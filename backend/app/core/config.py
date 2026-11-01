import os
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    APP_NAME: str = "MEDORA Smart Healthcare Platform"
    APP_VERSION: str = "1.0.0"
    APP_ENV: str = "blue"  # "blue" or "green"
    DEBUG: bool = False
    
    SECRET_KEY: str = os.getenv(
        "SECRET_KEY", 
        "medora_devsecops_jwt_secret_key_change_in_production_99882211"
    )
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    
    # Defaults to SQLite for immediate testing, easily overridden by POSTGRES_URL or DATABASE_URL
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", 
        "sqlite:///./medora.db"
    )
    
    CORS_ORIGINS: List[str] = ["*"]
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )


settings = Settings()
