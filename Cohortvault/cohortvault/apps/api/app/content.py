from __future__ import annotations

from hashlib import sha256
from io import BytesIO
from pathlib import Path
import re


def infer_document_type(file_name: str) -> str:
    suffix = Path(file_name).suffix.lower()
    if suffix == ".pdf":
        return "pdf"
    if suffix in {".md", ".markdown"}:
        return "md"
    if suffix in {".ppt", ".pptx", ".key"}:
        return "deck"
    return "note"


def tokenize(text: str) -> list[str]:
    return [token for token in re.findall(r"[a-z0-9]+", text.lower()) if len(token) > 2]


def chunk_text(text: str, chunk_size: int = 280, overlap: int = 60) -> list[str]:
    normalized = " ".join(text.split())
    if not normalized:
        return []

    chunks: list[str] = []
    start = 0
    while start < len(normalized):
        end = min(len(normalized), start + chunk_size)
        chunk = normalized[start:end].strip()
        if chunk:
            chunks.append(chunk)
        if end >= len(normalized):
            break
        start = max(0, end - overlap)
    return chunks


def extract_text(file_name: str, file_bytes: bytes, content_type: str | None) -> str:
    suffix = Path(file_name).suffix.lower()
    if suffix in {".md", ".markdown", ".txt"}:
        try:
            return file_bytes.decode("utf-8")
        except UnicodeDecodeError:
            return file_bytes.decode("utf-8", errors="ignore")

    if suffix == ".pdf" or content_type == "application/pdf":
        try:
            from pypdf import PdfReader

            reader = PdfReader(BytesIO(file_bytes))
            text = "\n".join(page.extract_text() or "" for page in reader.pages).strip()
            if text:
                return text
        except Exception:
            pass

    return (
        f"{Path(file_name).stem} is available in the workspace. Key themes include private collaboration, "
        "delegated secret access, attestation-backed receipts, and reviewable AI workflows."
    )


def compose_answer(prompt: str, output_mode: str, source_names: list[str], secret_name: str | None) -> str:
    document_names = ", ".join(source_names) if source_names else "the indexed workspace corpus"
    themes = {
        "delegated": "delegated secret access instead of copied credentials",
        "receipt": "signed execution receipts that reviewers can inspect",
        "research": "a privacy-first workflow for research-heavy teams",
        "investor": "reviewer-safe outputs for mentors and investors",
        "audit": "an auditable execution trail that survives teammate turnover",
    }
    matched = [summary for token, summary in themes.items() if token in prompt.lower()]
    fallback = [
        "a privacy-first AI workspace for research-heavy teams",
        "reviewable execution with strong provenance",
        "delegated secret usage without exposing raw keys",
    ]
    if not matched:
        matched = fallback.copy()
    while len(matched) < 3:
        matched.append(fallback[len(matched)])

    if output_mode == "summary_only":
        answer = f"Summary: CohortVault should emphasize {matched[0]} and {matched[1]}."
    else:
        answer = (
            f"Based on {document_names}, the strongest wedge is {matched[0]}. The supporting materials reinforce "
            f"{matched[1]} and {matched[2]}."
        )
        if output_mode == "full":
            answer += f" Full mode preserves richer source context for owner review and maps cleanly to {document_names}."

    if secret_name:
        answer += f" This run used the delegated secret reference `{secret_name}` without exposing the underlying value."
    return answer


def build_receipt(run_id: str, output_mode: str, sources_touched: int, secret_accessed: bool, signed_at: str) -> dict:
    payload = f"{run_id}:{output_mode}:{sources_touched}:{secret_accessed}:{signed_at}"
    return {
        "runId": run_id,
        "adapterType": "mock-signed-receipt",
        "runtimeId": "cv-runtime-dev-01",
        "policyHash": sha256(payload.encode("utf-8")).hexdigest()[:16],
        "sourcesTouched": sources_touched,
        "secretAccessed": secret_accessed,
        "signedAt": signed_at,
    }
