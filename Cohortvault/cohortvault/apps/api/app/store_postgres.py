from __future__ import annotations

from contextlib import contextmanager
from datetime import datetime, timezone
import json
from pathlib import Path
from threading import Lock
from typing import Any, Iterator
from uuid import uuid4

import psycopg
from psycopg.rows import dict_row
from psycopg_pool import ConnectionPool

from app.config import settings
from app.content import build_receipt, chunk_text, compose_answer, extract_text, infer_document_type, tokenize
from app.embeddings import embed_text, vector_literal
from app.migrate import run_migrations

DEFAULT_WORKSPACE_REF = "team-atlas"
DEFAULT_ACTOR_ID = "usr_owner"
ROLE_ORDER = {"reviewer": 0, "builder": 1, "owner": 2}
_bootstrap_lock = Lock()
_pool_lock = Lock()
_initialized = False
_pool: ConnectionPool | None = None


def now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def display_timestamp(timestamp: str) -> str:
    return f"{timestamp[11:16]} UTC"


def make_id(prefix: str) -> str:
    return f"{prefix}_{uuid4().hex[:8]}"


def slugify(name: str) -> str:
    slug = "".join(character.lower() if character.isalnum() else "-" for character in name).strip("-")
    while "--" in slug:
        slug = slug.replace("--", "-")
    return slug or f"workspace-{uuid4().hex[:4]}"


def _normalize_value(value: Any) -> Any:
    if isinstance(value, datetime):
        return value.astimezone(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")
    return value


def _normalize_row(row: Any) -> Any:
    if row is None:
        return None
    if isinstance(row, dict):
        return {key: _normalize_value(value) for key, value in row.items()}
    return row


def _translate_sql(query: str) -> str:
    translated: list[str] = []
    in_single_quote = False
    index = 0
    while index < len(query):
        character = query[index]
        if character == "'":
            translated.append(character)
            if in_single_quote and index + 1 < len(query) and query[index + 1] == "'":
                translated.append("'")
                index += 2
                continue
            in_single_quote = not in_single_quote
            index += 1
            continue
        if character == "?" and not in_single_quote:
            translated.append("%s")
        else:
            translated.append(character)
        index += 1
    return "".join(translated)


class CursorWrapper:
    def __init__(self, cursor: Any) -> None:
        self._cursor = cursor

    @property
    def rowcount(self) -> int:
        return self._cursor.rowcount

    def fetchone(self) -> dict[str, Any] | None:
        return _normalize_row(self._cursor.fetchone())

    def fetchall(self) -> list[dict[str, Any]]:
        rows = self._cursor.fetchall()
        return [_normalize_row(row) for row in rows]

    def __getattr__(self, name: str) -> Any:
        return getattr(self._cursor, name)


class ConnectionWrapper:
    def __init__(self, conn: psycopg.Connection[Any]) -> None:
        self._conn = conn

    def execute(self, query: str, params: tuple[Any, ...] | list[Any] = ()) -> CursorWrapper:
        cursor = self._conn.execute(_translate_sql(query), params)
        return CursorWrapper(cursor)

    def executemany(self, query: str, params_seq: list[tuple[Any, ...]] | list[list[Any]]) -> CursorWrapper:
        cursor = self._conn.cursor(row_factory=dict_row)
        cursor.executemany(_translate_sql(query), params_seq)
        return CursorWrapper(cursor)

    def __getattr__(self, name: str) -> Any:
        return getattr(self._conn, name)


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
def connection(skip_ready: bool = False) -> Iterator[ConnectionWrapper]:
    if not skip_ready:
        ensure_ready()
    with get_pool().connection() as conn:
        wrapped = ConnectionWrapper(conn)
        try:
            yield wrapped
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
            secure_run(
                "usr_owner",
                DEFAULT_WORKSPACE_REF,
                "Summarize the strongest product wedge from the uploaded materials for an investor prep session.",
                "redacted",
                "secret_workspace_api_secret",
            )
            secure_run(
                "usr_owner",
                DEFAULT_WORKSPACE_REF,
                "Give me a reviewer-safe summary of how the product uses delegated secrets and signed receipts.",
                "summary_only",
            )
            return
        _initialized = True


def _get_user(conn: ConnectionWrapper, user_id: str) -> dict[str, Any]:
    row = conn.execute("select * from users where id = ?", (user_id,)).fetchone()
    if row is None:
        raise KeyError(f"User {user_id} not found.")
    return dict(row)


def _record_event(conn: ConnectionWrapper, workspace_id: str, actor_user_id: str, event_type: str, detail: str, timestamp: str | None = None) -> None:
    actor = _get_user(conn, actor_user_id)
    created_at = timestamp or now_iso()
    conn.execute(
        """
        insert into audit_events (id, workspace_id, actor_user_id, actor_email, event_type, detail, created_at)
        values (?, ?, ?, ?, ?, ?, ?)
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
        conn.executemany(
            "insert into users (id, email, name, created_at) values (?, ?, ?, ?)",
            [(user_id, email, name, created_at) for user_id, email, name in users],
        )

        workspace_id = "ws_team_atlas"
        conn.execute(
            """
            insert into workspaces (id, name, slug, description, owner_id, secure_mode_default, created_at, last_secure_run_at)
            values (?, ?, ?, ?, ?, ?, ?, ?)
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
        conn.executemany(
            """
            insert into workspace_members (id, workspace_id, user_id, role, status, invited_by, created_at)
            values (?, ?, ?, ?, ?, ?, ?)
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
        conn.executemany(
            """
            insert into secrets (id, workspace_id, name, provider, scope, created_by, created_at, last_used_at, revoked_at)
            values (?, ?, ?, ?, ?, ?, ?, ?, ?)
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
                "Research notes highlight that attestation-backed execution and private retrieval are easier to explain "
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
                ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
            chunks = chunk_text(text)
            for index, chunk in enumerate(chunks):
                conn.execute(
                    """
                    insert into document_chunks (id, document_id, workspace_id, chunk_index, content, embedding)
                    values (?, ?, ?, ?, ?, ?::vector)
                    """,
                    (make_id("chk"), document_id, workspace_id, index, chunk, vector_literal(embed_text(chunk))),
                )
            conn.execute("update documents set chunk_count = ? where id = ?", (len(chunks), document_id))

        _record_event(conn, workspace_id, "usr_owner", "workspace.created", "Created Team Atlas workspace", "2026-03-15T10:00:00Z")
        _record_event(conn, workspace_id, "usr_owner", "member.invited", "Invited builder and reviewer personas", "2026-03-15T10:02:00Z")
        _record_event(conn, workspace_id, "usr_owner", "document.indexed", "Loaded seeded research corpus", "2026-03-15T10:24:00Z")
        _record_event(conn, workspace_id, "usr_owner", "secret.revoked", "Revoked market_intel_key after last review", "2026-03-15T10:42:00Z")


def _get_user_by_email(conn: ConnectionWrapper, email: str) -> dict[str, Any] | None:
    row = conn.execute("select * from users where lower(email) = lower(?)", (email,)).fetchone()
    return dict(row) if row else None


def _ensure_user(conn: ConnectionWrapper, email: str) -> dict[str, Any]:
    existing = _get_user_by_email(conn, email)
    if existing:
        return existing

    user_id = make_id("usr")
    conn.execute(
        "insert into users (id, email, name, created_at) values (?, ?, ?, ?)",
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


def get_actor(actor_id: str | None) -> dict[str, Any]:
    resolved_actor_id = actor_id or DEFAULT_ACTOR_ID
    with connection() as conn:
        row = conn.execute("select id, email, name from users where id = ?", (resolved_actor_id,)).fetchone()
        if row is None:
            row = conn.execute("select id, email, name from users where id = ?", (DEFAULT_ACTOR_ID,)).fetchone()
        if row is None:
            raise KeyError("Default actor missing from seed data.")
        return dict(row)


def _workspace_row(conn: ConnectionWrapper, workspace_ref: str) -> dict[str, Any]:
    row = conn.execute("select * from workspaces where id = ? or slug = ?", (workspace_ref, workspace_ref)).fetchone()
    if row is None:
        raise KeyError(f"Workspace {workspace_ref} not found.")
    return row


def _member_row(conn: ConnectionWrapper, workspace_id: str, actor_user_id: str) -> dict[str, Any]:
    row = conn.execute(
        "select * from workspace_members where workspace_id = ? and user_id = ?",
        (workspace_id, actor_user_id),
    ).fetchone()
    if row is None:
        raise PermissionError("Current actor is not a member of this workspace.")
    return row


def _require_workspace_role(conn: ConnectionWrapper, workspace_id: str, actor_user_id: str, minimum_role: str) -> dict[str, Any]:
    member = _member_row(conn, workspace_id, actor_user_id)
    if ROLE_ORDER[member["role"]] < ROLE_ORDER[minimum_role]:
        raise PermissionError(f"{minimum_role} role required.")
    return member


def _serialize_workspace(conn: ConnectionWrapper, workspace_row: dict[str, Any], actor_user_id: str) -> dict[str, Any]:
    member = _member_row(conn, workspace_row["id"], actor_user_id)
    document_count = conn.execute(
        "select count(*) as count from documents where workspace_id = ?",
        (workspace_row["id"],),
    ).fetchone()["count"]
    member_count = conn.execute(
        "select count(*) as count from workspace_members where workspace_id = ?",
        (workspace_row["id"],),
    ).fetchone()["count"]
    secret_count = conn.execute(
        "select count(*) as count from secrets where workspace_id = ?",
        (workspace_row["id"],),
    ).fetchone()["count"]
    return {
        "id": workspace_row["id"],
        "name": workspace_row["name"],
        "slug": workspace_row["slug"],
        "description": workspace_row["description"],
        "role": member["role"],
        "documentCount": document_count,
        "memberCount": member_count,
        "secretCount": secret_count,
        "lastSecureRunAt": workspace_row["last_secure_run_at"],
        "secure_mode_default": bool(workspace_row["secure_mode_default"]),
    }


def list_workspaces(actor_user_id: str) -> list[dict[str, Any]]:
    with connection() as conn:
        rows = conn.execute(
            """
            select w.*
            from workspaces w
            join workspace_members wm on wm.workspace_id = w.id
            where wm.user_id = ?
            order by w.created_at desc
            """,
            (actor_user_id,),
        ).fetchall()
        return [_serialize_workspace(conn, row, actor_user_id) for row in rows]


def create_workspace(actor_user_id: str, name: str, use_case: str | None, secure_mode_default: bool) -> dict[str, Any]:
    with connection() as conn:
        slug = slugify(name)
        base_slug = slug
        counter = 2
        while conn.execute("select 1 from workspaces where slug = ?", (slug,)).fetchone():
            slug = f"{base_slug}-{counter}"
            counter += 1

        workspace_id = make_id("ws")
        created_at = now_iso()
        conn.execute(
            """
            insert into workspaces (id, name, slug, description, owner_id, secure_mode_default, created_at, last_secure_run_at)
            values (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                workspace_id,
                name.strip(),
                slug,
                use_case.strip() if use_case else "Private workspace for secure research collaboration.",
                actor_user_id,
                bool(secure_mode_default),
                created_at,
                None,
            ),
        )
        conn.execute(
            """
            insert into workspace_members (id, workspace_id, user_id, role, status, invited_by, created_at)
            values (?, ?, ?, ?, ?, ?, ?)
            """,
            (make_id("member"), workspace_id, actor_user_id, "owner", "active", actor_user_id, created_at),
        )
        _record_event(conn, workspace_id, actor_user_id, "workspace.created", f"Created workspace {name.strip()}", created_at)
        workspace = conn.execute("select * from workspaces where id = ?", (workspace_id,)).fetchone()
        return _serialize_workspace(conn, workspace, actor_user_id)


def delete_workspace(actor_user_id: str, workspace_ref: str) -> None:
    with connection() as conn:
        workspace = _workspace_row(conn, workspace_ref)
        _require_workspace_role(conn, workspace["id"], actor_user_id, "owner")
        if workspace["slug"] == DEFAULT_WORKSPACE_REF:
            raise PermissionError("Default demo workspace cannot be deleted.")

        rows = conn.execute(
            "select storage_path from documents where workspace_id = ?",
            (workspace["id"],),
        ).fetchall()
        stored_paths = [row["storage_path"] for row in rows]
        conn.execute("delete from workspaces where id = ?", (workspace["id"],))

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
            where wm.workspace_id = ?
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
                "createdAt": row["created_at"],
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
            "select 1 from workspace_members where workspace_id = ? and user_id = ?",
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
            values (?, ?, ?, ?, ?, ?, ?)
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
            "createdAt": created_at,
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
            where wm.id = ? and wm.workspace_id = ?
            """,
            (member_id, workspace["id"]),
        ).fetchone()
        if member is None:
            raise KeyError(f"Member {member_id} not found.")

        conn.execute("update workspace_members set role = ? where id = ?", (role, member_id))
        _record_event(conn, workspace["id"], actor_user_id, "member.role_updated", f"Updated {member['email']} to {role}")
        return {
            "id": member_id,
            "email": member["email"],
            "name": member["name"],
            "role": role,
            "status": member["status"],
            "invitedBy": member["invited_by_email"],
            "createdAt": member["created_at"],
        }


def get_documents(actor_user_id: str, workspace_ref: str) -> list[dict[str, Any]]:
    with connection() as conn:
        workspace = _workspace_row(conn, workspace_ref)
        _member_row(conn, workspace["id"], actor_user_id)
        rows = conn.execute(
            """
            select d.*, u.email as uploaded_by_email
            from documents d
            join users u on u.id = d.uploaded_by
            where d.workspace_id = ?
            order by d.created_at desc
            """,
            (workspace["id"],),
        ).fetchall()
        return [
            {
                "id": row["id"],
                "name": row["name"],
                "type": row["type"],
                "status": row["status"],
                "visibility": row["visibility"],
                "uploadedBy": row["uploaded_by_email"],
                "createdAt": row["created_at"],
                "chunkCount": row["chunk_count"],
                "sizeBytes": row["size_bytes"],
            }
            for row in rows
        ]


def _enqueue_ingestion_job(conn: ConnectionWrapper, workspace_id: str, document_id: str, payload: dict[str, Any]) -> None:
    conn.execute(
        """
        insert into jobs (id, job_type, workspace_id, document_id, payload_json, status, attempts, error_message, created_at, started_at, completed_at)
        values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
              id, workspace_id, name, filename, type, mime_type, visibility, uploaded_by, status, created_at, storage_path, size_bytes, chunk_count
            ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
            "createdAt": created_at,
            "chunkCount": 0,
            "sizeBytes": size_bytes,
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
            where d.id = ? and d.workspace_id = ?
            """,
            (document_id, workspace["id"]),
        ).fetchone()
        if document is None:
            raise KeyError(f"Document {document_id} not found.")

        conn.execute("update documents set status = 'uploaded', chunk_count = 0 where id = ?", (document_id,))
        conn.execute("delete from document_chunks where document_id = ?", (document_id,))
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
            "createdAt": document["created_at"],
            "chunkCount": 0,
            "sizeBytes": document["size_bytes"],
        }


def delete_document(actor_user_id: str, workspace_ref: str, document_id: str) -> None:
    with connection() as conn:
        workspace = _workspace_row(conn, workspace_ref)
        _require_workspace_role(conn, workspace["id"], actor_user_id, "owner")
        document = conn.execute(
            "select id, name, storage_path from documents where id = ? and workspace_id = ?",
            (document_id, workspace["id"]),
        ).fetchone()
        if document is None:
            raise KeyError(f"Document {document_id} not found.")
        conn.execute("delete from documents where id = ?", (document_id,))
        conn.execute("delete from jobs where document_id = ? and status in ('queued', 'running', 'failed')", (document_id,))
        _record_event(conn, workspace["id"], actor_user_id, "document.deleted", f"Deleted {document['name']}")
        stored_path = document["storage_path"]

    storage_path = Path(stored_path)
    if storage_path.exists() and storage_path.is_file():
        storage_path.unlink()


def get_secrets(actor_user_id: str, workspace_ref: str) -> list[dict[str, Any]]:
    with connection() as conn:
        workspace = _workspace_row(conn, workspace_ref)
        _member_row(conn, workspace["id"], actor_user_id)
        rows = conn.execute(
            """
            select s.*, u.email as created_by_email
            from secrets s
            join users u on u.id = s.created_by
            where s.workspace_id = ?
            order by s.created_at desc
            """,
            (workspace["id"],),
        ).fetchall()
        return [
            {
                "id": row["id"],
                "name": row["name"],
                "provider": row["provider"],
                "scope": row["scope"],
                "status": "revoked" if row["revoked_at"] else "active",
                "createdBy": row["created_by_email"],
                "createdAt": row["created_at"],
                "lastUsedAt": row["last_used_at"],
                "revokedAt": row["revoked_at"],
            }
            for row in rows
        ]


def add_secret(actor_user_id: str, workspace_ref: str, name: str, provider: str, scope: str) -> dict[str, Any]:
    with connection() as conn:
        workspace = _workspace_row(conn, workspace_ref)
        _require_workspace_role(conn, workspace["id"], actor_user_id, "owner")
        secret_id = make_id("secret")
        created_at = now_iso()
        conn.execute(
            """
            insert into secrets (id, workspace_id, name, provider, scope, created_by, created_at, last_used_at, revoked_at)
            values (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (secret_id, workspace["id"], name.strip(), provider.strip(), scope.strip(), actor_user_id, created_at, None, None),
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
            "createdAt": created_at,
            "lastUsedAt": None,
            "revokedAt": None,
        }


def revoke_secret(actor_user_id: str, workspace_ref: str, secret_id: str) -> dict[str, Any]:
    with connection() as conn:
        workspace = _workspace_row(conn, workspace_ref)
        _require_workspace_role(conn, workspace["id"], actor_user_id, "owner")
        row = conn.execute(
            """
            select s.*, u.email as created_by_email
            from secrets s
            join users u on u.id = s.created_by
            where s.id = ? and s.workspace_id = ?
            """,
            (secret_id, workspace["id"]),
        ).fetchone()
        if row is None:
            raise KeyError(f"Secret {secret_id} not found.")
        revoked_at = row["revoked_at"] or now_iso()
        conn.execute("update secrets set revoked_at = ? where id = ?", (revoked_at, secret_id))
        _record_event(conn, workspace["id"], actor_user_id, "secret.revoked", f"Revoked {row['name']}", revoked_at)
        return {
            "id": row["id"],
            "name": row["name"],
            "provider": row["provider"],
            "scope": row["scope"],
            "status": "revoked",
            "createdBy": row["created_by_email"],
            "createdAt": row["created_at"],
            "lastUsedAt": row["last_used_at"],
            "revokedAt": revoked_at,
        }


def get_audit_events(actor_user_id: str, workspace_ref: str) -> list[dict[str, Any]]:
    with connection() as conn:
        workspace = _workspace_row(conn, workspace_ref)
        _member_row(conn, workspace["id"], actor_user_id)
        rows = conn.execute(
            """
            select id, event_type, actor_email, created_at, detail
            from audit_events
            where workspace_id = ?
            order by created_at desc
            """,
            (workspace["id"],),
        ).fetchall()
        return [
            {
                "id": row["id"],
                "eventType": row["event_type"],
                "actor": row["actor_email"],
                "createdAt": display_timestamp(row["created_at"]),
                "detail": row["detail"],
            }
            for row in rows
        ]


def _search_sources(conn: ConnectionWrapper, workspace_id: str, prompt: str, output_mode: str, actor_role: str) -> list[dict[str, Any]]:
    prompt_vector = vector_literal(embed_text(prompt))
    rows = conn.execute(
        """
        select dc.content, d.id as document_id, d.name as document_name, d.visibility, dc.embedding <=> ?::vector as distance
        from document_chunks dc
        join documents d on d.id = dc.document_id
        where dc.workspace_id = ? and d.status in ('indexed', 'restricted')
        order by distance asc, d.created_at desc, dc.chunk_index asc
        limit 12
        """,
        (prompt_vector, workspace_id),
    ).fetchall()
    if not rows:
        return []

    tokens = set(tokenize(prompt))
    scored: list[tuple[int, float, dict[str, Any]]] = []
    for row in rows:
        score = sum(1 for token in tokens if token in row["content"].lower())
        scored.append((score, row["distance"], row))
    scored.sort(key=lambda item: (-item[0], item[1]))
    top_rows = [row for score, _, row in scored if score > 0][:3]
    if not top_rows:
        top_rows = [row for _, _, row in scored[:2]]

    sources: list[dict[str, Any]] = []
    for row in top_rows:
        redacted = False
        snippet = row["content"][:180]
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
            }
        )
    return sources


def secure_run(
    actor_user_id: str,
    workspace_ref: str,
    prompt: str,
    output_mode: str,
    selected_secret_id: str | None = None,
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
        if selected_secret_id:
            secret = conn.execute(
                "select * from secrets where id = ? and workspace_id = ?",
                (selected_secret_id, workspace["id"]),
            ).fetchone()
            if secret is None:
                raise KeyError(f"Secret {selected_secret_id} not found.")
            selected_secret_name = secret["name"]
            if secret["revoked_at"]:
                run_id = make_id("run")
                created_at = now_iso()
                conn.execute(
                    """
                    insert into runs (
                      id, workspace_id, actor_user_id, prompt, status, output_mode, created_at, answer, selected_secret_id, selected_secret_name, denial_reason
                    ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        run_id,
                        workspace["id"],
                        actor_user_id,
                        prompt,
                        "denied",
                        output_mode,
                        created_at,
                        None,
                        selected_secret_id,
                        selected_secret_name,
                        f"Secret {selected_secret_name} has been revoked.",
                    ),
                )
                _record_event(
                    conn,
                    workspace["id"],
                    actor_user_id,
                    "run.denied",
                    f"Denied Secure Run because {selected_secret_name} is revoked",
                    created_at,
                )
                raise PermissionError(f"Secret {selected_secret_name} has been revoked and can no longer be used.")

            secret_accessed = True
            conn.execute("update secrets set last_used_at = ? where id = ?", (now_iso(), selected_secret_id))
            _record_event(conn, workspace["id"], actor_user_id, "secret.used", f"Used delegated secret {selected_secret_name}")

        sources = _search_sources(conn, workspace["id"], prompt, output_mode, member["role"])
        answer = compose_answer(prompt, output_mode, [source["documentName"] for source in sources], selected_secret_name)
        run_id = make_id("run")
        signed_at = now_iso()
        receipt = build_receipt(run_id, output_mode, len(sources), secret_accessed, signed_at)
        conn.execute(
            """
            insert into runs (
              id, workspace_id, actor_user_id, prompt, status, output_mode, created_at, answer, selected_secret_id, selected_secret_name, denial_reason
            ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
                insert into run_sources (id, run_id, document_id, document_name, visibility, snippet, redacted)
                values (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    make_id("source"),
                    run_id,
                    source["documentId"],
                    source["documentName"],
                    source["visibility"],
                    source["snippet"],
                    bool(source["redacted"]),
                ),
            )
        conn.execute(
            """
            insert into run_receipts (run_id, adapter_type, runtime_id, policy_hash, sources_touched, secret_accessed, signed_at)
            values (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                run_id,
                receipt["adapterType"],
                receipt["runtimeId"],
                receipt["policyHash"],
                receipt["sourcesTouched"],
                bool(receipt["secretAccessed"]),
                receipt["signedAt"],
            ),
        )
        conn.execute("update workspaces set last_secure_run_at = ? where id = ?", (signed_at, workspace["id"]))
        _record_event(conn, workspace["id"], actor_user_id, "run.started", "Started Secure Run workflow", signed_at)
        _record_event(conn, workspace["id"], actor_user_id, "run.completed", f"Completed Secure Run in {output_mode} mode", signed_at)
        return {
            "runId": run_id,
            "status": "completed",
            "answer": answer,
            "receipt": receipt,
            "sources": sources,
        }


def get_runs(actor_user_id: str, workspace_ref: str) -> list[dict[str, Any]]:
    with connection() as conn:
        workspace = _workspace_row(conn, workspace_ref)
        _member_row(conn, workspace["id"], actor_user_id)
        rows = conn.execute(
            """
            select id, prompt, status, output_mode, created_at, answer, selected_secret_name, denial_reason
            from runs
            where workspace_id = ?
            order by created_at desc
            """,
            (workspace["id"],),
        ).fetchall()
        return [
            {
                "id": row["id"],
                "prompt": row["prompt"],
                "status": row["status"],
                "outputMode": row["output_mode"],
                "createdAt": row["created_at"],
                "answer": row["answer"],
                "selectedSecret": row["selected_secret_name"],
                "denialReason": row["denial_reason"],
            }
            for row in rows
        ]


def _receipt_dict(conn: ConnectionWrapper, run_id: str) -> dict[str, Any] | None:
    row = conn.execute("select * from run_receipts where run_id = ?", (run_id,)).fetchone()
    if row is None:
        return None
    return {
        "runId": row["run_id"],
        "adapterType": row["adapter_type"],
        "runtimeId": row["runtime_id"],
        "policyHash": row["policy_hash"],
        "sourcesTouched": row["sources_touched"],
        "secretAccessed": bool(row["secret_accessed"]),
        "signedAt": row["signed_at"],
    }


def get_run(actor_user_id: str, workspace_ref: str, run_id: str) -> dict[str, Any]:
    with connection() as conn:
        workspace = _workspace_row(conn, workspace_ref)
        _member_row(conn, workspace["id"], actor_user_id)
        run = conn.execute(
            """
            select id, prompt, status, output_mode, created_at, answer, selected_secret_name, denial_reason
            from runs
            where id = ? and workspace_id = ?
            """,
            (run_id, workspace["id"]),
        ).fetchone()
        if run is None:
            raise KeyError(f"Run {run_id} not found.")
        sources = conn.execute(
            """
            select document_id, document_name, visibility, snippet, redacted
            from run_sources
            where run_id = ?
            order by document_name asc, id asc
            """,
            (run_id,),
        ).fetchall()
        return {
            "id": run["id"],
            "prompt": run["prompt"],
            "status": run["status"],
            "outputMode": run["output_mode"],
            "createdAt": run["created_at"],
            "answer": run["answer"],
            "selectedSecret": run["selected_secret_name"],
            "denialReason": run["denial_reason"],
            "receipt": _receipt_dict(conn, run_id),
            "sources": [
                {
                    "documentId": row["document_id"],
                    "documentName": row["document_name"],
                    "visibility": row["visibility"],
                    "snippet": row["snippet"],
                    "redacted": bool(row["redacted"]),
                }
                for row in sources
            ],
        }


def get_latest_receipt(actor_user_id: str, workspace_ref: str) -> dict[str, Any]:
    with connection() as conn:
        workspace = _workspace_row(conn, workspace_ref)
        _member_row(conn, workspace["id"], actor_user_id)
        row = conn.execute(
            """
            select rr.run_id
            from run_receipts rr
            join runs r on r.id = rr.run_id
            where r.workspace_id = ?
            order by rr.signed_at desc
            limit 1
            """,
            (workspace["id"],),
        ).fetchone()
        if row is None:
            raise KeyError("No receipt available yet.")
        receipt = _receipt_dict(conn, row["run_id"])
        if receipt is None:
            raise KeyError("No receipt available yet.")
        return receipt


def get_receipt(actor_user_id: str, workspace_ref: str, run_id: str) -> dict[str, Any]:
    with connection() as conn:
        workspace = _workspace_row(conn, workspace_ref)
        _member_row(conn, workspace["id"], actor_user_id)
        receipt = _receipt_dict(conn, run_id)
        if receipt is None:
            raise KeyError(f"Receipt for run {run_id} not found.")
        return receipt


def list_jobs(status: str | None = None) -> list[dict[str, Any]]:
    with connection() as conn:
        if status:
            rows = conn.execute("select * from jobs where status = ? order by created_at asc", (status,)).fetchall()
        else:
            rows = conn.execute("select * from jobs order by created_at asc").fetchall()
        return [dict(row) for row in rows]


def _claim_job(conn: ConnectionWrapper) -> dict[str, Any] | None:
    return conn.execute(
        """
        with next_job as (
          select id
          from jobs
          where status = 'queued'
          order by created_at asc
          limit 1
          for update skip locked
        )
        update jobs
        set status = 'running', started_at = ?, attempts = attempts + 1
        where id in (select id from next_job)
        returning *
        """,
        (now_iso(),),
    ).fetchone()


def _complete_job(conn: ConnectionWrapper, job_id: str) -> None:
    conn.execute(
        "update jobs set status = 'completed', completed_at = ?, error_message = null where id = ?",
        (now_iso(), job_id),
    )


def _fail_job(conn: ConnectionWrapper, job_id: str, message: str) -> None:
    conn.execute(
        "update jobs set status = 'failed', error_message = ?, completed_at = ? where id = ?",
        (message, now_iso(), job_id),
    )


def process_next_job() -> dict[str, Any] | None:
    with connection() as conn:
        job = _claim_job(conn)
        if job is None:
            return None

        try:
            if job["job_type"] != "ingest_document":
                raise ValueError(f"Unsupported job type {job['job_type']}")

            document = conn.execute(
                "select * from documents where id = ? and workspace_id = ?",
                (job["document_id"], job["workspace_id"]),
            ).fetchone()
            if document is None:
                raise KeyError(f"Document {job['document_id']} not found for job {job['id']}")

            storage_path = Path(document["storage_path"])
            file_bytes = storage_path.read_bytes()
            text = extract_text(document["filename"], file_bytes, document["mime_type"])
            chunks = chunk_text(text)
            conn.execute("delete from document_chunks where document_id = ?", (document["id"],))
            for index, chunk in enumerate(chunks):
                conn.execute(
                    """
                    insert into document_chunks (id, document_id, workspace_id, chunk_index, content, embedding)
                    values (?, ?, ?, ?, ?, ?::vector)
                    """,
                    (make_id("chk"), document["id"], document["workspace_id"], index, chunk, vector_literal(embed_text(chunk))),
                )
            final_status = "restricted" if document["visibility"] == "restricted" else "indexed"
            conn.execute(
                "update documents set status = ?, chunk_count = ? where id = ?",
                (final_status, len(chunks), document["id"]),
            )
            _record_event(
                conn,
                document["workspace_id"],
                document["uploaded_by"],
                "document.indexed",
                f"Indexed {len(chunks)} chunks for {document['name']}",
            )
            _complete_job(conn, job["id"])
            return {"jobId": job["id"], "documentId": document["id"], "chunks": len(chunks), "status": final_status}
        except Exception as error:
            _fail_job(conn, job["id"], str(error))
            return {"jobId": job["id"], "status": "failed", "error": str(error)}


def process_pending_jobs(limit: int = 10) -> list[dict[str, Any]]:
    processed: list[dict[str, Any]] = []
    for _ in range(limit):
        result = process_next_job()
        if result is None:
            break
        processed.append(result)
    return processed
