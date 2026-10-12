"""
Pydantic schemas for messaging and notifications.

Design:
  - MessageCreate allows empty body if attachment_ids is non-empty.
  - Threads responses embed participants and a last-message preview so the
    client can render a list without extra calls.
  - Notification responses are independent of messages (they're a different
    concept — signals, not chat).
"""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.models.messaging import ThreadKind
from app.models.notification import NotificationChannel, NotificationKind
from app.schemas.user import UserPublic


# ============================================================
# Attachments
# ============================================================

class AttachmentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    url: str
    filename: str
    content_type: str
    size_bytes: int
    width: int | None = None
    height: int | None = None
    duration_seconds: int | None = None
    created_at: datetime


# ============================================================
# Threads — requests
# ============================================================

class ThreadCreate(BaseModel):
    """
    Create a new thread.

    - `kind` determines the allowed-pairs rules.
    - `participant_ids` must include all participants (creator is added
      automatically by the endpoint).
    - `patient_id` is required when kind == "case" (validated server-side).
    """
    kind: ThreadKind
    subject: str = Field(..., min_length=1, max_length=300)
    participant_ids: list[uuid.UUID] = Field(..., min_length=1, max_length=20)
    patient_id: uuid.UUID | None = None


class MarkReadRequest(BaseModel):
    """Mark a thread as read up to now."""
    pass    # no body required


# ============================================================
# Threads — responses
# ============================================================

class ThreadParticipantRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    user: UserPublic
    joined_at: datetime
    last_read_at: datetime | None = None


class ThreadBrief(BaseModel):
    """Slim thread view for list endpoints."""
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    kind: ThreadKind
    subject: str
    patient_id: uuid.UUID | None = None
    last_message_at: datetime
    created_at: datetime


class ThreadRead(BaseModel):
    """Full thread with participants."""
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    kind: ThreadKind
    subject: str
    patient_id: uuid.UUID | None = None
    created_by_id: uuid.UUID
    participants: list[ThreadParticipantRead] = []
    last_message_at: datetime
    created_at: datetime
    updated_at: datetime


# ============================================================
# Messages — requests
# ============================================================

class MessageCreate(BaseModel):
    """
    Send a message in a thread.

    - `body` may be empty ONLY if `attachment_ids` is non-empty.
    - `client_message_id` is a client-side UUID used to dedupe retries.
    """
    body: str | None = Field(None, max_length=20000)
    attachment_ids: list[uuid.UUID] = Field(default_factory=list, max_length=10)
    client_message_id: str | None = Field(None, max_length=64)

    @model_validator(mode="after")
    def body_or_attachment(self) -> "MessageCreate":
        has_body = bool(self.body and self.body.strip())
        has_attachments = len(self.attachment_ids) > 0
        if not has_body and not has_attachments:
            raise ValueError("A message must have either a body or at least one attachment")
        return self


# ============================================================
# Messages — responses
# ============================================================

class MessageRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    thread_id: uuid.UUID
    sender: UserPublic
    body: str | None = None
    client_message_id: str | None = None
    is_system: bool = False
    attachments: list[AttachmentRead] = []
    created_at: datetime


class MessageBrief(BaseModel):
    """Slim message for previews."""
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    sender_id: uuid.UUID
    body: str | None = None
    created_at: datetime


# ============================================================
# Notifications
# ============================================================

class NotificationRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    kind: NotificationKind
    title: str
    body: str | None = None
    target_type: str | None = None
    target_id: uuid.UUID | None = None
    channel: NotificationChannel
    read_at: datetime | None = None
    created_at: datetime


class NotificationMarkRead(BaseModel):
    """Mark one or more notifications as read."""
    notification_ids: list[uuid.UUID] = Field(..., min_length=1, max_length=200)


class UnreadCounts(BaseModel):
    """Aggregate unread counts for the top-bar badges."""
    unread_messages: int = 0
    unread_notifications: int = 0
