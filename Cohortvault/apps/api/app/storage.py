from __future__ import annotations

from pathlib import Path
from typing import Protocol
from uuid import uuid4

from app.config import settings


class StorageAdapter(Protocol):
    adapter_type: str

    def save(self, file_name: str, file_bytes: bytes) -> str: ...

    def read(self, locator: str) -> bytes: ...

    def delete(self, locator: str) -> None: ...


class LocalStorageAdapter:
    adapter_type = "local"

    def __init__(self) -> None:
        self.root = Path(__file__).resolve().parent.parent / settings.upload_dir
        self.root.mkdir(parents=True, exist_ok=True)

    def save(self, file_name: str, file_bytes: bytes) -> str:
        safe_name = Path(file_name).name
        stored_name = f"{uuid4().hex}_{safe_name}"
        destination = self.root / stored_name
        destination.write_bytes(file_bytes)
        return f"local://{stored_name}"

    def read(self, locator: str) -> bytes:
        return self._resolve(locator).read_bytes()

    def delete(self, locator: str) -> None:
        path = self._resolve(locator)
        if path.exists() and path.is_file():
            path.unlink()

    def _resolve(self, locator: str) -> Path:
        if locator.startswith("local://"):
            return self.root / locator.removeprefix("local://")

        path = Path(locator)
        if path.is_absolute():
            return path
        return self.root.parent / path


class ObjectStorageAdapter:
    adapter_type = "object"

    def save(self, file_name: str, file_bytes: bytes) -> str:
        raise RuntimeError("Object storage adapter is not implemented in the current hackathon build.")

    def read(self, locator: str) -> bytes:
        raise RuntimeError("Object storage adapter is not implemented in the current hackathon build.")

    def delete(self, locator: str) -> None:
        raise RuntimeError("Object storage adapter is not implemented in the current hackathon build.")


def get_storage_adapter() -> StorageAdapter:
    if settings.storage_backend == "local":
        return LocalStorageAdapter()
    if settings.storage_backend == "object":
        return ObjectStorageAdapter()
    raise RuntimeError(f"Unsupported storage backend: {settings.storage_backend}")
