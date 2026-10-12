"""
Encounter endpoints.

An encounter is created when a doctor begins seeing a patient — either
from a checked-in appointment (most common) or as a walk-in with no
appointment (patient_id provided directly).

Role permissions matrix:

                                Patient  Doctor    Nurse  Reception  Lab  Admin
  POST   /encounters              ❌      ✅        ❌      ❌        ❌   ✅
  GET    /encounters              own     own       all    all       ❌   all
  GET    /encounters/{id}         own     own       all    all       ❌   all
  PATCH  /encounters/{id}         ❌      own       ❌      ❌        ❌   ✅
  POST   /encounters/{id}/close   ❌      own       ❌      ❌        ❌   ✅
"""

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import CurrentUser
from app.db.session import get_db
from app.models.appointment import Appointment, AppointmentStatus
from app.models.encounter import Encounter, EncounterStatus
from app.models.user import User, UserRole
from app.schemas.encounter import (
    EncounterCreate,
    EncounterRead,
    EncounterUpdate,
)


router = APIRouter(prefix="/encounters", tags=["encounters"])


# ============================================================
# Helpers
# ============================================================
def _is_adminish(user: User) -> bool:
    return user.role in (UserRole.ADMIN, UserRole.SUPER_ADMIN)


async def _get_encounter_or_404(db: AsyncSession, encounter_id: uuid.UUID) -> Encounter:
    result = await db.execute(select(Encounter).where(Encounter.id == encounter_id))
    enc = result.scalar_one_or_none()
    if enc is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Encounter not found")
    return enc


def _can_view(user: User, enc: Encounter) -> bool:
    if user.role == UserRole.PATIENT:
        return enc.patient_id == user.id
    if user.role == UserRole.DOCTOR:
        return enc.doctor_id == user.id
    if user.role in (UserRole.NURSE, UserRole.RECEPTION, UserRole.ADMIN, UserRole.SUPER_ADMIN):
        return True
    return False


def _can_edit(user: User, enc: Encounter) -> bool:
    if _is_adminish(user):
        return True
    if user.role == UserRole.DOCTOR and enc.doctor_id == user.id:
        return True
    return False


# ============================================================
# POST /encounters — create
# ============================================================
@router.post(
    "",
    response_model=EncounterRead,
    status_code=status.HTTP_201_CREATED,
    summary="Start an encounter (doctor, from appointment or walk-in)",
)
async def create_encounter(
    payload: EncounterCreate,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> EncounterRead:
    # Only doctors and admins can start encounters.
    if current_user.role != UserRole.DOCTOR and not _is_adminish(current_user):
        raise HTTPException(status_code=403, detail="Only doctors can start encounters")

    patient_id: uuid.UUID
    appointment_id: uuid.UUID | None = None

    if payload.appointment_id is not None:
        # Create from an appointment.
        appt_result = await db.execute(
            select(Appointment).where(Appointment.id == payload.appointment_id)
        )
        appt = appt_result.scalar_one_or_none()
        if appt is None:
            raise HTTPException(status_code=404, detail="Appointment not found")

        # Only the assigned doctor (or admin) can open the encounter.
        if current_user.role == UserRole.DOCTOR and appt.doctor_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not your appointment")

        # The appointment must be checked_in (or already completed, for late edits).
        if appt.status not in (AppointmentStatus.CHECKED_IN, AppointmentStatus.COMPLETED):
            raise HTTPException(
                status_code=400,
                detail=f"Appointment must be checked_in first (current: {appt.status.value})",
            )

        # One encounter per appointment.
        existing = await db.execute(
            select(Encounter).where(Encounter.appointment_id == appt.id)
        )
        if existing.scalar_one_or_none() is not None:
            raise HTTPException(status_code=409, detail="Encounter already exists for this appointment")

        patient_id = appt.patient_id
        appointment_id = appt.id
    else:
        # Walk-in — patient_id is required.
        if payload.patient_id is None:
            raise HTTPException(
                status_code=400,
                detail="Either appointment_id or patient_id is required",
            )

        # Verify patient exists.
        patient_result = await db.execute(select(User).where(User.id == payload.patient_id))
        patient = patient_result.scalar_one_or_none()
        if patient is None or patient.is_deleted or patient.role != UserRole.PATIENT:
            raise HTTPException(status_code=400, detail="Invalid patient_id")

        patient_id = payload.patient_id

    enc = Encounter(
        patient_id=patient_id,
        doctor_id=current_user.id,
        created_by_id=current_user.id,
        appointment_id=appointment_id,
        type=payload.type,
        chief_complaint=payload.chief_complaint,
        notes=payload.notes,
        status=EncounterStatus.OPEN,
    )
    db.add(enc)

    # If we came from an appointment, mark it completed.
    if appointment_id is not None:
        appt.completed_at = datetime.now(timezone.utc)
        appt.updated_at = appt.completed_at
        appt.status = AppointmentStatus.COMPLETED

    await db.commit()
    await db.refresh(enc)
    return EncounterRead.model_validate(enc)


# ============================================================
# GET /encounters — list
# ============================================================
@router.get(
    "",
    response_model=list[EncounterRead],
    summary="List encounters (role-filtered)",
)
async def list_encounters(
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
    status_filter: EncounterStatus | None = Query(None, alias="status"),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
) -> list[EncounterRead]:
    if current_user.role == UserRole.LAB:
        raise HTTPException(status_code=403, detail="Lab staff cannot view encounters")

    stmt = select(Encounter)
    if current_user.role == UserRole.PATIENT:
        stmt = stmt.where(Encounter.patient_id == current_user.id)
    elif current_user.role == UserRole.DOCTOR:
        stmt = stmt.where(Encounter.doctor_id == current_user.id)
    # Nurse / Reception / Admin: all.

    if status_filter is not None:
        stmt = stmt.where(Encounter.status == status_filter)

    stmt = stmt.order_by(Encounter.started_at.desc()).limit(limit).offset(offset)
    result = await db.execute(stmt)
    return [EncounterRead.model_validate(e) for e in result.scalars().all()]


# ============================================================
# GET /encounters/{id}
# ============================================================
@router.get(
    "/{encounter_id}",
    response_model=EncounterRead,
    summary="Get one encounter",
)
async def get_encounter(
    encounter_id: uuid.UUID,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> EncounterRead:
    enc = await _get_encounter_or_404(db, encounter_id)
    if not _can_view(current_user, enc):
        raise HTTPException(status_code=403, detail="Not allowed to view this encounter")
    return EncounterRead.model_validate(enc)


# ============================================================
# PATCH /encounters/{id}
# ============================================================
@router.patch(
    "/{encounter_id}",
    response_model=EncounterRead,
    summary="Update notes / close encounter (assigned doctor)",
)
async def update_encounter(
    encounter_id: uuid.UUID,
    payload: EncounterUpdate,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> EncounterRead:
    enc = await _get_encounter_or_404(db, encounter_id)
    if not _can_edit(current_user, enc):
        raise HTTPException(status_code=403, detail="Only the assigned doctor can edit this encounter")

    data = payload.model_dump(exclude_unset=True)

    # If transitioning to closed, set ended_at.
    if data.get("status") == EncounterStatus.CLOSED and enc.status != EncounterStatus.CLOSED:
        enc.ended_at = datetime.now(timezone.utc)

    for key, value in data.items():
        setattr(enc, key, value)
    enc.updated_at = datetime.now(timezone.utc)

    await db.commit()
    await db.refresh(enc)
    return EncounterRead.model_validate(enc)


# ============================================================
# POST /encounters/{id}/close
# ============================================================
@router.post(
    "/{encounter_id}/close",
    response_model=EncounterRead,
    summary="Close an encounter (convenience endpoint)",
)
async def close_encounter(
    encounter_id: uuid.UUID,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> EncounterRead:
    enc = await _get_encounter_or_404(db, encounter_id)
    if not _can_edit(current_user, enc):
        raise HTTPException(status_code=403, detail="Only the assigned doctor can close this encounter")

    if enc.status == EncounterStatus.CLOSED:
        raise HTTPException(status_code=400, detail="Encounter is already closed")

    enc.status = EncounterStatus.CLOSED
    enc.ended_at = datetime.now(timezone.utc)
    enc.updated_at = enc.ended_at

    await db.commit()
    await db.refresh(enc)
    return EncounterRead.model_validate(enc)
