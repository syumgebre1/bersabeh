"""
Appointment endpoints.

Role permissions matrix:

                          Patient  Doctor  Nurse  Reception  Lab  Admin
  POST   /appointments       ✅(self) ❌    ❌      ✅         ❌    ✅
  GET    /appointments       own     own    read   all        ❌    all
  GET    /appointments/today ❌      own    read   all        ❌    all
  GET    /appointments/{id}  own     own    read   all        ❌    all
  PATCH  /appointments/{id}  own(pre) ❌    ❌      ✅         ❌    ✅
  POST   /appointments/{id}/cancel  own  ❌   ❌   ✅         ❌    ✅
  POST   /appointments/{id}/check-in ❌ ❌   ✅      ✅         ❌    ✅
  POST   /appointments/{id}/complete ❌ own  ❌      ❌         ❌    ✅
"""

import uuid
from datetime import datetime, time, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import CurrentUser
from app.db.session import get_db
from app.models.appointment import Appointment, AppointmentStatus
from app.models.user import User, UserRole
from app.schemas.appointment import (
    AppointmentBrief,
    AppointmentCancel,
    AppointmentCreate,
    AppointmentRead,
    AppointmentUpdate,
)


router = APIRouter(prefix="/appointments", tags=["appointments"])


# ============================================================
# Helpers
# ============================================================
def _is_adminish(user: User) -> bool:
    return user.role in (UserRole.ADMIN, UserRole.SUPER_ADMIN)


def _is_staff(user: User) -> bool:
    return user.role in (
        UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.DOCTOR,
        UserRole.NURSE, UserRole.RECEPTION, UserRole.LAB,
    )


async def _get_appointment_or_404(db: AsyncSession, appointment_id: uuid.UUID) -> Appointment:
    result = await db.execute(select(Appointment).where(Appointment.id == appointment_id))
    appt = result.scalar_one_or_none()
    if appt is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found")
    return appt


def _can_view(user: User, appt: Appointment) -> bool:
    if _is_staff(user) and user.role != UserRole.LAB:
        return True
    if user.role == UserRole.PATIENT and appt.patient_id == user.id:
        return True
    if user.role == UserRole.DOCTOR and appt.doctor_id == user.id:
        return True
    return False


# ============================================================
# POST /appointments — book
# ============================================================
@router.post(
    "",
    response_model=AppointmentRead,
    status_code=status.HTTP_201_CREATED,
    summary="Book an appointment",
)
async def create_appointment(
    payload: AppointmentCreate,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> AppointmentRead:
    # Determine which patient the appointment is for.
    if current_user.role == UserRole.PATIENT:
        # Patients can only book for themselves.
        if payload.patient_id is not None and payload.patient_id != current_user.id:
            raise HTTPException(status_code=403, detail="Patients can only book for themselves")
        patient_id = current_user.id
    elif _is_adminish(current_user) or current_user.role == UserRole.RECEPTION:
        # Reception/admin must specify a patient.
        if payload.patient_id is None:
            raise HTTPException(status_code=400, detail="patient_id is required")
        patient_id = payload.patient_id
    else:
        raise HTTPException(status_code=403, detail="You cannot book appointments")

    # Verify the doctor exists and has role=doctor.
    doctor_result = await db.execute(select(User).where(User.id == payload.doctor_id))
    doctor = doctor_result.scalar_one_or_none()
    if doctor is None or doctor.role != UserRole.DOCTOR:
        raise HTTPException(status_code=400, detail="Invalid doctor_id")

    # Verify the patient exists and is a patient (or allow staff-to-staff? no, keep simple).
    patient_result = await db.execute(select(User).where(User.id == patient_id))
    patient = patient_result.scalar_one_or_none()
    if patient is None or patient.is_deleted:
        raise HTTPException(status_code=400, detail="Invalid patient_id")

    # Simple conflict check: same doctor, overlapping window.
    start = payload.scheduled_at
    end = start
    existing = await db.execute(
        select(Appointment).where(
            and_(
                Appointment.doctor_id == payload.doctor_id,
                Appointment.status.in_([
                    AppointmentStatus.SCHEDULED,
                    AppointmentStatus.CONFIRMED,
                    AppointmentStatus.CHECKED_IN,
                ]),
                Appointment.scheduled_at == start,
            )
        )
    )
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Doctor already has an appointment at this time",
        )

    appt = Appointment(
        patient_id=patient_id,
        doctor_id=payload.doctor_id,
        created_by_id=current_user.id,
        scheduled_at=payload.scheduled_at,
        duration_minutes=payload.duration_minutes,
        reason=payload.reason,
        status=AppointmentStatus.SCHEDULED,
    )
    db.add(appt)
    await db.commit()
    await db.refresh(appt)
    return AppointmentRead.model_validate(appt)


# ============================================================
# GET /appointments — list (filtered)
# ============================================================
@router.get(
    "",
    response_model=list[AppointmentRead],
    summary="List appointments (role-filtered)",
)
async def list_appointments(
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
    status_filter: AppointmentStatus | None = Query(None, alias="status"),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
) -> list[AppointmentRead]:
    stmt = select(Appointment)

    # Role filter.
    if current_user.role == UserRole.PATIENT:
        stmt = stmt.where(Appointment.patient_id == current_user.id)
    elif current_user.role == UserRole.DOCTOR:
        stmt = stmt.where(Appointment.doctor_id == current_user.id)
    elif current_user.role == UserRole.LAB:
        raise HTTPException(status_code=403, detail="Lab staff cannot view appointments")
    # Nurse, Reception, Admin, SuperAdmin: see all.

    if status_filter is not None:
        stmt = stmt.where(Appointment.status == status_filter)

    stmt = stmt.order_by(Appointment.scheduled_at.desc()).limit(limit).offset(offset)
    result = await db.execute(stmt)
    return [AppointmentRead.model_validate(a) for a in result.scalars().all()]


# ============================================================
# GET /appointments/today — today's schedule
# ============================================================
@router.get(
    "/today",
    response_model=list[AppointmentRead],
    summary="Today's appointments",
)
async def today_appointments(
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> list[AppointmentRead]:
    # Compute the UTC bounds of "today".
    now = datetime.now(timezone.utc)
    day_start = datetime.combine(now.date(), time.min, tzinfo=timezone.utc)
    day_end = datetime.combine(now.date(), time.max, tzinfo=timezone.utc)

    stmt = select(Appointment).where(
        Appointment.scheduled_at >= day_start,
        Appointment.scheduled_at <= day_end,
    )

    if current_user.role == UserRole.PATIENT:
        stmt = stmt.where(Appointment.patient_id == current_user.id)
    elif current_user.role == UserRole.DOCTOR:
        stmt = stmt.where(Appointment.doctor_id == current_user.id)
    elif current_user.role == UserRole.LAB:
        raise HTTPException(status_code=403, detail="Lab staff cannot view appointments")

    stmt = stmt.order_by(Appointment.scheduled_at.asc())
    result = await db.execute(stmt)
    return [AppointmentRead.model_validate(a) for a in result.scalars().all()]


# ============================================================
# GET /appointments/{id}
# ============================================================
@router.get(
    "/{appointment_id}",
    response_model=AppointmentRead,
    summary="Get one appointment",
)
async def get_appointment(
    appointment_id: uuid.UUID,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> AppointmentRead:
    appt = await _get_appointment_or_404(db, appointment_id)
    if not _can_view(current_user, appt):
        raise HTTPException(status_code=403, detail="Not allowed to view this appointment")
    return AppointmentRead.model_validate(appt)


# ============================================================
# PATCH /appointments/{id} — reschedule / edit
# ============================================================
@router.patch(
    "/{appointment_id}",
    response_model=AppointmentRead,
    summary="Edit an appointment (reschedule, change reason/notes)",
)
async def update_appointment(
    appointment_id: uuid.UUID,
    payload: AppointmentUpdate,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> AppointmentRead:
    appt = await _get_appointment_or_404(db, appointment_id)

    # Permission: patient own (only before check-in), reception/admin any.
    if current_user.role == UserRole.PATIENT:
        if appt.patient_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not your appointment")
        if appt.status in (AppointmentStatus.CHECKED_IN, AppointmentStatus.COMPLETED):
            raise HTTPException(status_code=400, detail="Cannot edit an already started visit")
    elif not (_is_adminish(current_user) or current_user.role == UserRole.RECEPTION):
        raise HTTPException(status_code=403, detail="You cannot edit this appointment")

    data = payload.model_dump(exclude_unset=True)
    for key, value in data.items():
        setattr(appt, key, value)
    appt.updated_at = datetime.now(timezone.utc)

    await db.commit()
    await db.refresh(appt)
    return AppointmentRead.model_validate(appt)


# ============================================================
# POST /appointments/{id}/cancel
# ============================================================
@router.post(
    "/{appointment_id}/cancel",
    response_model=AppointmentRead,
    summary="Cancel an appointment",
)
async def cancel_appointment(
    appointment_id: uuid.UUID,
    payload: AppointmentCancel,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> AppointmentRead:
    appt = await _get_appointment_or_404(db, appointment_id)

    if current_user.role == UserRole.PATIENT and appt.patient_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your appointment")
    elif not (_is_adminish(current_user) or current_user.role in (UserRole.RECEPTION, UserRole.PATIENT)):
        raise HTTPException(status_code=403, detail="You cannot cancel this appointment")

    if appt.status in (AppointmentStatus.COMPLETED, AppointmentStatus.CANCELLED):
        raise HTTPException(status_code=400, detail=f"Cannot cancel a {appt.status.value} appointment")

    appt.status = AppointmentStatus.CANCELLED
    appt.cancellation_reason = payload.reason
    appt.cancelled_at = datetime.now(timezone.utc)
    appt.updated_at = appt.cancelled_at

    await db.commit()
    await db.refresh(appt)
    return AppointmentRead.model_validate(appt)


# ============================================================
# POST /appointments/{id}/check-in
# ============================================================
@router.post(
    "/{appointment_id}/check-in",
    response_model=AppointmentRead,
    summary="Mark patient as arrived (reception)",
)
async def check_in_appointment(
    appointment_id: uuid.UUID,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> AppointmentRead:
    if not (_is_adminish(current_user) or current_user.role == UserRole.RECEPTION):
        raise HTTPException(status_code=403, detail="Only reception/admin can check in patients")

    appt = await _get_appointment_or_404(db, appointment_id)
    if appt.status in (AppointmentStatus.COMPLETED, AppointmentStatus.CANCELLED, AppointmentStatus.NO_SHOW):
        raise HTTPException(status_code=400, detail=f"Cannot check in a {appt.status.value} appointment")

    appt.status = AppointmentStatus.CHECKED_IN
    appt.checked_in_at = datetime.now(timezone.utc)
    appt.updated_at = appt.checked_in_at

    await db.commit()
    await db.refresh(appt)
    return AppointmentRead.model_validate(appt)


# ============================================================
# POST /appointments/{id}/complete
# ============================================================
@router.post(
    "/{appointment_id}/complete",
    response_model=AppointmentRead,
    summary="Mark appointment as completed (doctor)",
)
async def complete_appointment(
    appointment_id: uuid.UUID,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> AppointmentRead:
    appt = await _get_appointment_or_404(db, appointment_id)

    # Only the assigned doctor or admin can complete.
    if current_user.role == UserRole.DOCTOR:
        if appt.doctor_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not your appointment")
    elif not _is_adminish(current_user):
        raise HTTPException(status_code=403, detail="Only the assigned doctor can complete")

    if appt.status != AppointmentStatus.CHECKED_IN:
        raise HTTPException(
            status_code=400,
            detail=f"Only a checked-in appointment can be completed (current: {appt.status.value})",
        )

    appt.status = AppointmentStatus.COMPLETED
    appt.completed_at = datetime.now(timezone.utc)
    appt.updated_at = appt.completed_at

    await db.commit()
    await db.refresh(appt)
    return AppointmentRead.model_validate(appt)
