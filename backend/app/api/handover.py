"""
Handover notes — per patient, attached to the author's active shift.
"""

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.deps import require_roles
from app.db.session import get_db
from app.models.shift import HandoverNote, NurseShift
from app.models.user import User, UserRole
from app.schemas.handover import HandoverCreate, HandoverOut

router = APIRouter(prefix="/handover", tags=["handover"])

NURSE_ROLES = (UserRole.NURSE, UserRole.DOCTOR, UserRole.ADMIN, UserRole.SUPER_ADMIN)
AUTHOR_ROLES = (UserRole.NURSE, UserRole.ADMIN, UserRole.SUPER_ADMIN)


@router.get("", response_model=list[HandoverOut])
async def list_handovers(
    patient_id: uuid.UUID | None = None,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_roles(*NURSE_ROLES)),
):
    stmt = (
        select(HandoverNote)
        .options(
            selectinload(HandoverNote.patient),
            selectinload(HandoverNote.author),
        )
        .order_by(HandoverNote.created_at.desc())
        .limit(limit)
    )
    if patient_id:
        stmt = stmt.where(HandoverNote.patient_id == patient_id)

    return (await db.execute(stmt)).scalars().all()


@router.post("", response_model=HandoverOut, status_code=status.HTTP_201_CREATED)
async def create_handover(
    payload: HandoverCreate,
    db: AsyncSession = Depends(get_db),
    current: User = Depends(require_roles(*AUTHOR_ROLES)),
):
    # Find the author's active shift
    shift = (
        await db.execute(
            select(NurseShift).where(
                NurseShift.nurse_id == current.id,
                NurseShift.ended_at.is_(None),
            )
        )
    ).scalar_one_or_none()
    if not shift:
        raise HTTPException(
            status_code=400,
            detail="No active shift — start a shift first",
        )

    note = HandoverNote(
        shift_id=shift.id,
        author_id=current.id,
        patient_id=payload.patient_id,
        severity=payload.severity,
        note=payload.note,
    )
    db.add(note)
    await db.commit()

    stmt = (
        select(HandoverNote)
        .where(HandoverNote.id == note.id)
        .options(
            selectinload(HandoverNote.patient),
            selectinload(HandoverNote.author),
        )
    )
    return (await db.execute(stmt)).scalar_one()
