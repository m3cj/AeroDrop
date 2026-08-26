import math


def haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate great-circle distance between two points using the Haversine formula.
    
    Args:
        lat1, lon1: First point in decimal degrees
        lat2, lon2: Second point in decimal degrees
    
    Returns:
        Distance in kilometers
    """
    R = 6371.0  # Earth's radius in km

    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)

    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    return R * c


def bearing(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate initial bearing from point 1 to point 2 (true north = 0°).
    
    Returns:
        Bearing in degrees (0-360)
    """
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    dlambda = math.radians(lon2 - lon1)

    x = math.sin(dlambda) * math.cos(phi2)
    y = math.cos(phi1) * math.sin(phi2) - math.sin(phi1) * math.cos(phi2) * math.cos(dlambda)

    theta = math.atan2(x, y)
    return (math.degrees(theta) + 360) % 360


def wind_adjusted_speed(
    cruise_speed_ms: float,
    wind_speed_ms: float,
    wind_direction_deg: float,
    flight_bearing_deg: float,
) -> float:
    """
    Calculate effective ground speed adjusting for wind component along flight path.
    
    Headwind reduces speed, tailwind increases it (capped at 1.3× cruise).
    """
    # Angle between wind direction and flight direction
    relative_angle = math.radians(flight_bearing_deg - wind_direction_deg)
    wind_component = wind_speed_ms * math.cos(relative_angle)  # + = tailwind, - = headwind
    effective = cruise_speed_ms + wind_component
    return max(effective, cruise_speed_ms * 0.3)  # never below 30% of cruise
