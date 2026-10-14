"""
Scheduled doses and medication administrations.

Decision 2 (Hybrid approach):
  When a doctor writes a prescription, the scheduler service EXPANDS the
  prescription_items into concrete `scheduled_doses` rows (one per dose).
  When a nurse gives a dose, we create a `medication_administrations` row
  and mark the dose row as `administered`.

Why pre-compute?
  - Efficient shift queries (index on scheduled_for + status)
  - Clear audit trail (one row per dose, immutably stamped)
  - Clean cancellation (mark status=cancelled; don't lose history)

Status lifecycle:
  pending      — dose is scheduled, not yet given
  administered — nurse gave the dose (see medication_administrations)
  skipped      — nurse chose to skip (with reason)
  cancelled    — prescription was cancelled before this dose was due
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
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


# ============================================================
# Enums
# ============================================================

class DoseStatus(str, enum.Enum):
    PENDING = "pending"
    ADMINISTERED = "administered"
    SKIPPED = "skipped"
    CANCELLED = "cancelled"


class SkipReason(str, enum.Enum):
    PATIENT_REFUSED = "patient_refused"
    PATIENT_ABSENT = "patient_absent"
    NPO = "npo"                      # nothing by mouth
    ADVERSE_REACTION = "adverse_reaction"
    DOCTOR_HOLD = "doctor_hold"
    OTHER = "other"


# ============================================================
# Scheduled Dose
# ============================================================

class ScheduledDose(Base):
    __tablename__ = "scheduled_doses"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4,
    )

    # Source
    prescription_item_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("prescription_items.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    patient_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False, index=True,
    )

    # Denormalized for display (so a shift query doesn't need 3 joins)
    medication_name: Mapped[str] = mapped_column(String(200), nullable=False)
    dose: Mapped[str] = mapped_column(String(100), nullable=False)
    frequency: Mapped[str] = mapped_column(String(100), nullable=False)

    scheduled_for: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, index=True,
    )

    status: Mapped[DoseStatus] = mapped_column(
        SAEnum(DoseStatus, name="dose_status",
               values_callable=lambda e: [m.value for m in e]),
        nullable=False, default=DoseStatus.PENDING, index=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now(),
    )

    patient = relationship("User", foreign_keys=[patient_id], lazy="selectin")
    administration = relationship(
        "MedicationAdministration",
        back_populates="dose",
        uselist=False,
        cascade="all, delete-orphan",
        lazy="selectin",
    )

    __table_args__ = (
        # One dose per (item, scheduled_for) — no duplicates if scheduler re-runs
        UniqueConstraint(
            "prescription_item_id", "scheduled_for",
            name="uq_scheduled_doses_item_time",
        ),
        # The hot query: "all pending doses in time range for a set of patients"
        Index(
            "ix_scheduled_doses_pending_time",
            "scheduled_for",
            "status",
        ),
    )

    def __repr__(self) -> str:
        return (
            f"<ScheduledDose {self.medication_name} {self.dose} "
            f"@ {self.scheduled_for.isoformat()} status={self.status.value}>"
        )


# ============================================================
# Medication Administration
# ============================================================

class MedicationAdministration(Base):
    __tablename__ = "medication_administrations"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4,
    )

    dose_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("scheduled_doses.id", ondelete="CASCADE"),
        nullable=False, unique=True, index=True,
    )
    administered_by_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
    )

    administered_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), index=True,
    )
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Set only when the dose was skipped
    skip_reason: Mapped[SkipReason | None] = mapped_column(
        SAEnum(SkipReason, name="skip_reason",
               values_callable=lambda e: [m.value for m in e]),
        nullable=True,
    )
    skip_notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(),
    )

    dose = relationship("ScheduledDose", back_populates="administration")
    administered_by = relationship("User", foreign_keys=[administered_by_id], lazy="selectin")

    def __repr__(self) -> str:
        kind = "skip" if self.skip_reason else "give"
        return f"<MedicationAdministration {kind} dose={self.dose_id}>"
