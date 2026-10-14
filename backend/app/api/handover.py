"""
Handover notes endpoints.

Notes are written during a shift. They are collected when the shift is
handed over to another nurse.
"""

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import CurrentUser
from app.db.session import get_db
from app.models.shift import (
    HandoverNote,
    HandoverSeverity,
    NurseShift,
)
from app.models.user import User, UserRole
from app.schemas.shift import HandoverNoteCreate, HandoverNoteRead


router = APIRouter(prefix="/handover", tags=["handover"])


def _is_nurse(user: User) -> bool:
    return user.role in (UserRole.NURSE, UserRole.ADMIN, UserRole.SUPER_ADMIN)


async def _get_active_shift(db: AsyncSession, nurse_id: uuid.UUID) -> NurseShift:
    result = await db.execute(
        select(NurseShift)
        .where(NurseShift.nurse_id == nurse_id)
        .where(NurseShift.ended_at.is_(None))
    )
    shift = result.scalar_one_or_none()
    if shift is None:
        raise HTTPException(
            status_code=400,
            detail="You have no active shift. Start one first.",
        )
    return shift


# ============================================================
# GET /handover/notes — notes for current or given shift
# ============================================================
@router.get(
    "/notes",
    response_model=list[HandoverNoteRead],
    summary="List handover notes for the current shift (or a specific shift)",
)
async def list_notes(
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
    shift_id: uuid.UUID | None = Query(None, description="Specific shift; default is current"),
    severity: HandoverSeverity | None = Query(None),
    limit: int = Query(100, ge=1, le=500),
) -> list[HandoverNoteRead]:
    if not _is_nurse(current_user):
        raise HTTPException(status_code=403, detail="Not a nurse")

    if shift_id is None:
        shift = await _get_active_shift(db, current_user.id)
        shift_id = shift.id

    stmt = (
        select(HandoverNote)
        .where(HandoverNote.shift_id == shift_id)
        .order_by(HandoverNote.created_at.desc())
        .limit(limit)
    )
    if severity is not None:
        stmt = stmt.where(HandoverNote.severity == severity)

    result = await db.execute(stmt)
    return [HandoverNoteRead.model_validate(n) for n in result.scalars().all()]


# ============================================================
# POST /handover/notes — create a note
# ============================================================
@router.post(
    "/notes",
    response_model=HandoverNoteRead,
    status_code=status.HTTP_201_CREATED,
    summary="Write a handover note during your shift",
)
async def create_note(
    payload: HandoverNoteCreate,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> HandoverNoteRead:
    if not _is_nurse(current_user):
        raise HTTPException(status_code=403, detail="Not a nurse")

    shift = await _get_active_shift(db, current_user.id)

    # If a patient_id is given, validate it's a real patient
    if payload.patient_id is not None:
        patient_res = await db.execute(select(User).where(User.id == payload.patient_id))
        patient = patient_res.scalar_one_or_none()
        if patient is None or patient.role != UserRole.PATIENT:
            raise HTTPException(status_code=400, detail="Invalid patient_id")

    note = HandoverNote(
        shift_id=shift.id,
        author_id=current_user.id,
        patient_id=payload.patient_id,
        note=payload.note,
        severity=payload.severity,
    )
    db.add(note)
    await db.commit()
    await db.refresh(note)
    return HandoverNoteRead.model_validate(note)


# ============================================================
# DELETE /handover/notes/{id} — remove a note (author only, same shift)
# ============================================================
@router.delete(
    "/notes/{note_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a handover note you wrote this shift",
)
async def delete_note(
    note_id: uuid.UUID,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> None:
    if not _is_nurse(current_user):
        raise HTTPException(status_code=403, detail="Not a nurse")

    res = await db.execute(select(HandoverNote).where(HandoverNote.id == note_id))
    note = res.scalar_one_or_none()
    if note is None:
        raise HTTPException(status_code=404, detail="Note not found")
    if note.author_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the author can delete a note")

    await db.delete(note)
    await db.commit()
    return None
