from __future__ import annotations

from collections.abc import Generator
import os
from pathlib import Path
from uuid import uuid4

import psycopg
import pytest
from fastapi.testclient import TestClient


ROOT = Path(__file__).resolve().parents[3]


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

# --- Late imports: must come after load_env_file() sets COHORTVAULT_API_* ---
# These imports trigger pydantic-settings to read Settings(), which reads env vars.
# Moving them above load_env_file() would cause Settings() to use default values.
from app.main import app  # noqa: E402
import app.content as content  # noqa: E402
import app.store_postgres as store_postgres  # noqa: E402
from app.config import settings  # noqa: E402


def _switch_actor(client: TestClient, actor_id: str) -> None:
    response = client.post("/api/v1/session/actor", json={"actorId": actor_id})
    assert response.status_code == 200, response.text


@pytest.fixture(scope="session", autouse=True)
def require_postgres() -> Generator[None, None, None]:
    database_url = os.environ.get("COHORTVAULT_API_DATABASE_URL", "").strip() or settings.database_url
    if not database_url:
        pytest.skip("COHORTVAULT_API_DATABASE_URL is not set. Configure a reachable Postgres instance to run API tests.")

    try:
        with psycopg.connect(database_url, connect_timeout=3) as conn:
            conn.execute("select 1")
    except Exception as error:
        pytest.skip(f"Postgres is not reachable for API tests: {error}")
    yield


@pytest.fixture(scope="function")
def client(monkeypatch: pytest.MonkeyPatch, require_postgres: None) -> Generator[TestClient, None, None]:
    monkeypatch.setattr(content, "call_chat", lambda system_prompt, user_prompt: f"Synthetic Secure Run answer for tests.\n{user_prompt}")
    monkeypatch.setattr(store_postgres, "embed_text", lambda text: [0.0] * settings.openai_embedding_dimensions)

    with TestClient(app) as test_client:
        session = test_client.get("/api/v1/session")
        assert session.status_code == 200, session.text
        _switch_actor(test_client, "usr_owner")
        yield test_client


@pytest.fixture(scope="function")
def workspace_ref(client: TestClient) -> Generator[str, None, None]:
    suffix = uuid4().hex[:8]
    response = client.post(
        "/api/v1/workspaces",
        json={
            "name": f"Test Workspace {suffix}",
            "useCase": "Unit test workspace",
            "secureModeDefault": True,
        },
    )
    assert response.status_code == 200, response.text
    workspace_slug = response.json()["slug"]

    builder_invite = client.post(
        f"/api/v1/workspaces/{workspace_slug}/invite",
        json={"email": "builder@cohortvault.dev", "role": "builder"},
    )
    assert builder_invite.status_code == 200, builder_invite.text

    reviewer_invite = client.post(
        f"/api/v1/workspaces/{workspace_slug}/invite",
        json={"email": "reviewer@cohortvault.dev", "role": "reviewer"},
    )
    assert reviewer_invite.status_code == 200, reviewer_invite.text

    yield workspace_slug

    _switch_actor(client, "usr_owner")
    cleanup = client.delete(f"/api/v1/workspaces/{workspace_slug}")
    assert cleanup.status_code in {204, 404}, cleanup.text
