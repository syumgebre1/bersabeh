"""
Pydantic schemas for nurse shifts and handover.
"""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.shift import HandoverSeverity, HandoverStatus
from app.schemas.user import UserPublic


# ============================================================
# Shift
# ============================================================

class ShiftStartPayload(BaseModel):
    ward: str = Field("Ward A", max_length=50)


class ShiftEndPayload(BaseModel):
    pass


class NurseShiftRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    nurse: UserPublic
    ward: str
    started_at: datetime
    ended_at: datetime | None = None
    created_at: datetime


# ============================================================
# Handover Note
# ============================================================

class HandoverNoteCreate(BaseModel):
    note: str = Field(..., min_length=1, max_length=2000)
    severity: HandoverSeverity = HandoverSeverity.STABLE
    patient_id: uuid.UUID | None = None


class HandoverNoteRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    shift_id: uuid.UUID
    author: UserPublic
    patient: UserPublic | None = None
    note: str
    severity: HandoverSeverity
    created_at: datetime


# ============================================================
# Shift Handover (signed)
# ============================================================

class ShiftHandoverCreate(BaseModel):
    to_nurse_id: uuid.UUID | None = None
    notes: str | None = Field(None, max_length=2000)


class ShiftHandoverAcknowledge(BaseModel):
    pass


class ShiftHandoverRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    shift_id: uuid.UUID
    from_nurse: UserPublic
    to_nurse: UserPublic | None = None
    status: HandoverStatus
    handed_over_at: datetime
    acknowledged_at: datetime | None = None
    notes: str | None = None
    created_at: datetime
