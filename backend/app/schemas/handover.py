"""
Handover note schemas — match the real model (shift_id, author_id).
"""

import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

from app.models.shift import HandoverSeverity


class PatientBrief(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    full_name: str


class AuthorBrief(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    full_name: str


class HandoverCreate(BaseModel):
    """Author's shift is inferred from their active NurseShift."""
    patient_id: Optional[uuid.UUID] = None
    severity: HandoverSeverity = HandoverSeverity.STABLE
    note: str = Field(..., min_length=1, max_length=2000)


class HandoverOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    shift_id: uuid.UUID
    author_id: uuid.UUID
    patient_id: Optional[uuid.UUID] = None
    severity: HandoverSeverity
    note: str
    created_at: datetime
    patient: Optional[PatientBrief] = None
    author: Optional[AuthorBrief] = None
