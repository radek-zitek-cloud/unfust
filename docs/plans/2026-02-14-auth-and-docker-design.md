# Unfust — Authentication & Docker Setup Design

**Date:** 2026-02-14
**Status:** Approved

## Overview

Full-stack authentication system for the unfust personal dashboard app, followed by Docker
configuration for development and production. The backend uses FastAPI + SQLAlchemy + SQLite,
the frontend uses React Router 7 + Mantine. JWT bearer/refresh tokens with HttpOnly cookies
provide session management.

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Database | SQLAlchemy + SQLite in `/data` | Pragmatic start, trivial migration to PostgreSQL later |
| Password reset | Email-based reset link (SMTP) | Standard approach, user-expected flow |
| Token storage | HttpOnly cookies (refresh), JS memory (access) | Best XSS protection |
| Frontend UI | Mantine component library | Batteries-included, built-in dark mode, form handling |
| Backend structure | Monolithic FastAPI with routers + service layer | Simple, sufficient for personal dashboard |
| Settings | Pydantic `BaseSettings` with `.env` file support | Env vars override `.env`, works in local dev and Docker |
| Versioning | Semantic versioning, single source of truth in backend | Monorepo = one product version |

---

## 1. Data Model

### 1.1 User

| Field | Type | Constraints |
|-------|------|-------------|
| `id` | UUID | Primary key, auto-generated |
| `email` | String(255) | Unique, indexed, not null |
| `first_name` | String(100) | Not null |
| `last_name` | String(100) | Not null |
| `password_hash` | String(255) | Not null (bcrypt via passlib) |
| `is_active` | Boolean | Default: `False` |
| `is_admin` | Boolean | Default: `False` |
| `notes` | Text | Nullable |
| `created_at` | DateTime | Auto-set UTC |
| `updated_at` | DateTime | Auto-updated UTC |

**Auto-admin rule:** On registration, if the users table is empty, the new user gets
`is_active=True, is_admin=True`. All subsequent users get `is_active=False, is_admin=False`
and must be activated by an admin.

### 1.2 Refresh Token

| Field | Type | Constraints |
|-------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | FK -> users.id, indexed |
| `token_hash` | String(255) | SHA-256 hash of the token (never stored in plaintext) |
| `expires_at` | DateTime | Token expiration |
| `created_at` | DateTime | Auto-set UTC |
| `revoked` | Boolean | Default: `False` |

### 1.3 Password Reset Token

| Field | Type | Constraints |
|-------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | FK -> users.id |
| `token_hash` | String(255) | SHA-256 hash of the token |
| `expires_at` | DateTime | 1-hour TTL |
| `used` | Boolean | Default: `False` |

### 1.4 Database Setup

- SQLAlchemy 2.0 async with `AsyncSession`
- SQLite file at `data/unfust.db`
- Alembic for migrations, migration files committed to git
- DB path configurable via `DATABASE_URL` env var

---

## 2. Authentication Flows & API

### 2.1 JWT Token Strategy

| Token | Lifetime | Storage | Purpose |
|-------|----------|---------|---------|
| Access token | 15 minutes | JS memory (frontend) | API authorization via `Authorization: Bearer` header |
| Refresh token | 7 days | HttpOnly secure cookie | Silent refresh of access tokens |

### 2.2 API Endpoints

**Public (no auth required):**

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/health` | Returns `{ "status": "ok", "version": "x.y.z" }` |
| `POST` | `/api/auth/register` | Create account -> access token + refresh cookie |
| `POST` | `/api/auth/login` | Email + password -> access token + refresh cookie |
| `POST` | `/api/auth/refresh` | Reads refresh cookie -> new access token + rotated refresh cookie |
| `POST` | `/api/auth/forgot-password` | Email -> sends reset link (always returns 200) |
| `POST` | `/api/auth/reset-password` | Token + new password -> resets password, revokes all refresh tokens |

**Protected (valid access token required):**

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/auth/logout` | Revokes current refresh token, clears cookie |
| `GET` | `/api/users/me` | Returns current user profile |
| `PATCH` | `/api/users/me` | Update first name, last name, notes |
| `POST` | `/api/users/me/change-password` | Old + new password, revokes all other refresh tokens |

**Admin-only (access token + `is_admin=True`):**

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/users` | List all users (paginated) |
| `PATCH` | `/api/users/{id}` | Activate/deactivate, toggle admin, edit notes |

### 2.3 Security Behaviors

- **Refresh token rotation:** Every `/refresh` issues a new token and revokes the old one. Reuse
  of a revoked token triggers revocation of all tokens for that user (replay detection).
- **Password change/reset:** Revokes all refresh tokens, forcing re-login on all devices.
- **Login cleanup:** Expired refresh tokens for the user are cleaned up on login.
- **Rate limiting:** Failed login attempts throttled at 5 per minute per email (slowapi or
  in-memory counter).
- **Email enumeration prevention:** `/forgot-password` always returns 200. `/register` returns
  generic validation errors.

### 2.4 SMTP / Email

- Settings via `.env` / environment variables: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`,
  `SMTP_PASSWORD`, `SMTP_FROM`
- Reset link format: `{FRONTEND_URL}/reset-password?token={token}`
- Plain-text emails initially
- Synchronous sending (async background tasks can come later)

### 2.5 Settings

Pydantic `BaseSettings` with `env_file=".env"` support. Environment variables override `.env`
values. Key settings:

- `DATABASE_URL` (default: `sqlite+aiosqlite:///data/unfust.db`)
- `JWT_SECRET_KEY` (required, no default)
- `JWT_ACCESS_TOKEN_EXPIRE_MINUTES` (default: 15)
- `JWT_REFRESH_TOKEN_EXPIRE_DAYS` (default: 7)
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`
- `FRONTEND_URL` (default: `http://localhost:5173`)

---

## 3. Backend Structure

```
backend/
├── app/
│   ├── __init__.py          # __version__ = "0.1.0" (semver source of truth)
│   ├── main.py              # FastAPI app factory, CORS, router includes
│   ├── config.py            # Pydantic BaseSettings with .env support
│   ├── database.py          # SQLAlchemy async engine, session factory
│   ├── models/
│   │   ├── __init__.py
│   │   └── user.py          # User, RefreshToken, PasswordResetToken models
│   ├── schemas/
│   │   ├── __init__.py
│   │   └── user.py          # Pydantic request/response schemas
│   ├── routers/
│   │   ├── __init__.py
│   │   ├── auth.py          # Auth endpoints (login, register, refresh, etc.)
│   │   └── users.py         # User profile + admin endpoints
│   ├── services/
│   │   ├── __init__.py
│   │   ├── auth.py          # Auth business logic
│   │   └── email.py         # SMTP email sending
│   ├── dependencies.py      # FastAPI deps (get_db, get_current_user, require_admin)
│   └── security.py          # JWT encode/decode, password hashing
├── alembic/
│   ├── env.py
│   └── versions/
├── alembic.ini
└── pyproject.toml
```

---

## 4. Frontend Architecture

### 4.1 Auth State Management

`AuthProvider` React context wrapping the app:
- `user` object or `null`
- `accessToken` in memory (never localStorage)
- `isLoading` flag for initial silent refresh

**On app load:** Calls `/api/auth/refresh`. Success -> user logged in. Failure -> redirect to
login.

**API calls:** Custom fetch wrapper attaches `Authorization: Bearer` header. On 401, attempts
one silent refresh before redirecting to login.

### 4.2 Route Structure

```
/                     -> Redirect to /dashboard (if authenticated) or /login
/login                -> Login form
/register             -> Registration form
/forgot-password      -> Email input form
/reset-password       -> New password form (token from URL query param)
/dashboard            -> Protected layout (AppShell)
  /dashboard/         -> Dashboard home (welcome message)
  /dashboard/profile  -> Profile edit + password change
```

### 4.3 Dashboard Layout (Mantine AppShell)

**Header bar:**
- Left: App title ("unfust")
- Center/right: Main menu navigation (horizontal links)
- Far right: User avatar (initials-based) + full name dropdown -> Profile, Admin (if admin),
  Logout

**Main area:**
- `<Outlet />` for route content

**Footer status bar:**
- Left: Backend connection indicator (green/red dot) via `/api/health` polling every 30s
- Center: App version from health endpoint (e.g. `v0.1.0`)
- Right: User role badge ("Admin" / "User")

### 4.4 Mantine Integration

- `MantineProvider` at root with system-preference dark/light theme
- Replace Tailwind with Mantine styling (avoid mixing two styling systems)
- Key components: `TextInput`, `PasswordInput`, `Button`, `Paper`, `AppShell`, `Notifications`

### 4.5 Frontend Structure

```
frontend/
├── app/
│   ├── root.tsx              # MantineProvider, AuthProvider, theme setup
│   ├── routes.ts             # Route definitions
│   ├── routes/
│   │   ├── home.tsx          # Redirect logic (-> /dashboard or /login)
│   │   ├── login.tsx
│   │   ├── register.tsx
│   │   ├── forgot-password.tsx
│   │   ├── reset-password.tsx
│   │   └── dashboard/
│   │       ├── layout.tsx    # ProtectedLayout with AppShell
│   │       ├── index.tsx     # Dashboard home
│   │       └── profile.tsx   # Profile + password change
│   ├── lib/
│   │   ├── api.ts            # Fetch wrapper with token refresh
│   │   └── auth.tsx          # AuthProvider context + hook
│   └── components/           # Shared Mantine-based components
```

---

## 5. Docker Configuration

### 5.1 Container Architecture

| Service | Base Image | Dev Port | Prod Port |
|---------|-----------|----------|-----------|
| `backend` | `python:3.14-slim` | 8000 | 8000 |
| `frontend` | `node:20-alpine` | 5173 | 3000 |

### 5.2 Directory Layout Inside Containers

```
/srv/backend/
  .venv/          # Installed in image, never mounted
  app/            # <- mount ./backend/app here (dev only)
  alembic/        # <- mount ./backend/alembic here (dev only)

/srv/frontend/
  node_modules/   # Installed in image, never mounted
  app/            # <- mount ./frontend/app here (dev only)
  public/         # <- mount ./frontend/public here (dev only)
```

Source mounts are subdirectories that never overlap with dependency directories.

### 5.3 Development Mode (docker-compose.dev.yml)

**Backend volumes:**
```yaml
volumes:
  - ./backend/app:/srv/backend/app
  - ./backend/alembic:/srv/backend/alembic
  - ./data:/srv/backend/data
  - ./.env:/srv/backend/.env:ro
```

Uvicorn with `--reload` watching `/srv/backend/app`.

**Frontend volumes:**
```yaml
volumes:
  - ./frontend/app:/srv/frontend/app
  - ./frontend/public:/srv/frontend/public
```

Vite dev server with HMR. Proxy `/api` -> `http://backend:8000`.

### 5.4 Production Mode (docker-compose.yml)

- No volume mounts (everything baked into images)
- Backend: uvicorn without `--reload`, configurable worker count
- Frontend: `react-router build` then `react-router-serve` on port 3000
- Data volume for SQLite persistence: `./data:/srv/backend/data`

### 5.5 Network & Environment

- Internal Docker network: `unfust-net`
- Frontend -> backend via `http://backend:8000/api` (Docker DNS)
- Dev: Vite proxy forwards `/api` to backend (single origin, no CORS issues)
- `.env` file at project root (git-ignored), `.env.example` committed with placeholders

### 5.6 Dockerfiles

**`backend/Dockerfile`:**
1. `python:3.14-slim` base
2. Install `uv`
3. Copy `pyproject.toml` + `uv.lock`, run `uv sync` into `/srv/backend/.venv`
4. Copy source code into `/srv/backend/app`
5. CMD: `uvicorn app.main:app --host 0.0.0.0 --port 8000`

**`frontend/Dockerfile`:**
1. `node:20-alpine` base
2. Copy `package.json` + `package-lock.json`, run `npm ci` into `/srv/frontend/node_modules`
3. Copy source code
4. Dev override CMD: `npx react-router dev --host 0.0.0.0`
5. Prod: Multi-stage build then serve

---

## 6. Semantic Versioning

- Source of truth: `backend/app/__init__.py` -> `__version__ = "0.1.0"`
- Exposed via `/api/health` -> `{ "status": "ok", "version": "0.1.0" }`
- Frontend reads version from health endpoint (no hardcoded frontend version)
- Follows semver: MAJOR.MINOR.PATCH
- Starting at `0.1.0` (pre-release development)

---

## 7. Files to Create/Modify

### New files (backend):
- `backend/app/__init__.py`
- `backend/app/main.py` (replace existing placeholder)
- `backend/app/config.py`
- `backend/app/database.py`
- `backend/app/security.py`
- `backend/app/dependencies.py`
- `backend/app/models/__init__.py`
- `backend/app/models/user.py`
- `backend/app/schemas/__init__.py`
- `backend/app/schemas/user.py`
- `backend/app/routers/__init__.py`
- `backend/app/routers/auth.py`
- `backend/app/routers/users.py`
- `backend/app/services/__init__.py`
- `backend/app/services/auth.py`
- `backend/app/services/email.py`
- `backend/pyproject.toml` (update with dependencies)
- `backend/alembic.ini`
- `backend/alembic/env.py`
- `backend/alembic/versions/` (initial migration)

### New files (frontend):
- `frontend/app/lib/api.ts`
- `frontend/app/lib/auth.tsx`
- `frontend/app/routes/login.tsx`
- `frontend/app/routes/register.tsx`
- `frontend/app/routes/forgot-password.tsx`
- `frontend/app/routes/reset-password.tsx`
- `frontend/app/routes/dashboard/layout.tsx`
- `frontend/app/routes/dashboard/index.tsx`
- `frontend/app/routes/dashboard/profile.tsx`

### Modified files (frontend):
- `frontend/app/root.tsx` (add MantineProvider, AuthProvider)
- `frontend/app/routes.ts` (add all routes)
- `frontend/package.json` (add Mantine dependencies)

### New files (Docker):
- `docker-compose.yml`
- `docker-compose.dev.yml`
- `backend/Dockerfile` (new)
- `frontend/Dockerfile` (update existing)
- `.env.example`

### New files (project root):
- `.env.example`
- `.gitignore` (update with .env, data/*.db)
