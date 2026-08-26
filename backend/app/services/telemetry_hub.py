"""
TelemetryHub — Central pub/sub broker for telemetry frames.

Receives TelemetryFrame from MAVLink service or Mock provider.
Downsamples to configured rate (default 5 Hz) and broadcasts
to all connected WebSocket clients.
"""
import asyncio
import time
from dataclasses import asdict
from typing import Callable, Awaitable, Optional

from app.schemas.telemetry import TelemetryFrame


# Type for WS broadcast callbacks
TelemetrySink = Callable[[dict], Awaitable[None]]


class TelemetryHub:
    def __init__(self, target_hz: int = 5):
        self._target_hz = target_hz
        self._interval_s = 1.0 / target_hz
        self._latest: Optional[TelemetryFrame] = None
        self._sinks: list[TelemetrySink] = []
        self._lock = asyncio.Lock()
        self._broadcast_task: Optional[asyncio.Task] = None
        self._running = False

    def update_rate(self, hz: int):
        self._target_hz = hz
        self._interval_s = 1.0 / hz

    async def push(self, frame: TelemetryFrame):
        """Called by MAVLink or mock service to update latest telemetry."""
        async with self._lock:
            self._latest = frame

    def get_latest(self) -> Optional[TelemetryFrame]:
        return self._latest

    def add_sink(self, sink: TelemetrySink):
        """Register a WebSocket client callback."""
        if sink not in self._sinks:
            self._sinks.append(sink)

    def remove_sink(self, sink: TelemetrySink):
        """Deregister a WebSocket client callback."""
        if sink in self._sinks:
            self._sinks.remove(sink)

    async def start(self):
        """Start the broadcast loop."""
        self._running = True
        self._broadcast_task = asyncio.create_task(self._broadcast_loop())

    async def stop(self):
        """Stop the broadcast loop."""
        self._running = False
        if self._broadcast_task:
            self._broadcast_task.cancel()
            try:
                await self._broadcast_task
            except asyncio.CancelledError:
                pass

    async def _broadcast_loop(self):
        """Tick at target_hz and broadcast latest frame to all sinks."""
        while self._running:
            start = time.monotonic()

            if self._latest is not None and self._sinks:
                message = {
                    "type": "telemetry",
                    "data": asdict(self._latest),
                }
                dead_sinks = []
                for sink in list(self._sinks):
                    try:
                        await sink(message)
                    except Exception:
                        dead_sinks.append(sink)
                for sink in dead_sinks:
                    self.remove_sink(sink)

            elapsed = time.monotonic() - start
            sleep_time = max(0, self._interval_s - elapsed)
            await asyncio.sleep(sleep_time)


# Singleton instance
telemetry_hub = TelemetryHub()
