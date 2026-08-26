"""
MAVLink Service — connects to flight controller via UDP and parses messages.

Runs as a persistent asyncio background task.
Publishes TelemetryFrame to TelemetryHub on each relevant message.
"""
import asyncio
import logging
import time
from typing import Optional

from app.schemas.telemetry import TelemetryFrame
from app.services.telemetry_hub import telemetry_hub

logger = logging.getLogger(__name__)

# MAVLink flight mode mappings (ArduPilot Copter)
ARDUPILOT_MODES = {
    0: "STABILIZE", 1: "ACRO", 2: "ALT_HOLD", 3: "AUTO",
    4: "GUIDED", 5: "LOITER", 6: "RTL", 7: "CIRCLE",
    9: "LAND", 11: "DRIFT", 13: "SPORT", 14: "FLIP",
    15: "AUTOTUNE", 16: "POSHOLD", 17: "BRAKE", 18: "THROW",
    19: "AVOID_ADSB", 20: "GUIDED_NOGPS", 21: "SMART_RTL",
    22: "FLOWHOLD", 23: "FOLLOW", 24: "ZIGZAG",
}


class MAVLinkService:
    def __init__(self, connection_string: str = "udpin:0.0.0.0:14550"):
        self.connection_string = connection_string
        self._running = False
        self._task: Optional[asyncio.Task] = None
        self._frame = TelemetryFrame()
        self._connected = False

    @property
    def is_connected(self) -> bool:
        return self._connected

    async def start(self):
        self._running = True
        self._task = asyncio.create_task(self._run())
        logger.info(f"MAVLink service starting on {self.connection_string}")

    async def stop(self):
        self._running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        logger.info("MAVLink service stopped")

    async def _run(self):
        """Main loop — connect to FC and parse messages."""
        while self._running:
            try:
                await self._connect_and_listen()
            except asyncio.CancelledError:
                raise
            except Exception as e:
                logger.error(f"MAVLink connection error: {e}")
                self._connected = False
                await asyncio.sleep(5)  # retry delay

    async def _connect_and_listen(self):
        """Import pymavlink and connect (blocking IO run in thread pool)."""
        loop = asyncio.get_event_loop()

        def _connect():
            from pymavlink import mavutil
            conn = mavutil.mavlink_connection(self.connection_string)
            conn.wait_heartbeat(timeout=30)
            return conn

        try:
            conn = await loop.run_in_executor(None, _connect)
            self._connected = True
            logger.info(f"MAVLink heartbeat received from {self.connection_string}")

            await self._message_loop(conn, loop)
        except Exception as e:
            self._connected = False
            raise

    async def _message_loop(self, conn, loop):
        """Parse incoming MAVLink messages and update telemetry frame."""
        while self._running:
            def _recv():
                return conn.recv_match(
                    type=[
                        "HEARTBEAT", "GLOBAL_POSITION_INT",
                        "VFR_HUD", "SYS_STATUS", "BATTERY_STATUS",
                        "GPS_RAW_INT",
                    ],
                    blocking=True,
                    timeout=1.0,
                )

            msg = await loop.run_in_executor(None, _recv)
            if msg is None:
                continue

            self._parse_message(msg)
            await telemetry_hub.push(self._frame)

    def _parse_message(self, msg):
        """Update the telemetry frame from a MAVLink message."""
        msg_type = msg.get_type()
        now_ms = int(time.time() * 1000)

        if msg_type == "HEARTBEAT":
            mode_num = msg.custom_mode
            self._frame.flight_mode = ARDUPILOT_MODES.get(mode_num, f"MODE_{mode_num}")
            self._frame.armed = bool(msg.base_mode & 0x80)
            self._frame.timestamp_ms = now_ms

        elif msg_type == "GLOBAL_POSITION_INT":
            self._frame.lat = msg.lat / 1e7
            self._frame.lon = msg.lon / 1e7
            self._frame.alt_m = msg.relative_alt / 1000.0
            self._frame.alt_msl_m = msg.alt / 1000.0
            self._frame.heading_deg = msg.hdg / 100.0 if msg.hdg != 65535 else self._frame.heading_deg
            self._frame.timestamp_ms = now_ms

        elif msg_type == "VFR_HUD":
            self._frame.speed_ms = msg.groundspeed
            if msg.heading >= 0:
                self._frame.heading_deg = float(msg.heading)
            self._frame.is_flying = msg.groundspeed > 0.5 or msg.alt > 0.3

        elif msg_type == "SYS_STATUS":
            if msg.battery_remaining >= 0:
                self._frame.battery_pct = float(msg.battery_remaining)
            if msg.voltage_battery > 0:
                self._frame.battery_voltage_v = msg.voltage_battery / 1000.0
            if msg.current_battery >= 0:
                self._frame.battery_current_a = msg.current_battery / 100.0

        elif msg_type == "BATTERY_STATUS":
            if msg.battery_remaining >= 0:
                self._frame.battery_pct = float(msg.battery_remaining)

        elif msg_type == "GPS_RAW_INT":
            self._frame.gps_fix_type = msg.fix_type
            self._frame.satellites_visible = msg.satellites_visible


# Singleton instance
mavlink_service = MAVLinkService()
