"""
Video call model — a scheduled/ad-hoc video consultation.

State machine:
    requested ──► assigned ──► accepted ──► in_progress ──► ended
       │             │            │              │
       └─────────────┴────────────┴──────────────┴──► cancelled

Flow:
  1. Patient (or reception on their behalf) POSTs /calls → status=requested.
  2. Reception/Admin POSTs /calls/{id}/assign with a doctor_id → status=assigned.
     (For an emergency, the doctor can also self-accept if on-duty.)
  3. The assigned doctor POSTs /calls/{id}/accept → status=accepted,
     a `room_url` is generated and stored.
  4. Both parties open the room URL. Optionally the doctor marks in_progress.
  5. Either party POSTs /calls/{id}/end → status=ended, duration_seconds stored.

Why Jitsi (not custom WebRTC)?
  See DECISIONS.md D007. Real WebRTC needs STUN/TURN + signaling + native
  media negotiation across iOS/Android/Web — weeks of work. Jitsi gives us
  working HD video calls in a WebView with zero media plumbing. The platform
  still owns the workflow: who can call whom, who's assigned, when it happened,
  and the audit trail.
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
    func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


# ============================================================
# Enums
# ============================================================

class CallStatus(str, enum.Enum):
    REQUESTED = "requested"     # patient/reception asked for a call
    ASSIGNED = "assigned"       # reception/admin picked a doctor
    ACCEPTED = "accepted"       # doctor accepted; room_url exists
    IN_PROGRESS = "in_progress" # at least one party has joined
    ENDED = "ended"             # call completed
    CANCELLED = "cancelled"     # cancelled before it happened


# ============================================================
# Model
# ============================================================

class VideoCall(Base):
    __tablename__ = "video_calls"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4,
    )

    # ---- Participants ----
    patient_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False, index=True,
    )
    requested_by_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
    )
    assigned_to_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True, index=True,
    )

    # ---- Optional links ----
    thread_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("threads.id", ondelete="SET NULL"),
        nullable=True,
    )
    encounter_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("encounters.id", ondelete="SET NULL"),
        nullable=True,
    )

    # ---- Status + room ----
    status: Mapped[CallStatus] = mapped_column(
        SAEnum(CallStatus, name="call_status",
               values_callable=lambda e: [m.value for m in e]),
        nullable=False,
        default=CallStatus.REQUESTED,
        index=True,
    )
    room_url: Mapped[str | None] = mapped_column(String(500), nullable=True)

    reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    # ---- Timestamps ----
    requested_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(),
    )
    assigned_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    accepted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    ended_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    duration_seconds: Mapped[int | None] = mapped_column(Integer, nullable=True)

    is_seed_data: Mapped[bool] = mapped_column(nullable=False, default=False, index=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now(),
    )

    # ---- Relationships ----
    patient = relationship("User", foreign_keys=[patient_id], lazy="selectin")
    requested_by = relationship("User", foreign_keys=[requested_by_id], lazy="selectin")
    assigned_to = relationship("User", foreign_keys=[assigned_to_id], lazy="selectin")

    __table_args__ = (
        Index("ix_video_calls_patient_status", "patient_id", "status"),
        Index("ix_video_calls_doctor_status", "assigned_to_id", "status"),
        Index("ix_video_calls_requested_at", "requested_at"),
    )

    def __repr__(self) -> str:
        return (
            f"<VideoCall {self.id} patient={self.patient_id} "
            f"doctor={self.assigned_to_id} status={self.status.value}>"
        )
