import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.models import Base, User
from app.services.auth import AuthService


@pytest_asyncio.fixture
async def db_session():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    session_factory = async_sessionmaker(engine, expire_on_commit=False)
    async with session_factory() as session:
        yield session
    await engine.dispose()


@pytest.mark.asyncio
async def test_register_first_user_is_admin(db_session: AsyncSession):
    service = AuthService(db_session)
    user = await service.register(
        email="admin@test.com",
        first_name="Admin",
        last_name="User",
        password="password123",
    )
    assert user.is_active is True
    assert user.is_admin is True


@pytest.mark.asyncio
async def test_register_second_user_is_inactive(db_session: AsyncSession):
    service = AuthService(db_session)
    await service.register(
        email="first@test.com",
        first_name="First",
        last_name="User",
        password="password123",
    )
    second = await service.register(
        email="second@test.com",
        first_name="Second",
        last_name="User",
        password="password123",
    )
    assert second.is_active is False
    assert second.is_admin is False


@pytest.mark.asyncio
async def test_register_duplicate_email_raises(db_session: AsyncSession):
    service = AuthService(db_session)
    await service.register(
        email="dup@test.com",
        first_name="A",
        last_name="B",
        password="password123",
    )
    with pytest.raises(ValueError, match="already registered"):
        await service.register(
            email="dup@test.com",
            first_name="C",
            last_name="D",
            password="password456",
        )


@pytest.mark.asyncio
async def test_authenticate_valid_credentials(db_session: AsyncSession):
    service = AuthService(db_session)
    await service.register(
        email="user@test.com",
        first_name="Test",
        last_name="User",
        password="password123",
    )
    user = await service.authenticate("user@test.com", "password123")
    assert user is not None
    assert user.email == "user@test.com"


@pytest.mark.asyncio
async def test_authenticate_wrong_password(db_session: AsyncSession):
    service = AuthService(db_session)
    await service.register(
        email="user@test.com",
        first_name="Test",
        last_name="User",
        password="password123",
    )
    user = await service.authenticate("user@test.com", "wrongpassword")
    assert user is None


@pytest.mark.asyncio
async def test_authenticate_inactive_user_fails(db_session: AsyncSession):
    service = AuthService(db_session)
    # First user is auto-admin; second is inactive
    await service.register(
        email="first@test.com",
        first_name="First",
        last_name="User",
        password="password123",
    )
    await service.register(
        email="inactive@test.com",
        first_name="Inactive",
        last_name="User",
        password="password123",
    )
    user = await service.authenticate("inactive@test.com", "password123")
    assert user is None


@pytest.mark.asyncio
async def test_create_and_validate_refresh_token(db_session: AsyncSession):
    service = AuthService(db_session)
    user = await service.register(
        email="user@test.com",
        first_name="Test",
        last_name="User",
        password="password123",
    )
    raw_token = await service.create_refresh_token(user.id)
    validated_user = await service.validate_refresh_token(raw_token)
    assert validated_user is not None
    assert validated_user.id == user.id


@pytest.mark.asyncio
async def test_revoke_refresh_token(db_session: AsyncSession):
    service = AuthService(db_session)
    user = await service.register(
        email="user@test.com",
        first_name="Test",
        last_name="User",
        password="password123",
    )
    raw_token = await service.create_refresh_token(user.id)
    await service.revoke_refresh_token(raw_token)
    validated = await service.validate_refresh_token(raw_token)
    assert validated is None
