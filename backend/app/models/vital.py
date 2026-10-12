"""
Vital signs — logged during a visit by a nurse or doctor.

Design:
  - All clinical values are nullable. A nurse might log only BP at one check,
    or the full set. Requiring every field would make the feature unusable.
  - BP is split into systolic / diastolic (numbers), not a single string.
    This lets the future dashboard plot trends and flag hypertension.
  - `recorded_at` (when the reading was taken) is separate from
    `created_at` (when the row was inserted) — a nurse can back-date.
  - `recorded_by_id` is separate from the doctor of the encounter — a nurse
    is a different person.

Not null-constrained on encounter_id because a patient might have vitals
taken at reception before the doctor opens an encounter.
"""

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, Integer, Numeric, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Vital(Base):
    __tablename__ = "vitals"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4,
    )

    patient_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False, index=True,
    )
    encounter_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("encounters.id", ondelete="SET NULL"),
        nullable=True, index=True,
    )
    recorded_by_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
    )

    # ---- Clinical values ----
    temperature_c: Mapped[float | None] = mapped_column(Numeric(4, 1), nullable=True)
    heart_rate_bpm: Mapped[int | None] = mapped_column(Integer, nullable=True)
    respiratory_rate: Mapped[int | None] = mapped_column(Integer, nullable=True)
    bp_systolic: Mapped[int | None] = mapped_column(Integer, nullable=True)
    bp_diastolic: Mapped[int | None] = mapped_column(Integer, nullable=True)
    spo2_percent: Mapped[int | None] = mapped_column(Integer, nullable=True)
    weight_kg: Mapped[float | None] = mapped_column(Numeric(5, 2), nullable=True)
    height_cm: Mapped[float | None] = mapped_column(Numeric(5, 2), nullable=True)
    pain_scale: Mapped[int | None] = mapped_column(Integer, nullable=True)

    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    # ---- Timestamps ----
    recorded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), index=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(),
    )

    patient = relationship("User", foreign_keys=[patient_id], lazy="selectin")
    recorded_by = relationship("User", foreign_keys=[recorded_by_id], lazy="selectin")

    __table_args__ = (
        Index("ix_vitals_patient_recorded", "patient_id", "recorded_at"),
    )

    def __repr__(self) -> str:
        return f"<Vital {self.id} patient={self.patient_id} bp={self.bp_systolic}/{self.bp_diastolic}>"
