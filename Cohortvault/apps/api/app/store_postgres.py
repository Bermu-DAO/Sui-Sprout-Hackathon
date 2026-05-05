from __future__ import annotations

from contextlib import contextmanager
from datetime import datetime, timedelta, timezone
import json
import logging
from pathlib import Path
from threading import Lock
import threading
from time import perf_counter
from typing import Any, Iterator
from uuid import uuid4

import psycopg
from psycopg import sql as pgsql
from psycopg.errors import UniqueViolation
from psycopg.rows import dict_row
from psycopg_pool import ConnectionPool

from app.attestation import hydrate_receipt_metadata, verify_receipt as verify_receipt_record
from app.attestation import get_attestation_adapter
from app.capabilities import build_capability_payload, decode_capability_token, issue_capability_token, token_hash
from app.config import settings
from app.content import DocumentParseError, chunk_text, compose_answer, extract_text, infer_document_type, tokenize
from app.embeddings import embed_text, vector_literal
from app.migrate import run_migrations
from app.storage import get_storage_adapter
from app.vault import encrypt_secret

DEFAULT_WORKSPACE_REF = "team-atlas"
ROLE_ORDER = {"reviewer": 0, "builder": 1, "owner": 2}
_bootstrap_lock = Lock()
_pool_lock = Lock()
_initialized = False
_pool: ConnectionPool | None = None
logger = logging.getLogger(__name__)


def now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def display_timestamp(timestamp: datetime | str) -> str:
    resolved = _to_iso(timestamp)
    if not resolved:
        return ""
    return f"{resolved[11:16]} UTC"


def make_id(prefix: str) -> str:
    return f"{prefix}_{uuid4().hex[:8]}"


def slugify(name: str) -> str:
    slug = "".join(character.lower() if character.isalnum() else "-" for character in name).strip("-")
    while "--" in slug:
        slug = slug.replace("--", "-")
    return slug or f"workspace-{uuid4().hex[:4]}"


def _zero_vector() -> list[float]:
    return [0.0] * settings.openai_embedding_dimensions


def _safe_embed(text: str) -> list[float]:
    try:
        return embed_text(text)
    except RuntimeError:
        return _zero_vector()


def _to_iso(value: datetime | str | None) -> str | None:
    if value is None or isinstance(value, str):
        return value
    return value.astimezone(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _utc_now() -> datetime:
    return datetime.now(timezone.utc).replace(microsecond=0)


def _json_dict(value: Any) -> dict[str, Any] | None:
    if value is None:
        return None
    if isinstance(value, dict):
        return value
    if isinstance(value, str):
        try:
            parsed = json.loads(value)
        except json.JSONDecodeError:
            return None
        return parsed if isinstance(parsed, dict) else None
    return None


def _clip_snippet(text: str, limit: int) -> str:
    normalized = " ".join(text.split())
    if len(normalized) <= limit:
        return normalized
    return f"{normalized[: max(0, limit - 3)].rstrip()}..."


def _job_payload(job: dict[str, Any]) -> dict[str, Any]:
    payload = job.get("payload_json")
    if isinstance(payload, dict):
        return payload
    if isinstance(payload, str):
        parsed = json.loads(payload)
        return parsed if isinstance(parsed, dict) else {}
    return {}


# NOTE: psycopg's type stubs enforce LiteralString for query parameters (PEP 675).
# The helpers below accept `str` because their callers pass internal SQL strings,
# never user-controlled input. The type: ignore comments are intentional.
def _executemany(conn: psycopg.Connection[Any], query: str, params_seq: list[tuple[Any, ...]] | list[list[Any]]) -> None:
    with conn.cursor() as cur:
        cur.executemany(pgsql.SQL(query), params_seq)  # type: ignore[arg-type]


def _scalar(conn: psycopg.Connection[Any], query: str, params: tuple[Any, ...] = ()) -> Any:
    row = conn.execute(query, params).fetchone()  # type: ignore[arg-type]
    assert row is not None, "Expected a scalar result row"
    return next(iter(dict(row).values()))


def get_pool() -> ConnectionPool:
    global _pool
    if _pool is not None:
        return _pool

    with _pool_lock:
        if _pool is None:
            _pool = ConnectionPool(
                conninfo=settings.database_url,
                min_size=settings.database_pool_min_size,
                max_size=settings.database_pool_max_size,
                timeout=settings.database_pool_timeout_seconds,
                kwargs={"autocommit": False, "row_factory": dict_row},
                open=True,
            )
    return _pool


@contextmanager
def connection(skip_ready: bool = False) -> Iterator[psycopg.Connection[Any]]:
    if not skip_ready:
        ensure_ready()
    with get_pool().connection() as conn:
        try:
            yield conn
            conn.commit()
        except Exception:
            conn.rollback()
            raise


def initialize_database() -> None:
    ensure_ready()


def ensure_ready() -> None:
    global _initialized
    if _initialized:
        return

    with _bootstrap_lock:
        if _initialized:
            return
        run_migrations()
        with connection(skip_ready=True) as conn:
            existing = conn.execute("select count(*) as count from users").fetchone()
        if existing is not None and existing["count"] == 0:
            seed_demo_data()
            _initialized = True

            def _seed_runs() -> None:
                try:
                    secure_run(
                        "usr_owner",
                        DEFAULT_WORKSPACE_REF,
                        "Summarize the strongest product wedge from the uploaded materials.",
                        "redacted",
                        "secret_workspace_api_secret",
                    )
                    secure_run(
                        "usr_owner",
                        DEFAULT_WORKSPACE_REF,
                        "Give me a reviewer-safe summary of how the product uses delegated secrets.",
                        "summary_only",
                    )
                    logger.info("Seeded demo Secure Run examples successfully.")
                except Exception as error:
                    logger.warning("Seeded Secure Run examples skipped: %s", error)

            threading.Thread(target=_seed_runs, daemon=True, name="seed-runs").start()
            return
        _initialized = True


def _get_user(conn: psycopg.Connection[Any], user_id: str) -> dict[str, Any]:
    row = conn.execute("select * from users where id = %s", (user_id,)).fetchone()
    if row is None:
        raise KeyError(f"User {user_id} not found.")
    return dict(row)


def _record_event(conn: psycopg.Connection[Any], workspace_id: str, actor_user_id: str, event_type: str, detail: str, timestamp: str | None = None) -> None:
    actor = _get_user(conn, actor_user_id)
    created_at = timestamp or now_iso()
    conn.execute(
        """
        insert into audit_events (id, workspace_id, actor_user_id, actor_email, event_type, detail, created_at)
        values (%s, %s, %s, %s, %s, %s, %s)
        """,
        (make_id("evt"), workspace_id, actor_user_id, actor["email"], event_type, detail, created_at),
    )


def seed_demo_data() -> None:
    with connection(skip_ready=True) as conn:
        existing = conn.execute("select count(*) as count from users").fetchone()
        if existing is not None and existing["count"] > 0:
            return

        users = [
            ("usr_owner", "owner@cohortvault.dev", "Atlas Lead"),
            ("usr_builder", "builder@cohortvault.dev", "Atlas Builder"),
            ("usr_reviewer", "reviewer@cohortvault.dev", "Atlas Reviewer"),
        ]
        created_at = "2026-03-15T09:55:00Z"
        _executemany(
            conn,
            "insert into users (id, email, name, created_at) values (%s, %s, %s, %s)",
            [(user_id, email, name, created_at) for user_id, email, name in users],
        )

        workspace_id = "ws_team_atlas"
        conn.execute(
            """
            insert into workspaces (id, name, slug, description, owner_id, secure_mode_default, created_at, last_secure_run_at)
            values (%s, %s, %s, %s, %s, %s, %s, %s)
            """,
            (
                workspace_id,
                "Team Atlas",
                DEFAULT_WORKSPACE_REF,
                "Private workspace for secure research collaboration and investor prep.",
                "usr_owner",
                True,
                created_at,
                None,
            ),
        )

        members = [
            ("member_owner", workspace_id, "usr_owner", "owner", "active", "usr_owner", "2026-03-15T09:55:00Z"),
            ("member_builder", workspace_id, "usr_builder", "builder", "active", "usr_owner", "2026-03-15T09:58:00Z"),
            ("member_reviewer", workspace_id, "usr_reviewer", "reviewer", "active", "usr_owner", "2026-03-15T10:01:00Z"),
        ]
        _executemany(
            conn,
            """
            insert into workspace_members (id, workspace_id, user_id, role, status, invited_by, created_at)
            values (%s, %s, %s, %s, %s, %s, %s)
            """,
            members,
        )

        secrets = [
            (
                "secret_workspace_api_secret",
                workspace_id,
                "workspace_api_secret",
                "OpenAI",
                "research-synthesis",
                "usr_owner",
                "2026-03-15T10:08:00Z",
                "2026-03-15T10:31:22Z",
                None,
            ),
            (
                "secret_market_intel_key",
                workspace_id,
                "market_intel_key",
                "Perplexity",
                "competitive-research",
                "usr_owner",
                "2026-03-15T10:09:00Z",
                "2026-03-15T10:31:22Z",
                "2026-03-15T10:42:00Z",
            ),
        ]
        _executemany(
            conn,
            """
            insert into secrets (id, workspace_id, name, provider, scope, created_by, created_at, last_used_at, revoked_at)
            values (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            """,
            secrets,
        )

        seed_documents = [
            (
                "Private Pitch Deck",
                "private-pitch-deck.pdf",
                "restricted",
                "usr_owner",
                "2026-03-15T10:18:00Z",
                "Team Atlas should lead with a privacy-first AI workspace for research-heavy teams. "
                "The strongest wedge is delegated secret access, signed execution receipts, and reviewer-safe outputs for investors.",
            ),
            (
                "Shape Rotator Research Notes",
                "shape-rotator-research-notes.md",
                "workspace",
                "usr_owner",
                "2026-03-15T10:12:00Z",
                "Research notes highlight that signed receipt v1 records and private retrieval are easier to explain "
                "when paired with a real product wedge. Delegated secrets reduce unsafe key sharing.",
            ),
            (
                "Investor Prep Transcript",
                "investor-prep-transcript.md",
                "workspace",
                "usr_builder",
                "2026-03-15T10:20:00Z",
                "Mentors and investors respond well to a demo that shows private documents, a secure run, auditability, "
                "and a clean denial after secret revocation.",
            ),
            (
                "Internal Planning Memo",
                "internal-planning-memo.md",
                "workspace",
                "usr_owner",
                "2026-03-15T10:24:00Z",
                "The MVP should include workspace creation, invite flow, document upload, retrieval, secure run, "
                "audit logs, secret management, and a reviewer-safe artifact page.",
            ),
        ]

        for name, filename, visibility, uploaded_by, document_created_at, text in seed_documents:
            document_id = make_id("doc")
            document_type = infer_document_type(filename)
            status = "restricted" if visibility == "restricted" else "indexed"
            conn.execute(
                """
                insert into documents (
                  id, workspace_id, name, filename, type, mime_type, visibility, uploaded_by, status, created_at, storage_path, size_bytes, chunk_count
                ) values (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """,
                (
                    document_id,
                    workspace_id,
                    name,
                    filename,
                    document_type,
                    "application/pdf" if document_type == "pdf" else "text/markdown",
                    visibility,
                    uploaded_by,
                    status,
                    document_created_at,
                    f"seed/{filename}",
                    len(text.encode("utf-8")),
                    0,
                ),
            )
            chunks = chunk_text(
                text,
                chunk_size=settings.rag_chunk_size,
                overlap=settings.rag_chunk_overlap,
            )
            for index, chunk in enumerate(chunks):
                conn.execute(
                    """
                    insert into document_chunks (id, document_id, workspace_id, chunk_index, content, embedding)
                    values (%s, %s, %s, %s, %s, %s::vector)
                    """,
                    (make_id("chk"), document_id, workspace_id, index, chunk, vector_literal(_safe_embed(chunk))),
                )
            conn.execute("update documents set chunk_count = %s where id = %s", (len(chunks), document_id))

        _record_event(conn, workspace_id, "usr_owner", "workspace.created", "Created Team Atlas workspace", "2026-03-15T10:00:00Z")
        _record_event(conn, workspace_id, "usr_owner", "member.invited", "Invited builder and reviewer personas", "2026-03-15T10:02:00Z")
        _record_event(conn, workspace_id, "usr_owner", "document.indexed", "Loaded seeded research corpus", "2026-03-15T10:24:00Z")
        _record_event(conn, workspace_id, "usr_owner", "secret.revoked", "Revoked market_intel_key after last review", "2026-03-15T10:42:00Z")


def _get_user_by_email(conn: psycopg.Connection[Any], email: str) -> dict[str, Any] | None:
    row = conn.execute("select * from users where lower(email) = lower(%s)", (email,)).fetchone()
    return dict(row) if row else None


def _ensure_user(conn: psycopg.Connection[Any], email: str) -> dict[str, Any]:
    existing = _get_user_by_email(conn, email)
    if existing:
        return existing

    user_id = make_id("usr")
    conn.execute(
        "insert into users (id, email, name, created_at) values (%s, %s, %s, %s)",
        (user_id, email.lower(), email.split("@")[0].replace(".", " ").title(), now_iso()),
    )
    return _get_user(conn, user_id)


def list_personas() -> list[dict[str, Any]]:
    with connection() as conn:
        rows = conn.execute(
            """
            select id, email, name
            from users
            where right(email, length('@cohortvault.dev')) = '@cohortvault.dev'
            order by case id when 'usr_owner' then 0 when 'usr_builder' then 1 else 2 end
            """
        ).fetchall()
        return [dict(row) for row in rows]


def get_actor(actor_id: str) -> dict[str, Any]:
    with connection() as conn:
        row = conn.execute("select id, email, name from users where id = %s", (actor_id,)).fetchone()
        if row is None:
            raise KeyError(f"Actor {actor_id} not found.")
        return dict(row)


def _workspace_row(conn: psycopg.Connection[Any], workspace_ref: str) -> dict[str, Any]:
    row = conn.execute("select * from workspaces where id = %s or slug = %s", (workspace_ref, workspace_ref)).fetchone()
    if row is None:
        raise KeyError(f"Workspace {workspace_ref} not found.")
    return dict(row)


def _member_row(conn: psycopg.Connection[Any], workspace_id: str, actor_user_id: str) -> dict[str, Any]:
    row = conn.execute(
        "select * from workspace_members where workspace_id = %s and user_id = %s",
        (workspace_id, actor_user_id),
    ).fetchone()
    if row is None:
        raise PermissionError("Current actor is not a member of this workspace.")
    return dict(row)


def _require_workspace_role(conn: psycopg.Connection[Any], workspace_id: str, actor_user_id: str, minimum_role: str) -> dict[str, Any]:
    member = _member_row(conn, workspace_id, actor_user_id)
    if ROLE_ORDER[member["role"]] < ROLE_ORDER[minimum_role]:
        raise PermissionError(f"{minimum_role} role required.")
    return member


def _serialize_workspace(conn: psycopg.Connection[Any], workspace_row: dict[str, Any], actor_user_id: str) -> dict[str, Any]:
    member = _member_row(conn, workspace_row["id"], actor_user_id)
    document_count = _scalar(
        conn,
        "select count(*) as count from documents where workspace_id = %s",
        (workspace_row["id"],),
    )
    member_count = _scalar(
        conn,
        "select count(*) as count from workspace_members where workspace_id = %s",
        (workspace_row["id"],),
    )
    secret_count = _scalar(
        conn,
        "select count(*) as count from secrets where workspace_id = %s",
        (workspace_row["id"],),
    )
    return {
        "id": workspace_row["id"],
        "name": workspace_row["name"],
        "slug": workspace_row["slug"],
        "description": workspace_row["description"],
        "role": member["role"],
        "documentCount": document_count,
        "memberCount": member_count,
        "secretCount": secret_count,
        "lastSecureRunAt": _to_iso(workspace_row["last_secure_run_at"]),
        "secureModeDefault": bool(workspace_row["secure_mode_default"]),
    }


def list_workspaces(actor_user_id: str) -> list[dict[str, Any]]:
    with connection() as conn:
        rows = conn.execute(
            """
            select
              w.*,
              wm_me.role as actor_role,
              (select count(*) from documents d where d.workspace_id = w.id) as document_count,
              (select count(*) from workspace_members wm2 where wm2.workspace_id = w.id) as member_count,
              (select count(*) from secrets s where s.workspace_id = w.id) as secret_count
            from workspaces w
            join workspace_members wm_me
              on wm_me.workspace_id = w.id
              and wm_me.user_id = %s
            order by w.created_at desc
            """,
            (actor_user_id,),
        ).fetchall()
        return [
            {
                "id": row["id"],
                "name": row["name"],
                "slug": row["slug"],
                "description": row["description"],
                "role": row["actor_role"],
                "documentCount": row["document_count"],
                "memberCount": row["member_count"],
                "secretCount": row["secret_count"],
                "lastSecureRunAt": _to_iso(row["last_secure_run_at"]),
                "secureModeDefault": bool(row["secure_mode_default"]),
            }
            for row in rows
            if row is not None
        ]


def create_workspace(actor_user_id: str, name: str, use_case: str | None, secure_mode_default: bool) -> dict[str, Any]:
    base_slug = slugify(name)
    workspace_id = make_id("ws")
    created_at = now_iso()
    description = use_case.strip() if use_case else "Private workspace for secure research collaboration."

    for attempt in range(1, 10):
        slug = base_slug if attempt == 1 else f"{base_slug}-{attempt}"
        try:
            with connection() as conn:
                conn.execute(
                    """
                    insert into workspaces (id, name, slug, description, owner_id, secure_mode_default, created_at, last_secure_run_at)
                    values (%s, %s, %s, %s, %s, %s, %s, %s)
                    """,
                    (
                        workspace_id,
                        name.strip(),
                        slug,
                        description,
                        actor_user_id,
                        bool(secure_mode_default),
                        created_at,
                        None,
                    ),
                )
                conn.execute(
                    """
                    insert into workspace_members (id, workspace_id, user_id, role, status, invited_by, created_at)
                    values (%s, %s, %s, %s, %s, %s, %s)
                    """,
                    (make_id("member"), workspace_id, actor_user_id, "owner", "active", actor_user_id, created_at),
                )
                _record_event(
                    conn,
                    workspace_id,
                    actor_user_id,
                    "workspace.created",
                    f"Created workspace {name.strip()}",
                    created_at,
                )
                workspace = conn.execute("select * from workspaces where id = %s", (workspace_id,)).fetchone()
                assert workspace is not None, "Workspace insert succeeded but the row was not found."
                return _serialize_workspace(conn, dict(workspace), actor_user_id)
        except UniqueViolation:
            continue

    raise ValueError(f"Could not create a unique slug for workspace name '{name}' after 9 attempts.")


def delete_workspace(actor_user_id: str, workspace_ref: str) -> None:
    with connection() as conn:
        workspace = _workspace_row(conn, workspace_ref)
        _require_workspace_role(conn, workspace["id"], actor_user_id, "owner")
        if workspace["slug"] == DEFAULT_WORKSPACE_REF:
            raise PermissionError("Default demo workspace cannot be deleted.")

        rows = conn.execute(
            "select storage_path from documents where workspace_id = %s",
            (workspace["id"],),
        ).fetchall()
        stored_paths = [row["storage_path"] for row in rows]
        conn.execute("delete from workspaces where id = %s", (workspace["id"],))

    for stored_path in stored_paths:
        storage_path = Path(stored_path)
        if storage_path.exists() and storage_path.is_file():
            storage_path.unlink()


def get_workspace(actor_user_id: str, workspace_ref: str) -> dict[str, Any]:
    with connection() as conn:
        return _serialize_workspace(conn, _workspace_row(conn, workspace_ref), actor_user_id)


def get_members(actor_user_id: str, workspace_ref: str) -> list[dict[str, Any]]:
    with connection() as conn:
        workspace = _workspace_row(conn, workspace_ref)
        _member_row(conn, workspace["id"], actor_user_id)
        rows = conn.execute(
            """
            select wm.id, u.email, u.name, wm.role, wm.status, inviter.email as invited_by_email, wm.created_at
            from workspace_members wm
            join users u on u.id = wm.user_id
            join users inviter on inviter.id = wm.invited_by
            where wm.workspace_id = %s
            order by wm.created_at asc
            """,
            (workspace["id"],),
        ).fetchall()
        return [
            {
                "id": row["id"],
                "email": row["email"],
                "name": row["name"],
                "role": row["role"],
                "status": row["status"],
                "invitedBy": row["invited_by_email"],
                "createdAt": _to_iso(row["created_at"]),
            }
            for row in rows
        ]


def invite_member(actor_user_id: str, workspace_ref: str, email: str, role: str) -> dict[str, Any]:
    if role not in ROLE_ORDER:
        raise ValueError("Role must be owner, builder, or reviewer.")

    with connection() as conn:
        workspace = _workspace_row(conn, workspace_ref)
        _require_workspace_role(conn, workspace["id"], actor_user_id, "owner")
        user = _ensure_user(conn, email)
        existing = conn.execute(
            "select 1 from workspace_members where workspace_id = %s and user_id = %s",
            (workspace["id"], user["id"]),
        ).fetchone()
        if existing:
            raise ValueError(f"{email} is already a member of this workspace.")

        created_at = now_iso()
        member_id = make_id("member")
        status = "active" if user["email"].endswith("@cohortvault.dev") else "pending"
        conn.execute(
            """
            insert into workspace_members (id, workspace_id, user_id, role, status, invited_by, created_at)
            values (%s, %s, %s, %s, %s, %s, %s)
            """,
            (member_id, workspace["id"], user["id"], role, status, actor_user_id, created_at),
        )
        _record_event(conn, workspace["id"], actor_user_id, "member.invited", f"Invited {email.lower()} as {role}", created_at)
        inviter = _get_user(conn, actor_user_id)
        return {
            "id": member_id,
            "email": user["email"],
            "name": user["name"],
            "role": role,
            "status": status,
            "invitedBy": inviter["email"],
            "createdAt": _to_iso(created_at),
        }


def update_member_role(actor_user_id: str, workspace_ref: str, member_id: str, role: str) -> dict[str, Any]:
    if role not in ROLE_ORDER:
        raise ValueError("Role must be owner, builder, or reviewer.")

    with connection() as conn:
        workspace = _workspace_row(conn, workspace_ref)
        _require_workspace_role(conn, workspace["id"], actor_user_id, "owner")
        member = conn.execute(
            """
            select wm.*, u.email, u.name, inviter.email as invited_by_email
            from workspace_members wm
            join users u on u.id = wm.user_id
            join users inviter on inviter.id = wm.invited_by
            where wm.id = %s and wm.workspace_id = %s
            """,
            (member_id, workspace["id"]),
        ).fetchone()
        if member is None:
            raise KeyError(f"Member {member_id} not found.")

        conn.execute("update workspace_members set role = %s where id = %s", (role, member_id))
        _record_event(conn, workspace["id"], actor_user_id, "member.role_updated", f"Updated {member['email']} to {role}")
        return {
            "id": member_id,
            "email": member["email"],
            "name": member["name"],
            "role": role,
            "status": member["status"],
            "invitedBy": member["invited_by_email"],
            "createdAt": _to_iso(member["created_at"]),
        }


def _document_access_where_clause(viewer_role: str) -> str:
    if viewer_role == "owner":
        return "d.workspace_id = %s"
    if viewer_role == "builder":
        return "d.workspace_id = %s and d.visibility = 'workspace'"
    raise PermissionError("Reviewer role can inspect outputs, not workspace inputs.")


def get_documents(actor_user_id: str, workspace_ref: str, limit: int = 50, offset: int = 0) -> tuple[list[dict[str, Any]], int]:
    with connection() as conn:
        workspace = _workspace_row(conn, workspace_ref)
        member = _member_row(conn, workspace["id"], actor_user_id)
        where_clause = _document_access_where_clause(member["role"])
        total = _scalar(
            conn,
            f"select count(*) as count from documents d where {where_clause}",
            (workspace["id"],),
        )
        rows = conn.execute(
            f"""
            select d.*, u.email as uploaded_by_email
            from documents d
            join users u on u.id = d.uploaded_by
            where {where_clause}
            order by d.created_at desc
            limit %s offset %s
            """,
            (workspace["id"], limit, offset),
        ).fetchall()
        items = [
            {
                "id": row["id"],
                "name": row["name"],
                "type": row["type"],
                "status": row["status"],
                "visibility": row["visibility"],
                "uploadedBy": row["uploaded_by_email"],
                "createdAt": _to_iso(row["created_at"]),
                "chunkCount": row["chunk_count"],
                "sizeBytes": row["size_bytes"],
                "lastError": row["last_error"],
            }
            for row in rows
        ]
        return items, total


def _enqueue_ingestion_job(conn: psycopg.Connection[Any], workspace_id: str, document_id: str, payload: dict[str, Any]) -> None:
    conn.execute(
        """
        insert into jobs (
          id, job_type, workspace_id, document_id, payload_json, status, attempts, error_message,
          created_at, started_at, completed_at, next_retry_at, last_duration_ms
        )
        values (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """,
        (
            make_id("job"),
            "ingest_document",
            workspace_id,
            document_id,
            json.dumps(payload),
            "queued",
            0,
            None,
            now_iso(),
            None,
            None,
            now_iso(),
            None,
        ),
    )


def register_document_upload(
    actor_user_id: str,
    workspace_ref: str,
    file_name: str,
    storage_path: str,
    visibility: str,
    content_type: str | None,
    size_bytes: int,
    display_name: str | None = None,
) -> dict[str, Any]:
    with connection() as conn:
        workspace = _workspace_row(conn, workspace_ref)
        _require_workspace_role(conn, workspace["id"], actor_user_id, "owner")
        created_at = now_iso()
        document_id = make_id("doc")
        document_name = display_name.strip() if display_name else Path(file_name).name
        conn.execute(
            """
            insert into documents (
              id, workspace_id, name, filename, type, mime_type, visibility, uploaded_by, status, created_at, storage_path, size_bytes, chunk_count, last_error
            ) values (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """,
            (
                document_id,
                workspace["id"],
                document_name,
                Path(file_name).name,
                infer_document_type(file_name),
                content_type or "application/octet-stream",
                visibility,
                actor_user_id,
                "uploaded",
                created_at,
                storage_path,
                size_bytes,
                0,
                None,
            ),
        )
        _enqueue_ingestion_job(
            conn,
            workspace["id"],
            document_id,
            {"storage_path": storage_path, "mime_type": content_type, "visibility": visibility},
        )
        _record_event(conn, workspace["id"], actor_user_id, "document.uploaded", f"Uploaded {document_name}", created_at)
        actor = _get_user(conn, actor_user_id)
        return {
            "id": document_id,
            "name": document_name,
            "type": infer_document_type(file_name),
            "status": "uploaded",
            "visibility": visibility,
            "uploadedBy": actor["email"],
            "createdAt": _to_iso(created_at),
            "chunkCount": 0,
            "sizeBytes": size_bytes,
            "lastError": None,
        }


def reindex_document(actor_user_id: str, workspace_ref: str, document_id: str) -> dict[str, Any]:
    with connection() as conn:
        workspace = _workspace_row(conn, workspace_ref)
        _require_workspace_role(conn, workspace["id"], actor_user_id, "owner")
        document = conn.execute(
            """
            select d.*, u.email as uploaded_by_email
            from documents d
            join users u on u.id = d.uploaded_by
            where d.id = %s and d.workspace_id = %s
            """,
            (document_id, workspace["id"]),
        ).fetchone()
        if document is None:
            raise KeyError(f"Document {document_id} not found.")

        conn.execute("update documents set status = 'uploaded', chunk_count = 0, last_error = null where id = %s", (document_id,))
        conn.execute("delete from document_chunks where document_id = %s", (document_id,))
        _enqueue_ingestion_job(
            conn,
            workspace["id"],
            document_id,
            {"storage_path": document["storage_path"], "mime_type": document["mime_type"], "visibility": document["visibility"]},
        )
        _record_event(conn, workspace["id"], actor_user_id, "document.reindex_requested", f"Queued reindex for {document['name']}")
        return {
            "id": document["id"],
            "name": document["name"],
            "type": document["type"],
            "status": "uploaded",
            "visibility": document["visibility"],
            "uploadedBy": document["uploaded_by_email"],
            "createdAt": _to_iso(document["created_at"]),
            "chunkCount": 0,
            "sizeBytes": document["size_bytes"],
            "lastError": None,
        }


def delete_document(actor_user_id: str, workspace_ref: str, document_id: str) -> None:
    with connection() as conn:
        workspace = _workspace_row(conn, workspace_ref)
        _require_workspace_role(conn, workspace["id"], actor_user_id, "owner")
        document = conn.execute(
            "select id, name, storage_path from documents where id = %s and workspace_id = %s",
            (document_id, workspace["id"]),
        ).fetchone()
        if document is None:
            raise KeyError(f"Document {document_id} not found.")
        conn.execute("delete from documents where id = %s", (document_id,))
        conn.execute("delete from jobs where document_id = %s and status in ('queued', 'running', 'failed')", (document_id,))
        _record_event(conn, workspace["id"], actor_user_id, "document.deleted", f"Deleted {document['name']}")
        stored_path = document["storage_path"]

    get_storage_adapter().delete(stored_path)


def get_secrets(actor_user_id: str, workspace_ref: str, limit: int = 50, offset: int = 0) -> tuple[list[dict[str, Any]], int]:
    with connection() as conn:
        workspace = _workspace_row(conn, workspace_ref)
        _member_row(conn, workspace["id"], actor_user_id)
        total = _scalar(
            conn,
            "select count(*) as count from secrets where workspace_id = %s",
            (workspace["id"],),
        )
        rows = conn.execute(
            """
            select s.*, u.email as created_by_email
            from secrets s
            join users u on u.id = s.created_by
            where s.workspace_id = %s
            order by s.created_at desc
            limit %s offset %s
            """,
            (workspace["id"], limit, offset),
        ).fetchall()
        items = [
            {
                "id": row["id"],
                "name": row["name"],
                "provider": row["provider"],
                "scope": row["scope"],
                "status": "revoked" if row["revoked_at"] else "active",
                "createdBy": row["created_by_email"],
                "createdAt": _to_iso(row["created_at"]),
                "lastUsedAt": _to_iso(row["last_used_at"]),
                "revokedAt": _to_iso(row["revoked_at"]),
            }
            for row in rows
        ]
        return items, total


def _secret_row(conn: psycopg.Connection[Any], workspace_id: str, secret_id: str) -> dict[str, Any]:
    row = conn.execute(
        """
        select s.*, u.email as created_by_email
        from secrets s
        join users u on u.id = s.created_by
        where s.id = %s and s.workspace_id = %s
        """,
        (secret_id, workspace_id),
    ).fetchone()
    if row is None:
        raise KeyError(f"Secret {secret_id} not found.")
    return dict(row)


def _insert_denied_run(
    conn: psycopg.Connection[Any],
    workspace_id: str,
    actor_user_id: str,
    prompt: str,
    output_mode: str,
    denial_reason: str,
    selected_secret_id: str | None = None,
    selected_secret_name: str | None = None,
) -> str:
    run_id = make_id("run")
    created_at = now_iso()
    conn.execute(
        """
        insert into runs (
          id, workspace_id, actor_user_id, prompt, status, output_mode, created_at, answer, selected_secret_id, selected_secret_name, denial_reason
        ) values (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """,
        (
            run_id,
            workspace_id,
            actor_user_id,
            prompt,
            "denied",
            output_mode,
            created_at,
            None,
            selected_secret_id,
            selected_secret_name,
            denial_reason,
        ),
    )
    _record_event(conn, workspace_id, actor_user_id, "run.denied", denial_reason, created_at)
    return run_id


def _issue_secret_capability_with_conn(
    conn: psycopg.Connection[Any],
    actor_user_id: str,
    workspace_id: str,
    secret: dict[str, Any],
) -> dict[str, Any]:
    issued_at_dt = _utc_now()
    expires_at_dt = issued_at_dt + timedelta(seconds=settings.capability_ttl_seconds)
    issued_at = _to_iso(issued_at_dt)
    expires_at = _to_iso(expires_at_dt)
    assert issued_at is not None
    assert expires_at is not None

    capability_id = make_id("cap")
    payload = build_capability_payload(
        capability_id=capability_id,
        workspace_id=workspace_id,
        secret_id=secret["id"],
        scope=secret["scope"],
        issued_to_user_id=actor_user_id,
        issued_at=issued_at,
        expires_at=expires_at,
    )
    token = issue_capability_token(payload)
    conn.execute(
        """
        insert into secret_capabilities (
          id, workspace_id, secret_id, issued_to_user_id, scope, token_hash, created_at, expires_at, used_at, revoked_at
        ) values (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """,
        (
            capability_id,
            workspace_id,
            secret["id"],
            actor_user_id,
            secret["scope"],
            token_hash(token),
            issued_at,
            expires_at,
            None,
            None,
        ),
    )
    _record_event(
        conn,
        workspace_id,
        actor_user_id,
        "capability.issued",
        f"Issued short-lived capability for {secret['name']} until {expires_at}",
        issued_at,
    )
    return {
        "capabilityId": capability_id,
        "token": token,
        "secretId": secret["id"],
        "scope": secret["scope"],
        "expiresAt": expires_at,
        "secretName": secret["name"],
    }


def issue_secret_capability(actor_user_id: str, workspace_ref: str, secret_id: str) -> dict[str, Any]:
    with connection() as conn:
        workspace = _workspace_row(conn, workspace_ref)
        member = _member_row(conn, workspace["id"], actor_user_id)
        if member["role"] not in {"owner", "builder"}:
            raise PermissionError("Only owner and builder roles can issue secret capabilities.")

        secret = _secret_row(conn, workspace["id"], secret_id)
        if secret["revoked_at"]:
            raise PermissionError(f"Secret {secret['name']} has been revoked and can no longer be used.")
        capability = _issue_secret_capability_with_conn(conn, actor_user_id, workspace["id"], secret)
        return {
            "capabilityId": capability["capabilityId"],
            "token": capability["token"],
            "secretId": capability["secretId"],
            "scope": capability["scope"],
            "expiresAt": capability["expiresAt"],
        }


def _consume_secret_capability(
    conn: psycopg.Connection[Any],
    actor_user_id: str,
    workspace_id: str,
    capability_token: str,
) -> dict[str, Any]:
    try:
        payload = decode_capability_token(capability_token)
    except ValueError as error:
        raise PermissionError(str(error)) from error

    if payload["workspaceId"] != workspace_id:
        raise PermissionError("Capability does not belong to this workspace.")
    if payload["issuedToUserId"] != actor_user_id:
        raise PermissionError("Capability was issued for a different actor.")

    row = conn.execute(
        """
        select
          sc.*,
          s.name as secret_name,
          s.encrypted_blob,
          s.revoked_at as secret_revoked_at
        from secret_capabilities sc
        join secrets s on s.id = sc.secret_id
        where sc.id = %s and sc.workspace_id = %s
        """,
        (payload["capabilityId"], workspace_id),
    ).fetchone()
    if row is None:
        raise PermissionError("Capability lease is not registered.")

    if row["token_hash"] != token_hash(capability_token):
        raise PermissionError("Capability token does not match the recorded lease.")
    if row["secret_id"] != payload["secretId"] or row["scope"] != payload["scope"]:
        raise PermissionError("Capability payload does not match the recorded lease.")
    if row["used_at"] is not None:
        raise PermissionError("Capability has already been consumed.")
    if row["revoked_at"] is not None or row["secret_revoked_at"] is not None:
        raise PermissionError(f"Capability for secret {row['secret_name']} has been revoked.")
    if row["expires_at"] <= _utc_now():
        raise PermissionError("Capability has expired.")

    used_at = now_iso()
    conn.execute("update secret_capabilities set used_at = %s where id = %s", (used_at, row["id"]))
    conn.execute("update secrets set last_used_at = %s where id = %s", (used_at, row["secret_id"]))
    _record_event(
        conn,
        workspace_id,
        actor_user_id,
        "capability.used",
        f"Consumed capability for {row['secret_name']}",
        used_at,
    )

    secret_available = False
    encrypted_blob = row["encrypted_blob"]
    if encrypted_blob and settings.secret_encryption_key:
        try:
            from app.vault import decrypt_secret

            _decrypted_value = decrypt_secret(encrypted_blob)
            secret_available = True
            del _decrypted_value
            logger.info("Secret %s decrypted successfully for run (value not logged)", row["secret_name"])
        except (ValueError, RuntimeError) as error:
            logger.warning("Could not decrypt secret %s: %s", row["secret_name"], error)

    return {
        "secretId": row["secret_id"],
        "secretName": row["secret_name"],
        "secretAvailable": secret_available,
        "scope": row["scope"],
    }


def add_secret(
    actor_user_id: str,
    workspace_ref: str,
    name: str,
    provider: str,
    scope: str,
    secret_value: str = "",
) -> dict[str, Any]:
    with connection() as conn:
        workspace = _workspace_row(conn, workspace_ref)
        _require_workspace_role(conn, workspace["id"], actor_user_id, "owner")
        secret_id = make_id("secret")
        created_at = now_iso()
        encrypted_blob = None
        if secret_value and not settings.secret_encryption_key:
            raise ValueError("Secret values require COHORTVAULT_API_SECRET_ENCRYPTION_KEY. Refusing to store plaintext.")
        if secret_value and settings.secret_encryption_key:
            encrypted_blob = encrypt_secret(secret_value)
        conn.execute(
            """
            insert into secrets (id, workspace_id, name, provider, scope, created_by, created_at, last_used_at, revoked_at, encrypted_blob)
            values (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """,
            (
                secret_id,
                workspace["id"],
                name.strip(),
                provider.strip(),
                scope.strip(),
                actor_user_id,
                created_at,
                None,
                None,
                encrypted_blob,
            ),
        )
        _record_event(conn, workspace["id"], actor_user_id, "secret.added", f"Added secret reference {name.strip()}", created_at)
        actor = _get_user(conn, actor_user_id)
        return {
            "id": secret_id,
            "name": name.strip(),
            "provider": provider.strip(),
            "scope": scope.strip(),
            "status": "active",
            "createdBy": actor["email"],
            "createdAt": _to_iso(created_at),
            "lastUsedAt": None,
            "revokedAt": None,
        }


def revoke_secret(actor_user_id: str, workspace_ref: str, secret_id: str) -> dict[str, Any]:
    with connection() as conn:
        workspace = _workspace_row(conn, workspace_ref)
        _require_workspace_role(conn, workspace["id"], actor_user_id, "owner")
        row = _secret_row(conn, workspace["id"], secret_id)
        revoked_at = row["revoked_at"] or now_iso()
        conn.execute("update secrets set revoked_at = %s where id = %s", (revoked_at, secret_id))
        conn.execute(
            """
            update secret_capabilities
            set revoked_at = %s
            where secret_id = %s and workspace_id = %s and used_at is null and revoked_at is null and expires_at > %s
            """,
            (revoked_at, secret_id, workspace["id"], revoked_at),
        )
        _record_event(conn, workspace["id"], actor_user_id, "secret.revoked", f"Revoked {row['name']}", revoked_at)
        return {
            "id": row["id"],
            "name": row["name"],
            "provider": row["provider"],
            "scope": row["scope"],
            "status": "revoked",
            "createdBy": row["created_by_email"],
            "createdAt": _to_iso(row["created_at"]),
            "lastUsedAt": _to_iso(row["last_used_at"]),
            "revokedAt": _to_iso(revoked_at),
        }


def get_audit_events(actor_user_id: str, workspace_ref: str, limit: int = 50, offset: int = 0) -> tuple[list[dict[str, Any]], int]:
    with connection() as conn:
        workspace = _workspace_row(conn, workspace_ref)
        _member_row(conn, workspace["id"], actor_user_id)
        total = _scalar(
            conn,
            "select count(*) as count from audit_events where workspace_id = %s",
            (workspace["id"],),
        )
        rows = conn.execute(
            """
            select id, event_type, actor_email, created_at, detail
            from audit_events
            where workspace_id = %s
            order by created_at desc
            limit %s offset %s
            """,
            (workspace["id"], limit, offset),
        ).fetchall()
        items = [
            {
                "id": row["id"],
                "eventType": row["event_type"],
                "actor": row["actor_email"],
                "createdAt": display_timestamp(row["created_at"]),
                "detail": row["detail"],
            }
            for row in rows
        ]
        return items, total

 
# NOTE: The IVFFlat index was created with lists=100. For small corpora (<10k chunks)
# lists=10 to lists=50 would be more appropriate. Re-index documents after tuning.
def _search_sources(conn: psycopg.Connection[Any], workspace_id: str, prompt: str, output_mode: str, actor_role: str) -> list[dict[str, Any]]:
    prompt_vector = vector_literal(embed_text(prompt))
    rows = conn.execute(
        """
        select
          dc.content,
          dc.chunk_index,
          d.id as document_id,
          d.name as document_name,
          d.visibility,
          dc.embedding <=> %s::vector as distance
        from document_chunks dc
        join documents d on d.id = dc.document_id
        where dc.workspace_id = %s and d.status in ('indexed', 'restricted')
        order by distance asc, d.created_at desc, dc.chunk_index asc
        limit %s
        """,
        (prompt_vector, workspace_id, settings.retrieval_candidate_limit),
    ).fetchall()
    if not rows:
        logger.info("retrieval summary workspace=%s selected=0 reason=no_hits", workspace_id)
        return []

    tokens = set(tokenize(prompt))
    scored: list[tuple[int, float, dict[str, Any]]] = []
    for row in rows:
        score = sum(1 for token in tokens if token in row["content"].lower())
        scored.append((score, row["distance"], row))
    scored.sort(key=lambda item: (-item[0], item[1], item[2]["document_name"], item[2]["chunk_index"]))
    top_rows = [row for score, _, row in scored if score > 0][: settings.retrieval_max_sources]
    if not top_rows:
        top_rows = [row for _, _, row in scored[: settings.retrieval_max_sources]]

    sources: list[dict[str, Any]] = []
    for rank, row in enumerate(top_rows, start=1):
        redacted = False
        snippet = _clip_snippet(row["content"], settings.rag_snippet_length)
        if output_mode == "summary_only":
            snippet = "Hidden in summary-only mode."
            redacted = True
        elif output_mode == "redacted":
            snippet = f"Redacted excerpt from {row['document_name']}."
            redacted = True
        elif actor_role != "owner" and row["visibility"] == "restricted":
            snippet = f"Redacted excerpt from {row['document_name']}."
            redacted = True

        sources.append(
            {
                "documentId": row["document_id"],
                "documentName": row["document_name"],
                "visibility": row["visibility"],
                "snippet": snippet,
                "redacted": redacted,
                "citation": f"S{rank}",
                "rank": rank,
                "chunkIndex": row["chunk_index"],
                "distance": round(float(row["distance"]), 6),
            }
        )
    preview = ", ".join(
        f"{source['citation']}:{source['documentName']}#{source['chunkIndex']}"
        for source in sources[: settings.retrieval_log_preview_count]
    )
    logger.info(
        "retrieval summary workspace=%s selected=%s preview=%s",
        workspace_id,
        len(sources),
        preview or "none",
    )
    return sources


def secure_run(
    actor_user_id: str,
    workspace_ref: str,
    prompt: str,
    output_mode: str,
    selected_secret_id: str | None = None,
    capability_token: str | None = None,
) -> dict[str, Any]:
    if output_mode not in {"summary_only", "redacted", "full"}:
        raise ValueError("Output mode must be summary_only, redacted, or full.")

    with connection() as conn:
        workspace = _workspace_row(conn, workspace_ref)
        member = _member_row(conn, workspace["id"], actor_user_id)
        if member["role"] not in {"owner", "builder"}:
            raise PermissionError("Only owner and builder roles can run Secure Run.")

        selected_secret_name: str | None = None
        secret_accessed = False
        secret_available = False
        if not capability_token and selected_secret_id:
            secret = _secret_row(conn, workspace["id"], selected_secret_id)
            selected_secret_name = secret["name"]
            if secret["revoked_at"]:
                denial_reason = f"Secret {selected_secret_name} has been revoked and can no longer be used."
                _insert_denied_run(
                    conn,
                    workspace["id"],
                    actor_user_id,
                    prompt,
                    output_mode,
                    denial_reason,
                    selected_secret_id=selected_secret_id,
                    selected_secret_name=selected_secret_name,
                )
                conn.commit()
                raise PermissionError(denial_reason)
            capability_token = _issue_secret_capability_with_conn(conn, actor_user_id, workspace["id"], secret)["token"]

        if capability_token:
            try:
                consumed_capability = _consume_secret_capability(conn, actor_user_id, workspace["id"], capability_token)
            except PermissionError as error:
                denial_reason = str(error)
                _insert_denied_run(
                    conn,
                    workspace["id"],
                    actor_user_id,
                    prompt,
                    output_mode,
                    denial_reason,
                    selected_secret_id=selected_secret_id,
                    selected_secret_name=selected_secret_name,
                )
                conn.commit()
                raise

            selected_secret_id = consumed_capability["secretId"]
            selected_secret_name = consumed_capability["secretName"]
            secret_accessed = True
            secret_available = bool(consumed_capability["secretAvailable"])
            _record_event(conn, workspace["id"], actor_user_id, "secret.used", f"Used delegated secret {selected_secret_name}")

        sources = _search_sources(conn, workspace["id"], prompt, output_mode, member["role"])
        answer = compose_answer(prompt, output_mode, sources, selected_secret_name, secret_available)
        run_id = make_id("run")
        signed_at = now_iso()
        receipt = get_attestation_adapter().issue_receipt(run_id, output_mode, sources, secret_accessed, signed_at)
        conn.execute(
            """
            insert into runs (
              id, workspace_id, actor_user_id, prompt, status, output_mode, created_at, answer, selected_secret_id, selected_secret_name, denial_reason
            ) values (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """,
            (
                run_id,
                workspace["id"],
                actor_user_id,
                prompt,
                "completed",
                output_mode,
                signed_at,
                answer,
                selected_secret_id,
                selected_secret_name,
                None,
            ),
        )
        for source in sources:
            conn.execute(
                """
                insert into run_sources (
                  id, run_id, document_id, document_name, visibility, snippet, redacted, source_rank, chunk_index, distance
                )
                values (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """,
                (
                    make_id("source"),
                    run_id,
                    source["documentId"],
                    source["documentName"],
                    source["visibility"],
                    source["snippet"],
                    bool(source["redacted"]),
                    source.get("rank"),
                    source.get("chunkIndex"),
                    source.get("distance"),
                ),
            )
        conn.execute(
            """
            insert into run_receipts (
              run_id, adapter_type, runtime_id, policy_hash, sources_touched, secret_accessed, signed_at,
              receipt_payload, signature, signature_algorithm, source_scope
            )
            values (%s, %s, %s, %s, %s, %s, %s, %s::jsonb, %s, %s, %s::jsonb)
            """,
            (
                run_id,
                receipt["adapterType"],
                receipt["runtimeId"],
                receipt["policyHash"],
                receipt["sourcesTouched"],
                bool(receipt["secretAccessed"]),
                receipt["signedAt"],
                json.dumps(receipt["receiptPayload"]),
                receipt["signature"],
                receipt["signatureAlgorithm"],
                json.dumps(receipt["sourceScope"]),
            ),
        )
        conn.execute("update workspaces set last_secure_run_at = %s where id = %s", (signed_at, workspace["id"]))
        _record_event(conn, workspace["id"], actor_user_id, "run.started", "Started Secure Run workflow", signed_at)
        _record_event(conn, workspace["id"], actor_user_id, "run.completed", f"Completed Secure Run in {output_mode} mode", signed_at)
        return {
            "runId": run_id,
            "status": "completed",
            "answer": answer,
            "receipt": receipt,
            "sources": sources,
        }


def get_runs(actor_user_id: str, workspace_ref: str, limit: int = 50, offset: int = 0) -> tuple[list[dict[str, Any]], int]:
    with connection() as conn:
        workspace = _workspace_row(conn, workspace_ref)
        member = _member_row(conn, workspace["id"], actor_user_id)
        total = _scalar(
            conn,
            "select count(*) as count from runs where workspace_id = %s",
            (workspace["id"],),
        )
        rows = conn.execute(
            """
            select id, actor_user_id, prompt, status, output_mode, created_at, answer, selected_secret_name, denial_reason
            from runs
            where workspace_id = %s
            order by created_at desc
            limit %s offset %s
            """,
            (workspace["id"], limit, offset),
        ).fetchall()
        items = []
        for row in rows:
            answer, denial_reason = _answer_for_viewer(row, member["role"], actor_user_id)
            items.append(
                {
                    "id": row["id"],
                    "prompt": row["prompt"],
                    "status": row["status"],
                    "outputMode": row["output_mode"],
                    "createdAt": _to_iso(row["created_at"]),
                    "answer": answer,
                    "selectedSecret": row["selected_secret_name"] if member["role"] == "owner" or actor_user_id == row["actor_user_id"] else None,
                    "denialReason": denial_reason,
                }
            )
        return items, total


def _receipt_dict(conn: psycopg.Connection[Any], run_id: str) -> dict[str, Any] | None:
    row = conn.execute("select * from run_receipts where run_id = %s", (run_id,)).fetchone()
    if row is None:
        return None
    receipt = hydrate_receipt_metadata(
        {
        "runId": row["run_id"],
        "adapterType": row["adapter_type"],
        "runtimeId": row["runtime_id"],
        "policyHash": row["policy_hash"],
        "sourcesTouched": row["sources_touched"],
        "secretAccessed": bool(row["secret_accessed"]),
        "signedAt": _to_iso(row["signed_at"]),
        "receiptPayload": _json_dict(row.get("receipt_payload")),
        "signature": row.get("signature"),
        "signatureAlgorithm": row.get("signature_algorithm"),
        "sourceScope": _json_dict(row.get("source_scope")),
        }
    )
    receipt["verified"] = verify_receipt_record(receipt)
    return receipt


def _answer_for_viewer(run_row: dict[str, Any], viewer_role: str, viewer_user_id: str) -> tuple[str | None, str | None]:
    if run_row["status"] == "denied":
        return run_row["answer"], run_row["denial_reason"]

    if viewer_role == "owner" or viewer_user_id == run_row["actor_user_id"]:
        return run_row["answer"], run_row["denial_reason"]

    if run_row["output_mode"] == "full":
        return "Restricted: full-access run output is only visible to the run creator or a workspace owner.", None

    return run_row["answer"], run_row["denial_reason"]


def _receipt_for_viewer(
    receipt: dict[str, Any] | None,
    viewer_role: str,
    viewer_user_id: str,
    run_actor_user_id: str,
) -> dict[str, Any] | None:
    if receipt is None:
        return None
    if viewer_role == "owner" or viewer_user_id == run_actor_user_id:
        return receipt

    clipped = dict(receipt)
    source_scope = clipped.get("sourceScope")
    if isinstance(source_scope, dict):
        clipped["sourceScope"] = {
            "documentIds": [],
            "scopeHash": source_scope.get("scopeHash"),
        }
    return clipped


def _source_for_viewer(
    source_row: dict[str, Any],
    output_mode: str,
    viewer_role: str,
    viewer_user_id: str,
    run_actor_user_id: str,
) -> dict[str, Any]:
    is_privileged = viewer_role == "owner" or viewer_user_id == run_actor_user_id
    source_rank = source_row["source_rank"]
    chunk_index = source_row["chunk_index"]
    distance = source_row["distance"]

    if is_privileged:
        snippet = source_row["snippet"]
        redacted = bool(source_row["redacted"])
    elif output_mode == "full":
        snippet = "Full-mode source content is only visible to the run creator or workspace owner."
        redacted = True
    elif output_mode == "summary_only":
        snippet = "Hidden in summary-only mode."
        redacted = True
    else:
        snippet = f"Redacted excerpt from {source_row['document_name']}."
        redacted = True

    return {
        "documentId": source_row["document_id"],
        "documentName": source_row["document_name"],
        "visibility": source_row["visibility"],
        "snippet": snippet,
        "redacted": redacted,
        "citation": f"S{source_rank}" if source_rank else None,
        "rank": source_rank,
        "chunkIndex": chunk_index,
        "distance": float(distance) if distance is not None else None,
    }


def get_run(actor_user_id: str, workspace_ref: str, run_id: str) -> dict[str, Any]:
    with connection() as conn:
        workspace = _workspace_row(conn, workspace_ref)
        member = _member_row(conn, workspace["id"], actor_user_id)
        run = conn.execute(
            """
            select id, actor_user_id, prompt, status, output_mode, created_at, answer, selected_secret_name, denial_reason
            from runs
            where id = %s and workspace_id = %s
            """,
            (run_id, workspace["id"]),
        ).fetchone()
        if run is None:
            raise KeyError(f"Run {run_id} not found.")
        answer, denial_reason = _answer_for_viewer(run, member["role"], actor_user_id)
        sources = conn.execute(
            """
            select document_id, document_name, visibility, snippet, redacted, source_rank, chunk_index, distance
            from run_sources
            where run_id = %s
            order by coalesce(source_rank, 9999) asc, document_name asc, id asc
            """,
            (run_id,),
        ).fetchall()
        return {
            "id": run["id"],
            "prompt": run["prompt"],
            "status": run["status"],
            "outputMode": run["output_mode"],
            "createdAt": _to_iso(run["created_at"]),
            "answer": answer,
            "selectedSecret": run["selected_secret_name"] if member["role"] == "owner" or actor_user_id == run["actor_user_id"] else None,
            "denialReason": denial_reason,
            "receipt": _receipt_for_viewer(_receipt_dict(conn, run_id), member["role"], actor_user_id, run["actor_user_id"]),
            "sources": [_source_for_viewer(row, run["output_mode"], member["role"], actor_user_id, run["actor_user_id"]) for row in sources],
        }


def get_latest_receipt(actor_user_id: str, workspace_ref: str) -> dict[str, Any]:
    with connection() as conn:
        workspace = _workspace_row(conn, workspace_ref)
        member = _member_row(conn, workspace["id"], actor_user_id)
        row = conn.execute(
            """
            select rr.run_id, r.actor_user_id
            from run_receipts rr
            join runs r on r.id = rr.run_id
            where r.workspace_id = %s
            order by rr.signed_at desc
            limit 1
            """,
            (workspace["id"],),
        ).fetchone()
        if row is None:
            raise KeyError("No receipt available yet.")
        receipt = _receipt_for_viewer(_receipt_dict(conn, row["run_id"]), member["role"], actor_user_id, row["actor_user_id"])
        if receipt is None:
            raise KeyError("No receipt available yet.")
        return receipt


def get_receipt(actor_user_id: str, workspace_ref: str, run_id: str) -> dict[str, Any]:
    with connection() as conn:
        workspace = _workspace_row(conn, workspace_ref)
        member = _member_row(conn, workspace["id"], actor_user_id)
        run = conn.execute("select actor_user_id from runs where id = %s and workspace_id = %s", (run_id, workspace["id"])).fetchone()
        if run is None:
            raise KeyError(f"Receipt for run {run_id} not found.")
        receipt = _receipt_for_viewer(_receipt_dict(conn, run_id), member["role"], actor_user_id, run["actor_user_id"])
        if receipt is None:
            raise KeyError(f"Receipt for run {run_id} not found.")
        return receipt


def list_jobs(status: str | None = None) -> list[dict[str, Any]]:
    with connection() as conn:
        if status:
            rows = conn.execute("select * from jobs where status = %s order by created_at asc", (status,)).fetchall()
        else:
            rows = conn.execute("select * from jobs order by created_at asc").fetchall()
        items: list[dict[str, Any]] = []
        for row in rows:
            item = dict(row)
            item["effective_status"] = "retried" if item["status"] == "queued" and item["attempts"] > 0 and item["error_message"] else item["status"]
            items.append(item)
        return items


def _claim_job(conn: psycopg.Connection[Any]) -> dict[str, Any] | None:
    now = now_iso()
    return conn.execute(
        """
        with next_job as (
          select id
          from jobs
          where status = 'queued' and coalesce(next_retry_at, created_at) <= %s
          order by coalesce(next_retry_at, created_at) asc, created_at asc
          limit 1
          for update skip locked
        )
        update jobs
        set status = 'running', started_at = %s, attempts = attempts + 1
        where id in (select id from next_job)
        returning *
        """,
        (now, now),
    ).fetchone()


def _complete_job(conn: psycopg.Connection[Any], job_id: str, duration_ms: int) -> None:
    conn.execute(
        """
        update jobs
        set status = 'completed', completed_at = %s, error_message = null, next_retry_at = null, last_duration_ms = %s
        where id = %s
        """,
        (now_iso(), duration_ms, job_id),
    )


def _retry_job(conn: psycopg.Connection[Any], job_id: str, message: str, duration_ms: int) -> str:
    retry_at_dt = _utc_now() + timedelta(seconds=settings.worker_retry_backoff_seconds)
    retry_at = _to_iso(retry_at_dt)
    assert retry_at is not None
    conn.execute(
        """
        update jobs
        set status = 'queued', error_message = %s, started_at = null, completed_at = null, next_retry_at = %s, last_duration_ms = %s
        where id = %s
        """,
        (message, retry_at, duration_ms, job_id),
    )
    return retry_at


def _fail_job(conn: psycopg.Connection[Any], job_id: str, message: str, duration_ms: int) -> None:
    conn.execute(
        """
        update jobs
        set status = 'failed', error_message = %s, completed_at = %s, next_retry_at = null, last_duration_ms = %s
        where id = %s
        """,
        (message, now_iso(), duration_ms, job_id),
    )


def _set_document_ingestion_error(
    conn: psycopg.Connection[Any],
    document_id: str | None,
    status: str,
    message: str,
) -> None:
    if not document_id:
        return
    conn.execute(
        "update documents set status = %s, chunk_count = 0, last_error = %s where id = %s",
        (status, message, document_id),
    )


def _should_retry_job(error: Exception) -> bool:
    return isinstance(error, DocumentParseError) or not isinstance(error, (KeyError, ValueError))


def _process_ingestion_job(conn: psycopg.Connection[Any], job: dict[str, Any]) -> dict[str, Any]:
    if job["job_type"] != "ingest_document":
        raise ValueError(f"Unsupported job type {job['job_type']}")

    document = conn.execute(
        "select * from documents where id = %s and workspace_id = %s",
        (job["document_id"], job["workspace_id"]),
    ).fetchone()
    if document is None:
        raise KeyError(f"Document {job['document_id']} not found for job {job['id']}")

    payload = _job_payload(job)
    storage_locator = payload.get("storage_path") or document["storage_path"]
    file_bytes = get_storage_adapter().read(storage_locator)
    text = extract_text(document["filename"], file_bytes, document["mime_type"])
    chunks = chunk_text(
        text,
        chunk_size=settings.rag_chunk_size,
        overlap=settings.rag_chunk_overlap,
    )
    if not chunks:
        raise DocumentParseError(
            f"{document['filename']} did not yield any indexable text. Upload markdown, text, or a text-based PDF."
        )

    conn.execute("delete from document_chunks where document_id = %s", (document["id"],))
    for index, chunk in enumerate(chunks):
        try:
            embedding = embed_text(chunk)
        except RuntimeError as error:
            logger.warning("Embedding fallback for document %s: %s", document["id"], error)
            embedding = _zero_vector()
        conn.execute(
            """
            insert into document_chunks (id, document_id, workspace_id, chunk_index, content, embedding)
            values (%s, %s, %s, %s, %s, %s::vector)
            """,
            (make_id("chk"), document["id"], document["workspace_id"], index, chunk, vector_literal(embedding)),
        )
    final_status = "restricted" if document["visibility"] == "restricted" else "indexed"
    conn.execute(
        "update documents set status = %s, chunk_count = %s, last_error = null where id = %s",
        (final_status, len(chunks), document["id"]),
    )
    _record_event(
        conn,
        document["workspace_id"],
        document["uploaded_by"],
        "document.indexed",
        f"Indexed {len(chunks)} chunks for {document['name']}",
    )
    return {
        "documentId": document["id"],
        "documentName": document["name"],
        "workspaceId": document["workspace_id"],
        "uploadedBy": document["uploaded_by"],
        "chunks": len(chunks),
        "documentStatus": final_status,
    }


def process_next_job() -> dict[str, Any] | None:
    with connection() as conn:
        job = _claim_job(conn)
        if job is None:
            return None

        started = perf_counter()
        try:
            with conn.transaction():
                result = _process_ingestion_job(conn, job)
            duration_ms = int((perf_counter() - started) * 1000)
            _complete_job(conn, job["id"], duration_ms)
            logger.info(
                "ingestion completed job=%s document=%s chunks=%s attempts=%s duration_ms=%s",
                job["id"],
                result["documentId"],
                result["chunks"],
                job["attempts"],
                duration_ms,
            )
            return {
                "jobId": job["id"],
                "documentId": result["documentId"],
                "chunks": result["chunks"],
                "status": "completed",
                "documentStatus": result["documentStatus"],
                "attempts": job["attempts"],
                "durationMs": duration_ms,
            }
        except Exception as error:
            duration_ms = int((perf_counter() - started) * 1000)
            logger.exception(
                "ingestion attempt failed job=%s document=%s attempts=%s duration_ms=%s",
                job["id"],
                job.get("document_id"),
                job["attempts"],
                duration_ms,
            )
            error_message = str(error)
            if _should_retry_job(error) and job["attempts"] < settings.worker_max_attempts:
                retry_at = _retry_job(conn, job["id"], error_message, duration_ms)
                _set_document_ingestion_error(conn, job.get("document_id"), "uploaded", error_message)
                if job.get("workspace_id") and job.get("document_id"):
                    _record_event(
                        conn,
                        job["workspace_id"],
                        "usr_owner",
                        "document.ingestion_retried",
                        f"Retrying ingestion for {job['document_id']} at {retry_at}",
                    )
                return {
                    "jobId": job["id"],
                    "documentId": job.get("document_id"),
                    "status": "retried",
                    "documentStatus": "uploaded",
                    "attempts": job["attempts"],
                    "durationMs": duration_ms,
                    "error": error_message,
                    "retryAt": retry_at,
                }

            _fail_job(conn, job["id"], error_message, duration_ms)
            _set_document_ingestion_error(conn, job.get("document_id"), "failed", error_message)
            if job.get("workspace_id") and job.get("document_id"):
                _record_event(
                    conn,
                    job["workspace_id"],
                    "usr_owner",
                    "document.ingestion_failed",
                    f"Failed ingestion for {job['document_id']}: {error_message}",
                )
            return {
                "jobId": job["id"],
                "documentId": job.get("document_id"),
                "status": "failed",
                "documentStatus": "failed",
                "attempts": job["attempts"],
                "durationMs": duration_ms,
                "error": error_message,
            }


def process_pending_jobs(limit: int = 10) -> list[dict[str, Any]]:
    processed: list[dict[str, Any]] = []
    for _ in range(limit):
        result = process_next_job()
        if result is None:
            break
        processed.append(result)
    return processed
