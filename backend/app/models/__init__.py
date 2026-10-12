"""
ORM models package.

As we add models (User, Patient, Encounter, ...) in M2+, they get imported
here so that `import app.models` in alembic/env.py picks them all up for
autogenerate.

Example (later):
    from app.models.user import User          # noqa: F401
    from app.models.patient import Patient    # noqa: F401
"""

__all__ = []
