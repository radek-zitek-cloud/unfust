# Unfust — Personal Dashboard App

## Repository
- GitHub: `radek-zitek-cloud/unfust` (public)

## Project Structure
Monorepo: `backend/` (Python 3.14, FastAPI, SQLAlchemy async, SQLite) + `frontend/` (React 19, React Router 7, Mantine 8, TypeScript)
- Data/DB stored in `data/` (git-ignored)
- Settings loaded from `.env` via Pydantic BaseSettings (env vars override .env)
- Single version source of truth: `backend/app/__init__.py` → `__version__`

## Key Files
- `backend/app/main.py` — FastAPI entry point
- `backend/app/config.py` — Pydantic settings (reads `.env` from project root)
- `backend/app/routers/` — API route handlers (`auth.py`, `users.py`, `widgets.py`, `bookmarks.py`, `rss.py`)
- `backend/app/models/` — SQLAlchemy models
- `backend/app/services/` — Business logic layer
- `frontend/app/root.tsx` — App shell, providers, layout
- `frontend/app/theme.ts` — Mantine theme config
- `frontend/app/lib/auth.tsx` — Auth context & hooks
- `frontend/app/lib/api.ts` — API client functions

## Backend Commands
- `cd backend && uv sync` — install dependencies
- `cd backend && uv run pytest tests/ -v` — run tests
- `cd backend && uv run alembic upgrade head` — apply migrations
- `cd backend && uv run alembic revision --autogenerate -m "description"` — create migration
- `cd backend && uv run uvicorn app.main:app --reload --port 8000` — dev server

## Frontend Commands
- `cd frontend && npm install` — install dependencies
- `cd frontend && npm run dev` — dev server (port 5173)
- `cd frontend && npx react-router typegen && npx tsc --noEmit` — type check
- Vite proxies `/api` → `http://localhost:8000` in dev

## Docker
- `docker compose -f docker-compose.dev.yml up --build` — dev with hot reload
- `docker compose up --build` — production
- Volume mounts are source-only (no .venv, node_modules) — deps baked into image

## Environment Setup
- Copy `.env.example` to `.env` at project root and set `JWT_SECRET_KEY` (required)
- Generate secret: `openssl rand -hex 32`
- SMTP settings needed only for password reset emails

## Known Gotchas
- Mantine + SSR: `<html>` tag needs `suppressHydrationWarning` for ColorSchemeScript
- React Router 7 SSR: needs catch-all splat route (`*`) to avoid noisy 404s from Chrome DevTools probes
- SQLite DB path: `data/unfust.db` — ensure `data/` dir exists before running migrations
- First registered user auto-becomes active admin; subsequent users are inactive
- Backend formatting: `ruff format` (auto-runs via Claude Code hook on save)
- Weather widget requires `OPENWEATHERMAP_API_KEY` in `.env`
- System monitor Docker stats require `/var/run/docker.sock` mount
- RSS feeds refresh every 15 minutes via background task
- react-grid-layout v2: use `react-grid-layout/legacy` import path for component API

## Database Rules (CRITICAL)
**Never delete the database (`data/unfust.db`) without explicit user confirmation.**

### Migration Best Practices
- Always use Alembic for schema changes
- When adding non-nullable columns to existing tables, use `server_default`:
  ```python
  op.add_column('table', sa.Column('col', sa.Integer(), server_default='0', nullable=False))
  ```
- If a migration fails:
  1. Fix the migration script
  2. Run `alembic downgrade -1` to revert
  3. Re-run `alembic upgrade head`
- Test migrations on a backup copy first if production data exists
- Never use `rm data/unfust.db` as a migration fix
