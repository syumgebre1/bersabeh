"""
Pydantic schemas for audit log endpoints.

Audit entries are created internally by the audit service — there's no
public "create audit log" endpoint. This file only defines response shapes.

The read endpoint supports filtering by actor, action, entity, and date.
"""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.audit_log import AuditAction
from app.schemas.user import UserPublic


class AuditLogRead(BaseModel):
    """Full audit entry, with the actor (if not deleted)."""
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    actor: UserPublic | None = None
    action: AuditAction

    entity_type: str
    entity_id: uuid.UUID | None = None

    description: str | None = None
    before_json: dict | None = None
    after_json: dict | None = None
    diff_json: dict | None = None

    ip_address: str | None = None
    user_agent: str | None = None

    created_at: datetime


class AuditLogBrief(BaseModel):
    """Slim audit row for list views."""
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    actor_id: uuid.UUID | None = None
    action: AuditAction
    entity_type: str
    entity_id: uuid.UUID | None = None
    description: str | None = None
    created_at: datetime
