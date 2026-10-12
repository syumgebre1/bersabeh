"""
Pydantic schemas for appointment endpoints.

Design notes:
  - Requests accept user IDs; responses include *embedded user summaries*
    so the client can render cards without extra round-trips.
  - `scheduled_at` must be in the future for new bookings (validated here).
  - `duration_minutes` is bounded 5–240 min to prevent typos like 9000.
"""

import uuid
from datetime import datetime, timezone

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.appointment import AppointmentStatus


# ============================================================
# Nested user summaries (for embedding in responses)
# ============================================================

class AppointmentDoctorBrief(BaseModel):
    """Tiny doctor summary embedded in appointment responses."""
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    full_name: str
    specialty: str | None = None
    photo_url: str | None = None


class AppointmentPatientBrief(BaseModel):
    """Tiny patient summary embedded in appointment responses."""
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    full_name: str
    phone: str | None = None
    photo_url: str | None = None


# ============================================================
# Requests
# ============================================================

class AppointmentCreate(BaseModel):
    """
    Book a new appointment.

    - If a PATIENT books: `patient_id` must be omitted (server uses caller's id).
    - If RECEPTION/ADMIN books on behalf of someone: `patient_id` is required.
    """
    patient_id: uuid.UUID | None = Field(
        None,
        description="Required when booking for someone else (reception/admin).",
    )
    doctor_id: uuid.UUID = Field(..., description="The doctor to see.")
    scheduled_at: datetime = Field(..., description="ISO 8601 datetime, UTC recommended.")
    duration_minutes: int = Field(30, ge=5, le=240)
    reason: str | None = Field(None, max_length=1000)

    @field_validator("scheduled_at")
    @classmethod
    def must_be_future(cls, v: datetime) -> datetime:
        # Normalize to timezone-aware UTC before comparing.
        if v.tzinfo is None:
            v = v.replace(tzinfo=timezone.utc)
        if v <= datetime.now(timezone.utc):
            raise ValueError("scheduled_at must be in the future")
        return v


class AppointmentUpdate(BaseModel):
    """Reschedule or edit reason/notes. All fields optional."""
    scheduled_at: datetime | None = None
    duration_minutes: int | None = Field(None, ge=5, le=240)
    reason: str | None = Field(None, max_length=1000)
    notes: str | None = Field(None, max_length=2000)

    @field_validator("scheduled_at")
    @classmethod
    def must_be_future(cls, v: datetime | None) -> datetime | None:
        if v is None:
            return v
        if v.tzinfo is None:
            v = v.replace(tzinfo=timezone.utc)
        if v <= datetime.now(timezone.utc):
            raise ValueError("scheduled_at must be in the future")
        return v


class AppointmentCancel(BaseModel):
    """Cancel a scheduled appointment."""
    reason: str | None = Field(None, max_length=1000)


# ============================================================
# Responses
# ============================================================

class AppointmentRead(BaseModel):
    """Full appointment with embedded participants."""
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    patient: AppointmentPatientBrief
    doctor: AppointmentDoctorBrief
    scheduled_at: datetime
    duration_minutes: int
    status: AppointmentStatus
    reason: str | None = None
    notes: str | None = None
    cancellation_reason: str | None = None
    created_at: datetime
    updated_at: datetime
    confirmed_at: datetime | None = None
    checked_in_at: datetime | None = None
    completed_at: datetime | None = None
    cancelled_at: datetime | None = None


class AppointmentBrief(BaseModel):
    """Slim appointment for calendar/list views."""
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    patient_id: uuid.UUID
    doctor_id: uuid.UUID
    scheduled_at: datetime
    duration_minutes: int
    status: AppointmentStatus
    reason: str | None = None
