from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.widget import (
    SystemStatsResponse,
    WeatherResponse,
    WidgetLayoutResponse,
    WidgetLayoutUpdateRequest,
)
from app.services.system import get_container_stats, get_host_stats
from app.services.weather import fetch_forecast, fetch_weather
from app.services.widget import WidgetLayoutService

router = APIRouter(prefix="/api/widgets", tags=["widgets"])


@router.get("/layout", response_model=WidgetLayoutResponse)
async def get_layout(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = WidgetLayoutService(db)
    layout = await service.get_layout(user.id)
    if layout is None:
        return WidgetLayoutResponse(widgets=[])
    return WidgetLayoutResponse(widgets=layout.widgets)


@router.put("/layout", response_model=WidgetLayoutResponse)
async def save_layout(
    body: WidgetLayoutUpdateRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = WidgetLayoutService(db)
    layout = await service.save_layout(user.id, [w.model_dump() for w in body.widgets])
    return WidgetLayoutResponse(widgets=layout.widgets)


@router.get("/weather", response_model=WeatherResponse)
async def get_weather(
    city: str = Query(..., min_length=1),
    units: str = Query("metric", pattern="^(metric|imperial)$"),
    _user: User = Depends(get_current_user),
):
    try:
        data = await fetch_weather(city, units)
    except ValueError as e:
        # Weather service provides user-friendly error messages
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Weather service unavailable",
        )
    return WeatherResponse(**data)


@router.get("/forecast")
async def get_forecast(
    city: str = Query(..., min_length=1),
    units: str = Query("metric", pattern="^(metric|imperial)$"),
    _user: User = Depends(get_current_user),
):
    """Get 5-day weather forecast."""
    try:
        data = await fetch_forecast(city, units)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Weather service unavailable",
        )
    return data


@router.get("/system", response_model=SystemStatsResponse)
async def get_system_stats(
    _user: User = Depends(get_current_user),
):
    stats = get_host_stats()
    stats["containers"] = get_container_stats()
    return SystemStatsResponse(**stats)
