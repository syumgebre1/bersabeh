"""
Nurse shifts and handover notes.

Decision 4 (Structured signed handover):
  A nurse starts a shift → `nurse_shifts` row.
  During the shift, they can write handover notes → `handover_notes` rows
  (optionally tied to a specific patient).
  At the end, they click "Hand over" → `shift_handovers` row (status=pending).
  The receiving nurse clicks "Acknowledge" → status=acknowledged, both nurses
  + timestamps recorded.

Why separate tables?
  - Shifts have their own lifecycle (start, end, handover)
  - Handover notes accumulate during a shift
  - Acknowledgment is an explicit workflow step (patient safety)
"""

import enum
import uuid
from datetime import datetime

from sqlalchemy import (
    DateTime,
    Enum as SAEnum,
    ForeignKey,
    Index,
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

class HandoverStatus(str, enum.Enum):
    PENDING = "pending"            # handed over, not yet acknowledged
    ACKNOWLEDGED = "acknowledged"  # receiving nurse confirmed


class HandoverSeverity(str, enum.Enum):
    STABLE = "stable"
    ATTENTION = "attention"
    CRITICAL = "critical"


# ============================================================
# Nurse Shift
# ============================================================

class NurseShift(Base):
    __tablename__ = "nurse_shifts"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4,
    )

    nurse_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False, index=True,
    )

    ward: Mapped[str] = mapped_column(String(50), nullable=False, default="Ward A")

    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), index=True,
    )
    ended_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True, index=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(),
    )

    nurse = relationship("User", foreign_keys=[nurse_id], lazy="selectin")
    handover_notes = relationship(
        "HandoverNote",
        back_populates="shift",
        cascade="all, delete-orphan",
        lazy="selectin",
        order_by="HandoverNote.created_at.desc()",
    )
    handover = relationship(
        "ShiftHandover",
        back_populates="shift",
        uselist=False,
        cascade="all, delete-orphan",
        lazy="selectin",
    )

    __table_args__ = (
        # Fast: "find the active shift for a nurse"
        Index(
            "ix_nurse_shifts_active",
            "nurse_id",
            postgresql_where=(ended_at.is_(None)),
        ),
    )

    def __repr__(self) -> str:
        status = "active" if self.ended_at is None else "ended"
        return f"<NurseShift nurse={self.nurse_id} {status}>"


# ============================================================
# Handover Note (written during a shift)
# ============================================================

class HandoverNote(Base):
    __tablename__ = "handover_notes"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4,
    )

    shift_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("nurse_shifts.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    author_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
    )
    patient_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True, index=True,
    )

    note: Mapped[str] = mapped_column(Text, nullable=False)
    severity: Mapped[HandoverSeverity] = mapped_column(
        SAEnum(HandoverSeverity, name="handover_severity",
               values_callable=lambda e: [m.value for m in e]),
        nullable=False, default=HandoverSeverity.STABLE, index=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), index=True,
    )

    shift = relationship("NurseShift", back_populates="handover_notes")
    author = relationship("User", foreign_keys=[author_id], lazy="selectin")
    patient = relationship("User", foreign_keys=[patient_id], lazy="selectin")

    def __repr__(self) -> str:
        return f"<HandoverNote shift={self.shift_id} severity={self.severity.value}>"


# ============================================================
# Shift Handover (signed handover record)
# ============================================================

class ShiftHandover(Base):
    __tablename__ = "shift_handovers"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4,
    )

    shift_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("nurse_shifts.id", ondelete="CASCADE"),
        nullable=False, unique=True, index=True,
    )
    from_nurse_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
    )
    to_nurse_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    status: Mapped[HandoverStatus] = mapped_column(
        SAEnum(HandoverStatus, name="handover_status",
               values_callable=lambda e: [m.value for m in e]),
        nullable=False, default=HandoverStatus.PENDING, index=True,
    )

    handed_over_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(),
    )
    acknowledged_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True,
    )

    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(),
    )

    shift = relationship("NurseShift", back_populates="handover")
    from_nurse = relationship("User", foreign_keys=[from_nurse_id], lazy="selectin")
    to_nurse = relationship("User", foreign_keys=[to_nurse_id], lazy="selectin")

    def __repr__(self) -> str:
        return f"<ShiftHandover shift={self.shift_id} status={self.status.value}>"
