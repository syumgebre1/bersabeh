"""
Messaging models — threads, participants, messages, attachments.

Structure:
  threads               — a conversation (case / appointment / referral / broadcast / logistics)
  thread_participants   — who is in a thread (many-to-many with users)
  messages              — messages in a thread
  message_attachments   — files uploaded with a message

Thread kinds:
  case        — clinical case discussion (doctor ↔ patient, nurse ↔ patient, etc.)
  appointment — scheduling logistics
  referral    — doctor ↔ doctor
  broadcast   — admin-only announcement (one-to-many)
  logistics   — nurse ↔ patient / nurse ↔ reception (room, medication times, etc.)

Permission matrix:
  See app/core/allowed_threads.py — enforced at the API layer on thread
  creation and message send.
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
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


# ============================================================
# Enums
# ============================================================

class ThreadKind(str, enum.Enum):
    CASE = "case"
    APPOINTMENT = "appointment"
    REFERRAL = "referral"
    BROADCAST = "broadcast"
    LOGISTICS = "logistics"      # nurse↔patient, nurse↔reception coordination


# ============================================================
# Thread
# ============================================================

class Thread(Base):
    __tablename__ = "threads"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4,
    )

    kind: Mapped[ThreadKind] = mapped_column(
        SAEnum(ThreadKind, name="thread_kind",
               values_callable=lambda e: [m.value for m in e]),
        nullable=False, index=True,
    )
    subject: Mapped[str | None] = mapped_column(String(300), nullable=True)

    # Optional context
    patient_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True, index=True,
    )
    encounter_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("encounters.id", ondelete="SET NULL"),
        nullable=True,
    )

    is_archived: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, index=True)

    created_by_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now(),
    )
    # Denormalized for fast "sort my threads by recency" queries.
    # Matches the DB schema (NOT NULL with server_default=now()).
    last_message_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), index=True,
    )

    participants = relationship(
        "ThreadParticipant",
        back_populates="thread",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    messages = relationship(
        "Message",
        back_populates="thread",
        cascade="all, delete-orphan",
        order_by="Message.created_at",
    )

    __table_args__ = (
        Index("ix_threads_kind_updated", "kind", "updated_at"),
    )

    def __repr__(self) -> str:
        return f"<Thread {self.id} kind={self.kind.value} subject={self.subject!r}>"


# ============================================================
# Thread Participant
# ============================================================

class ThreadParticipant(Base):
    __tablename__ = "thread_participants"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4,
    )
    thread_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("threads.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False, index=True,
    )

    joined_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(),
    )
    last_read_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True,
    )

    thread = relationship("Thread", back_populates="participants")
    user = relationship("User", lazy="selectin")

    __table_args__ = (
        UniqueConstraint("thread_id", "user_id", name="uq_thread_participants_thread_user"),
    )

    def __repr__(self) -> str:
        return f"<ThreadParticipant thread={self.thread_id} user={self.user_id}>"


# ============================================================
# Message
# ============================================================

class Message(Base):
    __tablename__ = "messages"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4,
    )
    thread_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("threads.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    sender_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,     # nullable when is_system = true
        index=True,
    )

    body: Mapped[str] = mapped_column(Text, nullable=False)
    is_system: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, index=True)

    client_message_id: Mapped[str | None] = mapped_column(String(100), nullable=True, index=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), index=True,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now(),
    )

    thread = relationship("Thread", back_populates="messages")
    sender = relationship("User", lazy="selectin")
    attachments = relationship(
        "MessageAttachment",
        back_populates="message",
        cascade="all, delete-orphan",
        lazy="selectin",
    )

    __table_args__ = (
        Index("ix_messages_thread_created", "thread_id", "created_at"),
    )

    def __repr__(self) -> str:
        return f"<Message {self.id} thread={self.thread_id}>"


# ============================================================
# Message Attachment
# ============================================================

class MessageAttachment(Base):
    __tablename__ = "message_attachments"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4,
    )
    message_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("messages.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )

    file_url: Mapped[str] = mapped_column(String(500), nullable=False)
    file_name: Mapped[str] = mapped_column(String(255), nullable=False)
    file_type: Mapped[str] = mapped_column(String(100), nullable=False)
    file_size: Mapped[int] = mapped_column(Integer, nullable=False)

    uploaded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(),
    )

    message = relationship("Message", back_populates="attachments")

    def __repr__(self) -> str:
        return f"<MessageAttachment {self.file_name} ({self.file_type})>"
