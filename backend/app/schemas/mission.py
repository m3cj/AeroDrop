from datetime import datetime
from typing import Optional, Any
from pydantic import BaseModel, Field

from app.models.mission import MissionStatus


class MissionCreate(BaseModel):
    dest_lat: float = Field(..., ge=-90, le=90)
    dest_lon: float = Field(..., ge=-180, le=180)
    dest_label: Optional[str] = None
    package_weight_g: int = Field(..., ge=1, le=10000)
    scheduled_at: Optional[datetime] = None


class ValidationResultSchema(BaseModel):
    is_feasible: bool
    distance_km: float
    estimated_flight_time_s: int
    estimated_battery_usage_pct: float
    delivery_success_probability: float
    rejection_reasons: list[str] = []
    warnings: list[str] = []


class MissionResponse(BaseModel):
    id: str
    status: MissionStatus
    source_lat: float
    source_lon: float
    dest_lat: float
    dest_lon: float
    dest_label: Optional[str]
    package_weight_g: int
    scheduled_at: Optional[datetime]
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
    estimated_flight_time_s: Optional[int]
    actual_flight_time_s: Optional[int]
    estimated_battery_usage_pct: Optional[float]
    actual_battery_used_pct: Optional[float]
    success_probability: Optional[float]
    distance_km: Optional[float]
    validation_result: Optional[dict[str, Any]]
    failure_reason: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class MissionListResponse(BaseModel):
    missions: list[MissionResponse]
    total: int
    page: int
    page_size: int


class AbortMissionRequest(BaseModel):
    reason: Optional[str] = "Operator aborted"
