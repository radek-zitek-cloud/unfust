# AGENTS.md - Unfust Development Guide

Guidelines for agentic coding agents working in this repository.

## Project Overview

- **Backend**: Python 3.14, FastAPI, SQLAlchemy async, SQLite
- **Frontend**: React 19, React Router 7, Mantine 8, TypeScript
- **Database**: SQLite at `data/unfust.db` (git-ignored)

---

## Commands

### Backend

```bash
# Install, run tests, format
cd backend && uv sync
cd backend && uv run pytest tests/ -v
cd backend && uv run pytest tests/test_auth_service.py -v
cd backend && uv run pytest tests/test_auth_service.py::test_register_first_user_is_admin -v
cd backend && ruff format

# Migrations
cd backend && uv run alembic upgrade head
cd backend && uv run alembic revision --autogenerate -m "description"

# Dev server
cd backend && uv run uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend && npm install
cd frontend && npm run dev      # port 5173
cd frontend && npm run typecheck  # react-router typegen + tsc
cd frontend && npm run build
```

### Docker

```bash
docker compose -f docker-compose.dev.yml up --build  # dev
docker compose up --build                              # production
```

---

## Code Style - Python

### Formatting & Types
- Use `ruff format` before committing
- Python 3.14+ syntax: `X | None` over `Optional[X]`, no `from __future__ import annotations`
- All function args/returns need type hints
- Use SQLAlchemy's `Mapped[]` and `mapped_column()`

### Naming
- Files: snake_case (`auth_service.py`)
- Classes: PascalCase (`AuthService`)
- Functions/variables: snake_case
- Constants: UPPER_SNAKE_CASE
- DB tables: plural snake_case (`users`, `refresh_tokens`)

### Project Structure
```
backend/app/
├── main.py, config.py, database.py, dependencies.py, security.py
├── models/      # SQLAlchemy models
├── routers/     # API endpoints
├── schemas/     # Pydantic request/response
└── services/    # Business logic
```

### Error Handling
- `HTTPException` for HTTP errors
- `ValueError` for business logic validation
- Catch specific exceptions (e.g., `IntegrityError`)

### Async Patterns
- Use `async`/`await` throughout
- Use `AsyncSession`, `aiosqlite`

### Database Rules
- **Never delete `data/unfust.db` without explicit user confirmation**
- Always use Alembic for schema changes
- Use `server_default` for new non-nullable columns
- See CLAUDE.md for migration best practices

---

## Code Style - TypeScript/React

### TypeScript
- Strict mode enabled
- Use `interface` for public APIs, `type` for unions
- Avoid `any` - use `unknown` if needed
- Absolute imports: `~/*` maps to `./app/*`

### Naming
- Files: kebab-case components (`WeatherWidget.tsx`), camelCase utils (`api.ts`)
- Components: PascalCase
- Interfaces: PascalCase (`UserProfile`)

### Patterns
- Functional components with hooks
- Mantine UI components
- react-grid-layout v2: use `react-grid-layout/legacy`
- React Router 7: use `useLoaderData`, `useActionData` for SSR

### Mantine + SSR
- `<html>` needs `suppressHydrationWarning`

### Project Structure
```
frontend/app/
├── root.tsx, theme.ts
├── lib/auth.tsx, lib/api.ts
├── components/, components/widgets/
└── routes/
```

---

## API Design

### Backend
- RESTful: `GET/POST/PATCH/DELETE`
- FastAPI routers with prefixes (e.g., `prefix="/api/auth"`)
- Pydantic schemas, `response_model`

### Frontend
- Use `apiClient` from `~/lib/api.ts` (handles token refresh)
- Include `credentials: "include"` for cookie auth

---

## Environment

- Copy `.env.example` to `.env`
- Required: `JWT_SECRET_KEY` (`openssl rand -hex 32`)
- Optional: `OPENWEATHERMAP_API_KEY`, SMTP settings

---

## Common Gotchas

1. Mantine SSR: `<html>` needs `suppressHydrationWarning`
2. React Router 7: catch-all splat route (`*`) to avoid 404 noise
3. First user: auto-becomes admin; subsequent users inactive
4. Weather widget: requires `OPENWEATHERMAP_API_KEY`
5. System monitor: needs `/var/run/docker.sock` mount

---

## Testing

```python
@pytest_asyncio.fixture
async def db_session():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    session_factory = async_sessionmaker(engine, expire_on_commit=False)
    async with session_factory() as session:
        yield session
    await engine.dispose()
```

- Use `pytest-asyncio`
- `@pytest_asyncio.fixture`, `@pytest.mark.asyncio`
- Test file naming: `test_<module>.py`

---

## Version

- Source of truth: `backend/app/__init__.py` → `__version__`
