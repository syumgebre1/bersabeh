"""
Medication administration endpoints.

Role permissions:
                            Patient  Doctor  Nurse  Reception  Lab  Admin
  GET    /medications/schedule        ❌      ✅      ✅      ❌        ❌   ✅
  GET    /medications/today           ❌      ✅      ✅      ❌        ❌   ✅
  GET    /medications/patient/{pid}   own     ✅      ✅      ❌        ❌   ✅
  POST   /medications/{id}/administer ❌      ❌      ✅      ❌        ❌   ✅
  POST   /medications/{id}/skip       ❌      ❌      ✅      ❌        ❌   ✅
"""

import uuid
from datetime import datetime, time, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import CurrentUser
from app.db.session import get_db
from app.models.medication import (
    DoseStatus,
    MedicationAdministration,
    ScheduledDose,
)
from app.models.user import User, UserRole
from app.schemas.medication import (
    MedicationAdministerPayload,
    MedicationAdministrationRead,
    MedicationSkipPayload,
    ScheduledDoseBrief,
    ScheduledDoseRead,
)


router = APIRouter(prefix="/medications", tags=["medications"])


# ============================================================
# Helpers
# ============================================================
def _can_view(user: User) -> bool:
    return user.role in (UserRole.NURSE, UserRole.DOCTOR, UserRole.ADMIN, UserRole.SUPER_ADMIN)


def _can_administer(user: User) -> bool:
    return user.role in (UserRole.NURSE, UserRole.ADMIN, UserRole.SUPER_ADMIN)


async def _get_dose_or_404(db: AsyncSession, dose_id: uuid.UUID) -> ScheduledDose:
    result = await db.execute(select(ScheduledDose).where(ScheduledDose.id == dose_id))
    dose = result.scalar_one_or_none()
    if dose is None:
        raise HTTPException(status_code=404, detail="Scheduled dose not found")
    return dose


# ============================================================
# GET /medications/schedule — doses in a time window
# ============================================================
@router.get(
    "/schedule",
    response_model=list[ScheduledDoseRead],
    summary="Doses scheduled in a time window (default: now → +8h)",
)
async def get_schedule(
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
    from_time: datetime | None = Query(None),
    to_time: datetime | None = Query(None),
    status_filter: DoseStatus | None = Query(None, alias="status"),
    limit: int = Query(200, ge=1, le=500),
) -> list[ScheduledDoseRead]:
    if not _can_view(current_user):
        raise HTTPException(status_code=403, detail="Not allowed")

    now = datetime.now(timezone.utc)
    start = from_time or now
    end = to_time or (now + timedelta(hours=8))

    stmt = (
        select(ScheduledDose)
        .where(ScheduledDose.scheduled_for >= start)
        .where(ScheduledDose.scheduled_for <= end)
    )
    if status_filter is not None:
        stmt = stmt.where(ScheduledDose.status == status_filter)

    stmt = stmt.order_by(ScheduledDose.scheduled_for.asc()).limit(limit)
    result = await db.execute(stmt)
    return [ScheduledDoseRead.model_validate(d) for d in result.scalars().all()]


# ============================================================
# GET /medications/today — all doses for today
# ============================================================
@router.get(
    "/today",
    response_model=list[ScheduledDoseRead],
    summary="All doses scheduled for today (UTC)",
)
async def get_today(
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
    limit: int = Query(200, ge=1, le=500),
) -> list[ScheduledDoseRead]:
    if not _can_view(current_user):
        raise HTTPException(status_code=403, detail="Not allowed")

    now = datetime.now(timezone.utc)
    day_start = datetime.combine(now.date(), time.min, tzinfo=timezone.utc)
    day_end = day_start + timedelta(days=1)

    stmt = (
        select(ScheduledDose)
        .where(ScheduledDose.scheduled_for >= day_start)
        .where(ScheduledDose.scheduled_for < day_end)
        .order_by(ScheduledDose.scheduled_for.asc())
        .limit(limit)
    )
    result = await db.execute(stmt)
    return [ScheduledDoseRead.model_validate(d) for d in result.scalars().all()]


# ============================================================
# GET /medications/patient/{patient_id}
# ============================================================
@router.get(
    "/patient/{patient_id}",
    response_model=list[ScheduledDoseBrief],
    summary="Medication history for a patient",
)
async def get_patient_meds(
    patient_id: uuid.UUID,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
    limit: int = Query(100, ge=1, le=500),
) -> list[ScheduledDoseBrief]:
    if current_user.role == UserRole.PATIENT:
        if patient_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not your medications")
    elif not _can_view(current_user):
        raise HTTPException(status_code=403, detail="Not allowed")

    stmt = (
        select(ScheduledDose)
        .where(ScheduledDose.patient_id == patient_id)
        .order_by(ScheduledDose.scheduled_for.desc())
        .limit(limit)
    )
    result = await db.execute(stmt)
    return [ScheduledDoseBrief.model_validate(d) for d in result.scalars().all()]


# ============================================================
# POST /medications/{dose_id}/administer
# ============================================================
@router.post(
    "/{dose_id}/administer",
    response_model=MedicationAdministrationRead,
    status_code=status.HTTP_201_CREATED,
    summary="Mark a scheduled dose as administered",
)
async def administer_dose(
    dose_id: uuid.UUID,
    payload: MedicationAdministerPayload,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> MedicationAdministrationRead:
    if not _can_administer(current_user):
        raise HTTPException(status_code=403, detail="Only nurses can administer doses")

    dose = await _get_dose_or_404(db, dose_id)
    if dose.status != DoseStatus.PENDING:
        raise HTTPException(status_code=400, detail=f"Dose is already {dose.status.value}")

    admin = MedicationAdministration(
        dose_id=dose.id,
        administered_by_id=current_user.id,
        notes=payload.notes,
    )
    db.add(admin)
    dose.status = DoseStatus.ADMINISTERED

    await db.commit()
    await db.refresh(admin)
    return MedicationAdministrationRead.model_validate(admin)


# ============================================================
# POST /medications/{dose_id}/skip
# ============================================================
@router.post(
    "/{dose_id}/skip",
    response_model=MedicationAdministrationRead,
    status_code=status.HTTP_201_CREATED,
    summary="Mark a scheduled dose as skipped (with reason)",
)
async def skip_dose(
    dose_id: uuid.UUID,
    payload: MedicationSkipPayload,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> MedicationAdministrationRead:
    if not _can_administer(current_user):
        raise HTTPException(status_code=403, detail="Only nurses can skip doses")

    dose = await _get_dose_or_404(db, dose_id)
    if dose.status != DoseStatus.PENDING:
        raise HTTPException(status_code=400, detail=f"Dose is already {dose.status.value}")

    admin = MedicationAdministration(
        dose_id=dose.id,
        administered_by_id=current_user.id,
        skip_reason=payload.skip_reason,
        skip_notes=payload.skip_notes,
    )
    db.add(admin)
    dose.status = DoseStatus.SKIPPED

    await db.commit()
    await db.refresh(admin)
    return MedicationAdministrationRead.model_validate(admin)
