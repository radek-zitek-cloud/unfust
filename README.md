# UNFUST

Personal dashboard application.

**Stack:** FastAPI + SQLAlchemy (Python 3.14) | React 19 + Mantine 8 (TypeScript) | SQLite

## Quick Start (Docker)

```bash
cp .env.example .env
# Edit .env — set JWT_SECRET_KEY (required):
#   openssl rand -hex 32

make dev        # or: docker compose -f docker-compose.dev.yml up --build
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- API docs: http://localhost:8000/docs

The first registered user automatically becomes the admin.

## Development Without Docker

**Prerequisites:** Python 3.14+, Node 20+, [uv](https://docs.astral.sh/uv/)

```bash
cp .env.example .env
# Set JWT_SECRET_KEY in .env
```

### Backend

```bash
cd backend
uv sync
uv run alembic upgrade head
uv run uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Vite proxies `/api` requests to the backend at `localhost:8000`.

## Development Workflow (Make)

All development tasks are automated via the `Makefile`. Run `make help` for the full list.

### Development Commands

| Task | Command | Description |
|------|---------|-------------|
| Start dev environment | `make dev` | Hot reload for both backend and frontend |
| Stop containers | `make down` | Stop all running containers |
| View logs | `make logs` | Follow container output |

### Quality Checks

| Task | Command | Description |
|------|---------|-------------|
| Run all checks | `make check` | Tests + typecheck (required before release) |
| Backend tests | `make test` | Run pytest suite |
| Frontend typecheck | `make typecheck` | TypeScript validation |

### Docker Images

| Task | Command | Description |
|------|---------|-------------|
| Build production | `make build` | Tag images with current version |
| Push to registry | `make push-images` | Push to `ghcr.io` |

### Release Workflow

Releases follow semantic versioning and use release branches.

| Task | Command | Description |
|------|---------|-------------|
| Show version | `make version` | Display current version |
| Bump version | `make bump-patch/minor/major` | Update version in both backend and frontend |
| Full release | `make release-patch/minor/major` | Complete release workflow (see below) |
| Emergency rollback | `make rollback` | Rollback to previous version |

**Full release process** (`make release-patch`):
1. Run pre-release checks (tests + typecheck)
2. Bump version in `backend/app/__init__.py` and `frontend/package.json`
3. Create `release/vX.Y.Z` branch
4. Create and push git tag `vX.Y.Z`
5. Create GitHub release with auto-generated changelog
6. Build and push Docker images to `ghcr.io/radek-zitek-cloud/unfust-{backend,frontend}:vX.Y.Z`

After release, create a PR to merge the release branch into `main`.

### Legacy Commands

| Task | Command |
|------|---------|
| Run backend tests | `cd backend && uv run pytest tests/ -v` |
| Type-check frontend | `cd frontend && npx react-router typegen && npx tsc --noEmit` |
| Create DB migration | `cd backend && uv run alembic revision --autogenerate -m "description"` |
| Apply migrations | `cd backend && uv run alembic upgrade head` |
| Production build | `docker compose up --build` |

## Project Structure

```
unfust/
├── backend/
│   ├── app/
│   │   ├── main.py          # FastAPI entry point
│   │   ├── config.py        # Settings (reads .env)
│   │   ├── routers/         # API route handlers
│   │   ├── models/          # SQLAlchemy models
│   │   ├── schemas/         # Pydantic request/response schemas
│   │   └── services/        # Business logic
│   ├── alembic/             # Database migrations
│   ├── tests/
│   └── Dockerfile
├── frontend/
│   ├── app/
│   │   ├── root.tsx         # App shell & providers
│   │   ├── theme.ts         # Mantine theme
│   │   ├── components/      # Shared components
│   │   ├── lib/             # Auth context, API client
│   │   └── routes/          # Page routes
│   └── Dockerfile
├── scripts/                  # Release automation scripts
├── data/                     # SQLite database (git-ignored)
├── docker-compose.yml        # Production
├── docker-compose.dev.yml    # Development (hot reload)
└── Makefile                  # Development workflow commands
```

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `JWT_SECRET_KEY` | Yes | — | Secret for signing JWT tokens |
| `DATABASE_URL` | No | `sqlite+aiosqlite:///data/unfust.db` | Database connection string |
| `SMTP_HOST` | No | `localhost` | SMTP server for password reset emails |
| `SMTP_PORT` | No | `587` | SMTP port |
| `SMTP_USER` | No | — | SMTP username |
| `SMTP_PASSWORD` | No | — | SMTP password |
| `SMTP_FROM` | No | `noreply@unfust.local` | Sender address for emails |
| `FRONTEND_URL` | No | `http://localhost:5173` | Used in password reset email links |

## License

Private project.
