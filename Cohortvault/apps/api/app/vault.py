# pyright: reportMissingImports=false
# pyright: reportMissingModuleSource=false

from __future__ import annotations

from app.config import settings


def _get_fernet():
    # cryptography is a runtime dependency listed in pyproject.toml.
    # Type stubs are not available in all environments; errors here are false positives.
    try:
        from cryptography.fernet import Fernet
    except ModuleNotFoundError as error:
        raise RuntimeError(
            "cryptography is not installed. Run `python -m pip install -e apps/api` in a Python environment that allows dependency installs."
        ) from error

    key = settings.secret_encryption_key
    if not key:
        raise RuntimeError(
            "COHORTVAULT_API_SECRET_ENCRYPTION_KEY is not set. "
            "Generate one with: python -c \"from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())\""
        )
    return Fernet(key.encode() if isinstance(key, str) else key)


def encrypt_secret(plaintext: str) -> str:
    """Encrypt a secret value. Returns a base64url-encoded ciphertext string."""
    return _get_fernet().encrypt(plaintext.encode()).decode()


def decrypt_secret(ciphertext: str) -> str:
    """Decrypt a secret value. Raises ValueError on invalid token."""
    try:
        from cryptography.fernet import InvalidToken
    except ModuleNotFoundError as error:
        raise RuntimeError(
            "cryptography is not installed. Run `python -m pip install -e apps/api` in a Python environment that allows dependency installs."
        ) from error

    try:
        return _get_fernet().decrypt(ciphertext.encode()).decode()
    except InvalidToken as error:
        raise ValueError("Secret decryption failed: invalid token or wrong key.") from error
