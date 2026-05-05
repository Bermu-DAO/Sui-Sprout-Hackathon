from __future__ import annotations

from fastapi.testclient import TestClient

from app.config import settings
from app.store import process_pending_jobs


def switch_actor(client: TestClient, actor_id: str) -> None:
    response = client.post("/api/v1/session/actor", json={"actorId": actor_id})
    assert response.status_code == 200, response.text


def upload_markdown_document(
    client: TestClient,
    workspace_ref: str,
    name: str = "notes.md",
    visibility: str = "workspace",
    content: bytes = b"# Notes\nSecure collaboration and delegated secrets.\n",
) -> str:
    response = client.post(
        f"/api/v1/workspaces/{workspace_ref}/documents",
        data={"visibility": visibility, "display_name": "Notes"},
        files={"file": (name, content, "text/markdown")},
    )
    assert response.status_code == 200, response.text
    return response.json()["id"]


def test_owner_can_create_secret(client: TestClient, workspace_ref: str) -> None:
    response = client.post(
        f"/api/v1/workspaces/{workspace_ref}/secrets",
        json={"name": "owner_secret", "provider": "OpenAI", "scope": "research"},
    )
    assert response.status_code == 200, response.text


def test_builder_cannot_create_secret(client: TestClient, workspace_ref: str) -> None:
    switch_actor(client, "usr_builder")
    response = client.post(
        f"/api/v1/workspaces/{workspace_ref}/secrets",
        json={"name": "builder_secret", "provider": "OpenAI", "scope": "research"},
    )
    assert response.status_code == 403, response.text


def test_reviewer_cannot_run_secure(client: TestClient, workspace_ref: str) -> None:
    switch_actor(client, "usr_reviewer")
    response = client.post(
        f"/api/v1/workspaces/{workspace_ref}/runs/secure",
        json={"prompt": "Summarize the workspace.", "outputMode": "summary_only"},
    )
    assert response.status_code == 403, response.text


def test_builder_can_run_secure(client: TestClient, workspace_ref: str) -> None:
    switch_actor(client, "usr_builder")
    response = client.post(
        f"/api/v1/workspaces/{workspace_ref}/runs/secure",
        json={"prompt": "Summarize the workspace.", "outputMode": "summary_only"},
    )
    assert response.status_code == 200, response.text


def test_owner_can_delete_document(client: TestClient, workspace_ref: str) -> None:
    document_id = upload_markdown_document(client, workspace_ref, "owner-delete.md")
    response = client.delete(f"/api/v1/workspaces/{workspace_ref}/documents/{document_id}")
    assert response.status_code == 204, response.text


def test_builder_cannot_delete_document(client: TestClient, workspace_ref: str) -> None:
    document_id = upload_markdown_document(client, workspace_ref, "builder-delete.md")
    switch_actor(client, "usr_builder")
    response = client.delete(f"/api/v1/workspaces/{workspace_ref}/documents/{document_id}")
    assert response.status_code == 403, response.text


def test_unsigned_actor_cookie_is_rejected(client: TestClient) -> None:
    client.cookies.set(settings.session_cookie_name, "usr_owner")
    response = client.get("/api/v1/workspaces")
    assert response.status_code == 401, response.text


def test_builder_documents_hide_restricted_inputs(client: TestClient, workspace_ref: str) -> None:
    visible_document_id = upload_markdown_document(client, workspace_ref, "visible.md", visibility="workspace")
    hidden_document_id = upload_markdown_document(client, workspace_ref, "hidden.md", visibility="restricted")
    processed = process_pending_jobs(limit=5)
    assert processed, "Expected ingestion jobs to be processed."

    switch_actor(client, "usr_builder")
    response = client.get(f"/api/v1/workspaces/{workspace_ref}/documents?limit=100&offset=0")
    assert response.status_code == 200, response.text

    payload = response.json()
    document_ids = {document["id"] for document in payload["items"]}
    assert visible_document_id in document_ids
    assert hidden_document_id not in document_ids


def test_reviewer_documents_endpoint_is_forbidden(client: TestClient, workspace_ref: str) -> None:
    switch_actor(client, "usr_reviewer")
    response = client.get(f"/api/v1/workspaces/{workspace_ref}/documents?limit=100&offset=0")
    assert response.status_code == 403, response.text
    assert "outputs" in response.json()["detail"].lower()


def test_builder_run_detail_clips_owner_only_fields(client: TestClient, workspace_ref: str) -> None:
    upload_markdown_document(
        client,
        workspace_ref,
        name="restricted.md",
        visibility="restricted",
        content=b"# Restricted\nTOP SECRET acquisition plan for internal diligence only.\n",
    )
    processed = process_pending_jobs(limit=5)
    assert processed, "Expected ingestion jobs to be processed."

    secret = client.post(
        f"/api/v1/workspaces/{workspace_ref}/secrets",
        json={"name": "owner_secret", "provider": "OpenAI", "scope": "research"},
    )
    assert secret.status_code == 200, secret.text

    run = client.post(
        f"/api/v1/workspaces/{workspace_ref}/runs/secure",
        json={
            "prompt": "Summarize the acquisition plan.",
            "outputMode": "full",
            "selectedSecret": secret.json()["id"],
        },
    )
    assert run.status_code == 200, run.text
    run_id = run.json()["runId"]

    switch_actor(client, "usr_builder")
    review = client.get(f"/api/v1/workspaces/{workspace_ref}/runs/{run_id}")
    assert review.status_code == 200, review.text

    payload = review.json()
    assert payload["selectedSecret"] is None
    assert payload["receipt"]["sourceScope"]["documentIds"] == []
    assert "full-access run output is only visible" in (payload["answer"] or "")


def test_owner_run_detail_keeps_owner_fields(client: TestClient, workspace_ref: str) -> None:
    upload_markdown_document(
        client,
        workspace_ref,
        name="restricted-owner.md",
        visibility="restricted",
        content=b"# Restricted\nTOP SECRET launch memo for owner view.\n",
    )
    processed = process_pending_jobs(limit=5)
    assert processed, "Expected ingestion jobs to be processed."

    secret = client.post(
        f"/api/v1/workspaces/{workspace_ref}/secrets",
        json={"name": "owner_visible_secret", "provider": "OpenAI", "scope": "research"},
    )
    assert secret.status_code == 200, secret.text

    run = client.post(
        f"/api/v1/workspaces/{workspace_ref}/runs/secure",
        json={
            "prompt": "Summarize the launch memo.",
            "outputMode": "full",
            "selectedSecret": secret.json()["id"],
        },
    )
    assert run.status_code == 200, run.text
    run_id = run.json()["runId"]

    review = client.get(f"/api/v1/workspaces/{workspace_ref}/runs/{run_id}")
    assert review.status_code == 200, review.text

    payload = review.json()
    assert payload["selectedSecret"] == "owner_visible_secret"
    assert payload["receipt"]["sourceScope"]["documentIds"]


def test_reviewer_get_run_re_redacts_owner_full_run(client: TestClient, workspace_ref: str) -> None:
    upload_markdown_document(
        client,
        workspace_ref,
        name="restricted.md",
        visibility="restricted",
        content=b"# Restricted\nTOP SECRET acquisition plan for internal diligence only.\n",
    )
    processed = process_pending_jobs(limit=5)
    assert processed, "Expected ingestion jobs to be processed."

    run = client.post(
        f"/api/v1/workspaces/{workspace_ref}/runs/secure",
        json={"prompt": "Summarize the acquisition plan.", "outputMode": "full"},
    )
    assert run.status_code == 200, run.text
    run_id = run.json()["runId"]

    switch_actor(client, "usr_reviewer")
    review = client.get(f"/api/v1/workspaces/{workspace_ref}/runs/{run_id}")
    assert review.status_code == 200, review.text

    payload = review.json()
    assert "TOP SECRET" not in (payload["answer"] or "")
    assert "full-access run output is only visible" in (payload["answer"] or "")
    assert payload["selectedSecret"] is None
    assert payload["receipt"]["sourceScope"]["documentIds"] == []
    assert payload["sources"], "Expected the run to persist at least one source."
    assert all(source["redacted"] is True for source in payload["sources"])
    assert all("TOP SECRET" not in source["snippet"] for source in payload["sources"])
