from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List


class Settings(BaseSettings):
    """Application settings"""

    # App
    APP_NAME: str = "OnionTravel API"
    VERSION: str = "1.0.0"
    BASE_PATH: str = ""

    # Database
    DATABASE_URL: str = "sqlite:///./oniontravel.db"

    # Security
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # CORS
    ALLOWED_ORIGINS: str = "http://localhost:7000,http://localhost:3000"

    # Currency API
    EXCHANGE_RATE_API_KEY: str
    EXCHANGE_RATE_API_URL: str = "https://v6.exchangerate-api.com/v6"

    # OpenAI API
    OPENAI_API_KEY: str = ""  # Optional - required for AI voice expense feature

    # File Storage
    UPLOAD_DIR: str = "./uploads"
    MAX_UPLOAD_SIZE: int = 10485760  # 10MB

    # Scheduler
    CURRENCY_UPDATE_HOUR: int = 3  # 3 AM
    CURRENCY_UPDATE_TIMEZONE: str = "UTC"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True
    )

    @property
    def cors_origins(self) -> List[str]:
        """Parse CORS origins from comma-separated string"""
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",")]


settings = Settings()
