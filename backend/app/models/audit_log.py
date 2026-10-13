"""
Audit log — generic record of every mutation.

Why generic?
  We need to log everything from "user approved patient X" to "prescription
  cancelled" to "lab result entered" without adding a FK-per-entity. The
  generic design uses:
    - entity_type: the model class name as a string (e.g. "Prescription")
    - entity_id:   the UUID of the row (no FK — rows may be deleted)
    - before_json / after_json: JSONB snapshots of relevant fields
    - diff_json:   just the fields that changed (computed on update)

Why JSONB?
  Postgres JSONB allows querying inside snapshots (e.g. "find every audit
  entry where a prescription status went active → cancelled"). Enables
  forensic queries without schema changes.

Security:
  Only admins can read audit logs (endpoint-level check). Rows are
  append-only — no update or delete endpoints.

Retention:
  Audit logs are the clinic's legal/operational record. They are never
  deleted by the app. If retention becomes an issue, we add an archival
  policy on the DB (partition by month, move old partitions to cold storage).
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
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


# ============================================================
# Enums
# ============================================================

class AuditAction(str, enum.Enum):
    CREATE = "create"
    UPDATE = "update"
    DELETE = "delete"
    LOGIN = "login"
    LOGOUT = "logout"
    CUSTOM = "custom"


# ============================================================
# Model
# ============================================================

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4,
    )

    # Who did it (nullable for system actions like scheduled jobs)
    actor_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True, index=True,
    )

    action: Mapped[AuditAction] = mapped_column(
        SAEnum(AuditAction, name="audit_action",
               values_callable=lambda e: [m.value for m in e]),
        nullable=False, index=True,
    )

    # What was affected (generic — no FK by design)
    entity_type: Mapped[str] = mapped_column(String(80), nullable=False, index=True)
    entity_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), nullable=True, index=True,
    )

    # Human-readable summary
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Snapshots
    before_json: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    after_json: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    diff_json: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    # Request context
    ip_address: Mapped[str | None] = mapped_column(String(45), nullable=True)  # IPv6 max
    user_agent: Mapped[str | None] = mapped_column(String(300), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), index=True,
    )

    # Relationships
    actor = relationship("User", lazy="selectin")

    __table_args__ = (
        Index("ix_audit_logs_entity", "entity_type", "entity_id"),
        Index("ix_audit_logs_actor_created", "actor_id", "created_at"),
        Index("ix_audit_logs_created", "created_at"),
    )

    def __repr__(self) -> str:
        return (
            f"<AuditLog {self.action.value} {self.entity_type}"
            f"[{str(self.entity_id)[:8] if self.entity_id else '—'}]"
            f" by={self.actor_id}>"
        )
