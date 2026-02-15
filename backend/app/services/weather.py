import time

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
                raise ValueError(f"Weather service error: {e.response.status_code}") from e
        except httpx.TimeoutException as e:
            raise ValueError("Weather service timeout") from e
        except httpx.RequestError as e:
            raise ValueError("Failed to connect to weather service") from e

    result = {
        "city": data["name"],
        "temp": data["main"]["temp"],
        "feels_like": data["main"]["feels_like"],
        "humidity": data["main"]["humidity"],
        "wind_speed": data["wind"]["speed"],
        "description": data["weather"][0]["description"],
        "icon": data["weather"][0]["icon"],
    }
    _cache[cache_key] = (now, result)
    return result
