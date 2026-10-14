"""
Room and Bed Assignment models.

Physical rooms in the clinic + patient assignments to rooms.

Design:
  - `rooms`              — a physical room (fixed inventory, admin-managed)
  - `bed_assignments`    — a patient's stay in a room (admitted_at → discharged_at)

Key invariant:
  A room can only have ONE active assignment at a time
  (i.e. only one row where `discharged_at IS NULL`).
  Enforced at the API level + a partial unique index in Postgres.

Who assigns?
  - Reception can assign a room at check-in (default flow)
  - Nurse can assign / reassign / discharge from the ward view
  - Both see the same occupancy — the assignment row is the single truth
"""

import enum
import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    Enum as SAEnum,
    ForeignKey,
    Index,
    Integer,
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

class RoomType(str, enum.Enum):
    GENERAL = "general"
    PRIVATE = "private"
    ICU = "icu"
    ISOLATION = "isolation"
    MATERNITY = "maternity"


# ============================================================
# Room
# ============================================================

class Room(Base):
    __tablename__ = "rooms"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4,
    )

    number: Mapped[str] = mapped_column(String(20), nullable=False, unique=True, index=True)
    ward: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    floor: Mapped[str | None] = mapped_column(String(20), nullable=True)
    room_type: Mapped[RoomType] = mapped_column(
        SAEnum(RoomType, name="room_type",
               values_callable=lambda e: [m.value for m in e]),
        nullable=False, default=RoomType.GENERAL, index=True,
    )
    capacity: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, index=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now(),
    )

    assignments = relationship(
        "BedAssignment",
        back_populates="room",
        cascade="all, delete-orphan",
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return f"<Room {self.number} ({self.ward})>"


# ============================================================
# Bed Assignment
# ============================================================

class BedAssignment(Base):
    __tablename__ = "bed_assignments"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4,
    )

    room_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("rooms.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    patient_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
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

    room = relationship("Room", back_populates="assignments", lazy="selectin")
    patient = relationship("User", foreign_keys=[patient_id], lazy="selectin")
    assigned_by = relationship("User", foreign_keys=[assigned_by_id], lazy="selectin")

    __table_args__ = (
        # Fast lookup: active assignment for a room
        Index(
            "ix_bed_assignments_active_room",
            "room_id",
            postgresql_where=(discharged_at.is_(None)),
        ),
        # Fast lookup: active assignment for a patient
        Index(
            "ix_bed_assignments_active_patient",
            "patient_id",
            postgresql_where=(discharged_at.is_(None)),
        ),
        # Rule: a room can only have ONE active assignment
        Index(
            "uq_bed_assignments_one_active_per_room",
            "room_id",
            unique=True,
            postgresql_where=(discharged_at.is_(None)),
        ),
    )

    def __repr__(self) -> str:
        status = "active" if self.discharged_at is None else "discharged"
        return f"<BedAssignment room={self.room_id} patient={self.patient_id} {status}>"
