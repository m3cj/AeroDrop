from sqlalchemy import Column, String, Float, Integer, Boolean

from app.database import Base


class DroneSettings(Base):
    """Single-row settings table for operator configuration."""
    __tablename__ = "drone_settings"

    id = Column(Integer, primary_key=True, default=1)

    # Home base (VIT Chennai default)
    home_lat = Column(Float, nullable=False, default=12.8406)
    home_lon = Column(Float, nullable=False, default=80.1534)
    home_label = Column(String(255), nullable=True, default="VIT Chennai Base Station")

    # Drone performance parameters
    cruise_speed_ms = Column(Float, nullable=False, default=15.0)       # m/s
    max_payload_g = Column(Integer, nullable=False, default=2000)         # grams
    battery_capacity_mah = Column(Integer, nullable=False, default=5000)  # mAh
    hover_current_a = Column(Float, nullable=False, default=20.0)         # Amps at hover
    cruise_current_a = Column(Float, nullable=False, default=25.0)        # Amps at cruise

    # Safety thresholds
    max_wind_speed_ms = Column(Float, nullable=False, default=10.0)       # m/s
    max_precipitation_mm = Column(Float, nullable=False, default=2.0)     # mm/hr
    battery_reserve_pct = Column(Float, nullable=False, default=20.0)     # % to keep in reserve
    max_range_km = Column(Float, nullable=False, default=10.0)            # km one-way

    # Connection settings
    mavlink_connection = Column(String(255), nullable=False, default="udpin:0.0.0.0:14550")
    mock_mode = Column(Boolean, nullable=False, default=True)
    jetsan_hls_url = Column(String(512), nullable=False, default="http://localhost:8554/stream.m3u8")
    weather_api_key = Column(String(255), nullable=False, default="")

    # Telemetry
    telemetry_rate_hz = Column(Integer, nullable=False, default=5)
