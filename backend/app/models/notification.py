"""
Notification model — system-generated signals for a user.

Distinct from messages:
  - Messages are user-authored, stored in threads, two-way.
  - Notifications are system-authored, one-way, tie to an event
    (new message received, lab ready, appointment reminder, patient
    approved, ...).

Design:
  - `kind` categorizes the event so the client can pick an icon.
  - `target_type` + `target_id` point at the related object without a
    hard FK (avoids one nullable FK per possible target).
    Example: target_type="thread", target_id=<thread uuid>
  - `read_at` = NULL means unread; a timestamp means read.
  - `channel` records how the notification has been delivered so far.
  - `email_sent_at` lets us implement "email fallback if user offline"
    without re-sending.
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

class NotificationKind(str, enum.Enum):
    MESSAGE = "message"                     # new chat message
    APPOINTMENT = "appointment"             # reminder / status change
    LAB = "lab"                             # result ready
    PRESCRIPTION = "prescription"           # new prescription issued
    PATIENT_APPROVAL = "patient_approval"   # admin approves/rejects patient
    SYSTEM = "system"                       # generic system message


class NotificationChannel(str, enum.Enum):
    IN_APP = "in_app"
    EMAIL = "email"
    BOTH = "both"


# ============================================================
# Model
# ============================================================

class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4,
    )

    # Recipient.
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )

    kind: Mapped[NotificationKind] = mapped_column(
        SAEnum(NotificationKind, name="notification_kind",
               values_callable=lambda e: [m.value for m in e]),
        nullable=False, index=True,
    )

    title: Mapped[str] = mapped_column(String(200), nullable=False)
    body: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Where this notification points (e.g., "thread" + UUID).
    target_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    target_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), nullable=True, index=True,
    )

    channel: Mapped[NotificationChannel] = mapped_column(
        SAEnum(NotificationChannel, name="notification_channel",
               values_callable=lambda e: [m.value for m in e]),
        nullable=False, default=NotificationChannel.IN_APP,
    )

    # Read tracking.
    read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True, index=True)

    # Email fallback tracking (for "email if user offline" rule).
    email_sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    is_seed_data: Mapped[bool] = mapped_column(default=False, nullable=False, index=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), index=True,
    )

    user = relationship("User", lazy="selectin")

    __table_args__ = (
        Index("ix_notifications_user_read", "user_id", "read_at"),
        Index("ix_notifications_user_created", "user_id", "created_at"),
    )

    def __repr__(self) -> str:
        return f"<Notification {self.id} kind={self.kind.value} user={self.user_id} read={self.read_at is not None}>"
