"""
Pydantic schemas for video call endpoints.

Design:
  - CallRequest: patient or reception initiates. `patient_id` optional —
    patients implicitly call for themselves; reception must specify.
  - CallAssign: reception/admin assigns to a doctor.
  - CallEnd: either party ends the call; notes are optional.
  - Responses embed user briefs so the client can render without extra calls.
"""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.call import CallStatus


# ============================================================
# Nested user brief
# ============================================================

class CallUserBrief(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    full_name: str
    role: str | None = None
    photo_url: str | None = None


# ============================================================
# Requests
# ============================================================

class CallRequest(BaseModel):
    """
    Request a video call.

    - Patients: `patient_id` is ignored (server uses their id).
    - Reception/Admin: `patient_id` is REQUIRED.
    """
    patient_id: uuid.UUID | None = Field(
        None,
        description="Required if requested by reception/admin. Ignored for patients.",
    )
    reason: str | None = Field(None, max_length=1000)
    thread_id: uuid.UUID | None = Field(
        None,
        description="Optional: link the call to a messaging thread for system messages.",
    )
    encounter_id: uuid.UUID | None = Field(
        None,
        description="Optional: link to an encounter if the call is during a visit.",
    )


class CallAssign(BaseModel):
    """Reception/Admin assigns a doctor to a requested call."""
    doctor_id: uuid.UUID


class CallEnd(BaseModel):
    """Either party ends the call. Notes are optional."""
    notes: str | None = Field(None, max_length=2000)


# ============================================================
# Responses
# ============================================================

class CallRead(BaseModel):
    """Full call details with embedded participants."""
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    patient: CallUserBrief
    requested_by: CallUserBrief
    assigned_to: CallUserBrief | None = None

    thread_id: uuid.UUID | None = None
    encounter_id: uuid.UUID | None = None

    status: CallStatus
    room_url: str | None = None
    reason: str | None = None
    notes: str | None = None

    requested_at: datetime
    assigned_at: datetime | None = None
    accepted_at: datetime | None = None
    started_at: datetime | None = None
    ended_at: datetime | None = None
    duration_seconds: int | None = None

    created_at: datetime
    updated_at: datetime


class CallBrief(BaseModel):
    """Slim call row for list views."""
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    patient_id: uuid.UUID
    assigned_to_id: uuid.UUID | None = None
    status: CallStatus
    requested_at: datetime
    ended_at: datetime | None = None
    duration_seconds: int | None = None
