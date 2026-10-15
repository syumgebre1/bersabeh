"""Booking request schemas."""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator


class BookingRequestCreate(BaseModel):
    """Public — no auth required."""
    full_name: str = Field(..., min_length=2, max_length=200)
    phone: str = Field(..., min_length=7, max_length=50)
    email: str | None = Field(None, max_length=320)
    doctor_id: uuid.UUID | None = None
    preferred_at: datetime | None = None
    reason: str | None = Field(None, max_length=1000)

    @field_validator("phone")
    @classmethod
    def clean_phone(cls, v: str) -> str:
        # Strip whitespace; basic sanity — must have at least 7 digits
        v = v.strip()
        if sum(c.isdigit() for c in v) < 7:
            raise ValueError("phone must have at least 7 digits")
        return v

    @field_validator("email")
    @classmethod
    def clean_email(cls, v: str | None) -> str | None:
        if v is None:
            return None
        v = v.strip().lower()
        return v or None


class BookingRequestPublic(BaseModel):
    """Response to the public after creating a request."""
    id: uuid.UUID
    status: str
    preferred_at: datetime | None
    doctor_name: str | None


class BookingRequestRead(BaseModel):
    """Staff-facing full read."""
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    full_name: str
    phone: str
    email: str | None
    doctor_id: uuid.UUID | None
    preferred_at: datetime | None
    reason: str | None
    status: str
    contacted_at: datetime | None
    converted_at: datetime | None
    converted_patient_id: uuid.UUID | None
    converted_appointment_id: uuid.UUID | None
    internal_notes: str | None
    created_at: datetime
    updated_at: datetime


class BookingRequestConvert(BaseModel):
    """Reception/Admin — turn a request into a real appointment."""
    # If the patient already exists, pass their user_id.
    # Otherwise, provide full_name + phone (+ email) to create a new pending patient.
    existing_patient_id: uuid.UUID | None = None
    scheduled_at: datetime
    duration_minutes: int = Field(30, ge=5, le=240)
    reason: str | None = Field(None, max_length=1000)
    notes: str | None = Field(None, max_length=2000)
