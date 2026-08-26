"""
Mission Validation Engine

Validates a proposed mission against physical constraints, weather conditions,
and drone performance parameters. Outputs a ValidationResult with feasibility,
timing estimates, battery requirements, and delivery success probability.
"""
from dataclasses import dataclass, field
from typing import Optional

from app.utils.haversine import haversine, bearing, wind_adjusted_speed
from app.utils.battery_model import round_trip_battery_pct


@dataclass
class ValidationInput:
    # Route
    source_lat: float
    source_lon: float
    dest_lat: float
    dest_lon: float

    # Package
    package_weight_g: int

    # Drone parameters (from settings)
    cruise_speed_ms: float
    max_payload_g: int
    battery_capacity_mah: int
    hover_current_a: float
    cruise_current_a: float
    battery_reserve_pct: float
    max_range_km: float
    max_wind_speed_ms: float
    max_precipitation_mm: float

    # Current state
    current_battery_pct: float = 100.0

    # Weather (optional — if None, weather gate is skipped)
    wind_speed_ms: Optional[float] = None
    wind_direction_deg: Optional[float] = None
    precipitation_mm_hr: Optional[float] = None
    weather_description: Optional[str] = None


@dataclass
class ValidationResult:
    is_feasible: bool
    distance_km: float
    flight_bearing_deg: float
    effective_speed_ms: float
    estimated_flight_time_s: int          # one-way
    estimated_total_time_s: int           # round trip
    estimated_battery_usage_pct: float    # round trip %
    battery_breakdown: dict
    delivery_success_probability: float   # 0.0 – 1.0
    rejection_reasons: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "is_feasible": self.is_feasible,
            "distance_km": self.distance_km,
            "flight_bearing_deg": self.flight_bearing_deg,
            "effective_speed_ms": self.effective_speed_ms,
            "estimated_flight_time_s": self.estimated_flight_time_s,
            "estimated_total_time_s": self.estimated_total_time_s,
            "estimated_battery_usage_pct": self.estimated_battery_usage_pct,
            "battery_breakdown": self.battery_breakdown,
            "delivery_success_probability": self.delivery_success_probability,
            "rejection_reasons": self.rejection_reasons,
            "warnings": self.warnings,
        }


def validate_mission(inp: ValidationInput) -> ValidationResult:
    """Run the full validation pipeline and return a ValidationResult."""
    rejection_reasons: list[str] = []
    warnings: list[str] = []

    # ── 1. Distance ─────────────────────────────────────────────────────────
    distance_km = haversine(inp.source_lat, inp.source_lon, inp.dest_lat, inp.dest_lon)
    flight_bearing = bearing(inp.source_lat, inp.source_lon, inp.dest_lat, inp.dest_lon)

    if distance_km > inp.max_range_km:
        rejection_reasons.append(
            f"Distance {distance_km:.2f} km exceeds max range {inp.max_range_km:.1f} km"
        )
    elif distance_km > inp.max_range_km * 0.85:
        warnings.append(f"Distance {distance_km:.2f} km is close to max range ({inp.max_range_km:.1f} km)")

    if distance_km < 0.05:
        rejection_reasons.append("Destination is too close to home base (< 50 m)")

    # ── 2. Payload ───────────────────────────────────────────────────────────
    if inp.package_weight_g > inp.max_payload_g:
        rejection_reasons.append(
            f"Package weight {inp.package_weight_g}g exceeds max payload {inp.max_payload_g}g"
        )
    elif inp.package_weight_g > inp.max_payload_g * 0.9:
        warnings.append(f"Package weight {inp.package_weight_g}g is near max payload limit")

    # ── 3. Weather gate ──────────────────────────────────────────────────────
    wind_speed = inp.wind_speed_ms or 0.0
    wind_direction = inp.wind_direction_deg or 0.0
    precipitation = inp.precipitation_mm_hr or 0.0

    if inp.wind_speed_ms is not None and inp.wind_speed_ms > inp.max_wind_speed_ms:
        rejection_reasons.append(
            f"Wind speed {inp.wind_speed_ms:.1f} m/s exceeds limit {inp.max_wind_speed_ms:.1f} m/s"
        )
    elif inp.wind_speed_ms is not None and inp.wind_speed_ms > inp.max_wind_speed_ms * 0.75:
        warnings.append(f"Wind speed {inp.wind_speed_ms:.1f} m/s is elevated — reduced efficiency expected")

    if inp.precipitation_mm_hr is not None and inp.precipitation_mm_hr > inp.max_precipitation_mm:
        rejection_reasons.append(
            f"Precipitation {inp.precipitation_mm_hr:.1f} mm/hr exceeds limit {inp.max_precipitation_mm:.1f} mm/hr"
        )

    # ── 4. Speed & time ──────────────────────────────────────────────────────
    effective_speed = wind_adjusted_speed(
        inp.cruise_speed_ms, wind_speed, wind_direction, flight_bearing
    )
    flight_time_s = int((distance_km * 1000) / effective_speed) if effective_speed > 0 else 99999
    # Return trip slightly faster (lighter)
    return_speed = min(effective_speed * 1.05, effective_speed + 2.0)
    return_time_s = int((distance_km * 1000) / return_speed)
    total_time_s = flight_time_s + return_time_s

    # ── 5. Battery ───────────────────────────────────────────────────────────
    battery_breakdown = round_trip_battery_pct(
        distance_km=distance_km,
        effective_speed_ms=effective_speed,
        payload_weight_g=inp.package_weight_g,
        wind_speed_ms=wind_speed,
        hover_current_a=inp.hover_current_a,
        cruise_current_a=inp.cruise_current_a,
        max_payload_g=inp.max_payload_g,
        battery_capacity_mah=inp.battery_capacity_mah,
        reserve_pct=inp.battery_reserve_pct,
    )
    required_pct = battery_breakdown["required_pct"]

    if required_pct > inp.current_battery_pct:
        rejection_reasons.append(
            f"Insufficient battery: need {required_pct:.1f}% (including {inp.battery_reserve_pct:.0f}% reserve), "
            f"have {inp.current_battery_pct:.1f}%"
        )
    elif required_pct > inp.current_battery_pct * 0.9:
        warnings.append(f"Battery margin is tight: {inp.current_battery_pct - required_pct:.1f}% headroom")

    # ── 6. Success probability ───────────────────────────────────────────────
    probability = _calculate_success_probability(
        distance_km=distance_km,
        max_range_km=inp.max_range_km,
        wind_speed_ms=wind_speed,
        max_wind_ms=inp.max_wind_speed_ms,
        precipitation_mm=precipitation,
        max_precip_mm=inp.max_precipitation_mm,
        battery_margin_pct=inp.current_battery_pct - required_pct,
        payload_ratio=inp.package_weight_g / max(inp.max_payload_g, 1),
        has_rejections=len(rejection_reasons) > 0,
    )

    return ValidationResult(
        is_feasible=len(rejection_reasons) == 0,
        distance_km=round(distance_km, 3),
        flight_bearing_deg=round(flight_bearing, 1),
        effective_speed_ms=round(effective_speed, 2),
        estimated_flight_time_s=flight_time_s,
        estimated_total_time_s=total_time_s,
        estimated_battery_usage_pct=battery_breakdown["total_pct"],
        battery_breakdown=battery_breakdown,
        delivery_success_probability=probability,
        rejection_reasons=rejection_reasons,
        warnings=warnings,
    )


def _calculate_success_probability(
    distance_km: float,
    max_range_km: float,
    wind_speed_ms: float,
    max_wind_ms: float,
    precipitation_mm: float,
    max_precip_mm: float,
    battery_margin_pct: float,
    payload_ratio: float,
    has_rejections: bool,
) -> float:
    """
    Heuristic success probability (0.0 – 1.0) based on operational margins.
    """
    if has_rejections:
        return 0.0

    score = 1.0

    # Distance penalty: closer to range limit = lower confidence
    range_ratio = distance_km / max(max_range_km, 1.0)
    score *= max(0.5, 1.0 - range_ratio * 0.3)

    # Wind penalty
    if max_wind_ms > 0:
        wind_ratio = wind_speed_ms / max_wind_ms
        score *= max(0.6, 1.0 - wind_ratio * 0.25)

    # Precipitation penalty
    if max_precip_mm > 0 and precipitation_mm > 0:
        precip_ratio = precipitation_mm / max_precip_mm
        score *= max(0.5, 1.0 - precip_ratio * 0.3)

    # Battery margin: negative margin tanks probability sharply
    if battery_margin_pct < 5:
        score *= 0.7
    elif battery_margin_pct < 10:
        score *= 0.85

    # Payload penalty near limit
    if payload_ratio > 0.9:
        score *= 0.9

    return round(min(max(score, 0.0), 1.0), 3)
