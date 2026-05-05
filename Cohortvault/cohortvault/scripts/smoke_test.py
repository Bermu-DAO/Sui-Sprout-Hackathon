from pathlib import Path
import os
import sys
from time import perf_counter
from uuid import uuid4

ROOT = Path(__file__).resolve().parents[1]


def load_env_file(path: Path) -> None:
    if not path.exists():
        return

    for line in path.read_text(encoding="utf-8").splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#") or "=" not in stripped:
            continue
        key, value = stripped.split("=", 1)
        os.environ.setdefault(key, value)


load_env_file(ROOT / ".env")
os.environ.setdefault("COHORTVAULT_API_DATABASE_BACKEND", "sqlite")

sys.path.insert(0, str(ROOT / "apps" / "api"))

from fastapi.testclient import TestClient

from app.main import app
from app.store import process_pending_jobs


def main() -> None:
    started_at = perf_counter()
    print("backend", os.environ.get("COHORTVAULT_API_DATABASE_BACKEND", "sqlite"))
    client = TestClient(app)
    suffix = uuid4().hex[:6]
    workspace_name = f"Research Guild {suffix}"
    workspace_ref: str | None = None
    run_id: str | None = None

    try:
        session = client.get("/api/v1/session")
        assert session.status_code == 200
        owner_id = session.json()["actor"]["id"]
        print("session", owner_id)

        created = client.post(
            "/api/v1/workspaces",
            json={"name": workspace_name, "useCase": "Private diligence workflow", "secureModeDefault": True},
        )
        assert created.status_code == 200, created.text
        workspace_ref = created.json()["slug"]
        print("workspace", workspace_ref)

        invite = client.post(
            f"/api/v1/workspaces/{workspace_ref}/invite",
            json={"email": "builder@cohortvault.dev", "role": "builder"},
        )
        assert invite.status_code == 400 or invite.status_code == 200
        print("invite", invite.status_code)

        secret = client.post(
            f"/api/v1/workspaces/{workspace_ref}/secrets",
            json={"name": "demo_secret", "provider": "OpenAI", "scope": "notes"},
        )
        assert secret.status_code == 200, secret.text
        secret_id = secret.json()["id"]
        print("secret", secret_id)

        upload = client.post(
            f"/api/v1/workspaces/{workspace_ref}/documents",
            data={"visibility": "workspace", "display_name": "Guild Notes"},
            files={"file": ("guild-notes.md", b"# Guild\nDelegated secrets and audit logs win trust.\n", "text/markdown")},
        )
        assert upload.status_code == 200, upload.text
        document_id = upload.json()["id"]
        print("upload", document_id, upload.json()["status"])

        processed = process_pending_jobs(limit=5)
        assert processed, "worker did not process queued ingestion jobs"
        print("worker", processed[0]["status"])

        reindexed = client.post(f"/api/v1/workspaces/{workspace_ref}/documents/{document_id}/reindex")
        assert reindexed.status_code == 200, reindexed.text
        process_pending_jobs(limit=5)
        print("reindex", reindexed.json()["status"])

        switched = client.post("/api/v1/session/actor", json={"actorId": "usr_builder"})
        assert switched.status_code == 200, switched.text
        print("switch", switched.json()["actor"]["id"])

        builder_secret_attempt = client.post(
            f"/api/v1/workspaces/{workspace_ref}/secrets",
            json={"name": "builder_should_fail", "provider": "OpenAI", "scope": "notes"},
        )
        assert builder_secret_attempt.status_code == 403, builder_secret_attempt.text
        print("builder-secret", builder_secret_attempt.status_code)

        run = client.post(
            f"/api/v1/workspaces/{workspace_ref}/runs/secure",
            json={
                "prompt": "Summarize delegated secrets and audit logs for investors.",
                "outputMode": "redacted",
                "selectedSecret": secret_id,
            },
        )
        assert run.status_code == 200, run.text
        run_id = run.json()["runId"]
        print("run", run_id)

        switched_back = client.post("/api/v1/session/actor", json={"actorId": "usr_owner"})
        assert switched_back.status_code == 200, switched_back.text
        revoke = client.post(f"/api/v1/workspaces/{workspace_ref}/secrets/{secret_id}/revoke")
        assert revoke.status_code == 200, revoke.text
        print("revoke", revoke.json()["status"])

        denied = client.post(
            f"/api/v1/workspaces/{workspace_ref}/runs/secure",
            json={"prompt": "Try again.", "outputMode": "redacted", "selectedSecret": secret_id},
        )
        assert denied.status_code == 403, denied.text
        print("denied", denied.status_code)

        review = client.get(f"/api/v1/workspaces/{workspace_ref}/runs/{run_id}")
        assert review.status_code == 200, review.text
        print("review", review.json()["status"])

        switched_reviewer = client.post("/api/v1/session/actor", json={"actorId": "usr_reviewer"})
        assert switched_reviewer.status_code == 200, switched_reviewer.text
        reviewer_run = client.post(
            f"/api/v1/workspaces/{workspace_ref}/runs/secure",
            json={"prompt": "Reviewer should not run this.", "outputMode": "summary_only"},
        )
        assert reviewer_run.status_code == 403, reviewer_run.text
        print("reviewer-run", reviewer_run.status_code)

        client.post("/api/v1/session/actor", json={"actorId": "usr_owner"})
        audit = client.get(f"/api/v1/workspaces/{workspace_ref}/audit")
        assert audit.status_code == 200, audit.text
        print("audit", len(audit.json()))

        delete_response = client.delete(f"/api/v1/workspaces/{workspace_ref}/documents/{document_id}")
        assert delete_response.status_code == 204, delete_response.text
        print("delete-document", delete_response.status_code)
    finally:
        if workspace_ref:
            client.post("/api/v1/session/actor", json={"actorId": "usr_owner"})
            cleanup = client.delete(f"/api/v1/workspaces/{workspace_ref}")
            assert cleanup.status_code == 204, cleanup.text
            print("cleanup-workspace", cleanup.status_code)
        print("duration_seconds", round(perf_counter() - started_at, 2))


if __name__ == "__main__":
    main()
