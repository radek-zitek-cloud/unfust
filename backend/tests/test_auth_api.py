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


@pytest.mark.asyncio
async def test_register_first_user(app_client: AsyncClient):
    resp = await app_client.post(
        "/api/auth/register",
        json={
            "email": "admin@test.com",
            "first_name": "Admin",
            "last_name": "User",
            "password": "password123",
        },
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    # Should set refresh_token cookie
    assert "refresh_token" in resp.cookies


@pytest.mark.asyncio
async def test_login(app_client: AsyncClient):
    # Register first
    await app_client.post(
        "/api/auth/register",
        json={
            "email": "user@test.com",
            "first_name": "Test",
            "last_name": "User",
            "password": "password123",
        },
    )
    # Login
    resp = await app_client.post(
        "/api/auth/login",
        json={"email": "user@test.com", "password": "password123"},
    )
    assert resp.status_code == 200
    assert "access_token" in resp.json()


@pytest.mark.asyncio
async def test_login_wrong_password(app_client: AsyncClient):
    await app_client.post(
        "/api/auth/register",
        json={
            "email": "user@test.com",
            "first_name": "Test",
            "last_name": "User",
            "password": "password123",
        },
    )
    resp = await app_client.post(
        "/api/auth/login",
        json={"email": "user@test.com", "password": "wrong"},
    )
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_refresh_token(app_client: AsyncClient):
    # Register
    resp = await app_client.post(
        "/api/auth/register",
        json={
            "email": "user@test.com",
            "first_name": "Test",
            "last_name": "User",
            "password": "password123",
        },
    )
    # Refresh (cookies are carried by the client)
    resp = await app_client.post("/api/auth/refresh")
    assert resp.status_code == 200
    assert "access_token" in resp.json()


@pytest.mark.asyncio
async def test_get_me(app_client: AsyncClient):
    # Register
    resp = await app_client.post(
        "/api/auth/register",
        json={
            "email": "user@test.com",
            "first_name": "Test",
            "last_name": "User",
            "password": "password123",
        },
    )
    token = resp.json()["access_token"]
    # Get profile
    resp = await app_client.get(
        "/api/users/me", headers={"Authorization": f"Bearer {token}"}
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["email"] == "user@test.com"
    assert data["first_name"] == "Test"


@pytest.mark.asyncio
async def test_health(app_client: AsyncClient):
    resp = await app_client.get("/api/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"
    assert "version" in data
