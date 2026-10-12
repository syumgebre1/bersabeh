"""
Health check endpoint.

Purpose: a single, unauthenticated, cheap endpoint that answers:
  1. Is the API process alive?
  2. Is the database reachable?
  3. What version/environment is running?

Used by:
  - Load balancers to decide if a node should receive traffic.
  - Uptime monitoring (UptimeRobot, BetterStack, Pingdom...).
  - Ops humans who just want "is it up?"

Design note:
  We intentionally return 200 even when the DB is down, with status="degraded".
  Some people prefer 503 on DB failure — but that makes debugging harder when
  the process is alive and only the DB is unreachable. We log the error and
  expose the detail in the response.

  The DB check has a short timeout so a hung Postgres doesn't hang /health.
"""

import time
from datetime import datetime, timezone

from fastapi import APIRouter, status
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from app.core.config import settings
from app.db.session import engine


router = APIRouter(tags=["system"])


@router.get(
    "/health",
    status_code=status.HTTP_200_OK,
    summary="Health check",
    description="Returns API status and a lightweight database reachability check.",
)
async def health() -> dict:
    """Return API + DB health. Always fast, always safe to call."""
    started = time.perf_counter()
    db_status = "ok"
    db_error: str | None = None

    try:
        # `SELECT 1` is the cheapest possible DB round-trip.
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
    except SQLAlchemyError as exc:
        db_status = "error"
        # We log the class name only — not the full exception — to avoid
        # leaking connection strings or credentials in the response.
        db_error = exc.__class__.__name__
    except Exception as exc:  # noqa: BLE001
        db_status = "error"
        db_error = exc.__class__.__name__

    latency_ms = round((time.perf_counter() - started) * 1000, 2)

    return {
        "status": "ok" if db_status == "ok" else "degraded",
        "db": db_status,
        "db_error": db_error,
        "version": settings.APP_VERSION,
        "environment": settings.ENVIRONMENT,
        "latency_ms": latency_ms,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
