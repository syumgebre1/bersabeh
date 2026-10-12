"""
Pydantic schemas for vital signs.

Validation:
  - BP must be complete: if you provide systolic, provide diastolic too.
  - Ranges are sanity bounds, not clinical thresholds:
      temperature  30.0–45.0 °C
      heart_rate   20–250 bpm
      resp_rate    4–80 /min
      systolic     50–300 mmHg
      diastolic    30–200 mmHg
      spo2         50–100 %
      weight       0.5–500 kg
      height       20–260 cm
      pain_scale   0–10
  - At least ONE clinical field must be present, or the request is rejected.
"""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.schemas.user import UserPublic


# ============================================================
# Requests
# ============================================================

class VitalCreate(BaseModel):
    """Log a set of vital signs for a patient."""

    encounter_id: uuid.UUID | None = Field(
        None, description="Optional: link this vitals reading to a specific encounter."
    )

    temperature_c: float | None = Field(None, ge=30.0, le=45.0)
    heart_rate_bpm: int | None = Field(None, ge=20, le=250)
    respiratory_rate: int | None = Field(None, ge=4, le=80)
    bp_systolic: int | None = Field(None, ge=50, le=300)
    bp_diastolic: int | None = Field(None, ge=30, le=200)
    spo2_percent: int | None = Field(None, ge=50, le=100)
    weight_kg: float | None = Field(None, ge=0.5, le=500.0)
    height_cm: float | None = Field(None, ge=20.0, le=260.0)
    pain_scale: int | None = Field(None, ge=0, le=10)

    notes: str | None = Field(None, max_length=2000)
    recorded_at: datetime | None = Field(
        None, description="Optional backdate. Defaults to now()."
    )

    @model_validator(mode="after")
    def validate_consistency(self) -> "VitalCreate":
        # BP: both or neither.
        if (self.bp_systolic is None) != (self.bp_diastolic is None):
            raise ValueError("bp_systolic and bp_diastolic must be provided together")
        if self.bp_systolic is not None and self.bp_systolic <= self.bp_diastolic:
            raise ValueError("bp_systolic must be greater than bp_diastolic")

        # At least one clinical field.
        clinical_fields = (
            self.temperature_c, self.heart_rate_bpm, self.respiratory_rate,
            self.bp_systolic, self.spo2_percent, self.weight_kg,
            self.height_cm, self.pain_scale,
        )
        if all(f is None for f in clinical_fields):
            raise ValueError("At least one vital sign measurement is required")

        return self


# ============================================================
# Responses
# ============================================================

class VitalRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    patient_id: uuid.UUID
    encounter_id: uuid.UUID | None = None
    recorded_by: UserPublic
    recorded_at: datetime

    temperature_c: float | None = None
    heart_rate_bpm: int | None = None
    respiratory_rate: int | None = None
    bp_systolic: int | None = None
    bp_diastolic: int | None = None
    spo2_percent: int | None = None
    weight_kg: float | None = None
    height_cm: float | None = None
    pain_scale: int | None = None

    notes: str | None = None
    created_at: datetime


class VitalBrief(BaseModel):
    """Slim representation for list views."""
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    patient_id: uuid.UUID
    recorded_at: datetime
    bp_systolic: int | None = None
    bp_diastolic: int | None = None
    heart_rate_bpm: int | None = None
    temperature_c: float | None = None
    spo2_percent: int | None = None
