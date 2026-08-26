from fastapi import APIRouter, Query
from fastapi.responses import JSONResponse

from app.services.weather_service import weather_service
from app.services.telemetry_hub import telemetry_hub
from dataclasses import asdict

router = APIRouter(prefix="/weather", tags=["weather"])


@router.get("")
async def get_weather(
    lat: float = Query(..., ge=-90, le=90),
    lon: float = Query(..., ge=-180, le=180),
):
    """Get current conditions + forecast for route coordinates."""
    data = await weather_service.get_current_and_forecast(lat, lon)
    return data


# Telemetry HTTP fallback
telemetry_router = APIRouter(prefix="/telemetry", tags=["telemetry"])


@telemetry_router.get("/latest")
async def get_latest_telemetry():
    """HTTP fallback for latest telemetry snapshot (use WS for live data)."""
    latest = telemetry_hub.get_latest()
    if not latest:
        return JSONResponse({"connected": False, "data": None})
    return {"connected": True, "data": asdict(latest)}
