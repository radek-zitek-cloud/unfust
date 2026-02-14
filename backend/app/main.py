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
