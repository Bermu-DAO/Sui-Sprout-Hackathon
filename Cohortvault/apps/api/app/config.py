from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "CohortVault API"
    environment: str = "development"
    attestation_adapter: str = "mock-signed-receipt-v1"
    receipt_runtime_id: str = "cv-runtime-dev-01"
    receipt_signing_key: str = "cohortvault-dev-receipt-signing-key"
    openai_api_key: str = ""
    openai_chat_model: str = "gpt-4o-mini"
    openai_embedding_model: str = "text-embedding-3-small"
    openai_embedding_dimensions: int = 1536
    openai_request_timeout_seconds: float = 30.0
    openai_max_retries: int = 2
    database_url: str = "postgresql://postgres:postgres@localhost:5432/cohortvault"
    database_pool_min_size: int = 1
    database_pool_max_size: int = 6
    database_pool_timeout_seconds: float = 10.0
    storage_backend: str = "local"
    upload_dir: str = "data/uploads"
    storage_object_bucket: str = ""
    storage_object_prefix: str = "documents"
    web_origin: str = "http://localhost:3000"
    session_cookie_name: str = "cohortvault_actor"
    session_signing_key: str = "cohortvault-dev-session-key"
    session_ttl_seconds: int = 86400
    cookie_secure: bool = False
    worker_poll_interval_seconds: float = 1.0
    worker_max_attempts: int = 3
    worker_retry_backoff_seconds: float = 5.0
    rag_chunk_size: int = 1500
    rag_chunk_overlap: int = 200
    rag_snippet_length: int = 600
    retrieval_candidate_limit: int = 12
    retrieval_max_sources: int = 3
    retrieval_log_preview_count: int = 3
    secret_encryption_key: str = ""
    capability_ttl_seconds: int = 120
    capability_signing_key: str = "cohortvault-dev-capability-key"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_prefix="COHORTVAULT_API_",
        extra="ignore",
    )


settings = Settings()
