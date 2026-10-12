"""
Pydantic schemas for encounter endpoints.

Design notes:
  - Encounter is created by a DOCTOR, either from an appointment or as a
    walk-in. `appointment_id` is optional.
  - `status` transitions: open → closed. Once closed, `ended_at` is set.
  - `chief_complaint` is what the patient says is wrong.
  - `notes` are the doctor's running notes (structured SOAP in M5).
"""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.encounter import EncounterStatus, EncounterType


# ============================================================
# Nested summaries
# ============================================================

class EncounterDoctorBrief(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    full_name: str
    specialty: str | None = None
    photo_url: str | None = None


class EncounterPatientBrief(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    full_name: str
    phone: str | None = None
    photo_url: str | None = None


# ============================================================
# Requests
# ============================================================

class EncounterCreate(BaseModel):
    """
    Open a new clinical encounter.

    If a DOCTOR creates from an appointment: pass `appointment_id`, patient
    is inferred from the appointment.
    If a DOCTOR creates a walk-in: pass `patient_id` directly.
    """
    patient_id: uuid.UUID | None = Field(
        None,
        description="Required for walk-ins. Ignored if appointment_id is given.",
    )
    appointment_id: uuid.UUID | None = Field(
        None,
        description="If coming from a booked appointment.",
    )
    type: EncounterType = EncounterType.OUTPATIENT
    chief_complaint: str | None = Field(None, max_length=2000)
    notes: str | None = Field(None, max_length=10000)


class EncounterUpdate(BaseModel):
    """Update notes / close the visit. All fields optional."""
    chief_complaint: str | None = Field(None, max_length=2000)
    notes: str | None = Field(None, max_length=10000)
    type: EncounterType | None = None
    status: EncounterStatus | None = None


# ============================================================
# Responses
# ============================================================

class EncounterRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    patient: EncounterPatientBrief
    doctor: EncounterDoctorBrief
    appointment_id: uuid.UUID | None = None
    type: EncounterType
    status: EncounterStatus
    chief_complaint: str | None = None
    notes: str | None = None
    started_at: datetime
    ended_at: datetime | None = None
    created_at: datetime
    updated_at: datetime


class EncounterBrief(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    patient_id: uuid.UUID
    doctor_id: uuid.UUID
    type: EncounterType
    status: EncounterStatus
    started_at: datetime
    ended_at: datetime | None = None
    chief_complaint: str | None = None
