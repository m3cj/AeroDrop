from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.settings import DroneSettings
from app.schemas.settings import DroneSettingsResponse, DroneSettingsUpdate
from app.services.weather_service import weather_service

router = APIRouter(prefix="/settings", tags=["settings"])


async def get_settings_row(db: AsyncSession) -> DroneSettings:
    """Get or create the single-row settings record."""
    result = await db.execute(select(DroneSettings).where(DroneSettings.id == 1))
    row = result.scalar_one_or_none()
    if not row:
        row = DroneSettings(id=1, home_lat=12.8406, home_lon=80.1534, home_label="VIT Chennai Base Station")
        db.add(row)
        await db.commit()
        await db.refresh(row)
    elif not row.home_lat or row.home_lat == 0.0 or row.home_label == "Home Base" or (abs(row.home_lat - 12.9716) < 0.001):
        row.home_lat = 12.8406
        row.home_lon = 80.1534
        row.home_label = "VIT Chennai Base Station"
        await db.commit()
        await db.refresh(row)
    return row


@router.get("", response_model=DroneSettingsResponse)
async def get_settings(db: AsyncSession = Depends(get_db)):
    return await get_settings_row(db)


@router.put("", response_model=DroneSettingsResponse)
async def update_settings(
    updates: DroneSettingsUpdate,
    db: AsyncSession = Depends(get_db),
):
    row = await get_settings_row(db)
    update_data = updates.model_dump(exclude_none=True)

    for field, value in update_data.items():
        setattr(row, field, value)

    # If weather API key changed, update the weather service
    if "weather_api_key" in update_data:
        weather_service.set_api_key(update_data["weather_api_key"])

    await db.commit()
    await db.refresh(row)
    return row
