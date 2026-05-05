from __future__ import annotations

from openai import OpenAI

from app.config import settings


def _client() -> OpenAI:
    if not settings.openai_api_key:
        raise RuntimeError("COHORTVAULT_API_OPENAI_API_KEY is not configured.")
    return OpenAI(
        api_key=settings.openai_api_key,
        timeout=settings.openai_request_timeout_seconds,
        max_retries=settings.openai_max_retries,
    )


def call_chat(system_prompt: str, user_prompt: str) -> str:
    response = _client().chat.completions.create(
        model=settings.openai_chat_model,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
    )
    content = response.choices[0].message.content
    if not content:
        raise RuntimeError("OpenAI chat completion returned no content.")
    return content


def call_embedding(text: str) -> list[float]:
    response = _client().embeddings.create(
        model=settings.openai_embedding_model,
        input=text,
        dimensions=settings.openai_embedding_dimensions,
    )
    return list(response.data[0].embedding)
