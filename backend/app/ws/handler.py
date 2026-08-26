"""
WebSocket Handler — multiplexed single connection for all real-time data.

Message types pushed to client:
  - telemetry: 5 Hz position/battery/mode data
  - mission_status: state transitions, ETA updates
  - alert: low battery, weather change, validation warnings

Message format: {"type": "...", "data": {...}}
"""
import asyncio
import json
import logging
from typing import Any

from fastapi import WebSocket, WebSocketDisconnect

from app.services.telemetry_hub import telemetry_hub

logger = logging.getLogger(__name__)


class ConnectionManager:
    """Manages all active WebSocket connections."""

    def __init__(self):
        self._connections: list[WebSocket] = []

    async def connect(self, ws: WebSocket):
        await ws.accept()
        self._connections.append(ws)
        logger.info(f"WS connected: {ws.client}  total={len(self._connections)}")

    def disconnect(self, ws: WebSocket):
        if ws in self._connections:
            self._connections.remove(ws)
        logger.info(f"WS disconnected  total={len(self._connections)}")

    async def broadcast(self, message: dict[str, Any]):
        """Broadcast to all connected clients."""
        payload = json.dumps(message)
        dead = []
        for ws in list(self._connections):
            try:
                await ws.send_text(payload)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(ws)

    async def send_to(self, ws: WebSocket, message: dict[str, Any]):
        try:
            await ws.send_text(json.dumps(message))
        except Exception:
            self.disconnect(ws)


manager = ConnectionManager()


async def websocket_endpoint(ws: WebSocket):
    """Main WebSocket endpoint handler."""
    await manager.connect(ws)

    # Register this connection as a telemetry sink
    async def _telemetry_sink(message: dict):
        await manager.send_to(ws, message)

    telemetry_hub.add_sink(_telemetry_sink)

    # Send current telemetry snapshot immediately on connect
    latest = telemetry_hub.get_latest()
    if latest:
        from dataclasses import asdict
        await manager.send_to(ws, {"type": "telemetry", "data": asdict(latest)})

    # Send connected acknowledgement
    await manager.send_to(ws, {
        "type": "connected",
        "data": {"message": "AeroDrop WebSocket connected", "version": "1.0"},
    })

    try:
        while True:
            # Wait for client messages (ping/subscribe etc.)
            text = await ws.receive_text()
            try:
                msg = json.loads(text)
                await _handle_client_message(ws, msg)
            except json.JSONDecodeError:
                pass
    except WebSocketDisconnect:
        pass
    finally:
        telemetry_hub.remove_sink(_telemetry_sink)
        manager.disconnect(ws)


async def _handle_client_message(ws: WebSocket, msg: dict):
    """Handle messages sent from the client to the server."""
    msg_type = msg.get("type", "")

    if msg_type == "ping":
        await manager.send_to(ws, {"type": "pong", "data": {}})

    elif msg_type == "request_snapshot":
        latest = telemetry_hub.get_latest()
        if latest:
            from dataclasses import asdict
            await manager.send_to(ws, {"type": "telemetry", "data": asdict(latest)})


async def broadcast_mission_status(mission_id: str, status: str, data: dict = None):
    """Called by mission service to push state changes to all clients."""
    await manager.broadcast({
        "type": "mission_status",
        "data": {
            "mission_id": mission_id,
            "status": status,
            **(data or {}),
        },
    })


async def broadcast_alert(level: str, title: str, message: str, data: dict = None):
    """Broadcast an alert notification to all connected clients."""
    await manager.broadcast({
        "type": "alert",
        "data": {
            "level": level,   # "info" | "warning" | "error" | "critical"
            "title": title,
            "message": message,
            **(data or {}),
        },
    })
