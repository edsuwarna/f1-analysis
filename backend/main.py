"""
F1 Analysis — FastAPI Backend
Main application entry point.
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from backend.core.database import init_db
from backend.api import meetings, sessions, analytics


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

# CORS — allow frontend domains (CF Pages, local dev)
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "*")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in CORS_ORIGINS.split(",")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(meetings.router, prefix="/api", tags=["Meetings"])
app.include_router(sessions.router, prefix="/api", tags=["Sessions"])
app.include_router(analytics.router, prefix="/api/analytics", tags=["Analytics"])

# Serve frontend static files
frontend_path = os.path.join(os.path.dirname(__file__), "..", "frontend")
if os.path.exists(frontend_path):
    app.mount("/", StaticFiles(directory=frontend_path, html=True), name="frontend")
