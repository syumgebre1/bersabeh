"""
Audit log endpoints.

Role permissions:
  - Only ADMIN and SUPER_ADMIN can read the audit trail.
  - Filterable by actor, action, entity type, entity id, and date.

Design:
  - Read-only. Entries are created by the audit service (before_flush listener),
    not by API calls.
  - Pagination via limit/offset.
  - Responses embed the actor (unless the user was later deleted).
"""

import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import AdminUser
from app.db.session import get_db
from app.models.audit_log import AuditAction, AuditLog
from app.schemas.audit_log import AuditLogBrief, AuditLogRead


router = APIRouter(prefix="/audit-logs", tags=["audit"])


# ============================================================
# GET /audit-logs
# ============================================================
@router.get(
    "",
    response_model=list[AuditLogBrief],
    summary="List audit log entries (admin only)",
)
async def list_audit_logs(
    _admin: AdminUser,
    db: AsyncSession = Depends(get_db),
    actor_id: uuid.UUID | None = Query(None, description="Filter by actor"),
    action: AuditAction | None = Query(None),
    entity_type: str | None = Query(None, description="E.g. 'User', 'Prescription'"),
    entity_id: uuid.UUID | None = Query(None),
    since: datetime | None = Query(None, description="ISO datetime, inclusive"),
    until: datetime | None = Query(None, description="ISO datetime, exclusive"),
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
) -> list[AuditLogBrief]:
    stmt = select(AuditLog)

    if actor_id is not None:
        stmt = stmt.where(AuditLog.actor_id == actor_id)
    if action is not None:
        stmt = stmt.where(AuditLog.action == action)
    if entity_type is not None:
        stmt = stmt.where(AuditLog.entity_type == entity_type)
    if entity_id is not None:
        stmt = stmt.where(AuditLog.entity_id == entity_id)
    if since is not None:
        stmt = stmt.where(AuditLog.created_at >= since)
    if until is not None:
        stmt = stmt.where(AuditLog.created_at < until)

    stmt = stmt.order_by(AuditLog.created_at.desc()).limit(limit).offset(offset)
    result = await db.execute(stmt)
    return [AuditLogBrief.model_validate(a) for a in result.scalars().all()]


# ============================================================
# GET /audit-logs/{id}
# ============================================================
@router.get(
    "/{log_id}",
    response_model=AuditLogRead,
    summary="Get one audit entry (admin only)",
)
async def get_audit_log(
    log_id: uuid.UUID,
    _admin: AdminUser,
    db: AsyncSession = Depends(get_db),
) -> AuditLogRead:
    result = await db.execute(select(AuditLog).where(AuditLog.id == log_id))
    a = result.scalar_one_or_none()
    if a is None:
        raise HTTPException(status_code=404, detail="Audit log entry not found")
    return AuditLogRead.model_validate(a)
