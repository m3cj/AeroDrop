"""
Battery consumption model for delivery quadcopter.

Model: mAh consumed = (current_A × flight_time_h × 1000) + payload_penalty + reserve
- Hover current used as baseline
- Payload increases current draw linearly up to max_payload
- Wind increases current draw (headwind = more power needed)
"""


def estimate_battery_mah(
    distance_km: float,
    effective_speed_ms: float,
    payload_weight_g: int,
    wind_speed_ms: float,
    hover_current_a: float,
    cruise_current_a: float,
    max_payload_g: int,
) -> float:
    """
    Estimate mAh consumed for a one-way flight.

    Returns:
        Estimated mAh consumed (one-way, excluding reserve)
    """
    if effective_speed_ms <= 0:
        effective_speed_ms = 1.0

    flight_time_s = (distance_km * 1000) / effective_speed_ms
    flight_time_h = flight_time_s / 3600

    # Payload factor: 0% payload = hover_current, 100% payload = cruise_current
    payload_ratio = min(payload_weight_g / max(max_payload_g, 1), 1.0)
    base_current_a = hover_current_a + (cruise_current_a - hover_current_a) * payload_ratio

    # Wind penalty: each m/s of wind adds ~2% current draw (simplification)
    wind_factor = 1.0 + (wind_speed_ms * 0.02)

    effective_current_a = base_current_a * wind_factor
    consumed_mah = effective_current_a * flight_time_h * 1000

    return consumed_mah


def round_trip_battery_pct(
    distance_km: float,
    effective_speed_ms: float,
    payload_weight_g: int,
    wind_speed_ms: float,
    hover_current_a: float,
    cruise_current_a: float,
    max_payload_g: int,
    battery_capacity_mah: int,
    reserve_pct: float,
) -> dict:
    """
    Calculate full round-trip battery requirements.

    Returns dict with:
        - outbound_mah: one-way trip consumption
        - return_mah: return trip (no payload, slightly less consumption)
        - total_mah: outbound + return
        - total_pct: % of battery capacity
        - reserve_mah: required reserve for failsafe (RTL)
        - required_pct: total_pct + reserve_pct
    """
    outbound_mah = estimate_battery_mah(
        distance_km, effective_speed_ms, payload_weight_g, wind_speed_ms,
        hover_current_a, cruise_current_a, max_payload_g,
    )
    # Return trip: no payload, slightly faster without weight
    return_speed = min(effective_speed_ms * 1.05, effective_speed_ms + 2.0)
    return_mah = estimate_battery_mah(
        distance_km, return_speed, 0, wind_speed_ms,
        hover_current_a, cruise_current_a * 0.85, max_payload_g,
    )

    total_mah = outbound_mah + return_mah
    total_pct = (total_mah / max(battery_capacity_mah, 1)) * 100

    reserve_mah = battery_capacity_mah * (reserve_pct / 100)
    required_pct = total_pct + reserve_pct

    return {
        "outbound_mah": round(outbound_mah, 1),
        "return_mah": round(return_mah, 1),
        "total_mah": round(total_mah, 1),
        "total_pct": round(total_pct, 1),
        "reserve_mah": round(reserve_mah, 1),
        "required_pct": round(required_pct, 1),
    }
