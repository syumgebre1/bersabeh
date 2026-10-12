"""
ORM models package.

Every model is imported here so that `import app.models` (from alembic/env.py)
registers all tables with Base.metadata.

Add new models to this list as you create them.
"""

from app.models.appointment import Appointment, AppointmentStatus
from app.models.encounter import Encounter, EncounterStatus, EncounterType
from app.models.refresh_token import RefreshToken
from app.models.user import User, UserRole, UserStatus

__all__ = [
    # User & auth
    "User",
    "UserRole",
    "UserStatus",
    "RefreshToken",
    # Clinical
    "Appointment",
    "AppointmentStatus",
    "Encounter",
    "EncounterStatus",
    "EncounterType",
]
