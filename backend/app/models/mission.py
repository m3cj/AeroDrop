import enum
import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import (
    Column, String, Float, Integer, Boolean, DateTime, Enum as SAEnum,
    JSON, ForeignKey, Text
)
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import relationship

from app.database import Base


class MissionStatus(str, enum.Enum):
    CREATED = "CREATED"
    VALIDATED = "VALIDATED"
    READY = "READY"
    IN_FLIGHT = "IN_FLIGHT"
    DELIVERED = "DELIVERED"
    RETURNING = "RETURNING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    ABORTED = "ABORTED"


# Valid state transitions
MISSION_TRANSITIONS: dict[MissionStatus, set[MissionStatus]] = {
    MissionStatus.CREATED: {MissionStatus.VALIDATED, MissionStatus.ABORTED},
    MissionStatus.VALIDATED: {MissionStatus.READY, MissionStatus.CREATED, MissionStatus.ABORTED},
    MissionStatus.READY: {MissionStatus.IN_FLIGHT, MissionStatus.ABORTED},
    MissionStatus.IN_FLIGHT: {MissionStatus.DELIVERED, MissionStatus.FAILED, MissionStatus.ABORTED},
    MissionStatus.DELIVERED: {MissionStatus.RETURNING, MissionStatus.FAILED, MissionStatus.ABORTED},
    MissionStatus.RETURNING: {MissionStatus.COMPLETED, MissionStatus.FAILED, MissionStatus.ABORTED},
    MissionStatus.COMPLETED: set(),
    MissionStatus.FAILED: set(),
    MissionStatus.ABORTED: set(),
}


class Mission(Base):
    __tablename__ = "missions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    status = Column(SAEnum(MissionStatus), nullable=False, default=MissionStatus.CREATED, index=True)

    # Location
    source_lat = Column(Float, nullable=False)
    source_lon = Column(Float, nullable=False)
    dest_lat = Column(Float, nullable=False)
    dest_lon = Column(Float, nullable=False)
    dest_label = Column(String(255), nullable=True)

    # Package
    package_weight_g = Column(Integer, nullable=False)

    # Scheduling
    scheduled_at = Column(DateTime, nullable=True)

    # Timing
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)

    # Computed fields
    estimated_flight_time_s = Column(Integer, nullable=True)
    actual_flight_time_s = Column(Integer, nullable=True)
    estimated_battery_usage_pct = Column(Float, nullable=True)
    actual_battery_used_pct = Column(Float, nullable=True)
    success_probability = Column(Float, nullable=True)
    distance_km = Column(Float, nullable=True)

    # Validation snapshot
    validation_result = Column(JSON, nullable=True)

    # Failure / abort info
    failure_reason = Column(Text, nullable=True)

    # Timestamps
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
