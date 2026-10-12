"""
Prescription models — a clinical document tied to an encounter.

Structure:
  prescriptions         — the header (who prescribed what, when, to whom)
  prescription_items    — one row per medication (1-to-many)

Why two tables?
  A prescription is a header with N medication lines. Storing medications
  as JSON in a single column would lose type safety and make it impossible
  to query "how many prescriptions contain amoxicillin". A child table is
  the correct relational model and keeps audit trails clean.

Status lifecycle:
  active    — prescribed, patient should be taking it
  completed — course finished (doctor or system marks it)
  cancelled — doctor revoked the prescription (e.g., adverse reaction)
"""

import enum
import uuid
from datetime import date, datetime

from sqlalchemy import Date, DateTime, Enum as SAEnum, ForeignKey, Index, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


# ============================================================
# Enums
# ============================================================

class PrescriptionStatus(str, enum.Enum):
    ACTIVE = "active"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


# ============================================================
# Prescription header
# ============================================================

class Prescription(Base):
    __tablename__ = "prescriptions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4,
    )

    encounter_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("encounters.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    patient_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    doctor_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )

    status: Mapped[PrescriptionStatus] = mapped_column(
        SAEnum(PrescriptionStatus, name="prescription_status",
               values_callable=lambda e: [m.value for m in e]),
        nullable=False, default=PrescriptionStatus.ACTIVE, index=True,
    )

    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    follow_up_date: Mapped[date | None] = mapped_column(Date, nullable=True)

    created_by_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
    )

    is_seed_data: Mapped[bool] = mapped_column(
        nullable=False, default=False, index=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now(),
    )

    items = relationship(
        "PrescriptionItem",
        back_populates="prescription",
        cascade="all, delete-orphan",
        lazy="selectin",
        order_by="PrescriptionItem.sort_order",
    )
    patient = relationship("User", foreign_keys=[patient_id], lazy="selectin")
    doctor = relationship("User", foreign_keys=[doctor_id], lazy="selectin")

    __table_args__ = (
        Index("ix_prescriptions_patient_created", "patient_id", "created_at"),
        Index("ix_prescriptions_encounter", "encounter_id"),
    )

    def __repr__(self) -> str:
        return f"<Prescription {self.id} patient={self.patient_id} status={self.status.value}>"


# ============================================================
# Prescription items (medications)
# ============================================================

class PrescriptionItem(Base):
    __tablename__ = "prescription_items"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4,
    )
    prescription_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("prescriptions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    medication_name: Mapped[str] = mapped_column(String(200), nullable=False)
    dose: Mapped[str] = mapped_column(String(100), nullable=False)
    frequency: Mapped[str] = mapped_column(String(100), nullable=False)
    duration_days: Mapped[int | None] = mapped_column(Integer, nullable=True)
    instructions: Mapped[str | None] = mapped_column(Text, nullable=True)

    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    prescription = relationship("Prescription", back_populates="items")

    def __repr__(self) -> str:
        return f"<PrescriptionItem {self.medication_name} {self.dose}>"
