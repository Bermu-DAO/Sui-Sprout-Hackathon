from __future__ import annotations

from io import BytesIO
from pathlib import Path
import re

from app.llm import call_chat


class DocumentParseError(ValueError):
    pass


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


def chunk_text(text: str, chunk_size: int = 1500, overlap: int = 200) -> list[str]:
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
            text = file_bytes.decode("utf-8")
        except UnicodeDecodeError:
            text = file_bytes.decode("utf-8", errors="ignore")
        if not text.strip():
            raise DocumentParseError(f"{Path(file_name).name} is empty after decoding. Upload a non-empty markdown or text file.")
        return text

    if suffix == ".pdf" or content_type == "application/pdf":
        try:
            from pypdf import PdfReader

            reader = PdfReader(BytesIO(file_bytes))
            text = "\n".join(page.extract_text() or "" for page in reader.pages).strip()
            if text:
                return text
            raise DocumentParseError(
                f"{Path(file_name).name} did not produce readable PDF text. Upload a text-based PDF or convert it to markdown."
            )
        except DocumentParseError:
            raise
        except Exception as error:
            raise DocumentParseError(
                f"PDF extraction failed for {Path(file_name).name}: {error.__class__.__name__}. Upload a text-based PDF or convert it to markdown."
            ) from error

    return (
        f"{Path(file_name).stem} is available in the workspace. Key themes include private collaboration, "
        "delegated secret access, signed receipt v1 records, and reviewable AI workflows."
    )


def compose_answer(
    prompt: str,
    output_mode: str,
    sources: list[dict],
    selected_secret_name: str | None,
    secret_available: bool = False,
) -> str:
    if output_mode == "summary_only":
        system_prompt = "You are operating in Secure Run mode. Return only a concise summary. Do not reveal raw source content or secrets."
    elif output_mode == "redacted":
        system_prompt = "You are operating in Secure Run mode. You may reference document names but redact sensitive details."
    elif output_mode == "full":
        system_prompt = "You are operating in full-access mode. Provide a complete answer with source citations."
    else:
        raise ValueError("Output mode must be summary_only, redacted, or full.")

    context_lines: list[str] = []
    if sources:
        for index, source in enumerate(sources, start=1):
            context_lines.append(
                "\n".join(
                    [
                        f"[{source.get('citation', f'S{index}')}] Document: {source['documentName']}",
                        f"Visibility: {source['visibility']}",
                        f"Redacted: {'yes' if source['redacted'] else 'no'}",
                        f"Rank: {source.get('rank', index)}",
                        f"Snippet: {source['snippet']}",
                    ]
                )
            )
    else:
        context_lines.append("[1] No indexed sources were retrieved for this run.")

    user_message = "\n\n".join(
        [
            f"User prompt:\n{prompt}",
            "Retrieved context:\n" + "\n\n".join(context_lines),
        ]
    )
    if selected_secret_name:
        if secret_available:
            user_message += (
                f"\n\nThis run has access to a live credential delegated as `{selected_secret_name}`. "
                "The credential has been verified as active. Do not reveal its raw value in your response."
            )
        else:
            user_message += (
                f"\n\nThis run references the secret `{selected_secret_name}` but no credential value was stored. "
                "Proceed without making live API calls."
            )

    return call_chat(system_prompt, user_message)
