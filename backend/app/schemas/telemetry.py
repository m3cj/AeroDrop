from dataclasses import dataclass, field
from typing import Optional


@dataclass
class TelemetryFrame:
    """Parsed telemetry data from MAVLink or mock provider."""
    # Position
    lat: float = 0.0           # degrees
    lon: float = 0.0           # degrees
    alt_m: float = 0.0         # meters above home (relative)
    alt_msl_m: float = 0.0    # meters above sea level

    # Motion
    speed_ms: float = 0.0      # ground speed m/s
    heading_deg: float = 0.0   # 0-360 degrees

    # Battery
    battery_pct: float = 0.0
    battery_voltage_v: float = 0.0
    battery_current_a: float = 0.0
    battery_remaining_mah: float = 0.0

    # Status
    flight_mode: str = "UNKNOWN"
    armed: bool = False
    is_flying: bool = False

    # GPS
    gps_fix_type: int = 0
    satellites_visible: int = 0

    # Timing
    timestamp_ms: int = 0
