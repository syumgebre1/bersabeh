"""
Medication administration schemas.

The unit of work for a nurse is a `ScheduledDose` (one row per dose).
Giving / skipping a dose creates a `MedicationAdministration` row
and flips the dose's `status`.
"""

import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict

from app.models.medication import DoseStatus, SkipReason


class PatientBrief(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    full_name: str


class ScheduledDoseOut(BaseModel):
    """One scheduled dose as seen by a nurse."""
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    prescription_item_id: uuid.UUID
    patient_id: uuid.UUID
    medication_name: str
    dose: str
    frequency: str
    scheduled_for: datetime
    status: DoseStatus

    patient: Optional[PatientBrief] = None

    # Administration details (present only if status != pending)
    administered_at: Optional[datetime] = None
    administered_by_id: Optional[uuid.UUID] = None
    skip_reason: Optional[SkipReason] = None
    skip_notes: Optional[str] = None
    notes: Optional[str] = None


class AdministerIn(BaseModel):
    notes: Optional[str] = None


class SkipIn(BaseModel):
    reason: SkipReason
    notes: Optional[str] = None
