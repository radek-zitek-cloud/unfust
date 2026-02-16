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
