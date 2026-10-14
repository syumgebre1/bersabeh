"""
Pydantic schemas for scheduled doses and medication administrations.
"""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.medication import DoseStatus, SkipReason
from app.schemas.user import UserPublic


# ============================================================
# Administration
# ============================================================

class MedicationAdministerPayload(BaseModel):
    notes: str | None = Field(None, max_length=1000)


class MedicationSkipPayload(BaseModel):
    skip_reason: SkipReason
    skip_notes: str | None = Field(None, max_length=1000)


class MedicationAdministrationRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    dose_id: uuid.UUID
    administered_by: UserPublic
    administered_at: datetime
    notes: str | None = None
    skip_reason: SkipReason | None = None
    skip_notes: str | None = None
    created_at: datetime


# ============================================================
# Scheduled dose
# ============================================================

class ScheduledDoseRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    prescription_item_id: uuid.UUID
    patient_id: uuid.UUID
    patient: UserPublic
    medication_name: str
    dose: str
    frequency: str
    scheduled_for: datetime
    status: DoseStatus
    created_at: datetime
    updated_at: datetime

    administration: MedicationAdministrationRead | None = None


class ScheduledDoseBrief(BaseModel):
    """Slim for list views."""
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    patient_id: uuid.UUID
    medication_name: str
    dose: str
    frequency: str
    scheduled_for: datetime
    status: DoseStatus
