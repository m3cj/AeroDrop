from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # Database
    database_url: str = "sqlite+aiosqlite:///./aerodrop_dev.db"

    # MAVLink
    mavlink_connection: str = "udpin:0.0.0.0:14550"

    # Mock mode
    mock_mode: bool = True

    # Weather
    weather_api_key: str = ""
    weather_cache_ttl_s: int = 300  # 5 minutes

    # Video
    jetsan_hls_url: str = "http://localhost:8554/stream.m3u8"

    # Telemetry
    telemetry_rate_hz: int = 5

    # CORS
    cors_origins: list[str] = ["http://localhost:5173", "http://localhost:3000"]

    # App
    app_name: str = "AeroDrop"
    debug: bool = True

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache
def get_settings() -> Settings:
    return Settings()
