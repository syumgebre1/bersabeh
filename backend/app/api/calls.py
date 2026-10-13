"""
Video call endpoints.

Role permissions:
                                Patient  Doctor  Nurse  Reception  Lab  Admin
  POST   /calls                   own     ❌      ❌      any        ❌   any
  GET    /calls                   own     own     ❌      all        ❌   all
  GET    /calls/{id}              own     own     ❌      all        ❌   all
  POST   /calls/{id}/assign       ❌      ❌      ❌      ✅         ❌   ✅
  POST   /calls/{id}/accept       ❌      own/on-duty ❌   ❌         ❌   ✅
  POST   /calls/{id}/end          own     own     ❌      ❌         ❌   ✅

Side effects:
  - accept: generates room_url, sets accepted_at, posts a system message
    to the linked thread (if any).
  - end: computes duration_seconds, sets ended_at.
"""

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import CurrentUser
from app.db.session import get_db
from app.models.call import CallStatus, VideoCall
from app.models.messaging import Message, Thread
from app.models.user import User, UserRole
from app.schemas.call import (
    CallAssign,
    CallBrief,
    CallEnd,
    CallRead,
    CallRequest,
)
from app.services.jitsi import generate_room_url
from app.services.websocket_manager import manager


router = APIRouter(prefix="/calls", tags=["calls"])


# ============================================================
# Helpers
# ============================================================
def _is_adminish(user: User) -> bool:
    return user.role in (UserRole.ADMIN, UserRole.SUPER_ADMIN)


async def _get_call_or_404(db: AsyncSession, call_id: uuid.UUID) -> VideoCall:
    result = await db.execute(select(VideoCall).where(VideoCall.id == call_id))
    c = result.scalar_one_or_none()
    if c is None:
        raise HTTPException(status_code=404, detail="Call not found")
    return c


def _can_view(user: User, c: VideoCall) -> bool:
    if _is_adminish(user):
        return True
    if user.role == UserRole.PATIENT:
        return c.patient_id == user.id
    if user.role == UserRole.DOCTOR:
        return c.assigned_to_id == user.id or c.assigned_to_id is None
    if user.role == UserRole.RECEPTION:
        return True
    return False


# ============================================================
# POST /calls — request
# ============================================================
@router.post(
    "",
    response_model=CallRead,
    status_code=status.HTTP_201_CREATED,
    summary="Request a video call",
)
async def request_call(
    payload: CallRequest,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> CallRead:
    # Determine which patient this is for.
    if current_user.role == UserRole.PATIENT:
        if payload.patient_id is not None and payload.patient_id != current_user.id:
            raise HTTPException(status_code=403, detail="Patients can only request calls for themselves")
        patient_id = current_user.id
    elif _is_adminish(current_user) or current_user.role == UserRole.RECEPTION:
        if payload.patient_id is None:
            raise HTTPException(status_code=400, detail="patient_id is required")
        patient_id = payload.patient_id
    else:
        raise HTTPException(status_code=403, detail="You cannot request video calls")

    # Verify patient exists.
    patient_result = await db.execute(select(User).where(User.id == patient_id))
    patient = patient_result.scalar_one_or_none()
    if patient is None or patient.is_deleted or patient.role != UserRole.PATIENT:
        raise HTTPException(status_code=400, detail="Invalid patient_id")

    # Verify thread_id if given.
    if payload.thread_id is not None:
        t_result = await db.execute(select(Thread).where(Thread.id == payload.thread_id))
        if t_result.scalar_one_or_none() is None:
            raise HTTPException(status_code=400, detail="Invalid thread_id")

    c = VideoCall(
        patient_id=patient_id,
        requested_by_id=current_user.id,
        thread_id=payload.thread_id,
        encounter_id=payload.encounter_id,
        status=CallStatus.REQUESTED,
        reason=payload.reason,
    )
    db.add(c)
    await db.commit()
    await db.refresh(c)
    return CallRead.model_validate(c)


# ============================================================
# GET /calls — list
# ============================================================
@router.get(
    "",
    response_model=list[CallBrief],
    summary="List video calls (role-filtered)",
)
async def list_calls(
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
    status_filter: CallStatus | None = Query(None, alias="status"),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
) -> list[CallBrief]:
    if current_user.role not in (
        UserRole.PATIENT, UserRole.DOCTOR, UserRole.RECEPTION,
        UserRole.ADMIN, UserRole.SUPER_ADMIN,
    ):
        raise HTTPException(status_code=403, detail="You cannot view video calls")

    stmt = select(VideoCall)
    if current_user.role == UserRole.PATIENT:
        stmt = stmt.where(VideoCall.patient_id == current_user.id)
    elif current_user.role == UserRole.DOCTOR:
        from sqlalchemy import or_
        stmt = stmt.where(
            or_(
                VideoCall.assigned_to_id == current_user.id,
                VideoCall.assigned_to_id.is_(None),
            )
        )
    # Reception/Admin: all.

    if status_filter is not None:
        stmt = stmt.where(VideoCall.status == status_filter)

    stmt = stmt.order_by(VideoCall.requested_at.desc()).limit(limit).offset(offset)
    result = await db.execute(stmt)
    return [CallBrief.model_validate(c) for c in result.scalars().all()]


# ============================================================
# GET /calls/{id}
# ============================================================
@router.get(
    "/{call_id}",
    response_model=CallRead,
    summary="Get one video call",
)
async def get_call(
    call_id: uuid.UUID,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> CallRead:
    c = await _get_call_or_404(db, call_id)
    if not _can_view(current_user, c):
        raise HTTPException(status_code=403, detail="Not allowed to view this call")
    return CallRead.model_validate(c)


# ============================================================
# POST /calls/{id}/assign
# ============================================================
@router.post(
    "/{call_id}/assign",
    response_model=CallRead,
    summary="Assign a doctor to a requested call (reception/admin)",
)
async def assign_call(
    call_id: uuid.UUID,
    payload: CallAssign,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> CallRead:
    if not (_is_adminish(current_user) or current_user.role == UserRole.RECEPTION):
        raise HTTPException(status_code=403, detail="Only reception/admin can assign calls")

    c = await _get_call_or_404(db, call_id)
    if c.status in (CallStatus.ENDED, CallStatus.CANCELLED):
        raise HTTPException(status_code=400, detail=f"Cannot assign a {c.status.value} call")

    doctor_result = await db.execute(select(User).where(User.id == payload.doctor_id))
    doctor = doctor_result.scalar_one_or_none()
    if doctor is None or doctor.role != UserRole.DOCTOR or doctor.is_deleted:
        raise HTTPException(status_code=400, detail="Invalid doctor_id")

    c.assigned_to_id = doctor.id
    c.status = CallStatus.ASSIGNED
    c.assigned_at = datetime.now(timezone.utc)
    c.updated_at = c.assigned_at

    await db.commit()
    await db.refresh(c)

    # Notify the doctor via WebSocket.
    await manager.send_to_user(
        doctor.id,
        {
            "type": "call_assigned",
            "call_id": str(c.id),
            "patient_id": str(c.patient_id),
        },
    )

    return CallRead.model_validate(c)


# ============================================================
# POST /calls/{id}/accept
# ============================================================
@router.post(
    "/{call_id}/accept",
    response_model=CallRead,
    summary="Accept a call (assigned doctor generates the room)",
)
async def accept_call(
    call_id: uuid.UUID,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> CallRead:
    c = await _get_call_or_404(db, call_id)

    if c.status in (CallStatus.ENDED, CallStatus.CANCELLED, CallStatus.IN_PROGRESS):
        raise HTTPException(status_code=400, detail=f"Cannot accept a {c.status.value} call")

    # Only the assigned doctor (or an on-duty unassigned doctor, or admin) can accept.
    if current_user.role == UserRole.DOCTOR:
        if c.assigned_to_id is not None and c.assigned_to_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not assigned to you")
        if c.assigned_to_id is None and not current_user.is_on_duty:
            raise HTTPException(status_code=403, detail="Only on-duty doctors can take unassigned calls")
    elif not _is_adminish(current_user):
        raise HTTPException(status_code=403, detail="Only doctors can accept calls")

    # Assign to whoever accepted (if it wasn't already).
    if c.assigned_to_id is None:
        c.assigned_to_id = current_user.id
        c.assigned_at = datetime.now(timezone.utc)

    # Generate the room URL.
    c.room_url = generate_room_url(c.id)
    c.status = CallStatus.ACCEPTED
    c.accepted_at = datetime.now(timezone.utc)
    c.updated_at = c.accepted_at

    # Post a system message to the linked thread (if any).
    if c.thread_id is not None:
        sys_msg = Message(
            thread_id=c.thread_id,
            sender_id=current_user.id,
            body=f"📹 Video call accepted. Join at {c.room_url}",
            is_system=True,
        )
        db.add(sys_msg)

    await db.commit()
    await db.refresh(c)

    # Notify the patient via WebSocket.
    await manager.send_to_user(
        c.patient_id,
        {
            "type": "call_accepted",
            "call_id": str(c.id),
            "room_url": c.room_url,
            "doctor_id": str(c.assigned_to_id),
        },
    )

    return CallRead.model_validate(c)


# ============================================================
# POST /calls/{id}/end
# ============================================================
@router.post(
    "/{call_id}/end",
    response_model=CallRead,
    summary="End a call and record duration",
)
async def end_call(
    call_id: uuid.UUID,
    payload: CallEnd,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> CallRead:
    c = await _get_call_or_404(db, call_id)

    # Only participant or admin.
    if not _is_adminish(current_user):
        if current_user.role == UserRole.PATIENT and c.patient_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not your call")
        elif current_user.role == UserRole.DOCTOR and c.assigned_to_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not your call")
        elif current_user.role not in (UserRole.PATIENT, UserRole.DOCTOR):
            raise HTTPException(status_code=403, detail="You cannot end this call")

    if c.status == CallStatus.ENDED:
        raise HTTPException(status_code=400, detail="Call already ended")
    if c.status == CallStatus.CANCELLED:
        raise HTTPException(status_code=400, detail="Call was cancelled")

    now = datetime.now(timezone.utc)
    start = c.started_at or c.accepted_at or c.requested_at
    c.duration_seconds = int((now - start).total_seconds())
    c.ended_at = now
    c.status = CallStatus.ENDED
    c.updated_at = now
    if payload.notes:
        c.notes = (c.notes or "") + ("\n" if c.notes else "") + payload.notes

    await db.commit()
    await db.refresh(c)
    return CallRead.model_validate(c)
