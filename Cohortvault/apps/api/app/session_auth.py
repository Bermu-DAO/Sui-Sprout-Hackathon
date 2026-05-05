from __future__ import annotations

from base64 import urlsafe_b64decode, urlsafe_b64encode
from datetime import datetime, timedelta, timezone
from hashlib import sha256
import hmac
import json

from app.config import settings


def _canonical_json(value: dict[str, str]) -> str:
    return json.dumps(value, sort_keys=True, separators=(",", ":"))


def _sign(payload_json: str) -> str:
    return hmac.new(
        settings.session_signing_key.encode("utf-8"),
        payload_json.encode("utf-8"),
        sha256,
    ).hexdigest()


def _utc_now() -> datetime:
    return datetime.now(timezone.utc).replace(microsecond=0)


def _to_iso(value: datetime) -> str:
    return value.astimezone(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def issue_demo_session(actor_id: str) -> str:
    issued_at = _utc_now()
    expires_at = issued_at + timedelta(seconds=settings.session_ttl_seconds)
    payload = {
        "version": "demo-session-v1",
        "actorId": actor_id,
        "issuedAt": _to_iso(issued_at),
        "expiresAt": _to_iso(expires_at),
    }
    payload_json = _canonical_json(payload)
    payload_b64 = urlsafe_b64encode(payload_json.encode("utf-8")).decode("utf-8")
    return f"{payload_b64}.{_sign(payload_json)}"


def verify_demo_session(token: str) -> dict[str, str]:
    try:
        payload_b64, signature = token.split(".", 1)
    except ValueError as error:
        raise ValueError("Session token is malformed.") from error

    try:
        payload_json = urlsafe_b64decode(payload_b64.encode("utf-8")).decode("utf-8")
    except Exception as error:
        raise ValueError("Session token payload could not be decoded.") from error

    expected_signature = _sign(payload_json)
    if not hmac.compare_digest(expected_signature, signature):
        raise ValueError("Session token signature is invalid.")

    payload = json.loads(payload_json)
    if not isinstance(payload, dict):
        raise ValueError("Session token payload is invalid.")

    required_fields = {"version", "actorId", "issuedAt", "expiresAt"}
    if not required_fields.issubset(payload.keys()):
        raise ValueError("Session token payload is missing required fields.")

    if payload["version"] != "demo-session-v1":
        raise ValueError("Session token version is not supported.")

    expires_at = datetime.fromisoformat(str(payload["expiresAt"]).replace("Z", "+00:00"))
    if expires_at <= _utc_now():
        raise ValueError("Session token has expired.")

    return {key: str(value) for key, value in payload.items()}
