"""
Appointment model — a booked slot between a patient and a doctor.

State machine:
    scheduled ──► confirmed ──► checked_in ──► completed
        │              │              │
        └──────────────┴──────────────┴──► cancelled
                                              ▲
                                              │
                              no_show ◄───────┘ (patient didn't arrive)

Not every transition is required. The common flows:

  Patient books         → scheduled
  Reception confirms    → confirmed
  Patient arrives       → checked_in
  Doctor finishes visit → completed (and creates an Encounter)

  Cancelled at any time before completed → cancelled
  Patient never showed, appointment past → no_show (marked by staff)

Why a separate status from Encounter?
  An appointment is an *intent*. An encounter is *reality*. Sometimes
  a scheduled appointment never happens (no-show, cancel). Sometimes a
  walk-in becomes an encounter without any appointment. Keeping the
  state machines separate is honest about these differences.
"""

import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum as SAEnum, ForeignKey, Index, Integer, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


# ============================================================
# Enums
# ============================================================

class AppointmentStatus(str, enum.Enum):
    """Lifecycle of a booked appointment."""
    SCHEDULED = "scheduled"       # created; awaiting confirmation
    CONFIRMED = "confirmed"       # patient confirmed they'll come
    CHECKED_IN = "checked_in"     # patient arrived, waiting to be seen
    COMPLETED = "completed"       # visit happened; encounter was created
    CANCELLED = "cancelled"       # cancelled before it happened
    NO_SHOW = "no_show"           # patient never showed up


# ============================================================
# Model
# ============================================================

class Appointment(Base):
    """A scheduled slot for a patient to see a doctor."""

    __tablename__ = "appointments"

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
    created_by_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
    )

    # ---- Scheduling ----
    scheduled_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, index=True,
    )
    duration_minutes: Mapped[int] = mapped_column(
        Integer, nullable=False, default=30,
    )
    status: Mapped[AppointmentStatus] = mapped_column(
        SAEnum(AppointmentStatus, name="appointment_status",
               values_callable=lambda e: [m.value for m in e]),
        nullable=False,
        default=AppointmentStatus.SCHEDULED,
        index=True,
    )

    # ---- Content ----
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    cancellation_reason: Mapped[str | None] = mapped_column(Text, nullable=True)

    # ---- Lifecycle timestamps ----
    confirmed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    checked_in_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    cancelled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

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
        # "Today's schedule for Dr. X" — the doctor dashboard's main query.
        Index("ix_appointments_doctor_scheduled_at", "doctor_id", "scheduled_at"),
        # "Next appointment for patient Y" — the patient dashboard's main query.
        Index("ix_appointments_patient_scheduled_at", "patient_id", "scheduled_at"),
        # Filter by status quickly.
        Index("ix_appointments_status_scheduled_at", "status", "scheduled_at"),
    )

    def __repr__(self) -> str:
        return (
            f"<Appointment {self.id} patient={self.patient_id} "
            f"doctor={self.doctor_id} at={self.scheduled_at.isoformat()} status={self.status.value}>"
        )
