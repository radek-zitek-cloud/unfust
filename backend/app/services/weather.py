import time
from datetime import datetime

import httpx

from app.config import settings

_cache: dict[str, tuple[float, dict]] = {}
CACHE_TTL = 600  # 10 minutes


async def fetch_weather(city: str, units: str = "metric") -> dict:
    cache_key = f"{city}:{units}"
    now = time.time()

    if cache_key in _cache:
        cached_time, cached_data = _cache[cache_key]
        if now - cached_time < CACHE_TTL:
            return cached_data

    if not settings.openweathermap_api_key:
        raise ValueError("OpenWeatherMap API key not configured")

    async with httpx.AsyncClient() as client:
        try:
            resp = await client.get(
                "https://api.openweathermap.org/data/2.5/weather",
                params={
                    "q": city,
                    "units": units,
                    "appid": settings.openweathermap_api_key,
                },
                timeout=10,
            )
            resp.raise_for_status()
            data = resp.json()
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 404:
                raise ValueError(f"City '{city}' not found") from e
            elif e.response.status_code == 401:
                raise ValueError("Invalid API key") from e
            else:
                raise ValueError(
                    f"Weather service error: {e.response.status_code}"
                ) from e
        except httpx.TimeoutException as e:
            raise ValueError("Weather service timeout") from e
        except httpx.RequestError as e:
            raise ValueError("Failed to connect to weather service") from e

    result = {
        "city": data["name"],
        "country": data["sys"].get("country", ""),
        "lat": data["coord"]["lat"],
        "lon": data["coord"]["lon"],
        "temp": data["main"]["temp"],
        "feels_like": data["main"]["feels_like"],
        "humidity": data["main"]["humidity"],
        "wind_speed": data["wind"]["speed"],
        "description": data["weather"][0]["description"],
        "icon": data["weather"][0]["icon"],
    }
    _cache[cache_key] = (now, result)
    return result


async def fetch_forecast(city: str, units: str = "metric") -> dict:
    """Fetch 5-day weather forecast from OpenWeatherMap."""
    if not settings.openweathermap_api_key:
        raise ValueError("OpenWeatherMap API key not configured")

    async with httpx.AsyncClient() as client:
        try:
            resp = await client.get(
                "https://api.openweathermap.org/data/2.5/forecast",
                params={
                    "q": city,
                    "units": units,
                    "appid": settings.openweathermap_api_key,
                },
                timeout=10,
            )
            resp.raise_for_status()
            data = resp.json()
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 404:
                raise ValueError(f"City '{city}' not found") from e
            elif e.response.status_code == 401:
                raise ValueError("Invalid API key") from e
            else:
                raise ValueError(
                    f"Weather service error: {e.response.status_code}"
                ) from e
        except httpx.TimeoutException as e:
            raise ValueError("Weather service timeout") from e
        except httpx.RequestError as e:
            raise ValueError("Failed to connect to weather service") from e

    # Group by day and take the forecast around noon for each day
    daily_forecasts = []
    current_date = None
    for item in data["list"]:
        dt = datetime.fromtimestamp(item["dt"])
        date = dt.date()
        if date != current_date and len(daily_forecasts) < 5:
            daily_forecasts.append(
                {
                    "date": date.isoformat(),
                    "temp": item["main"]["temp"],
                    "description": item["weather"][0]["description"],
                    "icon": item["weather"][0]["icon"],
                }
            )
            current_date = date

    return {
        "city": data["city"]["name"],
        "country": data["city"].get("country", ""),
        "lat": data["city"]["coord"]["lat"],
        "lon": data["city"]["coord"]["lon"],
        "forecasts": daily_forecasts,
    }
