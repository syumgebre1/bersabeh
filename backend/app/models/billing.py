"""
Billing models — patient bills and their line items.

Design:
  - A Bill belongs to one encounter. When an encounter closes, reception
    generates a bill with N line items (consultation, labs, procedures).
  - `paid_amount_etb` tracks cumulative receipts. When it reaches
    `amount_etb`, status auto-updates to paid (handled by the API).
  - `payment_method` is on the bill, not per payment — for now we assume
    a single method per bill. If we later need partial payments with mixed
    methods, add a `bill_payments` table.
  - Amounts are stored as `Numeric(12, 2)` to avoid float rounding on money.

Why not a separate `payments` table?
  Simpler MVP. For a small clinic, "how much has been paid, and by what
  method" is enough. If a real billing workflow needs mixed payments we
  migrate to a `bill_payments` table then.
"""

import enum
import uuid
from datetime import datetime

from sqlalchemy import (
    DateTime,
    Enum as SAEnum,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


# ============================================================
# Enums
# ============================================================

class BillStatus(str, enum.Enum):
    UNPAID = "unpaid"
    PARTIAL = "partial"
    PAID = "paid"
    CANCELLED = "cancelled"


class PaymentMethod(str, enum.Enum):
    CASH = "cash"
    TELEBIRR = "telebirr"      # Ethio Telecom mobile money
    CBE_BIRR = "cbe_birr"      # Commercial Bank of Ethiopia mobile
    CHAPA = "chapa"            # payment gateway
    OTHER = "other"


# ============================================================
# Bill
# ============================================================

class Bill(Base):
    __tablename__ = "bills"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4,
    )

    patient_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False, index=True,
    )
    encounter_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("encounters.id", ondelete="RESTRICT"),
        nullable=False, index=True,
    )
    created_by_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
    )

    amount_etb: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    paid_amount_etb: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    currency: Mapped[str] = mapped_column(String(3), nullable=False, default="ETB")

    status: Mapped[BillStatus] = mapped_column(
        SAEnum(BillStatus, name="bill_status",
               values_callable=lambda e: [m.value for m in e]),
        nullable=False, default=BillStatus.UNPAID, index=True,
    )
    payment_method: Mapped[PaymentMethod | None] = mapped_column(
        SAEnum(PaymentMethod, name="payment_method",
               values_callable=lambda e: [m.value for m in e]),
        nullable=True,
    )

    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    is_seed_data: Mapped[bool] = mapped_column(nullable=False, default=False, index=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), index=True,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now(),
    )
    paid_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    patient = relationship("User", foreign_keys=[patient_id], lazy="selectin")
    created_by = relationship("User", foreign_keys=[created_by_id], lazy="selectin")
    items = relationship(
        "BillItem",
        back_populates="bill",
        cascade="all, delete-orphan",
        lazy="selectin",
        order_by="BillItem.sort_order",
    )

    __table_args__ = (
        Index("ix_bills_patient_status", "patient_id", "status"),
        Index("ix_bills_encounter", "encounter_id"),
    )

    def __repr__(self) -> str:
        return f"<Bill {self.id} patient={self.patient_id} status={self.status.value} amount={self.amount_etb}>"


# ============================================================
# Bill item
# ============================================================

class BillItem(Base):
    __tablename__ = "bill_items"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4,
    )
    bill_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("bills.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )

    description: Mapped[str] = mapped_column(String(300), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    unit_price_etb: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    amount_etb: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    bill = relationship("Bill", back_populates="items")

    def __repr__(self) -> str:
        return f"<BillItem {self.description} × {self.quantity} = {self.amount_etb}>"
