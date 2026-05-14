"""Pegasus Design — Configuration & Settings"""
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # ── Environment ────────────────────────────────────────────────────
    environment: str = "development"

    # ── Database ───────────────────────────────────────────────────────
    database_url: str = "postgresql+asyncpg://pegasus:pegasus_dev@localhost:5432/pegasus_design"

    # ── Redis ──────────────────────────────────────────────────────────
    redis_url: str = "redis://localhost:6379/0"

    # ── Auth ───────────────────────────────────────────────────────────
    jwt_secret: str = "dev_secret_change_in_prod"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 480

    # ── OpenAI ─────────────────────────────────────────────────────────
    openai_api_key: str = ""

    # ── InlineIQ ───────────────────────────────────────────────────────
    inlineiq_api_url: str = ""
    inlineiq_api_key: str = ""

    # ── AI Modes ───────────────────────────────────────────────────────
    ai_mode: str = "observe"  # observe | assist | automate

    # ── CORS ───────────────────────────────────────────────────────────
    cors_origins: list[str] = [
        "http://localhost:3000",
        "http://localhost:8000",
        "https://miniature-eureka-x5jxrpwqgj7w2pr4v-3000.app.github.dev",
    ]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
