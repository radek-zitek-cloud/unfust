import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import __version__
from app.config import settings
from app.database import async_session_factory
from app.routers import auth, bookmarks, rss, users, widgets
from app.services.rss import RssService

logger = logging.getLogger(__name__)


async def _rss_refresh_loop():
    while True:
        await asyncio.sleep(900)  # 15 minutes
        try:
            async with async_session_factory() as db:
                service = RssService(db)
                await service.refresh_all_feeds()
        except Exception:
            logger.warning("RSS refresh cycle failed")


@asynccontextmanager
async def lifespan(app: FastAPI):
    task = asyncio.create_task(_rss_refresh_loop())
    yield
    task.cancel()


def create_app() -> FastAPI:
    app = FastAPI(title="Unfust", version=__version__, lifespan=lifespan)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=[settings.frontend_url],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(auth.router)
    app.include_router(users.router)
    app.include_router(widgets.router)
    app.include_router(bookmarks.router)
    app.include_router(rss.router)

    @app.get("/api/health")
    async def health():
        return {"status": "ok", "version": __version__}

    return app


app = create_app()
