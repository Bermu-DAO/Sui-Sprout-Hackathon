from __future__ import annotations

from fastapi.testclient import TestClient

from app.config import settings
from app.store import list_jobs, process_pending_jobs


def upload_markdown_document(client: TestClient, workspace_ref: str, display_name: str = "Worker Notes") -> dict:
    response = client.post(
        f"/api/v1/workspaces/{workspace_ref}/documents",
        data={"visibility": "workspace", "display_name": display_name},
        files={"file": ("worker-notes.md", b"# Notes\nPrivate retrieval and audit logs.\n", "text/markdown")},
    )
    assert response.status_code == 200, response.text
    return response.json()


def test_worker_processes_upload_job(client: TestClient, workspace_ref: str) -> None:
    document = upload_markdown_document(client, workspace_ref)
    assert document["status"] == "uploaded"

    processed = process_pending_jobs(limit=5)
    assert processed, "Expected at least one queued ingestion job."
    assert processed[0]["status"] == "completed"
    assert processed[0]["documentStatus"] == "indexed"
    assert processed[0]["durationMs"] >= 0

    documents = client.get(f"/api/v1/workspaces/{workspace_ref}/documents?limit=100&offset=0")
    assert documents.status_code == 200, documents.text
    updated = next(item for item in documents.json()["items"] if item["id"] == document["id"])
    assert updated["status"] == "indexed"
    assert updated["chunkCount"] > 0


def test_reindex_queues_new_job(client: TestClient, workspace_ref: str) -> None:
    document = upload_markdown_document(client, workspace_ref, "Reindex Notes")
    process_pending_jobs(limit=5)

    before = [job for job in list_jobs() if job.get("document_id") == document["id"]]
    assert before, "Expected the initial upload to create a job."

    reindex = client.post(f"/api/v1/workspaces/{workspace_ref}/documents/{document['id']}/reindex")
    assert reindex.status_code == 200, reindex.text

    after = [job for job in list_jobs() if job.get("document_id") == document["id"]]
    assert len(after) == len(before) + 1
    assert any(job["status"] == "queued" for job in after)


def test_worker_retries_then_fails_bad_pdf(client: TestClient, workspace_ref: str, monkeypatch) -> None:
    monkeypatch.setattr(settings, "worker_max_attempts", 2)
    monkeypatch.setattr(settings, "worker_retry_backoff_seconds", 0.0)

    upload = client.post(
        f"/api/v1/workspaces/{workspace_ref}/documents",
        data={"visibility": "workspace", "display_name": "Broken PDF"},
        files={"file": ("broken.pdf", b"%PDF-1.4\nthis-is-not-a-real-pdf\n", "application/pdf")},
    )
    assert upload.status_code == 200, upload.text
    document = upload.json()

    first_attempt = process_pending_jobs(limit=1)
    assert first_attempt, "Expected first ingestion attempt."
    assert first_attempt[0]["status"] == "retried"
    assert first_attempt[0]["documentStatus"] == "uploaded"

    second_attempt = process_pending_jobs(limit=1)
    assert second_attempt, "Expected second ingestion attempt."
    assert second_attempt[0]["status"] == "failed"
    assert second_attempt[0]["documentStatus"] == "failed"

    documents = client.get(f"/api/v1/workspaces/{workspace_ref}/documents?limit=100&offset=0")
    assert documents.status_code == 200, documents.text
    updated = next(item for item in documents.json()["items"] if item["id"] == document["id"])
    assert updated["status"] == "failed"
    assert updated["lastError"]

    jobs = [job for job in list_jobs() if job.get("document_id") == document["id"]]
    assert jobs
    assert jobs[-1]["status"] == "failed"
    assert jobs[-1]["attempts"] == 2
