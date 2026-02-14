# Unfust — Personal Dashboard App

## Project Structure
Monorepo: `backend/` (Python 3.14, FastAPI, SQLAlchemy async, SQLite) + `frontend/` (React 19, React Router 7, Mantine 7, TypeScript)
- Data/DB stored in `data/` (git-ignored)
- Settings loaded from `.env` via Pydantic BaseSettings (env vars override .env)
- Single version source of truth: `backend/app/__init__.py` → `__version__`

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

## Known Gotchas
- Mantine + SSR: `<html>` tag needs `suppressHydrationWarning` for ColorSchemeScript
- React Router 7 SSR: needs catch-all splat route (`*`) to avoid noisy 404s from Chrome DevTools probes
- SQLite DB path: `data/unfust.db` — ensure `data/` dir exists before running migrations
- First registered user auto-becomes active admin; subsequent users are inactive
