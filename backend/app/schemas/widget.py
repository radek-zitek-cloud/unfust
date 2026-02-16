from datetime import datetime

from pydantic import BaseModel


# --- Widget Layout ---


class WidgetInstance(BaseModel):
    id: str
    type: str
    x: int
    y: int
    w: int
    h: int
    config: dict = {}


class WidgetLayoutResponse(BaseModel):
    widgets: list[WidgetInstance]

    model_config = {"from_attributes": True}


class WidgetLayoutUpdateRequest(BaseModel):
    widgets: list[WidgetInstance]


# --- Bookmarks ---


class BookmarkCreate(BaseModel):
    title: str
    url: str
    category: str | None = None
    position: int = 0


class BookmarkUpdate(BaseModel):
    title: str | None = None
    url: str | None = None
    category: str | None = None
    position: int | None = None


class BookmarkResponse(BaseModel):
    id: str
    title: str
    url: str
    category: str | None
    position: int
    created_at: datetime

    model_config = {"from_attributes": True}


# --- RSS ---


class RssFeedCreate(BaseModel):
    url: str


class RssFeedResponse(BaseModel):
    id: str
    url: str
    title: str | None
    last_fetched_at: datetime | None
    created_at: datetime

    model_config = {"from_attributes": True}


class RssItemResponse(BaseModel):
    title: str
    link: str
    published: str | None = None
    source: str | None = None


# --- Weather ---


class WeatherResponse(BaseModel):
    city: str
    country: str
    lat: float
    lon: float
    temp: float
    feels_like: float
    humidity: int
    wind_speed: float
    description: str
    icon: str


# --- System Monitor ---


class SystemStatsResponse(BaseModel):
    cpu_percent: float
    memory_percent: float
    memory_used_gb: float
    memory_total_gb: float
    disk_percent: float
    disk_used_gb: float
    disk_total_gb: float
    containers: list[dict] | None = None
