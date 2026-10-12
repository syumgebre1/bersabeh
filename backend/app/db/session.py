"""
Async database session management.

Creates the SQLAlchemy async engine (a connection pool) and provides:

  - `engine`: the app-wide async engine.
  - `AsyncSessionLocal`: a sessionmaker for creating sessions.
  - `get_db()`: a FastAPI dependency that yields a session per request
                and guarantees it's closed even if the request errors.

Why async?
  FastAPI is async-native. Using an async driver (asyncpg) with SQLAlchemy
  2.0 means DB calls don't block the event loop, so the API can handle many
  concurrent requests with one process. This is what "fast" looks like.

Connection pooling:
  - pool_size=10        — 10 idle connections kept ready
  - max_overflow=20     — up to 20 more opened under load (then queue)
  - pool_pre_ping=True  — validates connections before use; catches
                          stale sockets after Postgres restarts
  - pool_recycle=1800   — recycle every 30 min to avoid firewall timeouts
"""

from collections.abc import AsyncGenerator
from typing import Annotated

from fastapi import Depends
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.core.config import settings


# ------------------------------------------------------------
# Engine — one per process. Do not create new engines per request.
# ------------------------------------------------------------
engine: AsyncEngine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,             # logs every SQL statement when DEBUG=true
    future=True,
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True,
    pool_recycle=1800,
)


# ------------------------------------------------------------
# Session factory — call this to get a new session.
# expire_on_commit=False is important: it lets us return ORM objects
# from endpoints after commit without triggering extra lazy loads.
# ------------------------------------------------------------
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)


# ------------------------------------------------------------
# FastAPI dependency
# ------------------------------------------------------------
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    Yields an async DB session for use inside a request handler.

    Usage:
        @router.get("/example")
        async def example(db: AsyncSession = Depends(get_db)):
            result = await db.execute(select(User))
            ...
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


# Handy type alias for endpoint signatures:
#   async def foo(db: DbSession): ...
DbSession = Annotated[AsyncSession, Depends(get_db)]
