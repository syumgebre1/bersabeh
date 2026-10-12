"""
Pydantic schemas for prescription endpoints.

Design:
  - Create accepts a list of items (medications). At least 1 required.
  - Read returns items ordered by `sort_order` (as the model defines).
  - Brief is a slim version for list endpoints (no items, faster).
"""

import uuid
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.prescription import PrescriptionStatus


# ============================================================
# Nested briefs
# ============================================================

class PrescriptionDoctorBrief(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    full_name: str
    specialty: str | None = None


class PrescriptionPatientBrief(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    full_name: str
    phone: str | None = None


class PrescriptionItemRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    medication_name: str
    dose: str
    frequency: str
    duration_days: int | None = None
    instructions: str | None = None
    sort_order: int


class PrescriptionItemCreate(BaseModel):
    """One medication line in a new prescription."""
    medication_name: str = Field(..., min_length=1, max_length=200)
    dose: str = Field(..., min_length=1, max_length=100)
    frequency: str = Field(..., min_length=1, max_length=100)
    duration_days: int | None = Field(None, ge=1, le=365)
    instructions: str | None = Field(None, max_length=1000)


# ============================================================
# Requests
# ============================================================

class PrescriptionCreate(BaseModel):
    """Doctor writes a new prescription tied to an encounter."""
    encounter_id: uuid.UUID
    items: list[PrescriptionItemCreate] = Field(..., min_length=1, max_length=20)
    notes: str | None = Field(None, max_length=2000)
    follow_up_date: date | None = None


class PrescriptionUpdate(BaseModel):
    """Update status, notes, follow-up. Items are immutable once written."""
    status: PrescriptionStatus | None = None
    notes: str | None = Field(None, max_length=2000)
    follow_up_date: date | None = None


# ============================================================
# Responses
# ============================================================

class PrescriptionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    encounter_id: uuid.UUID
    patient: PrescriptionPatientBrief
    doctor: PrescriptionDoctorBrief
    status: PrescriptionStatus
    notes: str | None = None
    follow_up_date: date | None = None
    items: list[PrescriptionItemRead] = []
    created_at: datetime
    updated_at: datetime


class PrescriptionBrief(BaseModel):
    """Slim representation for list views."""
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    encounter_id: uuid.UUID
    patient_id: uuid.UUID
    doctor_id: uuid.UUID
    status: PrescriptionStatus
    follow_up_date: date | None = None
    created_at: datetime
