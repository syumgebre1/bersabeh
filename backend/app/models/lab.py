"""
Laboratory orders and results.

Two tables:
  lab_orders   — a doctor requests one or more tests (one row per test)
  lab_results  — a lab tech enters the outcome (1-to-1 with an order)

Why two tables?
  - The doctor can order a test without a result being ready yet.
  - The lab tech can add or update the result without touching the order.
  - A 1-to-1 relationship keeps audit trails clean (who ordered, who resulted).

Status lifecycle (lab_orders):
  pending     — ordered, not yet started
  in_progress — sample collected, being processed
  completed   — result entered
  cancelled   — order revoked (e.g., wrong test ordered)

Result type (lab_results):
  numeric — a measurable value with units (glucose = 95 mg/dL)
  text    — a descriptive finding (culture: no growth)
  image   — a file reference (X-ray, ultrasound) — URL points to /uploads
"""

import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum as SAEnum, ForeignKey, Index, Numeric, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


# ============================================================
# Enums
# ============================================================

class LabOrderStatus(str, enum.Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class LabPriority(str, enum.Enum):
    ROUTINE = "routine"
    URGENT = "urgent"
    STAT = "stat"        # immediate


class LabResultType(str, enum.Enum):
    NUMERIC = "numeric"
    TEXT = "text"
    IMAGE = "image"


# ============================================================
# Lab order
# ============================================================

class LabOrder(Base):
    __tablename__ = "lab_orders"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4,
    )

    encounter_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("encounters.id", ondelete="RESTRICT"),
        nullable=False, index=True,
    )
    patient_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False, index=True,
    )
    ordered_by_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
    )

    test_name: Mapped[str] = mapped_column(String(200), nullable=False)
    clinical_notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    status: Mapped[LabOrderStatus] = mapped_column(
        SAEnum(LabOrderStatus, name="lab_order_status",
               values_callable=lambda e: [m.value for m in e]),
        nullable=False, default=LabOrderStatus.PENDING, index=True,
    )
    priority: Mapped[LabPriority] = mapped_column(
        SAEnum(LabPriority, name="lab_priority",
               values_callable=lambda e: [m.value for m in e]),
        nullable=False, default=LabPriority.ROUTINE,
    )

    is_seed_data: Mapped[bool] = mapped_column(nullable=False, default=False, index=True)

    ordered_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(),
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now(),
    )

    result = relationship(
        "LabResult",
        back_populates="order",
        uselist=False,
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    patient = relationship("User", foreign_keys=[patient_id], lazy="selectin")
    ordered_by = relationship("User", foreign_keys=[ordered_by_id], lazy="selectin")

    __table_args__ = (
        Index("ix_lab_orders_patient_status", "patient_id", "status"),
        Index("ix_lab_orders_encounter", "encounter_id"),
    )

    def __repr__(self) -> str:
        return f"<LabOrder {self.test_name} status={self.status.value} priority={self.priority.value}>"


# ============================================================
# Lab result
# ============================================================

class LabResult(Base):
    __tablename__ = "lab_results"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4,
    )
    order_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("lab_orders.id", ondelete="CASCADE"),
        nullable=False, unique=True, index=True,
    )
    resulted_by_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
    )

    result_type: Mapped[LabResultType] = mapped_column(
        SAEnum(LabResultType, name="lab_result_type",
               values_callable=lambda e: [m.value for m in e]),
        nullable=False, default=LabResultType.NUMERIC,
    )

    value_numeric: Mapped[float | None] = mapped_column(Numeric(12, 4), nullable=True)
    value_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    value_image_url: Mapped[str | None] = mapped_column(String(500), nullable=True)

    units: Mapped[str | None] = mapped_column(String(50), nullable=True)
    reference_range: Mapped[str | None] = mapped_column(String(100), nullable=True)
    interpretation: Mapped[str | None] = mapped_column(Text, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    resulted_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(),
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now(),
    )

    order = relationship("LabOrder", back_populates="result")
    resulted_by = relationship("User", foreign_keys=[resulted_by_id], lazy="selectin")

    def __repr__(self) -> str:
        return f"<LabResult order={self.order_id} type={self.result_type.value}>"
