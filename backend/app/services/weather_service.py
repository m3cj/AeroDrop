"""
Weather Service — WeatherAPI.com integration with in-memory caching.
"""
import asyncio
import logging
import time
from typing import Optional

import httpx

logger = logging.getLogger(__name__)


class WeatherService:
    def __init__(self, api_key: str = "", cache_ttl_s: int = 300):
        self._api_key = api_key
        self._cache_ttl_s = cache_ttl_s
        self._cache: dict[str, tuple[float, dict]] = {}  # key → (timestamp, data)
        self._base_url = "https://api.weatherapi.com/v1"

    def set_api_key(self, key: str):
        self._api_key = key

    def _cache_key(self, lat: float, lon: float) -> str:
        # Round to 2 decimal places (~1.1km grid) for cache grouping
        return f"{round(lat, 2)},{round(lon, 2)}"

    def _is_cached(self, key: str) -> bool:
        if key not in self._cache:
            return False
        ts, _ = self._cache[key]
        return (time.time() - ts) < self._cache_ttl_s

    async def get_current_and_forecast(self, lat: float, lon: float) -> dict:
        """
        Fetch current conditions + 3-day forecast from WeatherAPI.com.
        Returns structured dict with weather data relevant to drone operations.
        """
        if not self._api_key:
            return self._mock_weather(lat, lon)

        key = self._cache_key(lat, lon)
        if self._is_cached(key):
            return self._cache[key][1]

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(
                    f"{self._base_url}/forecast.json",
                    params={
                        "key": self._api_key,
                        "q": f"{lat},{lon}",
                        "days": 2,
                        "aqi": "no",
                        "alerts": "yes",
                    },
                )
                resp.raise_for_status()
                raw = resp.json()

            data = self._parse_response(raw)
            self._cache[key] = (time.time(), data)
            return data

        except Exception as e:
            logger.error(f"Weather API error: {e}")
            return self._mock_weather(lat, lon)

    def _parse_response(self, raw: dict) -> dict:
        """Extract drone-relevant fields from WeatherAPI.com response."""
        current = raw.get("current", {})
        condition = current.get("condition", {})
        forecast_days = raw.get("forecast", {}).get("forecastday", [])

        # Parse today's hourly forecast
        hours = []
        if forecast_days:
            for hour in forecast_days[0].get("hour", [])[:24]:
                hours.append({
                    "time": hour.get("time", ""),
                    "temp_c": hour.get("temp_c", 0),
                    "wind_kph": hour.get("wind_kph", 0),
                    "wind_dir": hour.get("wind_dir", "N"),
                    "wind_degree": hour.get("wind_degree", 0),
                    "precip_mm": hour.get("precip_mm", 0),
                    "cloud_pct": hour.get("cloud", 0),
                    "condition": hour.get("condition", {}).get("text", ""),
                })

        return {
            "current": {
                "temp_c": current.get("temp_c", 0),
                "feels_like_c": current.get("feelslike_c", 0),
                "humidity_pct": current.get("humidity", 0),
                "wind_kph": current.get("wind_kph", 0),
                "wind_ms": round(current.get("wind_kph", 0) / 3.6, 2),
                "wind_dir": current.get("wind_dir", "N"),
                "wind_degree": current.get("wind_degree", 0),
                "precip_mm": current.get("precip_mm", 0),
                "cloud_pct": current.get("cloud", 0),
                "visibility_km": current.get("vis_km", 10),
                "uv_index": current.get("uv", 0),
                "condition_text": condition.get("text", ""),
                "condition_icon": condition.get("icon", ""),
                "is_day": bool(current.get("is_day", 1)),
            },
            "hourly_forecast": hours,
            "alerts": raw.get("alerts", {}).get("alert", []),
            "source": "weatherapi",
        }

    def _mock_weather(self, lat: float, lon: float) -> dict:
        """Return mock weather data when API key is not configured."""
        return {
            "current": {
                "temp_c": 28.5,
                "feels_like_c": 30.2,
                "humidity_pct": 65,
                "wind_kph": 12.0,
                "wind_ms": 3.33,
                "wind_dir": "NE",
                "wind_degree": 45,
                "precip_mm": 0.0,
                "cloud_pct": 30,
                "visibility_km": 10.0,
                "uv_index": 6,
                "condition_text": "Partly cloudy",
                "condition_icon": "//cdn.weatherapi.com/weather/64x64/day/116.png",
                "is_day": True,
            },
            "hourly_forecast": [],
            "alerts": [],
            "source": "mock",
        }


# Singleton
weather_service = WeatherService()
