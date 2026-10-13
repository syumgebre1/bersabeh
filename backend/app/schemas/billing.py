"""
Pydantic schemas for billing endpoints.

Design:
  - BillCreate contains items. The server computes `amount_etb` from the
    sum of (quantity × unit_price_etb) — clients never set the total.
  - PaymentRecord captures a partial or full payment.
  - Responses embed patient + creator briefs.
"""

import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.models.billing import BillStatus, PaymentMethod
from app.schemas.user import UserPublic


# ============================================================
# Nested
# ============================================================

class BillItemCreate(BaseModel):
    """One line item on a new bill."""
    description: str = Field(..., min_length=1, max_length=300)
    quantity: int = Field(1, ge=1, le=999)
    unit_price_etb: Decimal = Field(..., ge=0, decimal_places=2)


class BillItemRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    description: str
    quantity: int
    unit_price_etb: Decimal
    amount_etb: Decimal
    sort_order: int


# ============================================================
# Requests
# ============================================================

class BillCreate(BaseModel):
    """Reception creates a bill for an encounter."""
    encounter_id: uuid.UUID
    items: list[BillItemCreate] = Field(..., min_length=1, max_length=50)
    notes: str | None = Field(None, max_length=2000)


class PaymentRecord(BaseModel):
    """Record a payment against a bill."""
    amount_etb: Decimal = Field(..., gt=0, decimal_places=2)
    payment_method: PaymentMethod
    notes: str | None = Field(None, max_length=2000)

    @model_validator(mode="after")
    def validate_method_for_amount(self) -> "PaymentRecord":
        # Cash can be any amount; digital methods should match exactly.
        # We allow partial even on digital for now.
        return self


# ============================================================
# Responses
# ============================================================

class BillRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    patient: UserPublic
    created_by: UserPublic
    encounter_id: uuid.UUID

    amount_etb: Decimal
    paid_amount_etb: Decimal
    currency: str
    status: BillStatus
    payment_method: PaymentMethod | None = None
    notes: str | None = None

    items: list[BillItemRead] = []

    created_at: datetime
    updated_at: datetime
    paid_at: datetime | None = None


class BillBrief(BaseModel):
    """Slim bill for list views."""
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    patient_id: uuid.UUID
    encounter_id: uuid.UUID
    amount_etb: Decimal
    paid_amount_etb: Decimal
    currency: str
    status: BillStatus
    created_at: datetime
