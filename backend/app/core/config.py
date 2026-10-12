"""
Application configuration.

Reads from the .env file at the monorepo root and validates all variables
at import time. If anything is missing or malformed, the app fails loudly at
startup — which is what we want: fail fast, not at request time.

Usage anywhere in the app:
    from app.core.config import settings
    print(settings.JWT_SECRET_KEY)
"""

from functools import lru_cache
from typing import List

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Typed application settings loaded from .env."""

    model_config = SettingsConfigDict(
        env_file=("../.env", ".env"),   # try monorepo root first, then backend-local
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    # ---- Runtime ----
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    LOG_LEVEL: str = "INFO"

    # ---- API server ----
    API_HOST: str = "0.0.0.0"
    API_PORT: int = 8000
    CORS_ORIGINS: List[str] = Field(
        default_factory=lambda: [
            "http://localhost:8081",   # Expo web dev server
            "http://localhost:19006",  # Expo web legacy
            "http://localhost:3000",
        ]
    )

    # ---- Database ----
    # Async URL for FastAPI. Sync URL for Alembic (though we use async there too).
    DATABASE_URL: str
    DATABASE_URL_SYNC: str | None = None

    # ---- JWT ----
    JWT_SECRET_KEY: str
    JWT_REFRESH_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # ---- Email (MailHog in dev) ----
    MAIL_HOST: str = "localhost"
    MAIL_PORT: int = 1025
    MAIL_USERNAME: str | None = None
    MAIL_PASSWORD: str | None = None
    MAIL_FROM: str = "noreply@bersabehclinic.com"
    MAIL_FROM_NAME: str = "Bersabeh Clinic"
    MAIL_USE_TLS: bool = False

    # ---- File uploads ----
    UPLOAD_DIR: str = "./uploads"
    MAX_IMAGE_MB: int = 10
    MAX_PDF_MB: int = 25
    MAX_VIDEO_MB: int = 100

    # ---- Rate limiting ----
    AUTH_RATE_LIMIT: str = "5/15minutes"

    # ---- App metadata ----
    APP_NAME: str = "Bersabeh Clinic Platform"
    APP_VERSION: str = "0.1.0"

    # ------------------------------------------------------------
    # Validators
    # ------------------------------------------------------------

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, v):
        """Allow CORS_ORIGINS to be a JSON array OR a comma-separated string."""
        if isinstance(v, str):
            v = v.strip()
            if v.startswith("["):
                import json
                return json.loads(v)
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        return v

    @field_validator("JWT_SECRET_KEY", "JWT_REFRESH_SECRET_KEY")
    @classmethod
    def jwt_secrets_must_be_strong(cls, v: str, info) -> str:
        """Refuse obviously-placeholder or short secrets — fails at startup."""
        if v.startswith("change_me") or len(v) < 32:
            raise ValueError(
                f"{info.field_name} is a placeholder or too short. "
                f"Generate one with: openssl rand -hex 32"
            )
        return v

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT.lower() in ("production", "prod")


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Cached settings accessor. Use this in Depends(...) or import settings below."""
    return Settings()


# Import-time singleton — convenient for the 95% case.
settings = get_settings()
