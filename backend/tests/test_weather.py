import time

import httpx
import pytest
import respx

from app.services.weather import _cache, fetch_weather


@pytest.mark.asyncio
async def test_weather_no_api_key(monkeypatch):
    monkeypatch.setattr("app.services.weather.settings.openweathermap_api_key", "")
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
            "country": "CZ",
            "lat": 50.08,
            "lon": 14.43,
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


@pytest.mark.asyncio
@respx.mock
async def test_weather_city_not_found(monkeypatch):
    monkeypatch.setattr(
        "app.services.weather.settings.openweathermap_api_key", "test_key"
    )
    _cache.clear()

    respx.get("https://api.openweathermap.org/data/2.5/weather").mock(
        return_value=httpx.Response(404, json={"message": "city not found"})
    )

    with pytest.raises(ValueError, match="City 'InvalidCity' not found"):
        await fetch_weather("InvalidCity")


@pytest.mark.asyncio
@respx.mock
async def test_weather_invalid_api_key(monkeypatch):
    monkeypatch.setattr(
        "app.services.weather.settings.openweathermap_api_key", "invalid_key"
    )
    _cache.clear()

    respx.get("https://api.openweathermap.org/data/2.5/weather").mock(
        return_value=httpx.Response(401, json={"message": "Invalid API key"})
    )

    with pytest.raises(ValueError, match="Invalid API key"):
        await fetch_weather("Prague")


@pytest.mark.asyncio
@respx.mock
async def test_weather_service_error(monkeypatch):
    monkeypatch.setattr(
        "app.services.weather.settings.openweathermap_api_key", "test_key"
    )
    _cache.clear()

    respx.get("https://api.openweathermap.org/data/2.5/weather").mock(
        return_value=httpx.Response(500, json={"message": "Internal server error"})
    )

    with pytest.raises(ValueError, match="Weather service error: 500"):
        await fetch_weather("Prague")


@pytest.mark.asyncio
@respx.mock
async def test_weather_timeout(monkeypatch):
    monkeypatch.setattr(
        "app.services.weather.settings.openweathermap_api_key", "test_key"
    )
    _cache.clear()

    respx.get("https://api.openweathermap.org/data/2.5/weather").mock(
        side_effect=httpx.TimeoutException("Request timeout")
    )

    with pytest.raises(ValueError, match="Weather service timeout"):
        await fetch_weather("Prague")


@pytest.mark.asyncio
@respx.mock
async def test_weather_connection_error(monkeypatch):
    monkeypatch.setattr(
        "app.services.weather.settings.openweathermap_api_key", "test_key"
    )
    _cache.clear()

    respx.get("https://api.openweathermap.org/data/2.5/weather").mock(
        side_effect=httpx.ConnectError("Connection failed")
    )

    with pytest.raises(ValueError, match="Failed to connect to weather service"):
        await fetch_weather("Prague")


@pytest.mark.asyncio
@respx.mock
async def test_weather_successful_fetch(monkeypatch):
    monkeypatch.setattr(
        "app.services.weather.settings.openweathermap_api_key", "test_key"
    )
    _cache.clear()

    respx.get("https://api.openweathermap.org/data/2.5/weather").mock(
        return_value=httpx.Response(
            200,
            json={
                "name": "Prague",
                "sys": {"country": "CZ"},
                "coord": {"lat": 50.08, "lon": 14.43},
                "main": {
                    "temp": 15.5,
                    "feels_like": 14.0,
                    "humidity": 65,
                },
                "wind": {"speed": 4.5},
                "weather": [{"description": "few clouds", "icon": "02d"}],
            },
        )
    )

    result = await fetch_weather("Prague")
    assert result["city"] == "Prague"
    assert result["country"] == "CZ"
    assert result["lat"] == 50.08
    assert result["lon"] == 14.43
    assert result["temp"] == 15.5
    assert result["feels_like"] == 14.0
    assert result["humidity"] == 65
    assert result["wind_speed"] == 4.5
    assert result["description"] == "few clouds"
    assert result["icon"] == "02d"
