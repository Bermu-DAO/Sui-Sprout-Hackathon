from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "CohortVault API"
    environment: str = "development"
    attestation_adapter: str = "mock-signed-receipt"
    database_backend: str = "postgres"
    database_url: str = "postgresql://postgres:postgres@localhost:5432/cohortvault"
    database_pool_min_size: int = 1
    database_pool_max_size: int = 6
    database_pool_timeout_seconds: float = 10.0
    database_path: str = "data/cohortvault.sqlite3"
    upload_dir: str = "data/uploads"
    web_origin: str = "http://localhost:3000"
    session_cookie_name: str = "cohortvault_actor"
    worker_poll_interval_seconds: float = 1.0

    model_config = SettingsConfigDict(
        env_file=".env",
        env_prefix="COHORTVAULT_API_",
        extra="ignore",
    )


settings = Settings()
