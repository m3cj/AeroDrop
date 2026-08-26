"""
Mission Service — enforces the mission state machine and lifecycle.

State transitions:
  CREATED → VALIDATED → READY → IN_FLIGHT → DELIVERED → RETURNING → COMPLETED
  Any active state → FAILED | ABORTED
"""
import asyncio
import logging
from datetime import datetime
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.mission import Mission, MissionStatus, MISSION_TRANSITIONS
from app.schemas.mission import MissionCreate
from app.services.validation_engine import validate_mission, ValidationInput
from app.services.weather_service import weather_service

logger = logging.getLogger(__name__)


class MissionStateError(Exception):
    pass


class MissionService:
    async def create(self, db: AsyncSession, data: MissionCreate, settings) -> Mission:
        """Create a new mission in CREATED state."""
        mission = Mission(
            source_lat=settings.home_lat,
            source_lon=settings.home_lon,
            dest_lat=data.dest_lat,
            dest_lon=data.dest_lon,
            dest_label=data.dest_label,
            package_weight_g=data.package_weight_g,
            scheduled_at=data.scheduled_at,
            status=MissionStatus.CREATED,
        )
        db.add(mission)
        await db.commit()
        await db.refresh(mission)
        logger.info(f"Mission {mission.id} created")
        return mission

    async def validate(
        self, db: AsyncSession, mission: Mission, settings, current_battery_pct: float = 100.0
    ) -> Mission:
        """Run validation engine and update mission to VALIDATED or keep CREATED with errors."""
        # Fetch weather at destination
        weather = await weather_service.get_current_and_forecast(
            mission.dest_lat, mission.dest_lon
        )
        current = weather.get("current", {})

        inp = ValidationInput(
            source_lat=mission.source_lat,
            source_lon=mission.source_lon,
            dest_lat=mission.dest_lat,
            dest_lon=mission.dest_lon,
            package_weight_g=mission.package_weight_g,
            cruise_speed_ms=settings.cruise_speed_ms,
            max_payload_g=settings.max_payload_g,
            battery_capacity_mah=settings.battery_capacity_mah,
            hover_current_a=settings.hover_current_a,
            cruise_current_a=settings.cruise_current_a,
            battery_reserve_pct=settings.battery_reserve_pct,
            max_range_km=settings.max_range_km,
            max_wind_speed_ms=settings.max_wind_speed_ms,
            max_precipitation_mm=settings.max_precipitation_mm,
            current_battery_pct=current_battery_pct,
            wind_speed_ms=current.get("wind_ms"),
            wind_direction_deg=current.get("wind_degree"),
            precipitation_mm_hr=current.get("precip_mm"),
            weather_description=current.get("condition_text"),
        )

        result = validate_mission(inp)

        mission.validation_result = result.to_dict()
        mission.distance_km = result.distance_km
        mission.estimated_flight_time_s = result.estimated_flight_time_s
        mission.estimated_battery_usage_pct = result.estimated_battery_usage_pct
        mission.success_probability = result.delivery_success_probability

        if result.is_feasible:
            mission.status = MissionStatus.VALIDATED
        # else: keep CREATED, validation_result contains rejection_reasons

        await db.commit()
        await db.refresh(mission)
        logger.info(f"Mission {mission.id} validated: feasible={result.is_feasible}")
        return mission

    async def arm(self, db: AsyncSession, mission: Mission) -> Mission:
        """Transition VALIDATED → READY."""
        self._assert_transition(mission.status, MissionStatus.READY)
        mission.status = MissionStatus.READY
        await db.commit()
        await db.refresh(mission)
        logger.info(f"Mission {mission.id} armed → READY")
        return mission

    async def start(self, db: AsyncSession, mission: Mission) -> Mission:
        """Transition READY → IN_FLIGHT."""
        self._assert_transition(mission.status, MissionStatus.IN_FLIGHT)
        mission.status = MissionStatus.IN_FLIGHT
        mission.started_at = datetime.utcnow()
        await db.commit()
        await db.refresh(mission)
        logger.info(f"Mission {mission.id} started → IN_FLIGHT")
        return mission

    async def mark_delivered(self, db: AsyncSession, mission: Mission) -> Mission:
        self._assert_transition(mission.status, MissionStatus.DELIVERED)
        mission.status = MissionStatus.DELIVERED
        await db.commit()
        await db.refresh(mission)
        return mission

    async def mark_returning(self, db: AsyncSession, mission: Mission) -> Mission:
        self._assert_transition(mission.status, MissionStatus.RETURNING)
        mission.status = MissionStatus.RETURNING
        await db.commit()
        await db.refresh(mission)
        return mission

    async def complete(self, db: AsyncSession, mission: Mission) -> Mission:
        self._assert_transition(mission.status, MissionStatus.COMPLETED)
        mission.status = MissionStatus.COMPLETED
        mission.completed_at = datetime.utcnow()
        if mission.started_at:
            delta = mission.completed_at - mission.started_at
            mission.actual_flight_time_s = int(delta.total_seconds())
        await db.commit()
        await db.refresh(mission)
        logger.info(f"Mission {mission.id} completed")
        return mission

    async def abort(self, db: AsyncSession, mission: Mission, reason: str = "Operator aborted") -> Mission:
        self._assert_transition(mission.status, MissionStatus.ABORTED)
        mission.status = MissionStatus.ABORTED
        mission.failure_reason = reason
        mission.completed_at = datetime.utcnow()
        await db.commit()
        await db.refresh(mission)
        logger.info(f"Mission {mission.id} aborted: {reason}")
        return mission

    async def fail(self, db: AsyncSession, mission: Mission, reason: str) -> Mission:
        self._assert_transition(mission.status, MissionStatus.FAILED)
        mission.status = MissionStatus.FAILED
        mission.failure_reason = reason
        mission.completed_at = datetime.utcnow()
        await db.commit()
        await db.refresh(mission)
        logger.warning(f"Mission {mission.id} FAILED: {reason}")
        return mission

    def _assert_transition(self, current: MissionStatus, target: MissionStatus):
        allowed = MISSION_TRANSITIONS.get(current, set())
        if target not in allowed:
            raise MissionStateError(
                f"Cannot transition from {current} to {target}. "
                f"Allowed: {[s.value for s in allowed]}"
            )

    async def get_by_id(self, db: AsyncSession, mission_id: str) -> Optional[Mission]:
        result = await db.execute(select(Mission).where(Mission.id == mission_id))
        return result.scalar_one_or_none()

    async def list_missions(
        self, db: AsyncSession, page: int = 1, page_size: int = 20,
        status: Optional[MissionStatus] = None
    ) -> tuple[list[Mission], int]:
        query = select(Mission).order_by(Mission.created_at.desc())
        if status:
            query = query.where(Mission.status == status)
        count_query = select(Mission)
        if status:
            count_query = count_query.where(Mission.status == status)

        offset = (page - 1) * page_size
        paginated = query.offset(offset).limit(page_size)
        result = await db.execute(paginated)
        missions = list(result.scalars().all())
        total_result = await db.execute(count_query)
        total = len(list(total_result.scalars().all()))
        return missions, total

    async def clear_all(self, db: AsyncSession) -> int:
        from sqlalchemy import delete
        stmt = delete(Mission)
        res = await db.execute(stmt)
        await db.commit()
        logger.info(f"Cleared {res.rowcount} missions from database")
        return res.rowcount


# Singleton
mission_service = MissionService()
