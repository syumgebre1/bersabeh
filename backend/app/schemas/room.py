"""
Pydantic schemas for rooms and bed assignments.
"""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.room import RoomType
from app.schemas.user import UserPublic


# ============================================================
# Room
# ============================================================

class RoomCreate(BaseModel):
    number: str = Field(..., min_length=1, max_length=20)
    ward: str = Field(..., min_length=1, max_length=50)
    floor: str | None = Field(None, max_length=20)
    room_type: RoomType = RoomType.GENERAL
    capacity: int = Field(1, ge=1, le=20)
    notes: str | None = Field(None, max_length=1000)


class RoomUpdate(BaseModel):
    ward: str | None = Field(None, min_length=1, max_length=50)
    floor: str | None = Field(None, max_length=20)
    room_type: RoomType | None = None
    capacity: int | None = Field(None, ge=1, le=20)
    is_active: bool | None = None
    notes: str | None = Field(None, max_length=1000)


class CurrentOccupant(BaseModel):
    """Summary of the patient currently assigned to a room."""
    model_config = ConfigDict(from_attributes=True)

    assignment_id: uuid.UUID
    patient: UserPublic
    assigned_by: UserPublic
    admitted_at: datetime
    notes: str | None = None


class RoomRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    number: str
    ward: str
    floor: str | None = None
    room_type: RoomType
    capacity: int
    is_active: bool
    notes: str | None = None
    created_at: datetime
    updated_at: datetime

    # Computed by the API layer:
    is_occupied: bool = False
    current_occupant: CurrentOccupant | None = None


# ============================================================
# Bed Assignment
# ============================================================

class BedAssignmentCreate(BaseModel):
    patient_id: uuid.UUID
    notes: str | None = Field(None, max_length=1000)


class BedAssignmentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    room_id: uuid.UUID
    patient_id: uuid.UUID
    assigned_by: UserPublic
    patient: UserPublic
    admitted_at: datetime
    discharged_at: datetime | None = None
    discharge_reason: str | None = None
    notes: str | None = None
    created_at: datetime


class BedAssignmentDischarge(BaseModel):
    discharge_reason: str | None = Field(None, max_length=1000)
