"""
Pydantic schemas for lab orders and results.

Design:
  - One LabOrder = one test (e.g. "Complete Blood Count").
  - Doctors can order multiple tests at once — the client posts N orders.
  - LabResult is 1-to-1 with LabOrder. Creating a result auto-marks the order
    completed and stamps resulted_at.
  - Result validation ensures the payload matches the declared result_type.
"""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.models.lab import LabOrderStatus, LabPriority, LabResultType
from app.schemas.user import UserPublic


# ============================================================
# Requests
# ============================================================

class LabOrderCreate(BaseModel):
    """Doctor orders a lab test."""
    encounter_id: uuid.UUID
    test_name: str = Field(..., min_length=1, max_length=200)
    clinical_notes: str | None = Field(None, max_length=2000)
    priority: LabPriority = LabPriority.ROUTINE


class LabOrderUpdate(BaseModel):
    """Lab tech updates order status or notes."""
    status: LabOrderStatus | None = None
    priority: LabPriority | None = None
    clinical_notes: str | None = Field(None, max_length=2000)


class LabResultCreate(BaseModel):
    """Lab tech enters a result. Must match the declared result_type."""
    result_type: LabResultType
    value_numeric: float | None = None
    value_text: str | None = Field(None, max_length=5000)
    value_image_url: str | None = Field(None, max_length=500)
    units: str | None = Field(None, max_length=50)
    reference_range: str | None = Field(None, max_length=100)
    interpretation: str | None = Field(None, max_length=2000)
    notes: str | None = Field(None, max_length=2000)

    @model_validator(mode="after")
    def validate_payload_matches_type(self) -> "LabResultCreate":
        if self.result_type == LabResultType.NUMERIC:
            if self.value_numeric is None:
                raise ValueError("value_numeric is required when result_type='numeric'")
            if not self.units:
                raise ValueError("units are required for numeric results")
        elif self.result_type == LabResultType.TEXT:
            if not self.value_text:
                raise ValueError("value_text is required when result_type='text'")
        elif self.result_type == LabResultType.IMAGE:
            if not self.value_image_url:
                raise ValueError("value_image_url is required when result_type='image'")

        return self


# ============================================================
# Responses
# ============================================================

class LabResultRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    order_id: uuid.UUID
    resulted_by: UserPublic
    result_type: LabResultType
    value_numeric: float | None = None
    value_text: str | None = None
    value_image_url: str | None = None
    units: str | None = None
    reference_range: str | None = None
    interpretation: str | None = None
    notes: str | None = None
    resulted_at: datetime
    updated_at: datetime


class LabOrderRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    encounter_id: uuid.UUID
    patient_id: uuid.UUID
    ordered_by: UserPublic
    test_name: str
    clinical_notes: str | None = None
    status: LabOrderStatus
    priority: LabPriority
    ordered_at: datetime
    updated_at: datetime
    result: LabResultRead | None = None


class LabOrderBrief(BaseModel):
    """Slim representation for list views."""
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    patient_id: uuid.UUID
    test_name: str
    status: LabOrderStatus
    priority: LabPriority
    ordered_at: datetime
