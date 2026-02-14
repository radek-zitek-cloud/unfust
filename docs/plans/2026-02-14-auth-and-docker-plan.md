# Authentication & Docker Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement user authentication (register, login, logout, profile, password change/reset) with JWT tokens on a FastAPI+SQLAlchemy backend and React+Mantine frontend, then Dockerize the stack for dev and prod.

**Architecture:** Monolithic FastAPI app with routers + service layer. SQLAlchemy 2.0 async with SQLite stored in `/data`. React Router 7 frontend with Mantine UI, auth context holding access token in memory, refresh token in HttpOnly cookie. Docker Compose with dev (hot reload, source-only mounts) and prod configurations.

**Tech Stack:** Python 3.14, FastAPI, SQLAlchemy 2.0 (async), Alembic, Pydantic v2, passlib[bcrypt], python-jose[cryptography], aiosmtplib | React 19, React Router 7, Mantine 7, TypeScript | Docker, Docker Compose

**Design doc:** `docs/plans/2026-02-14-auth-and-docker-design.md`

---

## Phase 1: Backend Foundation

### Task 1: Project scaffolding and dependencies

**Files:**
- Modify: `backend/pyproject.toml`
- Delete: `backend/main.py`
- Create: `backend/app/__init__.py`
- Create: `backend/app/config.py`
- Create: `.env.example`
- Modify: `.gitignore`

**Step 1: Update pyproject.toml with all dependencies**

```toml
[project]
name = "unfust-backend"
version = "0.1.0"
description = "Unfust personal dashboard backend"
readme = "README.md"
requires-python = ">=3.14"
dependencies = [
    "fastapi>=0.115",
    "uvicorn[standard]>=0.34",
    "sqlalchemy[asyncio]>=2.0",
    "aiosqlite>=0.21",
    "alembic>=1.15",
    "pydantic>=2.10",
    "pydantic-settings>=2.7",
    "python-jose[cryptography]>=3.3",
    "passlib[bcrypt]>=1.7",
    "python-multipart>=0.0.20",
    "aiosmtplib>=3.0",
    "slowapi>=0.1",
]

[project.optional-dependencies]
dev = [
    "pytest>=8.0",
    "pytest-asyncio>=0.25",
    "httpx>=0.28",
]
```

**Step 2: Delete old `backend/main.py` placeholder**

Remove `backend/main.py` — it will be replaced by `backend/app/main.py` in Task 4.

**Step 3: Create `backend/app/__init__.py` (version source of truth)**

```python
__version__ = "0.1.0"
```

**Step 4: Create `backend/app/config.py`**

```python
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent.parent  # project root


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Database
    database_url: str = f"sqlite+aiosqlite:///{BASE_DIR / 'data' / 'unfust.db'}"

    # JWT
    jwt_secret_key: str = "CHANGE-ME-IN-PRODUCTION"
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 15
    jwt_refresh_token_expire_days: int = 7

    # SMTP
    smtp_host: str = "localhost"
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_from: str = "noreply@unfust.local"
    smtp_use_tls: bool = True

    # Frontend
    frontend_url: str = "http://localhost:5173"


settings = Settings()
```

**Step 5: Create `.env.example`**

```env
# JWT — REQUIRED: generate a strong secret
JWT_SECRET_KEY=change-me-generate-with-openssl-rand-hex-32

# Database
# DATABASE_URL=sqlite+aiosqlite:///data/unfust.db

# SMTP (for password reset emails)
# SMTP_HOST=smtp.example.com
# SMTP_PORT=587
# SMTP_USER=user@example.com
# SMTP_PASSWORD=password
# SMTP_FROM=noreply@example.com
# SMTP_USE_TLS=true

# Frontend URL (used in password reset emails)
# FRONTEND_URL=http://localhost:5173
```

**Step 6: Update `.gitignore`**

Append these entries:

```gitignore
# Environment
.env

# Database
data/*.db
data/*.db-journal
data/*.db-wal

# Python
__pycache__/
*.pyc
.venv/

# Node
node_modules/

# Build artifacts
frontend/build/
frontend/.react-router/
```

**Step 7: Install dependencies**

Run: `cd backend && uv sync`
Expected: Dependencies install successfully

**Step 8: Commit**

```bash
git add backend/pyproject.toml backend/app/__init__.py backend/app/config.py .env.example .gitignore
git rm backend/main.py
git commit -m "feat: scaffold backend project with dependencies and config"
```

---

### Task 2: Database setup and models

**Files:**
- Create: `backend/app/database.py`
- Create: `backend/app/models/__init__.py`
- Create: `backend/app/models/user.py`

**Step 1: Create `backend/app/database.py`**

```python
from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.config import settings

engine = create_async_engine(settings.database_url, echo=False)
async_session_factory = async_sessionmaker(engine, expire_on_commit=False)


async def get_db() -> AsyncGenerator[AsyncSession]:
    async with async_session_factory() as session:
        yield session
```

**Step 2: Create `backend/app/models/__init__.py`**

```python
from app.models.user import Base, PasswordResetToken, RefreshToken, User

__all__ = ["Base", "User", "RefreshToken", "PasswordResetToken"]
```

**Step 3: Create `backend/app/models/user.py`**

```python
import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, ForeignKey, String, Text
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    first_name: Mapped[str] = mapped_column(String(100))
    last_name: Mapped[str] = mapped_column(String(100))
    password_hash: Mapped[str] = mapped_column(String(255))
    is_active: Mapped[bool] = mapped_column(Boolean, default=False)
    is_admin: Mapped[bool] = mapped_column(Boolean, default=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    refresh_tokens: Mapped[list["RefreshToken"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    password_reset_tokens: Mapped[list["PasswordResetToken"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )


class RefreshToken(Base):
    __tablename__ = "refresh_tokens"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    token_hash: Mapped[str] = mapped_column(String(255))
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )
    revoked: Mapped[bool] = mapped_column(Boolean, default=False)

    user: Mapped["User"] = relationship(back_populates="refresh_tokens")


class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    token_hash: Mapped[str] = mapped_column(String(255))
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    used: Mapped[bool] = mapped_column(Boolean, default=False)

    user: Mapped["User"] = relationship(back_populates="password_reset_tokens")
```

**Step 4: Commit**

```bash
git add backend/app/database.py backend/app/models/
git commit -m "feat: add SQLAlchemy async database setup and user models"
```

---

### Task 3: Alembic migrations

**Files:**
- Create: `backend/alembic.ini`
- Create: `backend/alembic/env.py`
- Create: `backend/alembic/script.py.mako`
- Generated: `backend/alembic/versions/` (initial migration)

**Step 1: Initialize Alembic**

Run: `cd backend && uv run alembic init alembic`
Expected: Creates `alembic/` directory and `alembic.ini`

**Step 2: Edit `backend/alembic.ini`**

Change the `sqlalchemy.url` line to empty (we'll set it from env.py):

```ini
sqlalchemy.url =
```

**Step 3: Edit `backend/alembic/env.py`**

Replace the generated `env.py` with:

```python
import asyncio
from logging.config import fileConfig

from alembic import context
from sqlalchemy import pool
from sqlalchemy.ext.asyncio import async_engine_from_config

from app.config import settings
from app.models import Base

config = context.config
config.set_main_option("sqlalchemy.url", settings.database_url)

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection):
    context.configure(connection=connection, target_metadata=target_metadata)
    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    connectable = async_engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)
    await connectable.dispose()


def run_migrations_online() -> None:
    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
```

**Step 4: Generate initial migration**

Run: `cd backend && uv run alembic revision --autogenerate -m "initial user tables"`
Expected: Creates migration file in `backend/alembic/versions/`

**Step 5: Run the migration**

Run: `cd backend && uv run alembic upgrade head`
Expected: Creates `data/unfust.db` with users, refresh_tokens, password_reset_tokens tables

**Step 6: Commit**

```bash
git add backend/alembic.ini backend/alembic/
git commit -m "feat: add Alembic migrations with initial user tables"
```

---

### Task 4: Security utilities (JWT + password hashing)

**Files:**
- Create: `backend/app/security.py`
- Create: `backend/tests/__init__.py`
- Create: `backend/tests/test_security.py`

**Step 1: Write the failing tests**

Create `backend/tests/__init__.py` (empty file).

Create `backend/tests/test_security.py`:

```python
from datetime import timedelta

import pytest

from app.security import (
    create_access_token,
    decode_access_token,
    hash_password,
    hash_token,
    verify_password,
)


def test_hash_and_verify_password():
    hashed = hash_password("mysecretpassword")
    assert hashed != "mysecretpassword"
    assert verify_password("mysecretpassword", hashed) is True
    assert verify_password("wrongpassword", hashed) is False


def test_create_and_decode_access_token():
    token = create_access_token(subject="user-123", is_admin=True)
    payload = decode_access_token(token)
    assert payload["sub"] == "user-123"
    assert payload["is_admin"] is True


def test_expired_access_token():
    token = create_access_token(
        subject="user-123", expires_delta=timedelta(seconds=-1)
    )
    assert decode_access_token(token) is None


def test_hash_token_deterministic():
    token = "some-refresh-token"
    assert hash_token(token) == hash_token(token)
    assert hash_token(token) != hash_token("different-token")
```

**Step 2: Run tests to verify they fail**

Run: `cd backend && uv run pytest tests/test_security.py -v`
Expected: FAIL — `ImportError: cannot import name 'create_access_token'`

**Step 3: Implement `backend/app/security.py`**

```python
import hashlib
from datetime import datetime, timedelta, timezone

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def create_access_token(
    subject: str,
    is_admin: bool = False,
    expires_delta: timedelta | None = None,
) -> str:
    if expires_delta is None:
        expires_delta = timedelta(minutes=settings.jwt_access_token_expire_minutes)
    expire = datetime.now(timezone.utc) + expires_delta
    to_encode = {"sub": subject, "is_admin": is_admin, "exp": expire, "type": "access"}
    return jwt.encode(to_encode, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> dict | None:
    try:
        payload = jwt.decode(
            token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm]
        )
        if payload.get("type") != "access":
            return None
        return payload
    except JWTError:
        return None
```

**Step 4: Run tests to verify they pass**

Run: `cd backend && uv run pytest tests/test_security.py -v`
Expected: 4 passed

**Step 5: Commit**

```bash
git add backend/app/security.py backend/tests/
git commit -m "feat: add JWT and password hashing security utilities"
```

---

### Task 5: Pydantic schemas

**Files:**
- Create: `backend/app/schemas/__init__.py`
- Create: `backend/app/schemas/user.py`
- Create: `backend/app/schemas/auth.py`

**Step 1: Create `backend/app/schemas/__init__.py`**

```python
from app.schemas.auth import (
    ForgotPasswordRequest,
    LoginRequest,
    RefreshResponse,
    RegisterRequest,
    ResetPasswordRequest,
    TokenResponse,
)
from app.schemas.user import (
    ChangePasswordRequest,
    UpdateUserAdminRequest,
    UpdateUserRequest,
    UserListResponse,
    UserResponse,
)

__all__ = [
    "LoginRequest",
    "RegisterRequest",
    "TokenResponse",
    "RefreshResponse",
    "ForgotPasswordRequest",
    "ResetPasswordRequest",
    "UserResponse",
    "UpdateUserRequest",
    "ChangePasswordRequest",
    "UpdateUserAdminRequest",
    "UserListResponse",
]
```

**Step 2: Create `backend/app/schemas/auth.py`**

```python
from pydantic import BaseModel, EmailStr


class RegisterRequest(BaseModel):
    email: EmailStr
    first_name: str
    last_name: str
    password: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class RefreshResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str
```

**Step 3: Create `backend/app/schemas/user.py`**

```python
from datetime import datetime

from pydantic import BaseModel, EmailStr


class UserResponse(BaseModel):
    id: str
    email: EmailStr
    first_name: str
    last_name: str
    is_active: bool
    is_admin: bool
    notes: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class UpdateUserRequest(BaseModel):
    first_name: str | None = None
    last_name: str | None = None
    notes: str | None = None


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


class UpdateUserAdminRequest(BaseModel):
    is_active: bool | None = None
    is_admin: bool | None = None
    notes: str | None = None


class UserListResponse(BaseModel):
    users: list[UserResponse]
    total: int
```

Note: `EmailStr` requires `pydantic[email]`. Add `email-validator>=2.0` to pyproject.toml dependencies.

**Step 4: Add email-validator dependency**

In `backend/pyproject.toml`, add `"email-validator>=2.0"` to the dependencies list.

Run: `cd backend && uv sync`

**Step 5: Commit**

```bash
git add backend/app/schemas/ backend/pyproject.toml
git commit -m "feat: add Pydantic request/response schemas for auth and users"
```

---

### Task 6: Auth service (business logic)

**Files:**
- Create: `backend/app/services/__init__.py`
- Create: `backend/app/services/auth.py`
- Create: `backend/tests/test_auth_service.py`

**Step 1: Create `backend/app/services/__init__.py`**

Empty file.

**Step 2: Write failing tests for auth service**

Create `backend/tests/test_auth_service.py`:

```python
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
```

**Step 3: Run tests to verify they fail**

Run: `cd backend && uv run pytest tests/test_auth_service.py -v`
Expected: FAIL — `ImportError`

**Step 4: Implement `backend/app/services/auth.py`**

```python
import secrets
from datetime import datetime, timedelta, timezone

from sqlalchemy import func, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.user import PasswordResetToken, RefreshToken, User
from app.security import hash_password, hash_token, verify_password


class AuthService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def register(
        self, email: str, first_name: str, last_name: str, password: str
    ) -> User:
        # Check if this is the first user
        result = await self.db.execute(select(func.count(User.id)))
        user_count = result.scalar_one()

        user = User(
            email=email.lower().strip(),
            first_name=first_name.strip(),
            last_name=last_name.strip(),
            password_hash=hash_password(password),
            is_active=user_count == 0,
            is_admin=user_count == 0,
        )
        self.db.add(user)
        try:
            await self.db.commit()
            await self.db.refresh(user)
        except IntegrityError:
            await self.db.rollback()
            raise ValueError("Email already registered")
        return user

    async def authenticate(self, email: str, password: str) -> User | None:
        result = await self.db.execute(
            select(User).where(User.email == email.lower().strip())
        )
        user = result.scalar_one_or_none()
        if user is None:
            return None
        if not user.is_active:
            return None
        if not verify_password(password, user.password_hash):
            return None
        return user

    async def create_refresh_token(self, user_id: str) -> str:
        raw_token = secrets.token_urlsafe(64)
        db_token = RefreshToken(
            user_id=user_id,
            token_hash=hash_token(raw_token),
            expires_at=datetime.now(timezone.utc)
            + timedelta(days=settings.jwt_refresh_token_expire_days),
        )
        self.db.add(db_token)
        await self.db.commit()
        return raw_token

    async def validate_refresh_token(self, raw_token: str) -> User | None:
        token_hash_value = hash_token(raw_token)
        result = await self.db.execute(
            select(RefreshToken).where(
                RefreshToken.token_hash == token_hash_value,
                RefreshToken.revoked == False,
                RefreshToken.expires_at > datetime.now(timezone.utc),
            )
        )
        db_token = result.scalar_one_or_none()
        if db_token is None:
            return None
        result = await self.db.execute(
            select(User).where(User.id == db_token.user_id, User.is_active == True)
        )
        return result.scalar_one_or_none()

    async def revoke_refresh_token(self, raw_token: str) -> None:
        token_hash_value = hash_token(raw_token)
        await self.db.execute(
            update(RefreshToken)
            .where(RefreshToken.token_hash == token_hash_value)
            .values(revoked=True)
        )
        await self.db.commit()

    async def revoke_all_refresh_tokens(self, user_id: str) -> None:
        await self.db.execute(
            update(RefreshToken)
            .where(RefreshToken.user_id == user_id, RefreshToken.revoked == False)
            .values(revoked=True)
        )
        await self.db.commit()

    async def rotate_refresh_token(self, old_raw_token: str) -> tuple[str, User] | None:
        """Validate old token, revoke it, issue new one. Returns (new_token, user) or None."""
        token_hash_value = hash_token(old_raw_token)
        result = await self.db.execute(
            select(RefreshToken).where(RefreshToken.token_hash == token_hash_value)
        )
        db_token = result.scalar_one_or_none()
        if db_token is None:
            return None

        # Replay detection: if token is already revoked, revoke ALL tokens for the user
        if db_token.revoked:
            await self.revoke_all_refresh_tokens(db_token.user_id)
            return None

        if db_token.expires_at < datetime.now(timezone.utc):
            return None

        # Revoke old token
        db_token.revoked = True
        await self.db.commit()

        # Verify user is still active
        result = await self.db.execute(
            select(User).where(User.id == db_token.user_id, User.is_active == True)
        )
        user = result.scalar_one_or_none()
        if user is None:
            return None

        # Issue new token
        new_token = await self.create_refresh_token(user.id)
        return new_token, user

    async def create_password_reset_token(self, email: str) -> str | None:
        """Returns the raw reset token, or None if user not found."""
        result = await self.db.execute(
            select(User).where(User.email == email.lower().strip())
        )
        user = result.scalar_one_or_none()
        if user is None:
            return None

        raw_token = secrets.token_urlsafe(64)
        db_token = PasswordResetToken(
            user_id=user.id,
            token_hash=hash_token(raw_token),
            expires_at=datetime.now(timezone.utc) + timedelta(hours=1),
        )
        self.db.add(db_token)
        await self.db.commit()
        return raw_token

    async def reset_password(self, raw_token: str, new_password: str) -> bool:
        token_hash_value = hash_token(raw_token)
        result = await self.db.execute(
            select(PasswordResetToken).where(
                PasswordResetToken.token_hash == token_hash_value,
                PasswordResetToken.used == False,
                PasswordResetToken.expires_at > datetime.now(timezone.utc),
            )
        )
        db_token = result.scalar_one_or_none()
        if db_token is None:
            return False

        # Mark token as used
        db_token.used = True

        # Update password
        result = await self.db.execute(
            select(User).where(User.id == db_token.user_id)
        )
        user = result.scalar_one()
        user.password_hash = hash_password(new_password)
        await self.db.commit()

        # Revoke all refresh tokens
        await self.revoke_all_refresh_tokens(user.id)
        return True

    async def change_password(
        self, user_id: str, current_password: str, new_password: str
    ) -> bool:
        result = await self.db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        if user is None:
            return False
        if not verify_password(current_password, user.password_hash):
            return False
        user.password_hash = hash_password(new_password)
        await self.db.commit()
        await self.revoke_all_refresh_tokens(user_id)
        return True
```

**Step 5: Run tests to verify they pass**

Run: `cd backend && uv run pytest tests/test_auth_service.py -v`
Expected: 8 passed

**Step 6: Commit**

```bash
git add backend/app/services/ backend/tests/
git commit -m "feat: add auth service with registration, login, refresh token management"
```

---

### Task 7: Email service

**Files:**
- Create: `backend/app/services/email.py`

**Step 1: Implement `backend/app/services/email.py`**

```python
import logging
from email.message import EmailMessage

import aiosmtplib

from app.config import settings

logger = logging.getLogger(__name__)


async def send_password_reset_email(to_email: str, reset_token: str) -> None:
    reset_url = f"{settings.frontend_url}/reset-password?token={reset_token}"

    message = EmailMessage()
    message["From"] = settings.smtp_from
    message["To"] = to_email
    message["Subject"] = "Unfust — Password Reset"
    message.set_content(
        f"You requested a password reset.\n\n"
        f"Click here to reset your password:\n{reset_url}\n\n"
        f"This link expires in 1 hour.\n\n"
        f"If you did not request this, ignore this email."
    )

    try:
        await aiosmtplib.send(
            message,
            hostname=settings.smtp_host,
            port=settings.smtp_port,
            username=settings.smtp_user or None,
            password=settings.smtp_password or None,
            use_tls=settings.smtp_use_tls,
        )
    except Exception:
        logger.exception("Failed to send password reset email to %s", to_email)
```

**Step 2: Commit**

```bash
git add backend/app/services/email.py
git commit -m "feat: add email service for password reset"
```

---

### Task 8: FastAPI dependencies

**Files:**
- Create: `backend/app/dependencies.py`

**Step 1: Implement `backend/app/dependencies.py`**

```python
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User
from app.security import decode_access_token

bearer_scheme = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    payload = decode_access_token(credentials.credentials)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )
    user_id = payload.get("sub")
    result = await db.execute(
        select(User).where(User.id == user_id, User.is_active == True)
    )
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
        )
    return user


async def require_admin(user: User = Depends(get_current_user)) -> User:
    if not user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return user
```

**Step 2: Commit**

```bash
git add backend/app/dependencies.py
git commit -m "feat: add FastAPI dependencies for auth and admin access"
```

---

### Task 9: Auth router (API endpoints)

**Files:**
- Create: `backend/app/routers/__init__.py`
- Create: `backend/app/routers/auth.py`
- Create: `backend/tests/test_auth_api.py`

**Step 1: Create `backend/app/routers/__init__.py`**

Empty file.

**Step 2: Write failing tests for auth API**

Create `backend/tests/test_auth_api.py`:

```python
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
```

**Step 3: Run tests to verify they fail**

Run: `cd backend && uv run pytest tests/test_auth_api.py -v`
Expected: FAIL — `ImportError: cannot import name 'create_app'`

**Step 4: Implement `backend/app/routers/auth.py`**

```python
from fastapi import APIRouter, Cookie, Depends, HTTPException, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.auth import (
    ForgotPasswordRequest,
    LoginRequest,
    RegisterRequest,
    ResetPasswordRequest,
    TokenResponse,
)
from app.security import create_access_token
from app.services.auth import AuthService
from app.services.email import send_password_reset_email

router = APIRouter(prefix="/api/auth", tags=["auth"])

REFRESH_COOKIE_KEY = "refresh_token"
REFRESH_COOKIE_MAX_AGE = 7 * 24 * 60 * 60  # 7 days in seconds


def _set_refresh_cookie(response: Response, raw_token: str) -> None:
    response.set_cookie(
        key=REFRESH_COOKIE_KEY,
        value=raw_token,
        httponly=True,
        secure=False,  # Set True in production behind HTTPS
        samesite="lax",
        max_age=REFRESH_COOKIE_MAX_AGE,
        path="/api/auth",
    )


def _clear_refresh_cookie(response: Response) -> None:
    response.delete_cookie(key=REFRESH_COOKIE_KEY, path="/api/auth")


@router.post("/register", response_model=TokenResponse)
async def register(
    body: RegisterRequest,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    service = AuthService(db)
    try:
        user = await service.register(
            email=body.email,
            first_name=body.first_name,
            last_name=body.last_name,
            password=body.password,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    access_token = create_access_token(subject=user.id, is_admin=user.is_admin)
    raw_refresh = await service.create_refresh_token(user.id)
    _set_refresh_cookie(response, raw_refresh)
    return TokenResponse(access_token=access_token)


@router.post("/login", response_model=TokenResponse)
async def login(
    body: LoginRequest,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    service = AuthService(db)
    user = await service.authenticate(body.email, body.password)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
    access_token = create_access_token(subject=user.id, is_admin=user.is_admin)
    raw_refresh = await service.create_refresh_token(user.id)
    _set_refresh_cookie(response, raw_refresh)
    return TokenResponse(access_token=access_token)


@router.post("/refresh", response_model=TokenResponse)
async def refresh(
    response: Response,
    refresh_token: str | None = Cookie(None),
    db: AsyncSession = Depends(get_db),
):
    if refresh_token is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="No refresh token"
        )
    service = AuthService(db)
    result = await service.rotate_refresh_token(refresh_token)
    if result is None:
        _clear_refresh_cookie(response)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token"
        )
    new_raw_token, user = result
    access_token = create_access_token(subject=user.id, is_admin=user.is_admin)
    _set_refresh_cookie(response, new_raw_token)
    return TokenResponse(access_token=access_token)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(
    response: Response,
    refresh_token: str | None = Cookie(None),
    _user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if refresh_token:
        service = AuthService(db)
        await service.revoke_refresh_token(refresh_token)
    _clear_refresh_cookie(response)


@router.post("/forgot-password")
async def forgot_password(
    body: ForgotPasswordRequest,
    db: AsyncSession = Depends(get_db),
):
    service = AuthService(db)
    token = await service.create_password_reset_token(body.email)
    if token is not None:
        await send_password_reset_email(body.email, token)
    # Always return 200 to prevent email enumeration
    return {"message": "If the email exists, a reset link has been sent."}


@router.post("/reset-password")
async def reset_password(
    body: ResetPasswordRequest,
    db: AsyncSession = Depends(get_db),
):
    service = AuthService(db)
    success = await service.reset_password(body.token, body.new_password)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token",
        )
    return {"message": "Password reset successfully."}
```

**Step 5: Implement `backend/app/routers/users.py`**

Create `backend/app/routers/users.py`:

```python
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user, require_admin
from app.models.user import User
from app.schemas.user import (
    ChangePasswordRequest,
    UpdateUserAdminRequest,
    UpdateUserRequest,
    UserListResponse,
    UserResponse,
)
from app.services.auth import AuthService

router = APIRouter(prefix="/api/users", tags=["users"])


@router.get("/me", response_model=UserResponse)
async def get_me(user: User = Depends(get_current_user)):
    return user


@router.patch("/me", response_model=UserResponse)
async def update_me(
    body: UpdateUserRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if body.first_name is not None:
        user.first_name = body.first_name
    if body.last_name is not None:
        user.last_name = body.last_name
    if body.notes is not None:
        user.notes = body.notes
    await db.commit()
    await db.refresh(user)
    return user


@router.post("/me/change-password")
async def change_password(
    body: ChangePasswordRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = AuthService(db)
    success = await service.change_password(
        user.id, body.current_password, body.new_password
    )
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect",
        )
    return {"message": "Password changed successfully."}


@router.get("", response_model=UserListResponse)
async def list_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    _admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).offset(skip).limit(limit))
    users = result.scalars().all()
    total_result = await db.execute(select(func.count(User.id)))
    total = total_result.scalar_one()
    return UserListResponse(users=users, total=total)


@router.patch("/{user_id}", response_model=UserResponse)
async def update_user_admin(
    user_id: str,
    body: UpdateUserAdminRequest,
    _admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if body.is_active is not None:
        user.is_active = body.is_active
    if body.is_admin is not None:
        user.is_admin = body.is_admin
    if body.notes is not None:
        user.notes = body.notes
    await db.commit()
    await db.refresh(user)
    return user
```

**Step 6: Implement `backend/app/main.py`**

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import __version__
from app.config import settings
from app.routers import auth, users


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

    @app.get("/api/health")
    async def health():
        return {"status": "ok", "version": __version__}

    return app


app = create_app()
```

**Step 7: Run tests to verify they pass**

Run: `cd backend && uv run pytest tests/ -v`
Expected: All tests pass

**Step 8: Commit**

```bash
git add backend/app/routers/ backend/app/main.py backend/tests/test_auth_api.py
git commit -m "feat: add auth and user API routers with health endpoint"
```

---

## Phase 2: Frontend

### Task 10: Install Mantine and configure providers

**Files:**
- Modify: `frontend/package.json` (via npm install)
- Modify: `frontend/app/root.tsx`
- Delete: `frontend/app/app.css`
- Delete: `frontend/app/welcome/` (entire directory)
- Delete: `frontend/app/routes/home.tsx`

**Step 1: Install Mantine dependencies**

Run:
```bash
cd frontend && npm install @mantine/core @mantine/hooks @mantine/form @mantine/notifications @mantine/nprogress
```

Note: Mantine 7 requires `postcss` and `postcss-preset-mantine`. Check if needed:
```bash
cd frontend && npm install --save-dev postcss postcss-preset-mantine
```

**Step 2: Remove Tailwind and old welcome page**

Remove Tailwind from devDependencies:
```bash
cd frontend && npm uninstall tailwindcss @tailwindcss/vite
```

Delete files:
- `frontend/app/app.css`
- `frontend/app/welcome/welcome.tsx`
- `frontend/app/welcome/logo-dark.svg`
- `frontend/app/welcome/logo-light.svg`
- `frontend/app/routes/home.tsx`

**Step 3: Create PostCSS config**

Create `frontend/postcss.config.cjs`:

```js
module.exports = {
  plugins: {
    "postcss-preset-mantine": {},
  },
};
```

**Step 4: Update `frontend/vite.config.ts`**

Remove Tailwind plugin:

```typescript
import { reactRouter } from "@react-router/dev/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [reactRouter(), tsconfigPaths()],
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
    },
  },
});
```

**Step 5: Rewrite `frontend/app/root.tsx`**

```tsx
import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";

import { ColorSchemeScript, MantineProvider } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";

import type { Route } from "./+types/root";

export const links: Route.LinksFunction = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap",
  },
];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
        <ColorSchemeScript defaultColorScheme="auto" />
      </head>
      <body>
        <MantineProvider
          defaultColorScheme="auto"
          theme={{
            fontFamily:
              "Inter, ui-sans-serif, system-ui, sans-serif",
          }}
        >
          <Notifications position="top-right" />
          {children}
        </MantineProvider>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = "Oops!";
  let details = "An unexpected error occurred.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : "Error";
    details =
      error.status === 404
        ? "The requested page could not be found."
        : error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main style={{ paddingTop: 64, padding: 16, maxWidth: 800, margin: "0 auto" }}>
      <h1>{message}</h1>
      <p>{details}</p>
      {stack && (
        <pre style={{ width: "100%", padding: 16, overflow: "auto" }}>
          <code>{stack}</code>
        </pre>
      )}
    </main>
  );
}
```

**Step 6: Verify frontend compiles**

Run: `cd frontend && npx react-router typegen && npx tsc --noEmit`
Expected: No errors (route types may need regeneration after route changes in next task)

**Step 7: Commit**

```bash
git add -A frontend/
git commit -m "feat: replace Tailwind with Mantine, configure providers"
```

---

### Task 11: API client and auth context

**Files:**
- Create: `frontend/app/lib/api.ts`
- Create: `frontend/app/lib/auth.tsx`

**Step 1: Create `frontend/app/lib/api.ts`**

```typescript
let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

async function refreshAccessToken(): Promise<string | null> {
  try {
    const resp = await fetch("/api/auth/refresh", {
      method: "POST",
      credentials: "include",
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    setAccessToken(data.access_token);
    return data.access_token;
  } catch {
    return null;
  }
}

export async function apiClient(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const headers = new Headers(options.headers);
  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }
  if (!headers.has("Content-Type") && options.body) {
    headers.set("Content-Type", "application/json");
  }

  let resp = await fetch(path, { ...options, headers, credentials: "include" });

  // If 401, try refreshing the token once
  if (resp.status === 401 && accessToken) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      headers.set("Authorization", `Bearer ${newToken}`);
      resp = await fetch(path, { ...options, headers, credentials: "include" });
    }
  }

  return resp;
}

// Typed API functions

export interface UserProfile {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  is_admin: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface HealthResponse {
  status: string;
  version: string;
}

export async function login(email: string, password: string) {
  const resp = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
    credentials: "include",
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ detail: "Login failed" }));
    throw new Error(err.detail || "Login failed");
  }
  const data = await resp.json();
  setAccessToken(data.access_token);
  return data;
}

export async function register(
  email: string,
  firstName: string,
  lastName: string,
  password: string
) {
  const resp = await fetch("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email,
      first_name: firstName,
      last_name: lastName,
      password,
    }),
    credentials: "include",
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ detail: "Registration failed" }));
    throw new Error(err.detail || "Registration failed");
  }
  const data = await resp.json();
  setAccessToken(data.access_token);
  return data;
}

export async function logout() {
  await apiClient("/api/auth/logout", { method: "POST" });
  setAccessToken(null);
}

export async function getProfile(): Promise<UserProfile> {
  const resp = await apiClient("/api/users/me");
  if (!resp.ok) throw new Error("Failed to fetch profile");
  return resp.json();
}

export async function updateProfile(data: {
  first_name?: string;
  last_name?: string;
  notes?: string | null;
}): Promise<UserProfile> {
  const resp = await apiClient("/api/users/me", {
    method: "PATCH",
    body: JSON.stringify(data),
  });
  if (!resp.ok) throw new Error("Failed to update profile");
  return resp.json();
}

export async function changePassword(
  currentPassword: string,
  newPassword: string
) {
  const resp = await apiClient("/api/users/me/change-password", {
    method: "POST",
    body: JSON.stringify({
      current_password: currentPassword,
      new_password: newPassword,
    }),
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ detail: "Failed" }));
    throw new Error(err.detail || "Failed to change password");
  }
  return resp.json();
}

export async function forgotPassword(email: string) {
  const resp = await fetch("/api/auth/forgot-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  return resp.json();
}

export async function resetPassword(token: string, newPassword: string) {
  const resp = await fetch("/api/auth/reset-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, new_password: newPassword }),
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ detail: "Failed" }));
    throw new Error(err.detail || "Failed to reset password");
  }
  return resp.json();
}

export async function fetchHealth(): Promise<HealthResponse> {
  const resp = await fetch("/api/health");
  if (!resp.ok) throw new Error("Backend unreachable");
  return resp.json();
}
```

**Step 2: Create `frontend/app/lib/auth.tsx`**

```tsx
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import {
  type UserProfile,
  getProfile,
  setAccessToken,
  logout as apiLogout,
  login as apiLogin,
  register as apiRegister,
} from "./api";

interface AuthContextValue {
  user: UserProfile | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (
    email: string,
    firstName: string,
    lastName: string,
    password: string
  ) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const profile = await getProfile();
      setUser(profile);
    } catch {
      setUser(null);
    }
  }, []);

  // Silent refresh on mount
  useEffect(() => {
    async function init() {
      try {
        // Try to get a new access token from the refresh cookie
        const resp = await fetch("/api/auth/refresh", {
          method: "POST",
          credentials: "include",
        });
        if (resp.ok) {
          const data = await resp.json();
          setAccessToken(data.access_token);
          const profile = await getProfile();
          setUser(profile);
        }
      } catch {
        // Not logged in
      } finally {
        setIsLoading(false);
      }
    }
    init();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    await apiLogin(email, password);
    const profile = await getProfile();
    setUser(profile);
  }, []);

  const register = useCallback(
    async (
      email: string,
      firstName: string,
      lastName: string,
      password: string
    ) => {
      await apiRegister(email, firstName, lastName, password);
      const profile = await getProfile();
      setUser(profile);
    },
    []
  );

  const logout = useCallback(async () => {
    await apiLogout();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, isLoading, login, register, logout, refreshUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (ctx === null) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
```

**Step 3: Commit**

```bash
git add frontend/app/lib/
git commit -m "feat: add API client with token refresh and auth context provider"
```

---

### Task 12: Routes and auth pages (login, register, forgot/reset password)

**Files:**
- Modify: `frontend/app/routes.ts`
- Create: `frontend/app/routes/index.tsx`
- Create: `frontend/app/routes/login.tsx`
- Create: `frontend/app/routes/register.tsx`
- Create: `frontend/app/routes/forgot-password.tsx`
- Create: `frontend/app/routes/reset-password.tsx`

**Step 1: Update `frontend/app/routes.ts`**

```typescript
import { type RouteConfig, index, route, layout } from "@react-router/dev/routes";

export default [
  index("routes/index.tsx"),
  route("login", "routes/login.tsx"),
  route("register", "routes/register.tsx"),
  route("forgot-password", "routes/forgot-password.tsx"),
  route("reset-password", "routes/reset-password.tsx"),
  layout("routes/dashboard/layout.tsx", [
    route("dashboard", "routes/dashboard/index.tsx"),
    route("dashboard/profile", "routes/dashboard/profile.tsx"),
  ]),
] satisfies RouteConfig;
```

**Step 2: Create `frontend/app/routes/index.tsx`**

```tsx
import { Navigate } from "react-router";
import { LoadingOverlay } from "@mantine/core";
import { useAuth } from "~/lib/auth";

export default function Index() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingOverlay visible />;
  }

  return <Navigate to={user ? "/dashboard" : "/login"} replace />;
}
```

**Step 3: Create `frontend/app/routes/login.tsx`**

```tsx
import {
  Anchor,
  Button,
  Container,
  Paper,
  PasswordInput,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { Link, useNavigate } from "react-router";
import { useAuth } from "~/lib/auth";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const form = useForm({
    initialValues: { email: "", password: "" },
    validate: {
      email: (v) => (/^\S+@\S+$/.test(v) ? null : "Invalid email"),
      password: (v) => (v.length > 0 ? null : "Password is required"),
    },
  });

  const handleSubmit = async (values: typeof form.values) => {
    try {
      await login(values.email, values.password);
      navigate("/dashboard");
    } catch (err: any) {
      notifications.show({
        title: "Login failed",
        message: err.message,
        color: "red",
      });
    }
  };

  return (
    <Container size={420} my={40}>
      <Title ta="center">Welcome back</Title>
      <Text c="dimmed" size="sm" ta="center" mt={5}>
        Don&apos;t have an account?{" "}
        <Anchor component={Link} to="/register" size="sm">
          Register
        </Anchor>
      </Text>

      <Paper withBorder shadow="md" p={30} mt={30} radius="md">
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <TextInput
            label="Email"
            placeholder="you@example.com"
            required
            {...form.getInputProps("email")}
          />
          <PasswordInput
            label="Password"
            placeholder="Your password"
            required
            mt="md"
            {...form.getInputProps("password")}
          />
          <Anchor
            component={Link}
            to="/forgot-password"
            size="sm"
            mt="xs"
            display="block"
          >
            Forgot password?
          </Anchor>
          <Button type="submit" fullWidth mt="xl">
            Sign in
          </Button>
        </form>
      </Paper>
    </Container>
  );
}
```

**Step 4: Create `frontend/app/routes/register.tsx`**

```tsx
import {
  Anchor,
  Button,
  Container,
  Paper,
  PasswordInput,
  TextInput,
  Title,
  Text,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { Link, useNavigate } from "react-router";
import { useAuth } from "~/lib/auth";

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const form = useForm({
    initialValues: {
      email: "",
      firstName: "",
      lastName: "",
      password: "",
      confirmPassword: "",
    },
    validate: {
      email: (v) => (/^\S+@\S+$/.test(v) ? null : "Invalid email"),
      firstName: (v) => (v.trim().length > 0 ? null : "Required"),
      lastName: (v) => (v.trim().length > 0 ? null : "Required"),
      password: (v) => (v.length >= 8 ? null : "Minimum 8 characters"),
      confirmPassword: (v, values) =>
        v === values.password ? null : "Passwords don't match",
    },
  });

  const handleSubmit = async (values: typeof form.values) => {
    try {
      await register(
        values.email,
        values.firstName,
        values.lastName,
        values.password
      );
      navigate("/dashboard");
    } catch (err: any) {
      notifications.show({
        title: "Registration failed",
        message: err.message,
        color: "red",
      });
    }
  };

  return (
    <Container size={420} my={40}>
      <Title ta="center">Create an account</Title>
      <Text c="dimmed" size="sm" ta="center" mt={5}>
        Already have an account?{" "}
        <Anchor component={Link} to="/login" size="sm">
          Sign in
        </Anchor>
      </Text>

      <Paper withBorder shadow="md" p={30} mt={30} radius="md">
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <TextInput
            label="Email"
            placeholder="you@example.com"
            required
            {...form.getInputProps("email")}
          />
          <TextInput
            label="First name"
            placeholder="John"
            required
            mt="md"
            {...form.getInputProps("firstName")}
          />
          <TextInput
            label="Last name"
            placeholder="Doe"
            required
            mt="md"
            {...form.getInputProps("lastName")}
          />
          <PasswordInput
            label="Password"
            placeholder="Minimum 8 characters"
            required
            mt="md"
            {...form.getInputProps("password")}
          />
          <PasswordInput
            label="Confirm password"
            placeholder="Repeat password"
            required
            mt="md"
            {...form.getInputProps("confirmPassword")}
          />
          <Button type="submit" fullWidth mt="xl">
            Register
          </Button>
        </form>
      </Paper>
    </Container>
  );
}
```

**Step 5: Create `frontend/app/routes/forgot-password.tsx`**

```tsx
import {
  Anchor,
  Button,
  Container,
  Paper,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { useState } from "react";
import { Link } from "react-router";
import { forgotPassword } from "~/lib/api";

export default function ForgotPasswordPage() {
  const [submitted, setSubmitted] = useState(false);

  const form = useForm({
    initialValues: { email: "" },
    validate: {
      email: (v) => (/^\S+@\S+$/.test(v) ? null : "Invalid email"),
    },
  });

  const handleSubmit = async (values: typeof form.values) => {
    try {
      await forgotPassword(values.email);
      setSubmitted(true);
    } catch {
      notifications.show({
        title: "Error",
        message: "Something went wrong. Please try again.",
        color: "red",
      });
    }
  };

  return (
    <Container size={420} my={40}>
      <Title ta="center">Forgot your password?</Title>
      <Text c="dimmed" size="sm" ta="center" mt={5}>
        Enter your email to get a reset link
      </Text>

      <Paper withBorder shadow="md" p={30} mt={30} radius="md">
        {submitted ? (
          <>
            <Text ta="center">
              If an account with that email exists, we&apos;ve sent a reset
              link.
            </Text>
            <Anchor
              component={Link}
              to="/login"
              size="sm"
              mt="md"
              display="block"
              ta="center"
            >
              Back to login
            </Anchor>
          </>
        ) : (
          <form onSubmit={form.onSubmit(handleSubmit)}>
            <TextInput
              label="Email"
              placeholder="you@example.com"
              required
              {...form.getInputProps("email")}
            />
            <Button type="submit" fullWidth mt="xl">
              Send reset link
            </Button>
            <Anchor
              component={Link}
              to="/login"
              size="sm"
              mt="md"
              display="block"
              ta="center"
            >
              Back to login
            </Anchor>
          </form>
        )}
      </Paper>
    </Container>
  );
}
```

**Step 6: Create `frontend/app/routes/reset-password.tsx`**

```tsx
import {
  Anchor,
  Button,
  Container,
  Paper,
  PasswordInput,
  Text,
  Title,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { useState } from "react";
import { Link, useSearchParams } from "react-router";
import { resetPassword } from "~/lib/api";

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const [success, setSuccess] = useState(false);

  const form = useForm({
    initialValues: { password: "", confirmPassword: "" },
    validate: {
      password: (v) => (v.length >= 8 ? null : "Minimum 8 characters"),
      confirmPassword: (v, values) =>
        v === values.password ? null : "Passwords don't match",
    },
  });

  const handleSubmit = async (values: typeof form.values) => {
    try {
      await resetPassword(token, values.password);
      setSuccess(true);
    } catch (err: any) {
      notifications.show({
        title: "Reset failed",
        message: err.message,
        color: "red",
      });
    }
  };

  if (!token) {
    return (
      <Container size={420} my={40}>
        <Title ta="center">Invalid link</Title>
        <Text c="dimmed" ta="center" mt="md">
          This password reset link is invalid or has expired.
        </Text>
        <Anchor
          component={Link}
          to="/forgot-password"
          size="sm"
          mt="md"
          display="block"
          ta="center"
        >
          Request a new link
        </Anchor>
      </Container>
    );
  }

  return (
    <Container size={420} my={40}>
      <Title ta="center">Reset your password</Title>

      <Paper withBorder shadow="md" p={30} mt={30} radius="md">
        {success ? (
          <>
            <Text ta="center">Password reset successfully!</Text>
            <Anchor
              component={Link}
              to="/login"
              size="sm"
              mt="md"
              display="block"
              ta="center"
            >
              Go to login
            </Anchor>
          </>
        ) : (
          <form onSubmit={form.onSubmit(handleSubmit)}>
            <PasswordInput
              label="New password"
              placeholder="Minimum 8 characters"
              required
              {...form.getInputProps("password")}
            />
            <PasswordInput
              label="Confirm password"
              placeholder="Repeat password"
              required
              mt="md"
              {...form.getInputProps("confirmPassword")}
            />
            <Button type="submit" fullWidth mt="xl">
              Reset password
            </Button>
          </form>
        )}
      </Paper>
    </Container>
  );
}
```

**Step 7: Commit**

```bash
git add frontend/app/routes/ frontend/app/routes.ts
git commit -m "feat: add auth pages — login, register, forgot/reset password"
```

---

### Task 13: Dashboard layout and pages

**Files:**
- Create: `frontend/app/routes/dashboard/layout.tsx`
- Create: `frontend/app/routes/dashboard/index.tsx`
- Create: `frontend/app/routes/dashboard/profile.tsx`

**Step 1: Create `frontend/app/routes/dashboard/layout.tsx`**

```tsx
import {
  AppShell,
  Avatar,
  Badge,
  Box,
  Burger,
  Group,
  Indicator,
  LoadingOverlay,
  Menu,
  NavLink,
  Text,
  Title,
  UnstyledButton,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useCallback, useEffect, useState } from "react";
import { Link, Navigate, Outlet, useLocation, useNavigate } from "react-router";
import { fetchHealth, type HealthResponse } from "~/lib/api";
import { useAuth } from "~/lib/auth";

export default function DashboardLayout() {
  const { user, isLoading, logout } = useAuth();
  const [opened, { toggle }] = useDisclosure();
  const navigate = useNavigate();
  const location = useLocation();
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [backendOk, setBackendOk] = useState(true);

  const pollHealth = useCallback(async () => {
    try {
      const data = await fetchHealth();
      setHealth(data);
      setBackendOk(true);
    } catch {
      setBackendOk(false);
    }
  }, []);

  useEffect(() => {
    pollHealth();
    const interval = setInterval(pollHealth, 30_000);
    return () => clearInterval(interval);
  }, [pollHealth]);

  if (isLoading) {
    return <LoadingOverlay visible />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const initials =
    (user.first_name?.[0] || "") + (user.last_name?.[0] || "");

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{
        width: 250,
        breakpoint: "sm",
        collapsed: { mobile: !opened },
      }}
      footer={{ height: 30 }}
      padding="md"
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group>
            <Burger
              opened={opened}
              onClick={toggle}
              hiddenFrom="sm"
              size="sm"
            />
            <Title order={3}>unfust</Title>
          </Group>

          <Menu shadow="md" width={200}>
            <Menu.Target>
              <UnstyledButton>
                <Group gap="xs">
                  <Avatar color="blue" radius="xl" size="sm">
                    {initials}
                  </Avatar>
                  <Text size="sm" visibleFrom="sm">
                    {user.first_name} {user.last_name}
                  </Text>
                </Group>
              </UnstyledButton>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Item component={Link} to="/dashboard/profile">
                Profile
              </Menu.Item>
              <Menu.Divider />
              <Menu.Item color="red" onClick={handleLogout}>
                Logout
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md">
        <NavLink
          component={Link}
          to="/dashboard"
          label="Dashboard"
          active={location.pathname === "/dashboard"}
        />
        <NavLink
          component={Link}
          to="/dashboard/profile"
          label="Profile"
          active={location.pathname === "/dashboard/profile"}
        />
      </AppShell.Navbar>

      <AppShell.Main>
        <Outlet />
      </AppShell.Main>

      <AppShell.Footer p={4}>
        <Group justify="space-between" px="md" h="100%">
          <Group gap="xs">
            <Indicator
              color={backendOk ? "green" : "red"}
              size={8}
              processing={!backendOk}
            >
              <Box />
            </Indicator>
            <Text size="xs" c="dimmed">
              {backendOk ? "Connected" : "Backend unreachable"}
            </Text>
          </Group>
          <Text size="xs" c="dimmed">
            {health ? `v${health.version}` : "—"}
          </Text>
          <Badge size="xs" variant="light">
            {user.is_admin ? "Admin" : "User"}
          </Badge>
        </Group>
      </AppShell.Footer>
    </AppShell>
  );
}
```

**Step 2: Create `frontend/app/routes/dashboard/index.tsx`**

```tsx
import { Text, Title } from "@mantine/core";
import { useAuth } from "~/lib/auth";

export default function DashboardHome() {
  const { user } = useAuth();

  return (
    <>
      <Title order={2}>
        Welcome, {user?.first_name}
      </Title>
      <Text c="dimmed" mt="sm">
        This is your personal dashboard.
      </Text>
    </>
  );
}
```

**Step 3: Create `frontend/app/routes/dashboard/profile.tsx`**

```tsx
import {
  Button,
  Divider,
  Paper,
  PasswordInput,
  Stack,
  TextInput,
  Textarea,
  Title,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { useAuth } from "~/lib/auth";
import { changePassword, updateProfile } from "~/lib/api";

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();

  const profileForm = useForm({
    initialValues: {
      firstName: user?.first_name || "",
      lastName: user?.last_name || "",
      notes: user?.notes || "",
    },
  });

  const passwordForm = useForm({
    initialValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
    validate: {
      currentPassword: (v) => (v.length > 0 ? null : "Required"),
      newPassword: (v) => (v.length >= 8 ? null : "Minimum 8 characters"),
      confirmPassword: (v, values) =>
        v === values.newPassword ? null : "Passwords don't match",
    },
  });

  const handleProfileSubmit = async (values: typeof profileForm.values) => {
    try {
      await updateProfile({
        first_name: values.firstName,
        last_name: values.lastName,
        notes: values.notes || null,
      });
      await refreshUser();
      notifications.show({
        title: "Profile updated",
        message: "Your profile has been saved.",
        color: "green",
      });
    } catch (err: any) {
      notifications.show({
        title: "Error",
        message: err.message,
        color: "red",
      });
    }
  };

  const handlePasswordSubmit = async (
    values: typeof passwordForm.values
  ) => {
    try {
      await changePassword(values.currentPassword, values.newPassword);
      passwordForm.reset();
      notifications.show({
        title: "Password changed",
        message: "Your password has been updated.",
        color: "green",
      });
    } catch (err: any) {
      notifications.show({
        title: "Error",
        message: err.message,
        color: "red",
      });
    }
  };

  return (
    <Stack gap="xl">
      <div>
        <Title order={2}>Profile</Title>
        <Paper withBorder p="md" mt="md" maw={500}>
          <form onSubmit={profileForm.onSubmit(handleProfileSubmit)}>
            <TextInput label="Email" value={user?.email} disabled />
            <TextInput
              label="First name"
              mt="md"
              {...profileForm.getInputProps("firstName")}
            />
            <TextInput
              label="Last name"
              mt="md"
              {...profileForm.getInputProps("lastName")}
            />
            <Textarea
              label="Notes"
              mt="md"
              autosize
              minRows={3}
              {...profileForm.getInputProps("notes")}
            />
            <Button type="submit" mt="md">
              Save changes
            </Button>
          </form>
        </Paper>
      </div>

      <Divider />

      <div>
        <Title order={3}>Change password</Title>
        <Paper withBorder p="md" mt="md" maw={500}>
          <form onSubmit={passwordForm.onSubmit(handlePasswordSubmit)}>
            <PasswordInput
              label="Current password"
              {...passwordForm.getInputProps("currentPassword")}
            />
            <PasswordInput
              label="New password"
              mt="md"
              {...passwordForm.getInputProps("newPassword")}
            />
            <PasswordInput
              label="Confirm new password"
              mt="md"
              {...passwordForm.getInputProps("confirmPassword")}
            />
            <Button type="submit" mt="md">
              Change password
            </Button>
          </form>
        </Paper>
      </div>
    </Stack>
  );
}
```

**Step 4: Wire AuthProvider into root.tsx**

In `frontend/app/root.tsx`, wrap the `App` component:

```tsx
import { AuthProvider } from "~/lib/auth";

export default function App() {
  return (
    <AuthProvider>
      <Outlet />
    </AuthProvider>
  );
}
```

**Step 5: Verify frontend compiles**

Run: `cd frontend && npx react-router typegen && npx tsc --noEmit`
Expected: No type errors

**Step 6: Commit**

```bash
git add frontend/app/routes/dashboard/ frontend/app/root.tsx
git commit -m "feat: add dashboard layout with header, nav, status bar, and profile page"
```

---

## Phase 3: Integration Testing

### Task 14: End-to-end manual verification

**Step 1: Start backend**

Run: `cd backend && uv run alembic upgrade head && uv run uvicorn app.main:app --reload --port 8000`
Expected: Server starts on http://localhost:8000

**Step 2: Start frontend (separate terminal)**

Run: `cd frontend && npm run dev`
Expected: Vite dev server on http://localhost:5173

**Step 3: Test the full flow in browser**

1. Go to http://localhost:5173 → should redirect to /login
2. Click "Register" → fill form → submit → should redirect to /dashboard (first user = admin)
3. Check status bar: green dot, version, "Admin" badge
4. Go to Profile → change name → save → header avatar updates
5. Change password → login again with new password
6. Logout → redirect to /login
7. Test /api/health directly: `curl http://localhost:8000/api/health`

**Step 4: Run all backend tests**

Run: `cd backend && uv run pytest tests/ -v`
Expected: All tests pass

**Step 5: Commit any fixes**

```bash
git add -A
git commit -m "fix: integration fixes from end-to-end testing"
```

---

## Phase 4: Docker

### Task 15: Backend Dockerfile

**Files:**
- Create: `backend/Dockerfile`

**Step 1: Create `backend/Dockerfile`**

```dockerfile
FROM python:3.14-slim AS base

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

WORKDIR /srv/backend

# Install dependencies (cached layer)
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev

# Copy source code
COPY app/ ./app/
COPY alembic/ ./alembic/
COPY alembic.ini ./

# Production target
FROM base AS production
ENV PATH="/srv/backend/.venv/bin:$PATH"
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

# Development target (with reload)
FROM base AS development
ENV PATH="/srv/backend/.venv/bin:$PATH"
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload", "--reload-dir", "/srv/backend/app"]
```

**Step 2: Commit**

```bash
git add backend/Dockerfile
git commit -m "feat: add backend Dockerfile with dev and prod targets"
```

---

### Task 16: Frontend Dockerfile

**Files:**
- Modify: `frontend/Dockerfile`

**Step 1: Rewrite `frontend/Dockerfile`**

```dockerfile
FROM node:20-alpine AS base
WORKDIR /srv/frontend

# Install dependencies (cached layer)
COPY package.json package-lock.json ./
RUN npm ci

# Copy source code
COPY . .

# Development target
FROM base AS development
EXPOSE 5173
CMD ["npx", "react-router", "dev", "--host", "0.0.0.0"]

# Build target
FROM base AS build
RUN npm run build

# Production target
FROM node:20-alpine AS production
WORKDIR /srv/frontend
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY --from=build /srv/frontend/build ./build
EXPOSE 3000
CMD ["npm", "run", "start"]
```

**Step 2: Commit**

```bash
git add frontend/Dockerfile
git commit -m "feat: rewrite frontend Dockerfile with dev and prod targets"
```

---

### Task 17: Docker Compose files

**Files:**
- Create: `docker-compose.yml`
- Create: `docker-compose.dev.yml`

**Step 1: Create `docker-compose.yml` (production)**

```yaml
services:
  backend:
    build:
      context: ./backend
      target: production
    ports:
      - "8000:8000"
    env_file:
      - .env
    volumes:
      - ./data:/srv/backend/data
    networks:
      - unfust-net
    restart: unless-stopped

  frontend:
    build:
      context: ./frontend
      target: production
    ports:
      - "3000:3000"
    depends_on:
      - backend
    networks:
      - unfust-net
    restart: unless-stopped

networks:
  unfust-net:
    driver: bridge
```

**Step 2: Create `docker-compose.dev.yml`**

```yaml
services:
  backend:
    build:
      context: ./backend
      target: development
    ports:
      - "8000:8000"
    env_file:
      - .env
    volumes:
      - ./backend/app:/srv/backend/app
      - ./backend/alembic:/srv/backend/alembic
      - ./data:/srv/backend/data
      - ./.env:/srv/backend/.env:ro
    networks:
      - unfust-net

  frontend:
    build:
      context: ./frontend
      target: development
    ports:
      - "5173:5173"
    volumes:
      - ./frontend/app:/srv/frontend/app
      - ./frontend/public:/srv/frontend/public
    depends_on:
      - backend
    networks:
      - unfust-net

networks:
  unfust-net:
    driver: bridge
```

**Step 3: Test Docker dev mode**

Run: `docker compose -f docker-compose.dev.yml up --build`
Expected: Both services start. Frontend on :5173, backend on :8000. Hot reload works when editing source files.

**Step 4: Test Docker prod mode**

Run: `docker compose up --build`
Expected: Both services start. Frontend on :3000, backend on :8000.

**Step 5: Commit**

```bash
git add docker-compose.yml docker-compose.dev.yml
git commit -m "feat: add Docker Compose configs for dev (hot reload) and production"
```

---

## Phase 5: Final Polish

### Task 18: Update .env.example and create .env for dev

**Step 1: Ensure `.env` exists for local development**

Create `.env` (git-ignored) from `.env.example` with a real secret:

```bash
cp .env.example .env
# Edit .env and set JWT_SECRET_KEY to output of: openssl rand -hex 32
```

**Step 2: Verify `.env` is in `.gitignore`**

Already done in Task 1.

**Step 3: Commit any remaining changes**

```bash
git add .env.example
git commit -m "chore: finalize .env.example"
```

---

### Task 19: Run full test suite and verify

**Step 1: Run backend tests**

Run: `cd backend && uv run pytest tests/ -v`
Expected: All tests pass

**Step 2: Run frontend type check**

Run: `cd frontend && npx react-router typegen && npx tsc --noEmit`
Expected: No errors

**Step 3: Run Docker dev build**

Run: `docker compose -f docker-compose.dev.yml up --build`
Expected: Both services healthy, full auth flow works

**Step 4: Final commit if any fixes**

```bash
git add -A
git commit -m "chore: final fixes from full test suite"
```
