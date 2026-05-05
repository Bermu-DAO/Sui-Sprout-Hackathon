from hashlib import sha256
from json import dumps


def generate_receipt(run_id: str) -> dict[str, str]:
    payload = {
        "runId": run_id,
        "adapterType": "mock-signed-receipt",
        "runtimeId": "cv-runtime-dev-01",
    }
    payload["signature"] = sha256(dumps(payload, sort_keys=True).encode("utf-8")).hexdigest()
    return payload


def main() -> None:
    receipt = generate_receipt("run_demo_receipt")
    print(dumps(receipt, indent=2))


if __name__ == "__main__":
    main()
