from __future__ import annotations

from fastapi.testclient import TestClient

from app.attestation import TEE_PROVIDER_STUB_ADAPTER, get_attestation_adapter, verify_receipt
from app.config import settings
from app.store import process_pending_jobs

from .test_worker import upload_markdown_document


def _run_with_indexed_document(client: TestClient, workspace_ref: str) -> tuple[dict, dict]:
    document = upload_markdown_document(client, workspace_ref, "Receipt Notes")
    process_pending_jobs(limit=5)

    run = client.post(
        f"/api/v1/workspaces/{workspace_ref}/runs/secure",
        json={
            "prompt": "Summarize the receipt notes and keep the answer redacted.",
            "outputMode": "redacted",
        },
    )
    assert run.status_code == 200, run.text
    return document, run.json()


def test_secure_run_generates_signed_receipt_v1(client: TestClient, workspace_ref: str) -> None:
    _, run = _run_with_indexed_document(client, workspace_ref)

    receipt = run["receipt"]
    assert receipt["adapterType"] == "mock-signed-receipt-v1"
    assert receipt["providerInfo"]["kind"] == "lightweight-signed-runtime"
    assert receipt["providerInfo"]["displayName"] == "lightweight signed runtime"
    assert receipt["providerInfo"]["provesHardwareAttestation"] is False
    assert receipt["signature"]
    assert receipt["signatureAlgorithm"] == "mock-hmac-sha256-v1"
    assert receipt["receiptPayload"]["version"] == "signed-receipt-v1"
    assert receipt["verified"] is True


def test_receipt_signature_verification_detects_tampering(client: TestClient, workspace_ref: str) -> None:
    _, run = _run_with_indexed_document(client, workspace_ref)

    receipt = run["receipt"]
    assert verify_receipt(receipt) is True

    tampered = {**receipt, "policyHash": "tampered-policy-hash"}
    assert verify_receipt(tampered) is False


def test_receipt_source_scope_persists_document_ids(client: TestClient, workspace_ref: str) -> None:
    document, run = _run_with_indexed_document(client, workspace_ref)
    run_id = run["runId"]

    receipt_response = client.get(f"/api/v1/workspaces/{workspace_ref}/receipts/{run_id}")
    assert receipt_response.status_code == 200, receipt_response.text
    receipt = receipt_response.json()

    assert receipt["sourceScope"] is not None
    assert document["id"] in receipt["sourceScope"]["documentIds"]
    assert receipt["sourceScope"]["scopeHash"]

    run_detail = client.get(f"/api/v1/workspaces/{workspace_ref}/runs/{run_id}")
    assert run_detail.status_code == 200, run_detail.text
    source_ids = {source["documentId"] for source in run_detail.json()["sources"]}
    assert set(receipt["sourceScope"]["documentIds"]).issubset(source_ids)


def test_run_sources_include_stable_citation_metadata(client: TestClient, workspace_ref: str) -> None:
    _, run = _run_with_indexed_document(client, workspace_ref)
    run_id = run["runId"]

    run_detail = client.get(f"/api/v1/workspaces/{workspace_ref}/runs/{run_id}")
    assert run_detail.status_code == 200, run_detail.text
    sources = run_detail.json()["sources"]
    assert sources
    assert all(source["citation"] for source in sources)
    assert all(source["rank"] >= 1 for source in sources)


def test_tee_provider_stub_receipt_has_no_quote_like_fields(monkeypatch) -> None:
    monkeypatch.setattr(settings, "attestation_adapter", TEE_PROVIDER_STUB_ADAPTER)
    receipt = get_attestation_adapter().issue_receipt(
        "run_stub_receipt",
        "redacted",
        [{"documentId": "doc_1", "documentName": "Stub Notes"}],
        False,
        "2026-03-21T10:00:00Z",
    )

    assert receipt["providerInfo"]["kind"] == "tee-provider-stub"
    assert receipt["providerInfo"]["displayName"] == "tee-provider stub"
    assert receipt["providerInfo"]["configured"] is False
    assert receipt["providerInfo"]["provesHardwareAttestation"] is False
    assert receipt["runtimeMetadata"]["executionClass"] == "tee-ready-stub"
    assert "quote" not in receipt
    assert "quote" not in receipt["receiptPayload"]
