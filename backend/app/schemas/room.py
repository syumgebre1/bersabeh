"""
Room schemas — match the DB (no fantasy columns).
"""

import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

from app.models.room import RoomType


class RoomBase(BaseModel):
    number: str = Field(..., max_length=20)
    ward: str = Field(..., max_length=50)
    floor: Optional[str] = Field(None, max_length=20)
    room_type: RoomType = RoomType.GENERAL
    capacity: int = 1
    notes: Optional[str] = None
    is_active: bool = True


class RoomCreate(RoomBase):
    pass


class RoomUpdate(BaseModel):
    number: Optional[str] = None
    ward: Optional[str] = None
    floor: Optional[str] = None
    room_type: Optional[RoomType] = None
    capacity: Optional[int] = None
    notes: Optional[str] = None
    is_active: Optional[bool] = None


class PatientBrief(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    full_name: str
    phone: Optional[str] = None


class BedAssignmentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    patient_id: uuid.UUID
    room_id: uuid.UUID
    assigned_by_id: uuid.UUID
    admitted_at: datetime
    discharged_at: Optional[datetime] = None
    discharge_reason: Optional[str] = None
    notes: Optional[str] = None
    patient: Optional[PatientBrief] = None


class RoomOut(RoomBase):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    current_patient: Optional[PatientBrief] = None
    current_assignment_id: Optional[uuid.UUID] = None
    occupied: int = 0


class AssignPatientIn(BaseModel):
    patient_id: uuid.UUID
    reason: Optional[str] = None


class DischargeIn(BaseModel):
    notes: Optional[str] = None
