"""
FastAPI application entry point.

Responsibilities:
  - Create the FastAPI app instance with metadata (title, version, contact).
  - Configure CORS for the Expo web dev server + native mobile clients.
  - Register routers under /api/v1 (versioned API).
  - Provide startup/shutdown logs so we can see what's happening in dev.

Run locally:
    uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

Run from this directory (backend/) with the venv active.
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse

from app.api import health
from app.core.config import settings


# ------------------------------------------------------------
# Logging — basic config; expanded later with structured logs.
# ------------------------------------------------------------
logging.basicConfig(
    level=settings.LOG_LEVEL.upper(),
    format="%(asctime)s | %(levelname)-7s | %(name)s | %(message)s",
)
logger = logging.getLogger("bersabeh")


# ------------------------------------------------------------
# Lifespan — runs once at startup and once at shutdown.
# Use this for: warm caches, start background workers, close pools.
# ------------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("=" * 60)
    logger.info("%s v%s starting", settings.APP_NAME, settings.APP_VERSION)
    logger.info("Environment: %s | Debug: %s", settings.ENVIRONMENT, settings.DEBUG)
    logger.info("Docs:        http://localhost:%s/docs", settings.API_PORT)
    logger.info("Health:      http://localhost:%s/api/v1/health", settings.API_PORT)
    logger.info("=" * 60)
    yield
    logger.info("%s shutting down", settings.APP_NAME)


# ------------------------------------------------------------
# App instance
# ------------------------------------------------------------
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description=(
        "Role-based hospital platform for Bersabeh Clinic, Addis Ababa. "
        "See /docs for the interactive API explorer."
    ),
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)


# ------------------------------------------------------------
# CORS — required so the Expo web dev server can call the API.
# Native mobile doesn't need CORS, but Expo Web does.
# Origins are read from .env (CORS_ORIGINS) and can be a JSON
# array or a comma-separated string — see config.py validator.
# ------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ------------------------------------------------------------
# Routers — all under /api/v1 for future versioning.
# ------------------------------------------------------------
API_PREFIX = "/api/v1"

app.include_router(health.router, prefix=API_PREFIX)


# ------------------------------------------------------------
# Root — redirect to docs for convenience during dev.
# ------------------------------------------------------------
@app.get("/", include_in_schema=False)
async def root():
    """Redirect the root URL to the interactive API docs."""
    return RedirectResponse(url="/docs")
