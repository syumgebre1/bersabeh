"""
Encounter model — an actual clinical visit.

Why a dedicated encounter table?

  An appointment is a *plan* ("Selam will see Dr. Dawit at 3pm Tuesday").
  An encounter is *reality* ("Selam was seen by Dr. Dawit on Tuesday from
  3:02pm to 3:34pm, presenting with a headache"). The two are related but
  not the same — walk-ins have no appointment, and one appointment could
  theoretically spawn multiple follow-up encounters.

  Every clinical artifact hangs off the encounter:
    - prescriptions       → encounter_id
    - vitals              → encounter_id
    - lab orders/results  → encounter_id
    - clinical messages   → encounter_id (optional)
    - bills               → encounter_id

  This gives every future feature a single, unambiguous anchor:
  "which visit did this belong to?" is always answerable.

Relation to appointment:
  appointment_id is nullable. If the encounter came from a booked slot,
  it points back to it. If it was a walk-in, appointment_id is NULL.
"""

import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum as SAEnum, ForeignKey, Index, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


# ============================================================
# Enums
# ============================================================

class EncounterType(str, enum.Enum):
    """Broad category of the visit."""
    OUTPATIENT = "outpatient"      # regular consultation
    ADMITTED = "admitted"          # patient stays for observation
    EMERGENCY = "emergency"        # walk-in urgent care


class EncounterStatus(str, enum.Enum):
    """Lifecycle of the visit."""
    OPEN = "open"                  # doctor is actively seeing the patient
    CLOSED = "closed"              # visit completed and signed off


# ============================================================
# Model
# ============================================================

class Encounter(Base):
    """A single clinical visit."""

    __tablename__ = "encounters"

    # ---- Primary key ----
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    # ---- Participants ----
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

    # ---- Optional link to a booked appointment ----
    appointment_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("appointments.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    # ---- Clinical content ----
    type: Mapped[EncounterType] = mapped_column(
        SAEnum(EncounterType, name="encounter_type", values_callable=lambda e: [m.value for m in e]),
        nullable=False,
        default=EncounterType.OUTPATIENT,
    )
    status: Mapped[EncounterStatus] = mapped_column(
        SAEnum(EncounterStatus, name="encounter_status", values_callable=lambda e: [m.value for m in e]),
        nullable=False,
        default=EncounterStatus.OPEN,
        index=True,
    )
    chief_complaint: Mapped[str | None] = mapped_column(Text, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    # ---- Timing ----
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(),
    )
    ended_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # ---- Audit ----
    created_by_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
    )

    # ---- Timestamps ----
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now(),
    )

    # ---- Relationships ----
    patient = relationship("User", foreign_keys=[patient_id], lazy="selectin")
    doctor = relationship("User", foreign_keys=[doctor_id], lazy="selectin")

    # ---- Indexes ----
    __table_args__ = (
        Index("ix_encounters_patient_status", "patient_id", "status"),
        Index("ix_encounters_doctor_status", "doctor_id", "status"),
        Index("ix_encounters_started_at", "started_at"),
    )

    def __repr__(self) -> str:
        return (
            f"<Encounter {self.id} patient={self.patient_id} "
            f"doctor={self.doctor_id} type={self.type.value} status={self.status.value}>"
        )
