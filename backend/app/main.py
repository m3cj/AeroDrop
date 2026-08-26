"""
AeroDrop — FastAPI Application Entry Point

Lifespan events:
  - Startup: DB tables, settings load, telemetry service (MAVLink or mock), TelemetryHub, APScheduler
  - Shutdown: graceful cleanup of all background tasks and connections
"""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.database import create_tables
from app.services.telemetry_hub import telemetry_hub
from app.services.mavlink_service import mavlink_service
from app.services.mock_telemetry import mock_service
from app.services.scheduler_service import scheduler_service
from app.services.weather_service import weather_service
from app.ws.handler import websocket_endpoint
from app.api import missions, settings as settings_router, weather

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(name)s  %(levelname)s  %(message)s",
)
logger = logging.getLogger(__name__)
config = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown lifecycle."""
    # ── Startup ──────────────────────────────────────────────────────────────
    logger.info("AeroDrop starting up...")

    # 1. Create DB tables (dev mode — Alembic used in prod)
    await create_tables()

    # 2. Load settings from DB and configure services
    from app.database import AsyncSessionLocal
    from app.api.settings import get_settings_row
    async with AsyncSessionLocal() as db:
        drone_settings = await get_settings_row(db)

    # Configure weather service key
    if drone_settings.weather_api_key:
        weather_service.set_api_key(drone_settings.weather_api_key)

    # Update telemetry hub rate from settings
    telemetry_hub.update_rate(drone_settings.telemetry_rate_hz)

    # 3. Start telemetry source (mock or MAVLink)
    use_mock = drone_settings.mock_mode or config.mock_mode
    if use_mock:
        logger.info("Starting MOCK telemetry service")
        mock_service.set_home(drone_settings.home_lat or 12.8406, drone_settings.home_lon or 80.1534)
        await mock_service.start()
    else:
        logger.info(f"Starting MAVLink service on {drone_settings.mavlink_connection}")
        mavlink_service.connection_string = drone_settings.mavlink_connection
        await mavlink_service.start()

    # 4. Start telemetry broadcast hub
    await telemetry_hub.start()

    # 5. Start APScheduler
    scheduler_service.start()

    logger.info("AeroDrop startup complete ✓")

    yield  # ── Application runs ──────────────────────────────────────────────

    # ── Shutdown ─────────────────────────────────────────────────────────────
    logger.info("AeroDrop shutting down...")
    scheduler_service.stop()
    await telemetry_hub.stop()
    if use_mock:
        await mock_service.stop()
    else:
        await mavlink_service.stop()
    logger.info("AeroDrop shutdown complete")


# Create FastAPI app
app = FastAPI(
    title="AeroDrop API",
    description="Autonomous delivery drone operations platform",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=config.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# REST routers
app.include_router(missions.router, prefix="/api")
app.include_router(settings_router.router, prefix="/api")
app.include_router(weather.router, prefix="/api")
app.include_router(weather.telemetry_router, prefix="/api")

# WebSocket
@app.websocket("/ws")
async def ws(websocket: WebSocket):
    await websocket_endpoint(websocket)


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "mock_mode": config.mock_mode,
        "telemetry_connected": telemetry_hub.get_latest() is not None,
    }
