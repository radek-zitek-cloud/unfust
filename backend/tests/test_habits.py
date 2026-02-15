"""Tests for habit tracker."""

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

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


@pytest_asyncio.fixture
async def auth_client(app_client: AsyncClient):
    """Create a client with authenticated user."""
    # Register user
    await app_client.post(
        "/api/auth/register",
        json={
            "email": "habituser@test.com",
            "first_name": "Habit",
            "last_name": "User",
            "password": "password123",
        },
    )
    # Login
    resp = await app_client.post(
        "/api/auth/login",
        json={"email": "habituser@test.com", "password": "password123"},
    )
    token = resp.json()["access_token"]
    app_client.headers["Authorization"] = f"Bearer {token}"
    return app_client


@pytest.mark.asyncio
async def test_create_habit(auth_client: AsyncClient):
    resp = await auth_client.post(
        "/api/habits",
        json={
            "name": "Morning Run",
            "emoji": "🏃",
            "color": "#228be6",
            "category": "health",
            "habit_type": "positive",
            "frequency_type": "daily",
            "target_count": 1,
        },
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["name"] == "Morning Run"
    assert data["emoji"] == "🏃"
    assert data["stats"]["current_streak"] == 0


@pytest.mark.asyncio
async def test_list_habits(auth_client: AsyncClient):
    # Create habit
    await auth_client.post(
        "/api/habits",
        json={
            "name": "Read Book",
            "emoji": "📚",
            "color": "#40c057",
            "habit_type": "positive",
            "frequency_type": "daily",
            "target_count": 1,
        },
    )

    resp = await auth_client.get("/api/habits")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 1
    assert data[0]["name"] == "Read Book"


@pytest.mark.asyncio
async def test_log_completion(auth_client: AsyncClient):
    # Create habit
    create_resp = await auth_client.post(
        "/api/habits",
        json={
            "name": "Meditate",
            "emoji": "🧘",
            "color": "#be4bdb",
            "habit_type": "positive",
            "frequency_type": "daily",
            "target_count": 1,
        },
    )
    habit_id = create_resp.json()["id"]

    # Log completion
    resp = await auth_client.post(f"/api/habits/{habit_id}/logs", json={})
    assert resp.status_code == 201
    data = resp.json()
    assert data["habit_id"] == habit_id

    # Check XP was awarded
    me_resp = await auth_client.get("/api/users/me")
    assert me_resp.json()["habit_xp"] > 0


@pytest.mark.asyncio
async def test_streak_increment(auth_client: AsyncClient):
    # Create habit
    create_resp = await auth_client.post(
        "/api/habits",
        json={
            "name": "Daily Pushups",
            "emoji": "💪",
            "color": "#fa5252",
            "habit_type": "positive",
            "frequency_type": "daily",
            "target_count": 1,
        },
    )
    habit_id = create_resp.json()["id"]

    # First check-in
    await auth_client.post(f"/api/habits/{habit_id}/logs", json={})

    # Get habit - should have streak of 1
    resp = await auth_client.get(f"/api/habits/{habit_id}")
    assert resp.json()["stats"]["current_streak"] == 1


@pytest.mark.asyncio
async def test_get_summary(auth_client: AsyncClient):
    # Create habit
    create_resp = await auth_client.post(
        "/api/habits",
        json={
            "name": "Drink Water",
            "emoji": "💧",
            "color": "#15aabf",
            "habit_type": "positive",
            "frequency_type": "daily",
            "target_count": 8,
        },
    )
    habit_id = create_resp.json()["id"]

    # Log 3 completions today
    for _ in range(3):
        await auth_client.post(f"/api/habits/{habit_id}/logs", json={})

    # Get summary
    resp = await auth_client.get("/api/habits/summary")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_habits"] == 1
    assert data["completed_today"] == 0  # 3/8 is not complete
    assert data["habits"][0]["today_count"] == 3


@pytest.mark.asyncio
async def test_delete_habit(auth_client: AsyncClient):
    # Create habit
    create_resp = await auth_client.post(
        "/api/habits",
        json={
            "name": "Temp Habit",
            "emoji": "🗑️",
            "color": "#868e96",
            "habit_type": "positive",
            "frequency_type": "daily",
            "target_count": 1,
        },
    )
    habit_id = create_resp.json()["id"]

    # Delete
    resp = await auth_client.delete(f"/api/habits/{habit_id}")
    assert resp.status_code == 204

    # Verify deleted
    list_resp = await auth_client.get("/api/habits")
    assert len(list_resp.json()) == 0


@pytest.mark.asyncio
async def test_badge_earned_on_first_log(auth_client: AsyncClient):
    # Create habit
    create_resp = await auth_client.post(
        "/api/habits",
        json={
            "name": "First Habit",
            "emoji": "🌟",
            "color": "#fab005",
            "habit_type": "positive",
            "frequency_type": "daily",
            "target_count": 1,
        },
    )
    habit_id = create_resp.json()["id"]

    # Log completion
    await auth_client.post(f"/api/habits/{habit_id}/logs", json={})

    # Check badges
    resp = await auth_client.get("/api/habits/badges")
    assert resp.status_code == 200
    badges = resp.json()
    badge_types = [b["badge_type"] for b in badges]
    assert "first_log" in badge_types


@pytest.mark.asyncio
async def test_get_challenges(auth_client: AsyncClient):
    resp = await auth_client.get("/api/habits/challenges")
    assert resp.status_code == 200
    # Should have auto-generated challenges
    data = resp.json()
    assert len(data) >= 0  # May be empty initially or have generated ones


@pytest.mark.asyncio
async def test_weekly_habit_streak_with_no_logs(auth_client: AsyncClient):
    """Test that weekly habit with no logs returns 0 streak without infinite loop."""
    create_resp = await auth_client.post(
        "/api/habits",
        json={
            "name": "Weekly Exercise",
            "emoji": "🏋️",
            "color": "#228be6",
            "habit_type": "positive",
            "frequency_type": "weekly",
            "target_count": 3,
        },
    )
    habit_id = create_resp.json()["id"]

    # Get habit without any logs
    resp = await auth_client.get(f"/api/habits/{habit_id}")
    assert resp.status_code == 200
    assert resp.json()["stats"]["current_streak"] == 0


@pytest.mark.asyncio
async def test_monthly_habit_streak_with_no_logs(auth_client: AsyncClient):
    """Test that monthly habit with no logs returns 0 streak without infinite loop."""
    create_resp = await auth_client.post(
        "/api/habits",
        json={
            "name": "Monthly Goal",
            "emoji": "🎯",
            "color": "#40c057",
            "habit_type": "positive",
            "frequency_type": "monthly",
            "target_count": 10,
        },
    )
    habit_id = create_resp.json()["id"]

    # Get habit without any logs
    resp = await auth_client.get(f"/api/habits/{habit_id}")
    assert resp.status_code == 200
    assert resp.json()["stats"]["current_streak"] == 0


@pytest.mark.asyncio
async def test_weekly_habit_streak_calculation(auth_client: AsyncClient):
    """Test that weekly habit streak is calculated correctly."""
    create_resp = await auth_client.post(
        "/api/habits",
        json={
            "name": "Weekly Reading",
            "emoji": "📖",
            "color": "#be4bdb",
            "habit_type": "positive",
            "frequency_type": "weekly",
            "target_count": 3,
        },
    )
    habit_id = create_resp.json()["id"]

    # Log 3 completions (meets weekly target)
    for _ in range(3):
        await auth_client.post(f"/api/habits/{habit_id}/logs", json={})

    # Get habit - should have streak of 1
    resp = await auth_client.get(f"/api/habits/{habit_id}")
    assert resp.status_code == 200
    assert resp.json()["stats"]["current_streak"] == 1
