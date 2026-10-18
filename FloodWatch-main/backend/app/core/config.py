"""Application configuration loaded from environment variables.

Secrets are never hardcoded into source code. Provide them via a ``.env``
file (copied from ``.env.example``) or the process environment.
"""

from pathlib import Path

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

_BASE_DIR = Path(__file__).resolve().parent.parent.parent

# Dev-only fallback. Using this value logs a warning at startup.
DEV_ONLY_JWT_SECRET = "development-only-change-me-in-production"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=_BASE_DIR / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "FloodWatch API"
    environment: str = "development"
    debug: bool = True

    host: str = "0.0.0.0"
    port: int = 8000

    # Comma separated list of allowed browser origins.
    cors_origins: str = (
        "http://localhost:3000,http://127.0.0.1:3000,"
        "http://localhost:5173,http://127.0.0.1:5173"
    )

    jwt_secret: str = DEV_ONLY_JWT_SECRET
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24  # 24 hours

    data_dir: str = "data"
    upload_dir: str = "uploads"
    max_upload_size_mb: int = 5

    allowed_upload_extensions: str = ".jpg,.jpeg,.png,.webp,.gif"

    @field_validator("cors_origins", mode="before")
    @classmethod
    def _split_cors(cls, value: object) -> list[str] | str:
        if isinstance(value, str):
            value = value.strip()
        return value

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def data_path(self) -> Path:
        path = Path(self.data_dir)
        if not path.is_absolute():
            path = _BASE_DIR / path
        return path

    @property
    def upload_path(self) -> Path:
        path = Path(self.upload_dir)
        if not path.is_absolute():
            path = _BASE_DIR / path
        return path

    @property
    def max_upload_bytes(self) -> int:
        return self.max_upload_size_mb * 1024 * 1024

    @property
    def upload_extensions(self) -> set[str]:
        return {
            ext.strip().lower()
            for ext in self.allowed_upload_extensions.split(",")
            if ext.strip()
        }

    @property
    def using_dev_secret(self) -> bool:
        return self.jwt_secret == DEV_ONLY_JWT_SECRET


settings = Settings()