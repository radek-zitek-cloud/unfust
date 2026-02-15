import time

import pytest

from app.services.weather import _cache, fetch_weather


@pytest.mark.asyncio
async def test_weather_no_api_key(monkeypatch):
    monkeypatch.setattr(
        "app.services.weather.settings.openweathermap_api_key", ""
    )
    _cache.clear()
    with pytest.raises(ValueError, match="API key not configured"):
        await fetch_weather("Prague")


@pytest.mark.asyncio
async def test_weather_cache_hit():
    _cache.clear()
    _cache["Prague:metric"] = (
        time.time(),
        {
            "city": "Prague",
            "temp": 5.0,
            "feels_like": 2.0,
            "humidity": 80,
            "wind_speed": 3.0,
            "description": "clear sky",
            "icon": "01d",
        },
    )
    result = await fetch_weather("Prague")
    assert result["city"] == "Prague"
    assert result["temp"] == 5.0
