from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent.parent


class Settings(BaseSettings):
    """Application settings loaded from environment variables / .env file."""

    model_config = SettingsConfigDict(
        env_file=BASE_DIR / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Application
    APP_ENV: str = "development"
    APP_DEBUG: bool = False

    # Database
    # Docker: dùng container name kloc_db làm host, không phải loopback host
    DATABASE_URL: str = "postgresql+psycopg2://user:password@kloc_db:5432/kloc_db"

    # Security / JWT
    SECRET_KEY: str = "change-me-in-production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60


settings = Settings()
