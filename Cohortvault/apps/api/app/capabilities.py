from __future__ import annotations

from base64 import urlsafe_b64decode, urlsafe_b64encode
from hashlib import sha256
import hmac
import json
from typing import Any

from app.config import settings


def _canonical_json(value: Any) -> str:
    return json.dumps(value, sort_keys=True, separators=(",", ":"))


def _sign(payload_json: str) -> str:
    return hmac.new(
        settings.capability_signing_key.encode("utf-8"),
        payload_json.encode("utf-8"),
        sha256,
    ).hexdigest()


def token_hash(token: str) -> str:
    return sha256(token.encode("utf-8")).hexdigest()


def build_capability_payload(
    capability_id: str,
    workspace_id: str,
    secret_id: str,
    scope: str,
    issued_to_user_id: str,
    issued_at: str,
    expires_at: str,
) -> dict[str, str]:
    return {
        "version": "capability-v1",
        "capabilityId": capability_id,
        "workspaceId": workspace_id,
        "secretId": secret_id,
        "scope": scope,
        "issuedToUserId": issued_to_user_id,
        "issuedAt": issued_at,
        "expiresAt": expires_at,
    }


def issue_capability_token(payload: dict[str, str]) -> str:
    payload_json = _canonical_json(payload)
    payload_b64 = urlsafe_b64encode(payload_json.encode("utf-8")).decode("utf-8")
    signature = _sign(payload_json)
    return f"{payload_b64}.{signature}"


def decode_capability_token(token: str) -> dict[str, str]:
    try:
        payload_b64, signature = token.split(".", 1)
    except ValueError as error:
        raise ValueError("Capability token is malformed.") from error

    try:
        payload_json = urlsafe_b64decode(payload_b64.encode("utf-8")).decode("utf-8")
    except Exception as error:
        raise ValueError("Capability token payload could not be decoded.") from error

    expected_signature = _sign(payload_json)
    if not hmac.compare_digest(expected_signature, signature):
        raise ValueError("Capability token signature is invalid.")

    payload = json.loads(payload_json)
    if not isinstance(payload, dict):
        raise ValueError("Capability token payload is invalid.")

    required_fields = {
        "version",
        "capabilityId",
        "workspaceId",
        "secretId",
        "scope",
        "issuedToUserId",
        "issuedAt",
        "expiresAt",
    }
    if not required_fields.issubset(payload.keys()):
        raise ValueError("Capability token payload is missing required fields.")

    return {key: str(value) for key, value in payload.items()}
