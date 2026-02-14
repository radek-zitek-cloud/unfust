---
name: run-stack
description: Start the full dev stack. Usage - /run-stack [local|docker]
disable-model-invocation: true
---

# Run Unfust Dev Stack

## Modes

### `local` (default)
Start backend and frontend as local processes:

1. **Apply pending migrations:**
   ```bash
   cd /home/radek/Code/unfust/backend && uv run alembic upgrade head
   ```
2. **Start backend** (background):
   ```bash
   cd /home/radek/Code/unfust/backend && uv run uvicorn app.main:app --reload --port 8000
   ```
3. **Start frontend** (background):
   ```bash
   cd /home/radek/Code/unfust/frontend && npm run dev
   ```
4. **Verify** both are running:
   - Backend health: `curl -s http://localhost:8000/api/health`
   - Frontend: open http://localhost:5173

### `docker`
Start via Docker Compose with hot reload:

1. **Build and start:**
   ```bash
   cd /home/radek/Code/unfust && docker compose -f docker-compose.dev.yml up --build -d
   ```
2. **Apply migrations inside container:**
   ```bash
   docker compose -f docker-compose.dev.yml exec backend alembic upgrade head
   ```
3. **Verify:**
   - Backend: `curl -s http://localhost:8000/api/health`
   - Frontend: open http://localhost:5173
4. **Show logs:**
   ```bash
   docker compose -f docker-compose.dev.yml logs -f
   ```

## Stopping

- Local: stop the background shell processes
- Docker: `docker compose -f docker-compose.dev.yml down`
