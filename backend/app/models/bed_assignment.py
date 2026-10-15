"""
BedAssignment — a patient assigned to a room.

The DB enforces "one active assignment per room" via a partial unique index
(uq_bed_assignments_one_active_per_room WHERE discharged_at IS NULL).

Active assignment = discharged_at IS NULL.
"""

import uuid
from datetime import datetime

from sqlalchemy import (
    DateTime,
    ForeignKey,
    Index,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class BedAssignment(Base):
    __tablename__ = "bed_assignments"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4,
    )
    room_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("rooms.id", ondelete="RESTRICT"),
        nullable=False, index=True,
    )
    patient_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False, index=True,
    )
    assigned_by_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
    )
    admitted_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), index=True,
    )
    discharged_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True, index=True,
    )
    discharge_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now(),
    )

    room = relationship("Room", back_populates="assignments")
    patient = relationship("User", foreign_keys=[patient_id], lazy="selectin")
    assigned_by = relationship("User", foreign_keys=[assigned_by_id], lazy="selectin")

    __table_args__ = (
        # One active assignment per room
        Index(
            "uq_bed_assignments_one_active_per_room",
            "room_id",
            unique=True,
            postgresql_where=(discharged_at.is_(None)),
        ),
        # Fast lookup: active assignments for a patient / room
        Index(
            "ix_bed_assignments_active_patient",
            "patient_id",
            postgresql_where=(discharged_at.is_(None)),
        ),
        Index(
            "ix_bed_assignments_active_room",
            "room_id",
            postgresql_where=(discharged_at.is_(None)),
        ),
    )

    def __repr__(self) -> str:
        status = "active" if self.discharged_at is None else "discharged"
        return f"<BedAssignment room={self.room_id} patient={self.patient_id} {status}>"
