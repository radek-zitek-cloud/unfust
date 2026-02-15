# Dashboard Widgets Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a configurable widget dashboard with clock, weather, bookmarks, RSS feed, and system monitor widgets on a draggable grid.

**Architecture:** Generic widget framework with registry pattern. Backend provides data endpoints per widget type + a layout persistence API. Frontend uses react-grid-layout for drag/resize, with a widget registry mapping types to React components. Per-user layouts stored as JSON.

**Tech Stack:** FastAPI + SQLAlchemy async (backend), React 19 + Mantine 8 + react-grid-layout (frontend), psutil + httpx + feedparser (backend deps)

---

### Task 1: Add Backend Dependencies

**Files:**
- Modify: `backend/pyproject.toml`

**Step 1: Add new dependencies**

Add to the `dependencies` list in `pyproject.toml`:

```toml
    "httpx>=0.28",
    "feedparser>=6.0",
    "psutil>=6.0",
    "docker>=7.0",
```

Note: `httpx` is already in `[project.optional-dependencies] dev` — move it to main `dependencies`.

**Step 2: Install**

Run: `cd backend && uv sync`
Expected: Resolves and installs new packages without errors.

**Step 3: Commit**

```bash
git add backend/pyproject.toml backend/uv.lock
git commit -m "chore: add httpx, feedparser, psutil, docker dependencies"
```

---

### Task 2: Add Frontend Dependencies

**Files:**
- Modify: `frontend/package.json`

**Step 1: Install react-grid-layout**

Run: `cd frontend && npm install react-grid-layout @types/react-grid-layout`
Expected: Installs successfully.

**Step 2: Type-check**

Run: `cd frontend && npx react-router typegen && npx tsc --noEmit`
Expected: PASS

**Step 3: Commit**

```bash
git add frontend/package.json frontend/package-lock.json
git commit -m "chore: add react-grid-layout dependency"
```

---

### Task 3: Data Models — DashboardLayout, Bookmark, RssFeed

**Files:**
- Create: `backend/app/models/widget.py`
- Modify: `backend/app/models/__init__.py`

**Step 1: Write the models**

Create `backend/app/models/widget.py`:

```python
import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.user import Base


class DashboardLayout(Base):
    __tablename__ = "dashboard_layouts"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), unique=True, index=True
    )
    widgets: Mapped[dict] = mapped_column(JSON, default=list)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )


class Bookmark(Base):
    __tablename__ = "bookmarks"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    title: Mapped[str] = mapped_column(String(255))
    url: Mapped[str] = mapped_column(Text)
    category: Mapped[str | None] = mapped_column(String(100), nullable=True)
    position: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )


class RssFeed(Base):
    __tablename__ = "rss_feeds"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    url: Mapped[str] = mapped_column(Text)
    title: Mapped[str | None] = mapped_column(String(255), nullable=True)
    last_fetched_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    cached_items: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )
```

**Step 2: Update `__init__.py` to export new models**

In `backend/app/models/__init__.py`, add imports so Alembic sees them:

```python
from app.models.user import Base, User, RefreshToken, PasswordResetToken
from app.models.widget import DashboardLayout, Bookmark, RssFeed
```

**Step 3: Generate migration**

Run: `cd backend && uv run alembic revision --autogenerate -m "add widget models"`
Expected: Creates migration file with `dashboard_layouts`, `bookmarks`, `rss_feeds` tables.

**Step 4: Apply migration**

Run: `cd backend && uv run alembic upgrade head`
Expected: Tables created successfully.

**Step 5: Run existing tests to verify no regressions**

Run: `cd backend && uv run pytest tests/ -v`
Expected: All existing tests PASS.

**Step 6: Commit**

```bash
git add backend/app/models/widget.py backend/app/models/__init__.py backend/alembic/versions/
git commit -m "feat: add DashboardLayout, Bookmark, RssFeed models"
```

---

### Task 4: Pydantic Schemas for Widgets

**Files:**
- Create: `backend/app/schemas/widget.py`

**Step 1: Write the schemas**

```python
from datetime import datetime

from pydantic import BaseModel, HttpUrl


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
```

**Step 2: Commit**

```bash
git add backend/app/schemas/widget.py
git commit -m "feat: add Pydantic schemas for widgets"
```

---

### Task 5: Config — Add OpenWeatherMap API Key

**Files:**
- Modify: `backend/app/config.py`
- Modify: `.env.example`

**Step 1: Add to Settings class**

In `backend/app/config.py`, add to the `Settings` class:

```python
    # Widgets
    openweathermap_api_key: str = ""
```

**Step 2: Update `.env.example`**

Add:

```
# Widgets
# OPENWEATHERMAP_API_KEY=your-api-key-here
```

**Step 3: Commit**

```bash
git add backend/app/config.py .env.example
git commit -m "feat: add OpenWeatherMap API key to config"
```

---

### Task 6: Widget Layout Service + Router

**Files:**
- Create: `backend/app/services/widget.py`
- Create: `backend/app/routers/widgets.py`
- Modify: `backend/app/main.py`
- Create: `backend/tests/test_widget_layout.py`

**Step 1: Write failing test**

Create `backend/tests/test_widget_layout.py`:

```python
import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.database import get_db
from app.main import create_app
from app.models import Base


@pytest_asyncio.fixture
async def app_client():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    session_factory = async_sessionmaker(engine, expire_on_commit=False)
    app = create_app()

    async def override_get_db():
        async with session_factory() as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client
    await engine.dispose()


async def _register_and_get_token(client: AsyncClient) -> str:
    resp = await client.post(
        "/api/auth/register",
        json={
            "email": "test@test.com",
            "first_name": "Test",
            "last_name": "User",
            "password": "password123",
        },
    )
    return resp.json()["access_token"]


@pytest.mark.asyncio
async def test_get_layout_empty(app_client: AsyncClient):
    token = await _register_and_get_token(app_client)
    resp = await app_client.get(
        "/api/widgets/layout",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    assert resp.json()["widgets"] == []


@pytest.mark.asyncio
async def test_save_and_get_layout(app_client: AsyncClient):
    token = await _register_and_get_token(app_client)
    headers = {"Authorization": f"Bearer {token}"}
    widgets = [
        {"id": "w1", "type": "clock", "x": 0, "y": 0, "w": 1, "h": 1, "config": {}},
    ]
    resp = await app_client.put(
        "/api/widgets/layout",
        json={"widgets": widgets},
        headers=headers,
    )
    assert resp.status_code == 200

    resp = await app_client.get("/api/widgets/layout", headers=headers)
    assert resp.status_code == 200
    assert len(resp.json()["widgets"]) == 1
    assert resp.json()["widgets"][0]["type"] == "clock"
```

**Step 2: Run test — verify it fails**

Run: `cd backend && uv run pytest tests/test_widget_layout.py -v`
Expected: FAIL (router not found)

**Step 3: Write the service**

Create `backend/app/services/widget.py`:

```python
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.widget import DashboardLayout


class WidgetLayoutService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_layout(self, user_id: str) -> DashboardLayout | None:
        result = await self.db.execute(
            select(DashboardLayout).where(DashboardLayout.user_id == user_id)
        )
        return result.scalar_one_or_none()

    async def save_layout(self, user_id: str, widgets: list[dict]) -> DashboardLayout:
        layout = await self.get_layout(user_id)
        if layout is None:
            layout = DashboardLayout(user_id=user_id, widgets=widgets)
            self.db.add(layout)
        else:
            layout.widgets = widgets
        await self.db.commit()
        await self.db.refresh(layout)
        return layout
```

**Step 4: Write the router**

Create `backend/app/routers/widgets.py`:

```python
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.widget import WidgetLayoutResponse, WidgetLayoutUpdateRequest
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
    layout = await service.save_layout(
        user.id, [w.model_dump() for w in body.widgets]
    )
    return WidgetLayoutResponse(widgets=layout.widgets)
```

**Step 5: Register router in main.py**

In `backend/app/main.py`, add import and include:

```python
from app.routers import auth, users, widgets
# ...
app.include_router(widgets.router)
```

**Step 6: Run tests — verify they pass**

Run: `cd backend && uv run pytest tests/test_widget_layout.py -v`
Expected: PASS

**Step 7: Run all tests**

Run: `cd backend && uv run pytest tests/ -v`
Expected: All PASS

**Step 8: Commit**

```bash
git add backend/app/services/widget.py backend/app/routers/widgets.py backend/app/main.py backend/tests/test_widget_layout.py
git commit -m "feat: add widget layout API (save/load per-user grid)"
```

---

### Task 7: Weather Service + Endpoint

**Files:**
- Create: `backend/app/services/weather.py`
- Modify: `backend/app/routers/widgets.py`
- Create: `backend/tests/test_weather.py`

**Step 1: Write the weather service with in-memory cache**

Create `backend/app/services/weather.py`:

```python
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
```

**Step 2: Add weather endpoint to widgets router**

In `backend/app/routers/widgets.py`, add:

```python
from fastapi import Query, HTTPException, status
from app.schemas.widget import WeatherResponse
from app.services.weather import fetch_weather

@router.get("/weather", response_model=WeatherResponse)
async def get_weather(
    city: str = Query(..., min_length=1),
    units: str = Query("metric", pattern="^(metric|imperial)$"),
    _user: User = Depends(get_current_user),
):
    try:
        data = await fetch_weather(city, units)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(e))
    except Exception:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Weather service unavailable")
    return WeatherResponse(**data)
```

**Step 3: Write test**

Create `backend/tests/test_weather.py`:

```python
import pytest

from app.services.weather import _cache, fetch_weather


@pytest.mark.asyncio
async def test_weather_no_api_key(monkeypatch):
    monkeypatch.setattr("app.services.weather.settings.openweathermap_api_key", "")
    _cache.clear()
    with pytest.raises(ValueError, match="API key not configured"):
        await fetch_weather("Prague")


@pytest.mark.asyncio
async def test_weather_cache_hit(monkeypatch):
    import time
    _cache.clear()
    _cache["Prague:metric"] = (time.time(), {
        "city": "Prague",
        "temp": 5.0,
        "feels_like": 2.0,
        "humidity": 80,
        "wind_speed": 3.0,
        "description": "clear sky",
        "icon": "01d",
    })
    result = await fetch_weather("Prague")
    assert result["city"] == "Prague"
    assert result["temp"] == 5.0
```

**Step 4: Run tests**

Run: `cd backend && uv run pytest tests/test_weather.py -v`
Expected: PASS

**Step 5: Commit**

```bash
git add backend/app/services/weather.py backend/app/routers/widgets.py backend/tests/test_weather.py
git commit -m "feat: add weather widget endpoint with caching"
```

---

### Task 8: Bookmarks Service + Router

**Files:**
- Create: `backend/app/services/bookmark.py`
- Create: `backend/app/routers/bookmarks.py`
- Modify: `backend/app/main.py`
- Create: `backend/tests/test_bookmarks.py`

**Step 1: Write failing test**

Create `backend/tests/test_bookmarks.py`:

```python
import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.database import get_db
from app.main import create_app
from app.models import Base


@pytest_asyncio.fixture
async def app_client():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    session_factory = async_sessionmaker(engine, expire_on_commit=False)
    app = create_app()

    async def override_get_db():
        async with session_factory() as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client
    await engine.dispose()


async def _auth_header(client: AsyncClient) -> dict:
    resp = await client.post(
        "/api/auth/register",
        json={
            "email": "test@test.com",
            "first_name": "Test",
            "last_name": "User",
            "password": "password123",
        },
    )
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_create_and_list_bookmarks(app_client: AsyncClient):
    headers = await _auth_header(app_client)
    resp = await app_client.post(
        "/api/bookmarks",
        json={"title": "GitHub", "url": "https://github.com", "category": "Dev"},
        headers=headers,
    )
    assert resp.status_code == 200
    assert resp.json()["title"] == "GitHub"

    resp = await app_client.get("/api/bookmarks", headers=headers)
    assert resp.status_code == 200
    assert len(resp.json()) == 1


@pytest.mark.asyncio
async def test_update_bookmark(app_client: AsyncClient):
    headers = await _auth_header(app_client)
    resp = await app_client.post(
        "/api/bookmarks",
        json={"title": "Old", "url": "https://old.com"},
        headers=headers,
    )
    bookmark_id = resp.json()["id"]
    resp = await app_client.patch(
        f"/api/bookmarks/{bookmark_id}",
        json={"title": "New"},
        headers=headers,
    )
    assert resp.status_code == 200
    assert resp.json()["title"] == "New"


@pytest.mark.asyncio
async def test_delete_bookmark(app_client: AsyncClient):
    headers = await _auth_header(app_client)
    resp = await app_client.post(
        "/api/bookmarks",
        json={"title": "Delete Me", "url": "https://delete.com"},
        headers=headers,
    )
    bookmark_id = resp.json()["id"]
    resp = await app_client.delete(f"/api/bookmarks/{bookmark_id}", headers=headers)
    assert resp.status_code == 204

    resp = await app_client.get("/api/bookmarks", headers=headers)
    assert len(resp.json()) == 0
```

**Step 2: Run tests — verify they fail**

Run: `cd backend && uv run pytest tests/test_bookmarks.py -v`
Expected: FAIL

**Step 3: Write bookmark service**

Create `backend/app/services/bookmark.py`:

```python
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.widget import Bookmark


class BookmarkService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def list_bookmarks(self, user_id: str) -> list[Bookmark]:
        result = await self.db.execute(
            select(Bookmark)
            .where(Bookmark.user_id == user_id)
            .order_by(Bookmark.category, Bookmark.position)
        )
        return list(result.scalars().all())

    async def create_bookmark(self, user_id: str, **kwargs) -> Bookmark:
        bookmark = Bookmark(user_id=user_id, **kwargs)
        self.db.add(bookmark)
        await self.db.commit()
        await self.db.refresh(bookmark)
        return bookmark

    async def update_bookmark(
        self, user_id: str, bookmark_id: str, **kwargs
    ) -> Bookmark | None:
        result = await self.db.execute(
            select(Bookmark).where(
                Bookmark.id == bookmark_id, Bookmark.user_id == user_id
            )
        )
        bookmark = result.scalar_one_or_none()
        if bookmark is None:
            return None
        for key, value in kwargs.items():
            if value is not None:
                setattr(bookmark, key, value)
        await self.db.commit()
        await self.db.refresh(bookmark)
        return bookmark

    async def delete_bookmark(self, user_id: str, bookmark_id: str) -> bool:
        result = await self.db.execute(
            select(Bookmark).where(
                Bookmark.id == bookmark_id, Bookmark.user_id == user_id
            )
        )
        bookmark = result.scalar_one_or_none()
        if bookmark is None:
            return False
        await self.db.delete(bookmark)
        await self.db.commit()
        return True
```

**Step 4: Write bookmarks router**

Create `backend/app/routers/bookmarks.py`:

```python
from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.widget import BookmarkCreate, BookmarkResponse, BookmarkUpdate
from app.services.bookmark import BookmarkService

router = APIRouter(prefix="/api/bookmarks", tags=["bookmarks"])


@router.get("", response_model=list[BookmarkResponse])
async def list_bookmarks(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = BookmarkService(db)
    return await service.list_bookmarks(user.id)


@router.post("", response_model=BookmarkResponse)
async def create_bookmark(
    body: BookmarkCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = BookmarkService(db)
    return await service.create_bookmark(
        user.id,
        title=body.title,
        url=body.url,
        category=body.category,
        position=body.position,
    )


@router.patch("/{bookmark_id}", response_model=BookmarkResponse)
async def update_bookmark(
    bookmark_id: str,
    body: BookmarkUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = BookmarkService(db)
    bookmark = await service.update_bookmark(
        user.id,
        bookmark_id,
        title=body.title,
        url=body.url,
        category=body.category,
        position=body.position,
    )
    if bookmark is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bookmark not found")
    return bookmark


@router.delete("/{bookmark_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_bookmark(
    bookmark_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = BookmarkService(db)
    deleted = await service.delete_bookmark(user.id, bookmark_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bookmark not found")
    return Response(status_code=status.HTTP_204_NO_CONTENT)
```

**Step 5: Register in main.py**

```python
from app.routers import auth, users, widgets, bookmarks
# ...
app.include_router(bookmarks.router)
```

**Step 6: Run tests**

Run: `cd backend && uv run pytest tests/test_bookmarks.py -v`
Expected: PASS

Run: `cd backend && uv run pytest tests/ -v`
Expected: All PASS

**Step 7: Commit**

```bash
git add backend/app/services/bookmark.py backend/app/routers/bookmarks.py backend/app/main.py backend/tests/test_bookmarks.py
git commit -m "feat: add bookmarks CRUD API"
```

---

### Task 9: RSS Service + Router + Background Refresh

**Files:**
- Create: `backend/app/services/rss.py`
- Create: `backend/app/routers/rss.py`
- Modify: `backend/app/main.py`
- Create: `backend/tests/test_rss.py`

**Step 1: Write failing test**

Create `backend/tests/test_rss.py`:

```python
import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.database import get_db
from app.main import create_app
from app.models import Base


@pytest_asyncio.fixture
async def app_client():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    session_factory = async_sessionmaker(engine, expire_on_commit=False)
    app = create_app()

    async def override_get_db():
        async with session_factory() as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client
    await engine.dispose()


async def _auth_header(client: AsyncClient) -> dict:
    resp = await client.post(
        "/api/auth/register",
        json={
            "email": "test@test.com",
            "first_name": "Test",
            "last_name": "User",
            "password": "password123",
        },
    )
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_add_and_list_feeds(app_client: AsyncClient):
    headers = await _auth_header(app_client)
    resp = await app_client.post(
        "/api/rss/feeds",
        json={"url": "https://example.com/feed.xml"},
        headers=headers,
    )
    assert resp.status_code == 200
    assert resp.json()["url"] == "https://example.com/feed.xml"

    resp = await app_client.get("/api/rss/feeds", headers=headers)
    assert resp.status_code == 200
    assert len(resp.json()) == 1


@pytest.mark.asyncio
async def test_delete_feed(app_client: AsyncClient):
    headers = await _auth_header(app_client)
    resp = await app_client.post(
        "/api/rss/feeds",
        json={"url": "https://example.com/feed.xml"},
        headers=headers,
    )
    feed_id = resp.json()["id"]
    resp = await app_client.delete(f"/api/rss/feeds/{feed_id}", headers=headers)
    assert resp.status_code == 204

    resp = await app_client.get("/api/rss/feeds", headers=headers)
    assert len(resp.json()) == 0


@pytest.mark.asyncio
async def test_get_items_empty(app_client: AsyncClient):
    headers = await _auth_header(app_client)
    resp = await app_client.get("/api/rss/items", headers=headers)
    assert resp.status_code == 200
    assert resp.json() == []
```

**Step 2: Run tests — verify they fail**

Run: `cd backend && uv run pytest tests/test_rss.py -v`
Expected: FAIL

**Step 3: Write RSS service**

Create `backend/app/services/rss.py`:

```python
import logging
from datetime import datetime, timezone

import feedparser
import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.widget import RssFeed

logger = logging.getLogger(__name__)


class RssService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def list_feeds(self, user_id: str) -> list[RssFeed]:
        result = await self.db.execute(
            select(RssFeed).where(RssFeed.user_id == user_id)
        )
        return list(result.scalars().all())

    async def add_feed(self, user_id: str, url: str) -> RssFeed:
        feed = RssFeed(user_id=user_id, url=url)
        self.db.add(feed)
        await self.db.commit()
        await self.db.refresh(feed)
        # Try to fetch immediately (best effort)
        try:
            await self._refresh_feed(feed)
        except Exception:
            logger.warning("Failed initial fetch for feed %s", url)
        return feed

    async def delete_feed(self, user_id: str, feed_id: str) -> bool:
        result = await self.db.execute(
            select(RssFeed).where(
                RssFeed.id == feed_id, RssFeed.user_id == user_id
            )
        )
        feed = result.scalar_one_or_none()
        if feed is None:
            return False
        await self.db.delete(feed)
        await self.db.commit()
        return True

    async def get_items(self, user_id: str) -> list[dict]:
        feeds = await self.list_feeds(user_id)
        items = []
        for feed in feeds:
            if feed.cached_items:
                for item in feed.cached_items:
                    item["source"] = feed.title or feed.url
                    items.append(item)
        items.sort(key=lambda x: x.get("published", ""), reverse=True)
        return items

    async def _refresh_feed(self, feed: RssFeed) -> None:
        async with httpx.AsyncClient() as client:
            resp = await client.get(feed.url, timeout=15, follow_redirects=True)
            resp.raise_for_status()

        parsed = feedparser.parse(resp.text)
        if parsed.feed.get("title"):
            feed.title = parsed.feed.title

        feed.cached_items = [
            {
                "title": entry.get("title", ""),
                "link": entry.get("link", ""),
                "published": entry.get("published", ""),
            }
            for entry in parsed.entries[:50]
        ]
        feed.last_fetched_at = datetime.now(timezone.utc)
        await self.db.commit()

    async def refresh_all_feeds(self) -> None:
        result = await self.db.execute(select(RssFeed))
        feeds = result.scalars().all()
        for feed in feeds:
            try:
                await self._refresh_feed(feed)
            except Exception:
                logger.warning("Failed to refresh feed %s", feed.url)
```

**Step 4: Write RSS router**

Create `backend/app/routers/rss.py`:

```python
from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.widget import RssFeedCreate, RssFeedResponse, RssItemResponse
from app.services.rss import RssService

router = APIRouter(prefix="/api/rss", tags=["rss"])


@router.get("/feeds", response_model=list[RssFeedResponse])
async def list_feeds(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = RssService(db)
    return await service.list_feeds(user.id)


@router.post("/feeds", response_model=RssFeedResponse)
async def add_feed(
    body: RssFeedCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = RssService(db)
    return await service.add_feed(user.id, body.url)


@router.delete("/feeds/{feed_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_feed(
    feed_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = RssService(db)
    deleted = await service.delete_feed(user.id, feed_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Feed not found")
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/items", response_model=list[RssItemResponse])
async def get_items(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = RssService(db)
    return await service.get_items(user.id)
```

**Step 5: Register router and add background task in main.py**

Update `backend/app/main.py`:

```python
import asyncio
import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import __version__
from app.config import settings
from app.database import async_session_factory
from app.routers import auth, bookmarks, rss, users, widgets
from app.services.rss import RssService

logger = logging.getLogger(__name__)


async def _rss_refresh_loop():
    while True:
        await asyncio.sleep(900)  # 15 minutes
        try:
            async with async_session_factory() as db:
                service = RssService(db)
                await service.refresh_all_feeds()
        except Exception:
            logger.warning("RSS refresh cycle failed")


def create_app() -> FastAPI:
    app = FastAPI(title="Unfust", version=__version__)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=[settings.frontend_url],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(auth.router)
    app.include_router(users.router)
    app.include_router(widgets.router)
    app.include_router(bookmarks.router)
    app.include_router(rss.router)

    @app.on_event("startup")
    async def start_rss_refresh():
        asyncio.create_task(_rss_refresh_loop())

    @app.get("/api/health")
    async def health():
        return {"status": "ok", "version": __version__}

    return app


app = create_app()
```

**Step 6: Run tests**

Run: `cd backend && uv run pytest tests/test_rss.py -v`
Expected: PASS

Run: `cd backend && uv run pytest tests/ -v`
Expected: All PASS

**Step 7: Commit**

```bash
git add backend/app/services/rss.py backend/app/routers/rss.py backend/app/main.py backend/tests/test_rss.py
git commit -m "feat: add RSS feed API with background refresh"
```

---

### Task 10: System Monitor Endpoint

**Files:**
- Create: `backend/app/services/system.py`
- Modify: `backend/app/routers/widgets.py`
- Create: `backend/tests/test_system.py`

**Step 1: Write system service**

Create `backend/app/services/system.py`:

```python
import logging

import psutil

logger = logging.getLogger(__name__)


def get_host_stats() -> dict:
    mem = psutil.virtual_memory()
    disk = psutil.disk_usage("/")
    return {
        "cpu_percent": psutil.cpu_percent(interval=0.5),
        "memory_percent": mem.percent,
        "memory_used_gb": round(mem.used / (1024**3), 2),
        "memory_total_gb": round(mem.total / (1024**3), 2),
        "disk_percent": disk.percent,
        "disk_used_gb": round(disk.used / (1024**3), 2),
        "disk_total_gb": round(disk.total / (1024**3), 2),
    }


def get_container_stats() -> list[dict] | None:
    try:
        import docker

        client = docker.from_env()
        containers = client.containers.list()
        return [
            {
                "name": c.name,
                "status": c.status,
                "image": str(c.image.tags[0]) if c.image.tags else str(c.image.id[:12]),
            }
            for c in containers
        ]
    except Exception:
        logger.debug("Docker not available for container stats")
        return None
```

**Step 2: Add system endpoint to widgets router**

In `backend/app/routers/widgets.py`, add:

```python
from app.schemas.widget import SystemStatsResponse
from app.services.system import get_host_stats, get_container_stats

@router.get("/system", response_model=SystemStatsResponse)
async def get_system_stats(
    _user: User = Depends(get_current_user),
):
    stats = get_host_stats()
    stats["containers"] = get_container_stats()
    return SystemStatsResponse(**stats)
```

**Step 3: Write test**

Create `backend/tests/test_system.py`:

```python
from app.services.system import get_host_stats


def test_get_host_stats():
    stats = get_host_stats()
    assert "cpu_percent" in stats
    assert "memory_percent" in stats
    assert "disk_percent" in stats
    assert stats["memory_total_gb"] > 0
    assert stats["disk_total_gb"] > 0
```

**Step 4: Run tests**

Run: `cd backend && uv run pytest tests/test_system.py -v`
Expected: PASS

Run: `cd backend && uv run pytest tests/ -v`
Expected: All PASS

**Step 5: Commit**

```bash
git add backend/app/services/system.py backend/app/routers/widgets.py backend/tests/test_system.py
git commit -m "feat: add system monitor endpoint (host + Docker stats)"
```

---

### Task 11: Frontend API Client Functions

**Files:**
- Modify: `frontend/app/lib/api.ts`

**Step 1: Add widget API functions**

Append to `frontend/app/lib/api.ts`:

```typescript
// --- Widget Layout ---

export interface WidgetInstance {
  id: string;
  type: string;
  x: number;
  y: number;
  w: number;
  h: number;
  config: Record<string, any>;
}

export interface WidgetLayout {
  widgets: WidgetInstance[];
}

export async function getWidgetLayout(): Promise<WidgetLayout> {
  const resp = await apiClient("/api/widgets/layout");
  return resp.json();
}

export async function saveWidgetLayout(widgets: WidgetInstance[]): Promise<void> {
  await apiClient("/api/widgets/layout", {
    method: "PUT",
    body: JSON.stringify({ widgets }),
  });
}

// --- Weather ---

export interface WeatherData {
  city: string;
  temp: number;
  feels_like: number;
  humidity: number;
  wind_speed: number;
  description: string;
  icon: string;
}

export async function fetchWeather(city: string, units = "metric"): Promise<WeatherData> {
  const resp = await apiClient(`/api/widgets/weather?city=${encodeURIComponent(city)}&units=${units}`);
  return resp.json();
}

// --- Bookmarks ---

export interface Bookmark {
  id: string;
  title: string;
  url: string;
  category: string | null;
  position: number;
  created_at: string;
}

export async function getBookmarks(): Promise<Bookmark[]> {
  const resp = await apiClient("/api/bookmarks");
  return resp.json();
}

export async function createBookmark(data: { title: string; url: string; category?: string }): Promise<Bookmark> {
  const resp = await apiClient("/api/bookmarks", {
    method: "POST",
    body: JSON.stringify(data),
  });
  return resp.json();
}

export async function updateBookmark(id: string, data: Partial<Bookmark>): Promise<Bookmark> {
  const resp = await apiClient(`/api/bookmarks/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
  return resp.json();
}

export async function deleteBookmark(id: string): Promise<void> {
  await apiClient(`/api/bookmarks/${id}`, { method: "DELETE" });
}

// --- RSS ---

export interface RssFeed {
  id: string;
  url: string;
  title: string | null;
  last_fetched_at: string | null;
  created_at: string;
}

export interface RssItem {
  title: string;
  link: string;
  published: string | null;
  source: string | null;
}

export async function getRssFeeds(): Promise<RssFeed[]> {
  const resp = await apiClient("/api/rss/feeds");
  return resp.json();
}

export async function addRssFeed(url: string): Promise<RssFeed> {
  const resp = await apiClient("/api/rss/feeds", {
    method: "POST",
    body: JSON.stringify({ url }),
  });
  return resp.json();
}

export async function deleteRssFeed(id: string): Promise<void> {
  await apiClient(`/api/rss/feeds/${id}`, { method: "DELETE" });
}

export async function getRssItems(): Promise<RssItem[]> {
  const resp = await apiClient("/api/rss/items");
  return resp.json();
}

// --- System ---

export interface SystemStats {
  cpu_percent: number;
  memory_percent: number;
  memory_used_gb: number;
  memory_total_gb: number;
  disk_percent: number;
  disk_used_gb: number;
  disk_total_gb: number;
  containers: { name: string; status: string; image: string }[] | null;
}

export async function fetchSystemStats(): Promise<SystemStats> {
  const resp = await apiClient("/api/widgets/system");
  return resp.json();
}
```

**Step 2: Type-check**

Run: `cd frontend && npx react-router typegen && npx tsc --noEmit`
Expected: PASS

**Step 3: Commit**

```bash
git add frontend/app/lib/api.ts
git commit -m "feat: add frontend API client functions for all widgets"
```

---

### Task 12: WidgetCard Wrapper Component

**Files:**
- Create: `frontend/app/components/WidgetCard.tsx`

**Step 1: Write the component**

```tsx
import { ActionIcon, Group, Paper, Text } from "@mantine/core";
import type { ReactNode } from "react";

function IconSettings({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function IconX({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

interface WidgetCardProps {
  title: string;
  children: ReactNode;
  onSettings?: () => void;
  onRemove?: () => void;
}

export function WidgetCard({ title, children, onSettings, onRemove }: WidgetCardProps) {
  return (
    <Paper
      withBorder
      radius="md"
      h="100%"
      style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}
    >
      <Group
        justify="space-between"
        px="sm"
        py={6}
        style={{ borderBottom: "1px solid var(--mantine-color-default-border)", flexShrink: 0 }}
      >
        <Text size="xs" fw={600} tt="uppercase" c="dimmed" ff="monospace">
          {title}
        </Text>
        <Group gap={4}>
          {onSettings && (
            <ActionIcon variant="subtle" size="xs" color="gray" onClick={onSettings}>
              <IconSettings size={14} />
            </ActionIcon>
          )}
          {onRemove && (
            <ActionIcon variant="subtle" size="xs" color="gray" onClick={onRemove}>
              <IconX size={14} />
            </ActionIcon>
          )}
        </Group>
      </Group>
      <div style={{ flex: 1, padding: "var(--mantine-spacing-sm)", overflow: "auto" }}>
        {children}
      </div>
    </Paper>
  );
}
```

**Step 2: Type-check**

Run: `cd frontend && npx react-router typegen && npx tsc --noEmit`
Expected: PASS

**Step 3: Commit**

```bash
git add frontend/app/components/WidgetCard.tsx
git commit -m "feat: add WidgetCard wrapper component"
```

---

### Task 13: Clock Widget

**Files:**
- Create: `frontend/app/components/widgets/ClockWidget.tsx`

**Step 1: Write the component**

```tsx
import { Stack, Text } from "@mantine/core";
import { useEffect, useState } from "react";

interface ClockWidgetProps {
  config: { timezone?: string; format?: "12h" | "24h" };
}

export function ClockWidget({ config }: ClockWidgetProps) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const timeOptions: Intl.DateTimeFormatOptions = {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: config.format === "12h",
    timeZone: config.timezone || undefined,
  };

  const dateOptions: Intl.DateTimeFormatOptions = {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: config.timezone || undefined,
  };

  return (
    <Stack align="center" justify="center" h="100%" gap={4}>
      <Text size="2rem" fw={700} ff="monospace" lh={1}>
        {now.toLocaleTimeString(undefined, timeOptions)}
      </Text>
      <Text size="sm" c="dimmed">
        {now.toLocaleDateString(undefined, dateOptions)}
      </Text>
      {config.timezone && (
        <Text size="xs" c="dimmed" ff="monospace">
          {config.timezone}
        </Text>
      )}
    </Stack>
  );
}
```

**Step 2: Type-check**

Run: `cd frontend && npx react-router typegen && npx tsc --noEmit`
Expected: PASS

**Step 3: Commit**

```bash
git add frontend/app/components/widgets/ClockWidget.tsx
git commit -m "feat: add clock widget component"
```

---

### Task 14: Weather Widget

**Files:**
- Create: `frontend/app/components/widgets/WeatherWidget.tsx`

**Step 1: Write the component**

```tsx
import { Group, Loader, Stack, Text } from "@mantine/core";
import { useCallback, useEffect, useState } from "react";
import { type WeatherData, fetchWeather } from "~/lib/api";

interface WeatherWidgetProps {
  config: { city?: string; units?: "metric" | "imperial" };
}

export function WeatherWidget({ config }: WeatherWidgetProps) {
  const [data, setData] = useState<WeatherData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const city = config.city || "London";
  const units = config.units || "metric";

  const load = useCallback(async () => {
    try {
      const result = await fetchWeather(city, units);
      setData(result);
      setError(null);
    } catch (err: any) {
      setError(err.message || "Failed to load weather");
    }
  }, [city, units]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 600_000); // 10 min
    return () => clearInterval(interval);
  }, [load]);

  if (error) {
    return (
      <Stack align="center" justify="center" h="100%">
        <Text size="sm" c="red">{error}</Text>
      </Stack>
    );
  }

  if (!data) {
    return (
      <Stack align="center" justify="center" h="100%">
        <Loader size="sm" />
      </Stack>
    );
  }

  const tempUnit = units === "metric" ? "°C" : "°F";

  return (
    <Stack gap="xs" justify="center" h="100%">
      <Group justify="space-between">
        <Text fw={700} size="xl">
          {Math.round(data.temp)}{tempUnit}
        </Text>
        <img
          src={`https://openweathermap.org/img/wn/${data.icon}@2x.png`}
          alt={data.description}
          width={48}
          height={48}
        />
      </Group>
      <Text size="sm" c="dimmed" tt="capitalize">{data.description}</Text>
      <Group gap="lg">
        <Text size="xs" c="dimmed">Feels like {Math.round(data.feels_like)}{tempUnit}</Text>
        <Text size="xs" c="dimmed">Humidity {data.humidity}%</Text>
        <Text size="xs" c="dimmed">Wind {data.wind_speed} {units === "metric" ? "m/s" : "mph"}</Text>
      </Group>
    </Stack>
  );
}
```

**Step 2: Type-check**

Run: `cd frontend && npx react-router typegen && npx tsc --noEmit`
Expected: PASS

**Step 3: Commit**

```bash
git add frontend/app/components/widgets/WeatherWidget.tsx
git commit -m "feat: add weather widget component"
```

---

### Task 15: Bookmarks Widget

**Files:**
- Create: `frontend/app/components/widgets/BookmarksWidget.tsx`

**Step 1: Write the component**

```tsx
import {
  ActionIcon,
  Anchor,
  Button,
  Group,
  Modal,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import { useCallback, useEffect, useState } from "react";
import {
  type Bookmark,
  createBookmark,
  deleteBookmark,
  getBookmarks,
} from "~/lib/api";

function IconPlus({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function IconTrash({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

export function BookmarksWidget() {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [opened, { open, close }] = useDisclosure(false);
  const form = useForm({ initialValues: { title: "", url: "", category: "" } });

  const load = useCallback(async () => {
    try {
      setBookmarks(await getBookmarks());
    } catch {}
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async (values: typeof form.values) => {
    await createBookmark({
      title: values.title,
      url: values.url,
      category: values.category || undefined,
    });
    form.reset();
    close();
    await load();
  };

  const handleDelete = async (id: string) => {
    await deleteBookmark(id);
    await load();
  };

  const grouped = bookmarks.reduce<Record<string, Bookmark[]>>((acc, b) => {
    const cat = b.category || "Uncategorized";
    (acc[cat] ||= []).push(b);
    return acc;
  }, {});

  return (
    <>
      <Stack gap="xs" h="100%">
        {Object.entries(grouped).map(([category, items]) => (
          <div key={category}>
            <Text size="xs" c="dimmed" fw={600} mb={4}>{category}</Text>
            {items.map((b) => (
              <Group key={b.id} gap="xs" mb={2} wrap="nowrap">
                <Anchor href={b.url} target="_blank" size="sm" style={{ flex: 1 }} lineClamp={1}>
                  {b.title}
                </Anchor>
                <ActionIcon variant="subtle" size="xs" color="gray" onClick={() => handleDelete(b.id)}>
                  <IconTrash size={12} />
                </ActionIcon>
              </Group>
            ))}
          </div>
        ))}
        {bookmarks.length === 0 && (
          <Text size="sm" c="dimmed" ta="center">No bookmarks yet</Text>
        )}
        <Button variant="light" size="xs" leftSection={<IconPlus />} onClick={open}>
          Add bookmark
        </Button>
      </Stack>

      <Modal opened={opened} onClose={close} title="Add bookmark" size="sm">
        <form onSubmit={form.onSubmit(handleAdd)}>
          <Stack gap="sm">
            <TextInput label="Title" required {...form.getInputProps("title")} />
            <TextInput label="URL" required {...form.getInputProps("url")} />
            <TextInput label="Category" {...form.getInputProps("category")} />
            <Button type="submit">Add</Button>
          </Stack>
        </form>
      </Modal>
    </>
  );
}
```

**Step 2: Type-check**

Run: `cd frontend && npx react-router typegen && npx tsc --noEmit`
Expected: PASS

**Step 3: Commit**

```bash
git add frontend/app/components/widgets/BookmarksWidget.tsx
git commit -m "feat: add bookmarks widget component"
```

---

### Task 16: RSS Widget

**Files:**
- Create: `frontend/app/components/widgets/RssWidget.tsx`

**Step 1: Write the component**

```tsx
import {
  Anchor,
  Button,
  Group,
  Loader,
  Modal,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useCallback, useEffect, useState } from "react";
import {
  type RssItem,
  addRssFeed,
  getRssFeeds,
  getRssItems,
  deleteRssFeed,
} from "~/lib/api";

export function RssWidget() {
  const [items, setItems] = useState<RssItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [opened, { open, close }] = useDisclosure(false);
  const [feedUrl, setFeedUrl] = useState("");

  const load = useCallback(async () => {
    try {
      setItems(await getRssItems());
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 900_000); // 15 min
    return () => clearInterval(interval);
  }, [load]);

  const handleAddFeed = async () => {
    if (!feedUrl.trim()) return;
    await addRssFeed(feedUrl.trim());
    setFeedUrl("");
    close();
    await load();
  };

  if (loading) {
    return (
      <Stack align="center" justify="center" h="100%">
        <Loader size="sm" />
      </Stack>
    );
  }

  return (
    <>
      <Stack gap={6} h="100%">
        {items.slice(0, 20).map((item, i) => (
          <div key={`${item.link}-${i}`}>
            <Anchor href={item.link} target="_blank" size="sm" lineClamp={1}>
              {item.title}
            </Anchor>
            <Group gap="xs">
              {item.source && <Text size="xs" c="dimmed">{item.source}</Text>}
              {item.published && (
                <Text size="xs" c="dimmed">{new Date(item.published).toLocaleDateString()}</Text>
              )}
            </Group>
          </div>
        ))}
        {items.length === 0 && (
          <Text size="sm" c="dimmed" ta="center">No feeds configured</Text>
        )}
        <Button variant="light" size="xs" onClick={open}>
          Manage feeds
        </Button>
      </Stack>

      <Modal opened={opened} onClose={close} title="Add RSS feed" size="sm">
        <Stack gap="sm">
          <TextInput
            label="Feed URL"
            placeholder="https://example.com/feed.xml"
            value={feedUrl}
            onChange={(e) => setFeedUrl(e.currentTarget.value)}
          />
          <Button onClick={handleAddFeed}>Add feed</Button>
        </Stack>
      </Modal>
    </>
  );
}
```

**Step 2: Type-check**

Run: `cd frontend && npx react-router typegen && npx tsc --noEmit`
Expected: PASS

**Step 3: Commit**

```bash
git add frontend/app/components/widgets/RssWidget.tsx
git commit -m "feat: add RSS feed widget component"
```

---

### Task 17: System Monitor Widget

**Files:**
- Create: `frontend/app/components/widgets/SystemWidget.tsx`

**Step 1: Write the component**

```tsx
import { Badge, Group, Loader, Progress, Stack, Text } from "@mantine/core";
import { useCallback, useEffect, useState } from "react";
import { type SystemStats, fetchSystemStats } from "~/lib/api";

function StatBar({ label, percent, detail }: { label: string; percent: number; detail: string }) {
  const color = percent > 90 ? "red" : percent > 70 ? "yellow" : "teal";
  return (
    <div>
      <Group justify="space-between" mb={2}>
        <Text size="xs" fw={600}>{label}</Text>
        <Text size="xs" c="dimmed">{detail}</Text>
      </Group>
      <Progress value={percent} size="sm" color={color} radius="xl" />
    </div>
  );
}

export function SystemWidget() {
  const [stats, setStats] = useState<SystemStats | null>(null);

  const load = useCallback(async () => {
    try {
      setStats(await fetchSystemStats());
    } catch {}
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 30_000);
    return () => clearInterval(interval);
  }, [load]);

  if (!stats) {
    return (
      <Stack align="center" justify="center" h="100%">
        <Loader size="sm" />
      </Stack>
    );
  }

  return (
    <Stack gap="sm" justify="center" h="100%">
      <StatBar label="CPU" percent={stats.cpu_percent} detail={`${stats.cpu_percent.toFixed(1)}%`} />
      <StatBar
        label="Memory"
        percent={stats.memory_percent}
        detail={`${stats.memory_used_gb} / ${stats.memory_total_gb} GB`}
      />
      <StatBar
        label="Disk"
        percent={stats.disk_percent}
        detail={`${stats.disk_used_gb} / ${stats.disk_total_gb} GB`}
      />
      {stats.containers && stats.containers.length > 0 && (
        <div>
          <Text size="xs" fw={600} mb={4}>Containers</Text>
          <Group gap={4}>
            {stats.containers.map((c) => (
              <Badge
                key={c.name}
                size="xs"
                variant="light"
                color={c.status === "running" ? "teal" : "gray"}
              >
                {c.name}
              </Badge>
            ))}
          </Group>
        </div>
      )}
    </Stack>
  );
}
```

**Step 2: Type-check**

Run: `cd frontend && npx react-router typegen && npx tsc --noEmit`
Expected: PASS

**Step 3: Commit**

```bash
git add frontend/app/components/widgets/SystemWidget.tsx
git commit -m "feat: add system monitor widget component"
```

---

### Task 18: Widget Registry + Dashboard Page Rewrite

**Files:**
- Create: `frontend/app/components/widgets/index.ts`
- Rewrite: `frontend/app/routes/dashboard/index.tsx`

**Step 1: Create widget registry**

Create `frontend/app/components/widgets/index.ts`:

```typescript
import type { ComponentType } from "react";
import { ClockWidget } from "./ClockWidget";
import { WeatherWidget } from "./WeatherWidget";
import { BookmarksWidget } from "./BookmarksWidget";
import { RssWidget } from "./RssWidget";
import { SystemWidget } from "./SystemWidget";

interface WidgetDefinition {
  component: ComponentType<{ config: any }>;
  label: string;
  defaultSize: { w: number; h: number };
  minSize?: { w: number; h: number };
}

export const widgetRegistry: Record<string, WidgetDefinition> = {
  clock: {
    component: ClockWidget,
    label: "Clock",
    defaultSize: { w: 2, h: 1 },
  },
  weather: {
    component: WeatherWidget,
    label: "Weather",
    defaultSize: { w: 2, h: 1 },
  },
  bookmarks: {
    component: BookmarksWidget as ComponentType<{ config: any }>,
    label: "Bookmarks",
    defaultSize: { w: 2, h: 2 },
  },
  rss: {
    component: RssWidget as ComponentType<{ config: any }>,
    label: "RSS Feed",
    defaultSize: { w: 2, h: 2 },
  },
  system: {
    component: SystemWidget as ComponentType<{ config: any }>,
    label: "System Monitor",
    defaultSize: { w: 2, h: 2 },
  },
};
```

**Step 2: Rewrite dashboard page**

Rewrite `frontend/app/routes/dashboard/index.tsx`:

```tsx
import { Button, Group, Loader, Menu, Stack, Text, Title } from "@mantine/core";
import { useCallback, useEffect, useRef, useState } from "react";
import { Responsive, WidthProvider } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import {
  type WidgetInstance,
  getWidgetLayout,
  saveWidgetLayout,
} from "~/lib/api";
import { useAuth } from "~/lib/auth";
import { WidgetCard } from "~/components/WidgetCard";
import { widgetRegistry } from "~/components/widgets";

const ResponsiveGrid = WidthProvider(Responsive);

export default function DashboardHome() {
  const { user } = useAuth();
  const [widgets, setWidgets] = useState<WidgetInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const saveTimeout = useRef<ReturnType<typeof setTimeout>>();

  const load = useCallback(async () => {
    try {
      const layout = await getWidgetLayout();
      setWidgets(layout.widgets);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const debouncedSave = useCallback((updated: WidgetInstance[]) => {
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => {
      saveWidgetLayout(updated).catch(() => {});
    }, 1000);
  }, []);

  const handleLayoutChange = (layout: any[]) => {
    const updated = widgets.map((w) => {
      const item = layout.find((l: any) => l.i === w.id);
      if (item) {
        return { ...w, x: item.x, y: item.y, w: item.w, h: item.h };
      }
      return w;
    });
    setWidgets(updated);
    debouncedSave(updated);
  };

  const addWidget = (type: string) => {
    const def = widgetRegistry[type];
    if (!def) return;
    const id = `${type}-${Date.now()}`;
    const newWidget: WidgetInstance = {
      id,
      type,
      x: 0,
      y: Infinity, // places at bottom
      w: def.defaultSize.w,
      h: def.defaultSize.h,
      config: {},
    };
    const updated = [...widgets, newWidget];
    setWidgets(updated);
    debouncedSave(updated);
  };

  const removeWidget = (id: string) => {
    const updated = widgets.filter((w) => w.id !== id);
    setWidgets(updated);
    debouncedSave(updated);
  };

  if (loading) {
    return (
      <Stack align="center" justify="center" h={300}>
        <Loader />
      </Stack>
    );
  }

  const gridLayout = widgets.map((w) => ({
    i: w.id,
    x: w.x,
    y: w.y,
    w: w.w,
    h: w.h,
    minW: widgetRegistry[w.type]?.minSize?.w ?? 1,
    minH: widgetRegistry[w.type]?.minSize?.h ?? 1,
  }));

  return (
    <>
      <Group justify="space-between" mb="md">
        <div>
          <Title order={2} fw={700}>
            Welcome back, {user?.first_name}
          </Title>
          <Text c="dimmed" size="sm" mt={4}>
            {widgets.length > 0
              ? "Drag and resize widgets to customize your dashboard."
              : "Add widgets to get started."}
          </Text>
        </div>
        <Menu shadow="md" position="bottom-end">
          <Menu.Target>
            <Button variant="light" size="sm">
              Add widget
            </Button>
          </Menu.Target>
          <Menu.Dropdown>
            {Object.entries(widgetRegistry).map(([type, def]) => (
              <Menu.Item key={type} onClick={() => addWidget(type)}>
                {def.label}
              </Menu.Item>
            ))}
          </Menu.Dropdown>
        </Menu>
      </Group>

      {widgets.length === 0 ? (
        <Stack align="center" justify="center" h={300}>
          <Text c="dimmed">Your dashboard is empty.</Text>
          <Menu shadow="md">
            <Menu.Target>
              <Button>Add your first widget</Button>
            </Menu.Target>
            <Menu.Dropdown>
              {Object.entries(widgetRegistry).map(([type, def]) => (
                <Menu.Item key={type} onClick={() => addWidget(type)}>
                  {def.label}
                </Menu.Item>
              ))}
            </Menu.Dropdown>
          </Menu>
        </Stack>
      ) : (
        <ResponsiveGrid
          layouts={{ lg: gridLayout }}
          breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
          cols={{ lg: 4, md: 3, sm: 2, xs: 1, xxs: 1 }}
          rowHeight={180}
          onLayoutChange={handleLayoutChange}
          draggableHandle=".widget-drag-handle"
          style={{ margin: -10 }}
        >
          {widgets.map((w) => {
            const def = widgetRegistry[w.type];
            if (!def) return null;
            const WidgetComponent = def.component;
            return (
              <div key={w.id}>
                <WidgetCard
                  title={def.label}
                  onRemove={() => removeWidget(w.id)}
                >
                  <WidgetComponent config={w.config} />
                </WidgetCard>
              </div>
            );
          })}
        </ResponsiveGrid>
      )}
    </>
  );
}
```

**Step 3: Make WidgetCard title bar draggable**

In `frontend/app/components/WidgetCard.tsx`, add `className="widget-drag-handle"` to the title `Group`:

```tsx
<Group
  className="widget-drag-handle"
  justify="space-between"
  px="sm"
  py={6}
  style={{
    borderBottom: "1px solid var(--mantine-color-default-border)",
    flexShrink: 0,
    cursor: "grab",
  }}
>
```

**Step 4: Type-check**

Run: `cd frontend && npx react-router typegen && npx tsc --noEmit`
Expected: PASS

**Step 5: Commit**

```bash
git add frontend/app/components/widgets/ frontend/app/routes/dashboard/index.tsx frontend/app/components/WidgetCard.tsx
git commit -m "feat: add widget registry and rewrite dashboard with react-grid-layout"
```

---

### Task 19: Update Docker Compose for New Features

**Files:**
- Modify: `docker-compose.dev.yml`

**Step 1: Add Docker socket mount and rebuild**

In `docker-compose.dev.yml`, update the backend service volumes:

```yaml
    volumes:
      - ./backend/app:/srv/backend/app
      - ./backend/alembic:/srv/backend/alembic
      - ./data:/srv/backend/data
      - ./.env:/srv/backend/.env:ro
      - /var/run/docker.sock:/var/run/docker.sock:ro
```

**Step 2: Commit**

```bash
git add docker-compose.dev.yml
git commit -m "chore: mount Docker socket for system monitor widget"
```

---

### Task 20: Update `.env.example` and Config Docs

**Files:**
- Modify: `CLAUDE.md`

**Step 1: Add widget section to CLAUDE.md known gotchas**

Add:

```markdown
- Weather widget requires `OPENWEATHERMAP_API_KEY` in `.env`
- System monitor Docker stats require `/var/run/docker.sock` mount
- RSS feeds refresh every 15 minutes via background task
```

**Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: add widget gotchas to CLAUDE.md"
```

---

### Task 21: Full Integration Test

**Step 1: Rebuild Docker dev environment**

```bash
docker compose -f docker-compose.dev.yml down
docker compose -f docker-compose.dev.yml up --build
```

**Step 2: Verify in browser**

- Navigate to `http://localhost:5173`
- Log in
- Dashboard should show empty state with "Add your first widget"
- Add each widget type and verify it renders
- Drag widgets to reorder — verify positions persist on page reload
- Test bookmarks: add, view, delete
- Test RSS: add a feed (e.g. `https://hnrss.org/frontpage`), wait for items
- System monitor should show CPU/memory/disk bars

**Step 3: Run all backend tests**

Run: `cd backend && uv run pytest tests/ -v`
Expected: All PASS

**Step 4: Type-check frontend**

Run: `cd frontend && npx react-router typegen && npx tsc --noEmit`
Expected: PASS

**Step 5: Bump version and tag**

```bash
# In backend/app/__init__.py: change to "0.2.0"
git add -A
git commit -m "feat: dashboard widgets v0.2.0"
git tag v0.2.0
git push && git push origin v0.2.0
```
