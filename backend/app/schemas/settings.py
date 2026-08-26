from typing import Optional
from pydantic import BaseModel, Field


class DroneSettingsResponse(BaseModel):
    id: int
    home_lat: float
    home_lon: float
    home_label: Optional[str]
    cruise_speed_ms: float
    max_payload_g: int
    battery_capacity_mah: int
    hover_current_a: float
    cruise_current_a: float
    max_wind_speed_ms: float
    max_precipitation_mm: float
    battery_reserve_pct: float
    max_range_km: float
    mavlink_connection: str
    mock_mode: bool
    jetsan_hls_url: str
    weather_api_key: str
    telemetry_rate_hz: int

    class Config:
        from_attributes = True


class DroneSettingsUpdate(BaseModel):
    home_lat: Optional[float] = Field(None, ge=-90, le=90)
    home_lon: Optional[float] = Field(None, ge=-180, le=180)
    home_label: Optional[str] = None
    cruise_speed_ms: Optional[float] = Field(None, gt=0, le=50)
    max_payload_g: Optional[int] = Field(None, gt=0, le=10000)
    battery_capacity_mah: Optional[int] = Field(None, gt=0)
    hover_current_a: Optional[float] = Field(None, gt=0)
    cruise_current_a: Optional[float] = Field(None, gt=0)
    max_wind_speed_ms: Optional[float] = Field(None, ge=0)
    max_precipitation_mm: Optional[float] = Field(None, ge=0)
    battery_reserve_pct: Optional[float] = Field(None, ge=5, le=50)
    max_range_km: Optional[float] = Field(None, gt=0)
    mavlink_connection: Optional[str] = None
    mock_mode: Optional[bool] = None
    jetsan_hls_url: Optional[str] = None
    weather_api_key: Optional[str] = None
    telemetry_rate_hz: Optional[int] = Field(None, ge=1, le=20)
