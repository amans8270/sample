"""Application configuration loaded from environment variables."""

from functools import lru_cache
from typing import List

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # App
    APP_NAME: str = "TripAI Platform"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/tripai"

    # JWT
    JWT_SECRET_KEY: str = "change-me-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    # OpenAI
    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4"
    OPENAI_MAX_TOKENS: int = 4096

    # Rate limiting
    RATE_LIMIT_PER_MINUTE: int = 30

    # CORS
    CORS_ORIGINS: List[str] = ["*"]

    # Cache / page generation
    PAGE_GENERATION_COOLDOWN_SECONDS: int = 60
    MAX_AI_RETRIES: int = 3

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


@lru_cache()
def get_settings() -> Settings:
    return Settings()
