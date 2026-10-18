"""FloodWatch FastAPI application.

Local JSON-file storage backend. CORS is restricted to configured origins
(via ``CORS_ORIGINS``) — never ``*`` in production.
"""

from __future__ import annotations

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.backup import snapshot_backup
from app.core.config import settings
from app.core.responses import register_exception_handlers
from app.routers import alerts, analytics, auth, forecast, funds, gis, notifications, priority, reports
from app.storage.seed import ensure_seed

logging.basicConfig(
    level=logging.DEBUG if settings.debug else logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)
logger = logging.getLogger("floodwatch.main")

app = FastAPI(
    title=settings.app_name,
    description=(
        "FloodWatch backend — REST API for flood reports, alerts, "
        "notifications, treasury funds, GIS layers, forecasts and analytics."
    ),
    version="0.1.0",
)

# CORS — restricted to explicit origins. Use CORS_ORIGINS for the React dev server.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

register_exception_handlers(app)

# Serve uploaded report imagery.
settings.upload_path.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.upload_path), name="uploads")

# Ensure baseline JSON collections exist before the first request.
ensure_seed()


@app.on_event("startup")
async def startup() -> None:
    if settings.using_dev_secret:
        logger.warning(
            "JWT_SECRET is the development default. Set JWT_SECRET in backend/.env "
            "before deploying."
        )
    if settings.environment != "test":
        snapshot_backup()
    logger.info(
        "FloodWatch backend ready | data=%s | uploads=%s | cors=%s",
        settings.data_path,
        settings.upload_path,
        settings.cors_origin_list,
    )


@app.get("/health", tags=["system"], summary="Health check")
def health() -> dict:
    return {"success": True, "data": {"status": "ok", "service": settings.app_name}}


for _router in (auth.router, reports.router, notifications.router, alerts.router,
                funds.router, gis.router, forecast.router, priority.router,
                analytics.router):
    app.include_router(_router)