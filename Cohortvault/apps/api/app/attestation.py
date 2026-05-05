from __future__ import annotations

from abc import ABC, abstractmethod
from hashlib import sha256
import hmac
import json
from typing import Any

from app.config import settings


ReceiptDict = dict[str, Any]

SIGNED_RECEIPT_V1 = "signed-receipt-v1"
MOCK_SIGNED_RECEIPT_V1 = "mock-signed-receipt-v1"
LEGACY_LIGHTWEIGHT_RECEIPT = "lightweight-runtime-receipt"
TEE_PROVIDER_STUB_ADAPTER = "tee-provider-stub"
LEGACY_REAL_TEE_ATTESTATION = "tee-attestation"

LIGHTWEIGHT_SIGNED_RUNTIME = "lightweight-signed-runtime"
TEE_PROVIDER_STUB = "tee-provider-stub"


def _canonical_json(value: Any) -> str:
    return json.dumps(value, sort_keys=True, separators=(",", ":"))


def _sha256_text(value: str) -> str:
    return sha256(value.encode("utf-8")).hexdigest()


def _scope_hash(document_ids: list[str]) -> str:
    normalized_ids = sorted(str(document_id) for document_id in document_ids)
    return _sha256_text(_canonical_json(normalized_ids))


class RuntimeProvider(ABC):
    kind: str
    display_name: str
    execution_class: str
    configured: bool
    remotely_verifiable: bool
    proves_hardware_attestation: bool

    def provider_info(self) -> dict[str, Any]:
        return {
            "kind": self.kind,
            "displayName": self.display_name,
            "configured": self.configured,
            "remotelyVerifiable": self.remotely_verifiable,
            "provesHardwareAttestation": self.proves_hardware_attestation,
        }

    def runtime_metadata(self) -> dict[str, Any]:
        return {
            "runtimeId": settings.receipt_runtime_id,
            "executionClass": self.execution_class,
        }


class LightweightSignedRuntimeProvider(RuntimeProvider):
    kind = LIGHTWEIGHT_SIGNED_RUNTIME
    display_name = "lightweight signed runtime"
    execution_class = "application-runtime"
    configured = True
    remotely_verifiable = True
    proves_hardware_attestation = False


class TeeProviderStub(RuntimeProvider):
    kind = TEE_PROVIDER_STUB
    display_name = "tee-provider stub"
    execution_class = "tee-ready-stub"
    configured = False
    remotely_verifiable = False
    proves_hardware_attestation = False


class PolicyDigester:
    def digest(self, output_mode: str, secret_accessed: bool, provider: RuntimeProvider) -> str:
        policy_material = {
            "outputMode": output_mode,
            "reviewerRedaction": True,
            "secretAccessMode": "delegated-reference" if secret_accessed else "none",
            "receiptVersion": "signed-receipt-v1",
            "providerKind": provider.kind,
            "executionClass": provider.execution_class,
        }
        return _sha256_text(_canonical_json(policy_material))


class ReceiptSigner:
    signature_algorithm = "mock-hmac-sha256-v1"

    def sign(self, payload: dict[str, Any]) -> str:
        return hmac.new(
            settings.receipt_signing_key.encode("utf-8"),
            _canonical_json(payload).encode("utf-8"),
            sha256,
        ).hexdigest()

    def verify(self, payload: dict[str, Any], signature: str, signature_algorithm: str | None) -> bool:
        if signature_algorithm != self.signature_algorithm:
            return False
        expected_signature = self.sign(payload)
        return hmac.compare_digest(expected_signature, signature)


class ReceiptBuilder:
    def __init__(self, adapter_type: str, provider: RuntimeProvider, signer: ReceiptSigner) -> None:
        self.adapter_type = adapter_type
        self.provider = provider
        self.signer = signer
        self.policy_digester = PolicyDigester()

    def build(
        self,
        run_id: str,
        output_mode: str,
        sources: list[dict[str, Any]],
        secret_accessed: bool,
        signed_at: str,
    ) -> ReceiptDict:
        document_ids = sorted({source["documentId"] for source in sources if source.get("documentId")})
        source_scope = {
            "documentIds": document_ids,
            "scopeHash": _scope_hash(document_ids),
        }
        provider_info = self.provider.provider_info()
        runtime_metadata = self.provider.runtime_metadata()
        policy_hash = self.policy_digester.digest(output_mode, secret_accessed, self.provider)
        receipt_payload = {
            "version": "signed-receipt-v1",
            "runId": run_id,
            "outputMode": output_mode,
            "runtimeId": runtime_metadata["runtimeId"],
            "policyHash": policy_hash,
            "sourceScopeHash": source_scope["scopeHash"],
            "sourcesTouched": len(sources),
            "secretAccessed": secret_accessed,
            "signedAt": signed_at,
            "providerInfo": provider_info,
            "runtimeMetadata": runtime_metadata,
        }
        signature = self.signer.sign(receipt_payload)
        receipt: ReceiptDict = {
            "runId": run_id,
            "adapterType": self.adapter_type,
            "runtimeId": runtime_metadata["runtimeId"],
            "runtimeMetadata": runtime_metadata,
            "providerInfo": provider_info,
            "policyHash": policy_hash,
            "sourcesTouched": len(sources),
            "secretAccessed": secret_accessed,
            "signedAt": signed_at,
            "receiptPayload": receipt_payload,
            "signature": signature,
            "signatureAlgorithm": self.signer.signature_algorithm,
            "sourceScope": source_scope,
        }
        receipt["verified"] = verify_receipt(receipt)
        return receipt

    def verify(self, receipt: ReceiptDict) -> bool:
        payload = receipt.get("receiptPayload")
        signature = receipt.get("signature")
        source_scope = receipt.get("sourceScope")
        provider_info = receipt.get("providerInfo")
        runtime_metadata = receipt.get("runtimeMetadata")
        if not isinstance(payload, dict) or not isinstance(signature, str) or not isinstance(source_scope, dict):
            return False
        if not isinstance(provider_info, dict) or not isinstance(runtime_metadata, dict):
            return False

        document_ids = source_scope.get("documentIds")
        scope_hash = source_scope.get("scopeHash")
        if not isinstance(document_ids, list) or not isinstance(scope_hash, str):
            return False
        if scope_hash != _scope_hash([str(document_id) for document_id in document_ids]):
            return False
        if payload.get("sourceScopeHash") != scope_hash:
            return False
        if payload.get("runId") != receipt.get("runId"):
            return False
        if payload.get("runtimeId") != receipt.get("runtimeId"):
            return False
        if payload.get("policyHash") != receipt.get("policyHash"):
            return False
        if payload.get("sourcesTouched") != receipt.get("sourcesTouched"):
            return False
        if payload.get("secretAccessed") != receipt.get("secretAccessed"):
            return False
        if payload.get("signedAt") != receipt.get("signedAt"):
            return False
        if payload.get("providerInfo") != provider_info:
            return False
        if payload.get("runtimeMetadata") != runtime_metadata:
            return False
        return self.signer.verify(payload, signature, receipt.get("signatureAlgorithm"))


class AttestationAdapter(ABC):
    adapter_type: str

    @abstractmethod
    def issue_receipt(
        self,
        run_id: str,
        output_mode: str,
        sources: list[dict[str, Any]],
        secret_accessed: bool,
        signed_at: str,
    ) -> ReceiptDict:
        raise NotImplementedError

    @abstractmethod
    def verify_receipt(self, receipt: ReceiptDict) -> bool:
        raise NotImplementedError


class MockSignedReceiptAdapter(AttestationAdapter):
    adapter_type = MOCK_SIGNED_RECEIPT_V1

    def __init__(self) -> None:
        self.provider = LightweightSignedRuntimeProvider()
        self.signer = ReceiptSigner()
        self.builder = ReceiptBuilder(self.adapter_type, self.provider, self.signer)

    def issue_receipt(
        self,
        run_id: str,
        output_mode: str,
        sources: list[dict[str, Any]],
        secret_accessed: bool,
        signed_at: str,
    ) -> ReceiptDict:
        return self.builder.build(run_id, output_mode, sources, secret_accessed, signed_at)

    def verify_receipt(self, receipt: ReceiptDict) -> bool:
        return self.builder.verify(receipt)


class TEEProviderStubAdapter(AttestationAdapter):
    adapter_type = TEE_PROVIDER_STUB_ADAPTER

    def __init__(self) -> None:
        self.provider = TeeProviderStub()
        self.signer = ReceiptSigner()
        self.builder = ReceiptBuilder(self.adapter_type, self.provider, self.signer)

    def issue_receipt(
        self,
        run_id: str,
        output_mode: str,
        sources: list[dict[str, Any]],
        secret_accessed: bool,
        signed_at: str,
    ) -> ReceiptDict:
        return self.builder.build(run_id, output_mode, sources, secret_accessed, signed_at)

    def verify_receipt(self, receipt: ReceiptDict) -> bool:
        return self.builder.verify(receipt)


class RealTEEAttestationAdapter(TEEProviderStubAdapter):
    """Backward-compatible stub adapter. Real SGX/Nitro/dstack provider wiring is not implemented."""


def _legacy_provider_info(adapter_type: str, runtime_id: str) -> tuple[dict[str, Any], dict[str, Any]]:
    if adapter_type == MOCK_SIGNED_RECEIPT_V1:
        provider = LightweightSignedRuntimeProvider()
    else:
        provider = TeeProviderStub()
    runtime_metadata = provider.runtime_metadata()
    runtime_metadata["runtimeId"] = runtime_id
    return provider.provider_info(), runtime_metadata


def get_attestation_adapter(adapter_type: str | None = None) -> AttestationAdapter:
    resolved = adapter_type or settings.attestation_adapter
    if resolved == MOCK_SIGNED_RECEIPT_V1:
        return MockSignedReceiptAdapter()
    if resolved in {TEE_PROVIDER_STUB_ADAPTER, LEGACY_REAL_TEE_ATTESTATION}:
        return TEEProviderStubAdapter()
    raise ValueError(f"Unsupported attestation adapter: {resolved}")


def hydrate_receipt_metadata(receipt: ReceiptDict) -> ReceiptDict:
    payload = receipt.get("receiptPayload")
    if not isinstance(payload, dict):
        return receipt

    provider_info = payload.get("providerInfo")
    runtime_metadata = payload.get("runtimeMetadata")
    if not isinstance(provider_info, dict) or not isinstance(runtime_metadata, dict):
        legacy_provider_info, legacy_runtime_metadata = _legacy_provider_info(
            str(receipt.get("adapterType")),
            str(receipt.get("runtimeId")),
        )
        if not isinstance(provider_info, dict):
            provider_info = legacy_provider_info
        if not isinstance(runtime_metadata, dict):
            runtime_metadata = legacy_runtime_metadata

    hydrated = dict(receipt)
    hydrated["providerInfo"] = provider_info
    hydrated["runtimeMetadata"] = runtime_metadata
    return hydrated


def verify_receipt(receipt: ReceiptDict) -> bool:
    adapter_type = receipt.get("adapterType")
    if not isinstance(adapter_type, str):
        return False

    try:
        adapter = get_attestation_adapter(adapter_type)
        return adapter.verify_receipt(hydrate_receipt_metadata(receipt))
    except ValueError:
        if adapter_type == LEGACY_LIGHTWEIGHT_RECEIPT:
            return False
        return False
