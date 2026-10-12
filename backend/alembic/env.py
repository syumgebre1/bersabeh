"""
Alembic environment — async variant.

The default Alembic env.py is sync-only. Our app uses async SQLAlchemy
(asyncpg), so we override env.py to:

  1. Import Base.metadata so all models are registered for autogenerate.
  2. Load DATABASE_URL from app.core.config (from .env), not alembic.ini.
  3. Use async_engine_from_config to run migrations over asyncpg.
  4. Wrap the migration run inside asyncio.run(...).

Autogenerate usage:
    alembic revision --autogenerate -m "message"

Apply migrations:
    alembic upgrade head

Rollback one:
    alembic downgrade -1
"""

import asyncio
from logging.config import fileConfig

from alembic import context
from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import async_engine_from_config

from app.core.config import settings
from app.db.base import Base

# Import all models here so Alembic sees them for autogenerate.
# As we add model modules in M2+, import them in app/models/__init__.py
# and then `import app.models  # noqa` here.
# Example (later):
#   from app.models import user, patient, appointment  # noqa: F401
import app.models  # noqa: F401  (empty for now — models come in M2)

# Alembic Config object — gives access to alembic.ini values.
config = context.config

# Set the DB URL dynamically from our settings (loaded from .env).
config.set_main_option("sqlalchemy.url", settings.DATABASE_URL)

# Configure Python logging from alembic.ini.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# The metadata Alembic compares against for autogenerate.
target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """
    Run migrations in 'offline' mode — generate SQL without a live DB.
    Usage: alembic upgrade head --sql
    """
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
        compare_server_default=True,
    )

    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection: Connection) -> None:
    """Configure the migration context with our metadata and run it."""
    context.configure(
        connection=connection,
        target_metadata=target_metadata,
        compare_type=True,
        compare_server_default=True,
    )

    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    """Create an async engine and run migrations inside a connection."""
    connectable = async_engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)

    await connectable.dispose()


def run_migrations_online() -> None:
    """Entry point for online migrations — wraps the async run in asyncio."""
    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
