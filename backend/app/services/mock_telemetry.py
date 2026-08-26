"""
Mock Telemetry Service — simulates a full delivery mission flight path.

Generates realistic telemetry data without a real drone connected.
Simulates: takeoff → cruise to destination → loiter/deliver → return → land.
Toggled via settings.mock_mode flag.
"""
import asyncio
import logging
import math
import time
from typing import Optional

from app.schemas.telemetry import TelemetryFrame
from app.services.telemetry_hub import telemetry_hub
from app.utils.haversine import bearing

logger = logging.getLogger(__name__)

# Default mock flight parameters (VIT Chennai Base Station)
MOCK_HOME_LAT = 12.8406      # VIT Chennai Base Station
MOCK_HOME_LON = 80.1534
MOCK_DEST_LAT = 12.8520      # Nearby Kelambakkam delivery point (~1.8km)
MOCK_DEST_LON = 80.1650
MOCK_CRUISE_SPEED_MS = 14.0
MOCK_UPDATE_HZ = 10           # Internal update rate
MOCK_BATTERY_DRAIN_PCT_PER_S = 0.04  # ~4% per 100 seconds at cruise


class MockTelemetryService:
    """Simulates a delivery drone mission with realistic state progression."""

    PHASE_IDLE = "idle"
    PHASE_TAKEOFF = "takeoff"
    PHASE_CRUISE_OUT = "cruise_out"
    PHASE_LOITER = "loiter"
    PHASE_CRUISE_BACK = "cruise_back"
    PHASE_LANDING = "landing"

    def __init__(self):
        self._running = False
        self._task: Optional[asyncio.Task] = None
        self._phase = self.PHASE_IDLE

        # Home position
        self._home_lat = MOCK_HOME_LAT
        self._home_lon = MOCK_HOME_LON

        # Current simulated position
        self._lat = MOCK_HOME_LAT
        self._lon = MOCK_HOME_LON
        self._alt_m = 0.0
        self._speed_ms = 0.0
        self._heading_deg = 0.0
        self._battery_pct = 100.0
        self._flight_mode = "STABILIZE"
        self._armed = False

        # Mission state
        self._dest_lat = MOCK_DEST_LAT
        self._dest_lon = MOCK_DEST_LON
        self._active_mission_id: Optional[str] = None
        self._phase_timer = 0.0

    def set_home(self, lat: float, lon: float):
        self._home_lat = lat
        self._home_lon = lon
        if self._phase == self.PHASE_IDLE:
            self._lat = lat
            self._lon = lon

    def set_destination(self, lat: float, lon: float):
        self._dest_lat = lat
        self._dest_lon = lon

    def launch_mission(self, dest_lat: float, dest_lon: float, mission_id: Optional[str] = None):
        """Immediately dispatch the simulated drone to a target destination."""
        self._dest_lat = dest_lat
        self._dest_lon = dest_lon
        self._active_mission_id = mission_id
        self._armed = True
        self._battery_pct = max(self._battery_pct, 95.0)

        if self._alt_m < 5.0:
            self._lat = self._home_lat
            self._lon = self._home_lon
            self._phase = self.PHASE_TAKEOFF
            self._flight_mode = "POSHOLD"
        else:
            self._phase = self.PHASE_CRUISE_OUT
            self._flight_mode = "AUTO"

        self._phase_timer = 0.0
        logger.info(f"Mock: Dispatched to target ({dest_lat}, {dest_lon}) for mission {mission_id}")

    def abort_mission(self):
        """Command RTL failsafe return to home base."""
        self._phase = self.PHASE_CRUISE_BACK
        self._flight_mode = "RTL"
        self._phase_timer = 0.0
        logger.info("Mock: Mission aborted → commanding RTL return to base")

    async def _update_mission_db_status(self, mission_id: str, new_status: str):
        """Persist mission state transition in database."""
        try:
            from app.database import AsyncSessionLocal
            from app.services.mission_service import mission_service
            async with AsyncSessionLocal() as db:
                mission = await mission_service.get_by_id(db, mission_id)
                if mission:
                    if new_status == "DELIVERED":
                        await mission_service.mark_delivered(db, mission)
                    elif new_status == "RETURNING":
                        await mission_service.mark_returning(db, mission)
                    elif new_status == "COMPLETED":
                        await mission_service.complete(db, mission)
        except Exception as e:
            logger.debug(f"Mock: DB transition note: {e}")

    async def start(self):
        self._running = True
        self._task = asyncio.create_task(self._run())
        logger.info("Mock telemetry service started")

    async def stop(self):
        self._running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        logger.info("Mock telemetry service stopped")

    async def _run(self):
        interval = 1.0 / MOCK_UPDATE_HZ
        while self._running:
            start = time.monotonic()
            await self._tick(interval)
            frame = self._build_frame()
            await telemetry_hub.push(frame)
            elapsed = time.monotonic() - start
            await asyncio.sleep(max(0, interval - elapsed))

    async def _tick(self, dt: float):
        """Advance simulation by dt seconds."""
        self._phase_timer += dt

        if self._phase == self.PHASE_IDLE:
            self._flight_mode = "STABILIZE"
            self._armed = False
            self._speed_ms = 0.0
            self._alt_m = 0.0
            # Fast recharge while docked at base station
            self._battery_pct = min(100.0, self._battery_pct + 15.0 * dt)

        elif self._phase == self.PHASE_TAKEOFF:
            target_alt = 35.0
            self._alt_m = min(self._alt_m + 4.0 * dt, target_alt)
            self._flight_mode = "POSHOLD"
            self._armed = True
            self._speed_ms = 2.0
            self._battery_pct -= MOCK_BATTERY_DRAIN_PCT_PER_S * dt * 0.5
            if self._alt_m >= target_alt - 0.5:
                self._phase = self.PHASE_CRUISE_OUT
                self._flight_mode = "AUTO"
                self._phase_timer = 0.0
                logger.debug("Mock: Takeoff complete → cruise out")

        elif self._phase == self.PHASE_CRUISE_OUT:
            self._move_towards(self._dest_lat, self._dest_lon, MOCK_CRUISE_SPEED_MS, dt)
            self._flight_mode = "AUTO"
            self._speed_ms = MOCK_CRUISE_SPEED_MS
            self._battery_pct -= MOCK_BATTERY_DRAIN_PCT_PER_S * dt
            dist = self._dist_to(self._dest_lat, self._dest_lon)
            if dist < 0.025:  # within 25m
                self._lat = self._dest_lat
                self._lon = self._dest_lon
                self._phase = self.PHASE_LOITER
                self._phase_timer = 0.0
                logger.debug("Mock: Arrived at destination → payload delivery loiter")
                if self._active_mission_id:
                    from app.ws.handler import broadcast_mission_status
                    await broadcast_mission_status(self._active_mission_id, "DELIVERED")
                    await self._update_mission_db_status(self._active_mission_id, "DELIVERED")

        elif self._phase == self.PHASE_LOITER:
            self._flight_mode = "LOITER"
            self._speed_ms = 0.5
            self._battery_pct -= MOCK_BATTERY_DRAIN_PCT_PER_S * dt * 0.6
            if self._phase_timer > 4.0:
                self._phase = self.PHASE_CRUISE_BACK
                self._flight_mode = "RTL"
                self._phase_timer = 0.0
                logger.debug("Mock: Delivery complete → returning to base")
                if self._active_mission_id:
                    from app.ws.handler import broadcast_mission_status
                    await broadcast_mission_status(self._active_mission_id, "RETURNING")
                    await self._update_mission_db_status(self._active_mission_id, "RETURNING")

        elif self._phase == self.PHASE_CRUISE_BACK:
            self._move_towards(self._home_lat, self._home_lon, MOCK_CRUISE_SPEED_MS * 1.05, dt)
            self._flight_mode = "RTL"
            self._speed_ms = MOCK_CRUISE_SPEED_MS
            self._battery_pct -= MOCK_BATTERY_DRAIN_PCT_PER_S * dt
            dist = self._dist_to(self._home_lat, self._home_lon)
            if dist < 0.025:
                self._lat = self._home_lat
                self._lon = self._home_lon
                self._phase = self.PHASE_LANDING
                self._phase_timer = 0.0
                logger.debug("Mock: Over home base → landing")

        elif self._phase == self.PHASE_LANDING:
            self._alt_m = max(self._alt_m - 3.0 * dt, 0.0)
            self._flight_mode = "LAND"
            self._speed_ms = 1.0
            self._battery_pct -= MOCK_BATTERY_DRAIN_PCT_PER_S * dt * 0.4
            if self._alt_m <= 0.1:
                self._alt_m = 0.0
                self._armed = False
                self._phase = self.PHASE_IDLE
                self._phase_timer = 0.0
                logger.debug("Mock: Landed → completed")
                if self._active_mission_id:
                    from app.ws.handler import broadcast_mission_status
                    await broadcast_mission_status(self._active_mission_id, "COMPLETED")
                    await self._update_mission_db_status(self._active_mission_id, "COMPLETED")
                    self._active_mission_id = None

        # Clamp battery
        self._battery_pct = max(self._battery_pct, 0.0)

    def _move_towards(self, target_lat: float, target_lon: float, speed_ms: float, dt: float):
        """Move current position towards target at given speed."""
        brg = bearing(self._lat, self._lon, target_lat, target_lon)
        self._heading_deg = brg
        dist_km = self._dist_to(target_lat, target_lon)
        step_km = (speed_ms * dt) / 1000.0

        if step_km >= dist_km:
            self._lat = target_lat
            self._lon = target_lon
        else:
            # Move along vector towards target
            ratio = step_km / max(dist_km, 1e-9)
            self._lat += (target_lat - self._lat) * ratio
            self._lon += (target_lon - self._lon) * ratio

    def _dist_to(self, lat: float, lon: float) -> float:
        from app.utils.haversine import haversine
        return haversine(self._lat, self._lon, lat, lon)

    def _build_frame(self) -> TelemetryFrame:
        """Build a TelemetryFrame from current simulated state."""
        voltage = 25.2 - ((100 - self._battery_pct) / 100) * 4.2
        current = 22.0 if self._phase not in (self.PHASE_IDLE,) else 0.5

        return TelemetryFrame(
            lat=round(self._lat, 7),
            lon=round(self._lon, 7),
            alt_m=round(self._alt_m, 2),
            alt_msl_m=round(self._alt_m + 920.0, 2),
            speed_ms=round(self._speed_ms, 2),
            heading_deg=round(self._heading_deg % 360, 1),
            battery_pct=round(self._battery_pct, 1),
            battery_voltage_v=round(voltage, 2),
            battery_current_a=round(current, 1),
            battery_remaining_mah=round(5000 * self._battery_pct / 100, 0),
            flight_mode=self._flight_mode,
            armed=self._armed,
            is_flying=self._phase not in (self.PHASE_IDLE, self.PHASE_LANDING) or self._alt_m > 0.5,
            gps_fix_type=3,
            satellites_visible=14,
            timestamp_ms=int(time.time() * 1000),
        )


# Singleton instance
mock_service = MockTelemetryService()
