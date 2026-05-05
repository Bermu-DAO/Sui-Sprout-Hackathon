"""Legacy helper name kept for compatibility.

This script now emits a signed receipt v1 example from the mock adapter, not a
TEE quote or hardware attestation payload.
"""

from json import dumps


def generate_receipt(run_id: str) -> dict[str, str]:
    return {
        "runId": run_id,
        "adapterType": "mock-signed-receipt-v1",
        "runtimeId": "cv-runtime-dev-01",
        "policyHash": "demo-policy-hash",
        "sourcesTouched": "2",
        "secretAccessed": "false",
        "signedAt": "2026-03-21T12:00:00Z",
        "signatureAlgorithm": "mock-hmac-sha256-v1",
        "signature": "demo-signature",
        "verified": "true",
    }


def main() -> None:
    receipt = generate_receipt("run_demo_receipt")
    print(dumps(receipt, indent=2))


if __name__ == "__main__":
    main()
