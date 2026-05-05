from __future__ import annotations

from app.config import settings
from app.llm import call_embedding

EMBEDDING_DIMENSIONS = settings.openai_embedding_dimensions


def embed_text(text: str) -> list[float]:
    return call_embedding(text)


def vector_literal(values: list[float]) -> str:
    return "[" + ",".join(f"{value:.6f}" for value in values) + "]"
