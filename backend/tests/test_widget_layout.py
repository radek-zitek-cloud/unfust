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
