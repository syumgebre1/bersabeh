"""
ORM models package.

Every model is imported here so that `import app.models` (from alembic/env.py)
registers all tables with Base.metadata.

Add new models to this list as you create them.
"""

from app.models.appointment import Appointment, AppointmentStatus
from app.models.encounter import Encounter, EncounterStatus, EncounterType
from app.models.lab import (
    LabOrder,
    LabOrderStatus,
    LabPriority,
    LabResult,
    LabResultType,
)
from app.models.prescription import (
    Prescription,
    PrescriptionItem,
    PrescriptionStatus,
)
from app.models.refresh_token import RefreshToken
from app.models.user import User, UserRole, UserStatus
from app.models.vital import Vital

__all__ = [
    # User & auth
    "User",
    "UserRole",
    "UserStatus",
    "RefreshToken",
    # Scheduling & clinical
    "Appointment",
    "AppointmentStatus",
    "Encounter",
    "EncounterStatus",
    "EncounterType",
    "Prescription",
    "PrescriptionItem",
    "PrescriptionStatus",
    "Vital",
    "LabOrder",
    "LabOrderStatus",
    "LabPriority",
    "LabResult",
    "LabResultType",
]
