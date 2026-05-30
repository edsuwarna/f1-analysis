"""
F1 Analysis — FastAPI Backend
Main application entry point.
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from backend.core.database import init_db
from backend.core.limiter import limiter
from backend.api import meetings, sessions, analytics, teams, news, drivers, tech
from backend.api import multiviewer


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize database tables on startup."""
    await init_db()
    yield


import os

app = FastAPI(
    title="F1 Analysis API",
    description="Formula 1 telemetry, lap timing, and performance analysis API",
    version="0.1.0",
    lifespan=lifespan,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

# CORS — allow frontend domains (CF Pages, local dev)
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "*")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in CORS_ORIGINS.split(",")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Health check ──
@app.get("/health")
async def health():
    """Simple health check for container healthcheck + tunnel readiness."""
    return {"status": "ok"}


# Register routers
app.include_router(meetings.router, prefix="/api", tags=["Meetings"])
app.include_router(sessions.router, prefix="/api", tags=["Sessions"])
app.include_router(analytics.router, prefix="/api/analytics", tags=["Analytics"])
app.include_router(teams.router, prefix="/api/teams", tags=["Teams"])
app.include_router(news.router, prefix="/api", tags=["News"])
app.include_router(drivers.router, prefix="/api", tags=["Drivers"])
app.include_router(tech.router, prefix="/api", tags=["Tech Updates"])
app.include_router(multiviewer.router, prefix="/api", tags=["Multiviewer"])

# Serve frontend static files
frontend_path = os.path.join(os.path.dirname(__file__), "..", "frontend")
if os.path.exists(frontend_path):
    app.mount("/", StaticFiles(directory=frontend_path, html=True), name="frontend")
