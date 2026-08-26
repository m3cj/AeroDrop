from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.mission import MissionStatus
from app.schemas.mission import MissionCreate, MissionResponse, MissionListResponse, AbortMissionRequest
from app.services.mission_service import mission_service, MissionStateError
from app.services.scheduler_service import scheduler_service
from app.api.settings import get_settings_row
from app.services.telemetry_hub import telemetry_hub
from app.ws.handler import broadcast_mission_status

router = APIRouter(prefix="/missions", tags=["missions"])


@router.post("", response_model=MissionResponse, status_code=201)
async def create_mission(
    data: MissionCreate,
    db: AsyncSession = Depends(get_db),
):
    settings = await get_settings_row(db)
    if settings.home_lat == 0.0 and settings.home_lon == 0.0:
        raise HTTPException(400, "Home base location not configured. Set it in Settings first.")

    mission = await mission_service.create(db, data, settings)

    if data.scheduled_at:
        scheduler_service.schedule_mission_start(
            mission.id, data.scheduled_at,
            callback=_scheduled_start_callback,
        )

    return mission


@router.get("", response_model=MissionListResponse)
async def list_missions(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: Optional[MissionStatus] = None,
    db: AsyncSession = Depends(get_db),
):
    missions, total = await mission_service.list_missions(db, page, page_size, status)
    return MissionListResponse(missions=missions, total=total, page=page, page_size=page_size)


@router.delete("", status_code=200)
async def clear_all_missions(db: AsyncSession = Depends(get_db)):
    count = await mission_service.clear_all(db)
    from app.services.mock_telemetry import mock_service
    mock_service.abort_mission()
    return {"cleared": count}


@router.get("/{mission_id}", response_model=MissionResponse)
async def get_mission(mission_id: str, db: AsyncSession = Depends(get_db)):
    mission = await mission_service.get_by_id(db, mission_id)
    if not mission:
        raise HTTPException(404, f"Mission {mission_id} not found")
    return mission


@router.post("/{mission_id}/validate", response_model=MissionResponse)
async def validate_mission_endpoint(mission_id: str, db: AsyncSession = Depends(get_db)):
    mission = await mission_service.get_by_id(db, mission_id)
    if not mission:
        raise HTTPException(404, f"Mission {mission_id} not found")

    settings = await get_settings_row(db)
    latest = telemetry_hub.get_latest()
    battery_pct = latest.battery_pct if (latest and latest.battery_pct > 20.0) else 100.0

    try:
        mission = await mission_service.validate(db, mission, settings, battery_pct)
        await broadcast_mission_status(mission.id, mission.status.value)
    except MissionStateError as e:
        raise HTTPException(409, str(e))

    return mission


@router.post("/{mission_id}/start", response_model=MissionResponse)
async def start_mission(mission_id: str, db: AsyncSession = Depends(get_db)):
    mission = await mission_service.get_by_id(db, mission_id)
    if not mission:
        raise HTTPException(404, f"Mission {mission_id} not found")

    try:
        if mission.status == MissionStatus.VALIDATED:
            mission = await mission_service.arm(db, mission)
        mission = await mission_service.start(db, mission)

        # In mock mode, immediately dispatch simulated drone to destination
        from app.services.mock_telemetry import mock_service
        mock_service.launch_mission(mission.dest_lat, mission.dest_lon, mission.id)

        await broadcast_mission_status(mission.id, mission.status.value, {
            "started_at": mission.started_at.isoformat() if mission.started_at else None,
        })
    except MissionStateError as e:
        raise HTTPException(409, str(e))

    return mission


@router.post("/{mission_id}/abort", response_model=MissionResponse)
async def abort_mission(
    mission_id: str,
    body: AbortMissionRequest = AbortMissionRequest(),
    db: AsyncSession = Depends(get_db),
):
    mission = await mission_service.get_by_id(db, mission_id)
    if not mission:
        raise HTTPException(404, f"Mission {mission_id} not found")

    try:
        mission = await mission_service.abort(db, mission, body.reason or "Operator aborted")
        scheduler_service.cancel_mission(mission_id)

        from app.services.mock_telemetry import mock_service
        mock_service.abort_mission()

        await broadcast_mission_status(mission.id, mission.status.value, {
            "reason": mission.failure_reason,
        })
    except MissionStateError as e:
        raise HTTPException(409, str(e))

    return mission


async def _scheduled_start_callback(mission_id: str):
    """Called by APScheduler at the scheduled time."""
    from app.database import AsyncSessionLocal
    async with AsyncSessionLocal() as db:
        mission = await mission_service.get_by_id(db, mission_id)
        if mission and mission.status == MissionStatus.READY:
            await mission_service.start(db, mission)
            await broadcast_mission_status(mission_id, MissionStatus.IN_FLIGHT.value)
