"""Configuration settings for the Loan Origination System backend."""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "LOS Underwriter Service"
    app_version: str = "1.1.0"
    debug: bool = False

    # Google Gemini & Vertex AI Settings
    gemini_api_key: str | None = None
    google_genai_use_vertexai: bool = False
    gcp_project: str = "adhish-base-project-1"
    gcp_location: str = "us-central1"
    model_name: str = "gemini-3.8-flash"
    model_name_lite: str = "gemini-3.5-flash-lite"

    # Underwriting Policy Version
    policy_version: str = "v2026.10.1"

    # A2A Endpoints
    bureau_a2a_url: str = "http://localhost:8000/a2a/credit_bureau"
    los_underwriter_a2a_url: str = "http://localhost:8000/a2a/los_underwriter"

    # CORS Origins
    cors_origins: list[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
    ]

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
