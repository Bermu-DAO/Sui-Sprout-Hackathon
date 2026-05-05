from __future__ import annotations

from fastapi.testclient import TestClient

from app.config import settings


def create_secret(client: TestClient, workspace_ref: str) -> str:
    response = client.post(
        f"/api/v1/workspaces/{workspace_ref}/secrets",
        json={"name": "delegated_secret", "provider": "OpenAI", "scope": "research"},
    )
    assert response.status_code == 200, response.text
    return response.json()["id"]


def issue_capability(client: TestClient, workspace_ref: str, secret_id: str) -> dict:
    response = client.post(f"/api/v1/workspaces/{workspace_ref}/secrets/{secret_id}/capabilities")
    assert response.status_code == 200, response.text
    return response.json()


def test_revoked_secret_denies_run(client: TestClient, workspace_ref: str) -> None:
    secret_id = create_secret(client, workspace_ref)
    capability = issue_capability(client, workspace_ref, secret_id)

    initial_run = client.post(
        f"/api/v1/workspaces/{workspace_ref}/runs/secure",
        json={
            "prompt": "Summarize the research flow.",
            "outputMode": "redacted",
            "capabilityToken": capability["token"],
        },
    )
    assert initial_run.status_code == 200, initial_run.text

    second_capability = issue_capability(client, workspace_ref, secret_id)
    revoked = client.post(f"/api/v1/workspaces/{workspace_ref}/secrets/{secret_id}/revoke")
    assert revoked.status_code == 200, revoked.text
    assert revoked.json()["status"] == "revoked"

    denied = client.post(
        f"/api/v1/workspaces/{workspace_ref}/runs/secure",
        json={
            "prompt": "Try the same run again.",
            "outputMode": "redacted",
            "capabilityToken": second_capability["token"],
        },
    )
    assert denied.status_code == 403, denied.text
    assert "revoked" in denied.json()["detail"].lower()

    audit = client.get(f"/api/v1/workspaces/{workspace_ref}/audit?limit=50&offset=0")
    assert audit.status_code == 200, audit.text
    event_types = {event["eventType"] for event in audit.json()["items"]}
    assert {"secret.added", "capability.issued", "secret.revoked", "run.denied"}.issubset(event_types)


def test_active_secret_run_creates_receipt(client: TestClient, workspace_ref: str) -> None:
    secret_id = create_secret(client, workspace_ref)
    capability = issue_capability(client, workspace_ref, secret_id)

    run = client.post(
        f"/api/v1/workspaces/{workspace_ref}/runs/secure",
        json={
            "prompt": "Prepare a redacted investor summary.",
            "outputMode": "redacted",
            "capabilityToken": capability["token"],
        },
    )
    assert run.status_code == 200, run.text
    run_id = run.json()["runId"]

    receipt = client.get(f"/api/v1/workspaces/{workspace_ref}/receipts/{run_id}")
    assert receipt.status_code == 200, receipt.text
    assert receipt.json()["secretAccessed"] is True

    audit = client.get(f"/api/v1/workspaces/{workspace_ref}/audit?limit=50&offset=0")
    assert audit.status_code == 200, audit.text
    event_types = {event["eventType"] for event in audit.json()["items"]}
    assert {"secret.added", "capability.issued", "capability.used"}.issubset(event_types)


def test_expired_capability_denies_run(client: TestClient, workspace_ref: str, monkeypatch) -> None:
    secret_id = create_secret(client, workspace_ref)
    monkeypatch.setattr(settings, "capability_ttl_seconds", -1)
    capability = issue_capability(client, workspace_ref, secret_id)

    run = client.post(
        f"/api/v1/workspaces/{workspace_ref}/runs/secure",
        json={
            "prompt": "Try an expired capability.",
            "outputMode": "redacted",
            "capabilityToken": capability["token"],
        },
    )
    assert run.status_code == 403, run.text
    assert "expired" in run.json()["detail"].lower()


def test_no_encryption_key_rejects_secret_value(client: TestClient, workspace_ref: str, monkeypatch) -> None:
    monkeypatch.setattr(settings, "secret_encryption_key", "")
    before = client.get(f"/api/v1/workspaces/{workspace_ref}/secrets?limit=100&offset=0")
    assert before.status_code == 200, before.text

    response = client.post(
        f"/api/v1/workspaces/{workspace_ref}/secrets",
        json={
            "name": "plaintext_attempt",
            "provider": "OpenAI",
            "scope": "research",
            "secretValue": "sk-test-plaintext",
        },
    )
    assert response.status_code == 400, response.text
    assert "refusing to store plaintext" in response.json()["detail"].lower()

    after = client.get(f"/api/v1/workspaces/{workspace_ref}/secrets?limit=100&offset=0")
    assert after.status_code == 200, after.text
    assert after.json()["total"] == before.json()["total"]
