"""
Nurse shift endpoints.

Role permissions:
                            Patient  Doctor  Nurse  Reception  Lab  Admin
  GET    /shifts/current              ❌      ✅      ✅      ❌        ❌   ✅
  POST   /shifts/start                ❌      ❌      ✅      ❌        ❌   ✅
  POST   /shifts/end                  ❌      ❌      ✅      ❌        ❌   ✅
  GET    /shifts/me                   ❌      ✅      ✅      ❌        ❌   ✅
  POST   /shifts/handover             ❌      ❌      ✅      ❌        ❌   ✅
  POST   /shifts/handover/{id}/acknowledge
                                      ❌      ❌      ✅      ❌        ❌   ✅
  GET    /shifts/handover/pending     ❌      ❌      ✅      ❌        ❌   ✅
"""

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import CurrentUser
from app.db.session import get_db
from app.models.shift import (
    HandoverStatus,
    NurseShift,
    ShiftHandover,
)
from app.models.user import User, UserRole
from app.schemas.shift import (
    NurseShiftRead,
    ShiftEndPayload,
    ShiftHandoverAcknowledge,
    ShiftHandoverCreate,
    ShiftHandoverRead,
    ShiftStartPayload,
)


router = APIRouter(prefix="/shifts", tags=["shifts"])


# ============================================================
# Helpers
# ============================================================
def _is_nurse(user: User) -> bool:
    return user.role in (UserRole.NURSE, UserRole.ADMIN, UserRole.SUPER_ADMIN)


async def _get_active_shift(db: AsyncSession, nurse_id: uuid.UUID) -> NurseShift | None:
    result = await db.execute(
        select(NurseShift)
        .where(NurseShift.nurse_id == nurse_id)
        .where(NurseShift.ended_at.is_(None))
    )
    return result.scalar_one_or_none()


# ============================================================
# GET /shifts/current — active shift
# ============================================================
@router.get(
    "/current",
    response_model=NurseShiftRead | None,
    summary="Current active shift for the logged-in nurse",
)
async def get_current_shift(
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> NurseShiftRead | None:
    if not _is_nurse(current_user):
        raise HTTPException(status_code=403, detail="Not a nurse")

    shift = await _get_active_shift(db, current_user.id)
    if shift is None:
        return None
    return NurseShiftRead.model_validate(shift)


# ============================================================
# POST /shifts/start
# ============================================================
@router.post(
    "/start",
    response_model=NurseShiftRead,
    status_code=status.HTTP_201_CREATED,
    summary="Start a new nurse shift",
)
async def start_shift(
    payload: ShiftStartPayload,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> NurseShiftRead:
    if not _is_nurse(current_user):
        raise HTTPException(status_code=403, detail="Not a nurse")

    existing = await _get_active_shift(db, current_user.id)
    if existing is not None:
        raise HTTPException(status_code=400, detail="You already have an active shift")

    shift = NurseShift(
        nurse_id=current_user.id,
        ward=payload.ward,
    )
    db.add(shift)
    await db.commit()
    await db.refresh(shift)
    return NurseShiftRead.model_validate(shift)


# ============================================================
# POST /shifts/end
# ============================================================
@router.post(
    "/end",
    response_model=NurseShiftRead,
    summary="End the current shift",
)
async def end_shift(
    payload: ShiftEndPayload,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> NurseShiftRead:
    if not _is_nurse(current_user):
        raise HTTPException(status_code=403, detail="Not a nurse")

    shift = await _get_active_shift(db, current_user.id)
    if shift is None:
        raise HTTPException(status_code=400, detail="No active shift")

    shift.ended_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(shift)
    return NurseShiftRead.model_validate(shift)


# ============================================================
# POST /shifts/handover — sign handover
# ============================================================
@router.post(
    "/handover",
    response_model=ShiftHandoverRead,
    status_code=status.HTTP_201_CREATED,
    summary="Hand over the current shift to another nurse",
)
async def hand_over(
    payload: ShiftHandoverCreate,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> ShiftHandoverRead:
    if not _is_nurse(current_user):
        raise HTTPException(status_code=403, detail="Not a nurse")

    shift = await _get_active_shift(db, current_user.id)
    if shift is None:
        raise HTTPException(status_code=400, detail="No active shift")

    # Optional: validate to_nurse_id is a nurse
    if payload.to_nurse_id is not None:
        nurse_res = await db.execute(select(User).where(User.id == payload.to_nurse_id))
        nurse = nurse_res.scalar_one_or_none()
        if nurse is None or nurse.role != UserRole.NURSE:
            raise HTTPException(status_code=400, detail="to_nurse_id must be a nurse")

    # Check for existing handover on this shift
    existing_res = await db.execute(
        select(ShiftHandover).where(ShiftHandover.shift_id == shift.id)
    )
    if existing_res.scalar_one_or_none() is not None:
        raise HTTPException(status_code=400, detail="Shift already handed over")

    handover = ShiftHandover(
        shift_id=shift.id,
        from_nurse_id=current_user.id,
        to_nurse_id=payload.to_nurse_id,
        status=HandoverStatus.PENDING,
        notes=payload.notes,
    )
    db.add(handover)
    await db.commit()
    await db.refresh(handover)
    return ShiftHandoverRead.model_validate(handover)


# ============================================================
# POST /shifts/handover/{id}/acknowledge
# ============================================================
@router.post(
    "/handover/{handover_id}/acknowledge",
    response_model=ShiftHandoverRead,
    summary="Receiving nurse acknowledges a handover",
)
async def acknowledge_handover(
    handover_id: uuid.UUID,
    payload: ShiftHandoverAcknowledge,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> ShiftHandoverRead:
    if not _is_nurse(current_user):
        raise HTTPException(status_code=403, detail="Not a nurse")

    res = await db.execute(select(ShiftHandover).where(ShiftHandover.id == handover_id))
    handover = res.scalar_one_or_none()
    if handover is None:
        raise HTTPException(status_code=404, detail="Handover not found")

    if handover.status == HandoverStatus.ACKNOWLEDGED:
        raise HTTPException(status_code=400, detail="Already acknowledged")

    # Optionally: enforce that only the target nurse can acknowledge.
    # For now, allow any nurse (reception/admin can step in).
    handover.status = HandoverStatus.ACKNOWLEDGED
    handover.acknowledged_at = datetime.now(timezone.utc)
    if handover.to_nurse_id is None:
        handover.to_nurse_id = current_user.id

    await db.commit()
    await db.refresh(handover)
    return ShiftHandoverRead.model_validate(handover)


# ============================================================
# GET /shifts/handover/pending — handovers awaiting acknowledgment
# ============================================================
@router.get(
    "/handover/pending",
    response_model=list[ShiftHandoverRead],
    summary="Pending handovers to acknowledge",
)
async def pending_handovers(
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> list[ShiftHandoverRead]:
    if not _is_nurse(current_user):
        raise HTTPException(status_code=403, detail="Not a nurse")

    # Show:
    #   - handovers targeted at this nurse
    #   - unassigned handovers (to_nurse_id is None)
    stmt = (
        select(ShiftHandover)
        .where(ShiftHandover.status == HandoverStatus.PENDING)
        .where(
            (ShiftHandover.to_nurse_id == current_user.id)
            | (ShiftHandover.to_nurse_id.is_(None))
        )
        .order_by(ShiftHandover.handed_over_at.desc())
    )
    result = await db.execute(stmt)
    return [ShiftHandoverRead.model_validate(h) for h in result.scalars().all()]
