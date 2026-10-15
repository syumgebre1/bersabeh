"""
Medication administration — nurse schedule + administer/skip.

Design:
  - `ScheduledDose` is the unit: one row per scheduled dose.
  - Giving a dose creates a `MedicationAdministration` row AND flips
    the dose's status to ADMINISTERED.
  - Skipping writes a `MedicationAdministration` row with `skip_reason`
    AND flips status to SKIPPED.
"""

import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.deps import require_roles
from app.db.session import get_db
from app.models.medication import (
    DoseStatus,
    MedicationAdministration,
    ScheduledDose,
)
from app.models.user import User, UserRole
from app.schemas.medication_admin import (
    AdministerIn,
    ScheduledDoseOut,
    SkipIn,
)

router = APIRouter(prefix="/medications", tags=["medications"])

NURSE_ROLES = (UserRole.NURSE, UserRole.ADMIN, UserRole.SUPER_ADMIN)


def _decorate(dose: ScheduledDose) -> ScheduledDoseOut:
    out = ScheduledDoseOut.model_validate(dose)
    admin = dose.administration
    if admin:
        out.administered_at = admin.administered_at
        out.administered_by_id = admin.administered_by_id
        out.skip_reason = admin.skip_reason
        out.skip_notes = admin.skip_notes
        out.notes = admin.notes
    return out


@router.get("/schedule", response_model=list[ScheduledDoseOut])
async def get_schedule(
    window_hours: int = 12,
    patient_id: uuid.UUID | None = None,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_roles(*NURSE_ROLES)),
):
    """
    Pending + recently-completed doses within the window:
    [now - window_hours/2, now + window_hours/2].
    """
    now = datetime.now(timezone.utc)
    half = timedelta(hours=window_hours / 2)
    start = now - half
    end = now + half

    stmt = (
        select(ScheduledDose)
        .where(
            and_(
                ScheduledDose.scheduled_for >= start,
                ScheduledDose.scheduled_for <= end,
            )
        )
        .options(
            selectinload(ScheduledDose.patient),
            selectinload(ScheduledDose.administration),
        )
        .order_by(ScheduledDose.scheduled_for)
    )
    if patient_id:
        stmt = stmt.where(ScheduledDose.patient_id == patient_id)

    rows = (await db.execute(stmt)).scalars().all()
    return [_decorate(d) for d in rows]


@router.get("/patient/{patient_id}", response_model=list[ScheduledDoseOut])
async def get_patient_meds(
    patient_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_roles(*NURSE_ROLES)),
):
    stmt = (
        select(ScheduledDose)
        .where(ScheduledDose.patient_id == patient_id)
        .options(
            selectinload(ScheduledDose.patient),
            selectinload(ScheduledDose.administration),
        )
        .order_by(ScheduledDose.scheduled_for.desc())
        .limit(200)
    )
    rows = (await db.execute(stmt)).scalars().all()
    return [_decorate(d) for d in rows]


@router.post("/{dose_id}/administer", response_model=ScheduledDoseOut)
async def administer(
    dose_id: uuid.UUID,
    payload: AdministerIn,
    db: AsyncSession = Depends(get_db),
    current: User = Depends(require_roles(*NURSE_ROLES)),
):
    dose = (
        await db.execute(
            select(ScheduledDose)
            .where(ScheduledDose.id == dose_id)
            .options(
                selectinload(ScheduledDose.patient),
                selectinload(ScheduledDose.administration),
            )
        )
    ).scalar_one_or_none()
    if not dose:
        raise HTTPException(status_code=404, detail="Scheduled dose not found")
    if dose.status == DoseStatus.ADMINISTERED:
        raise HTTPException(status_code=409, detail="Already administered")
    if dose.status == DoseStatus.CANCELLED:
        raise HTTPException(status_code=409, detail="Dose was cancelled")

    dose.status = DoseStatus.ADMINISTERED
    admin = dose.administration or MedicationAdministration(dose_id=dose.id)
    admin.administered_by_id = current.id
    admin.administered_at = datetime.now(timezone.utc)
    if payload.notes:
        admin.notes = payload.notes
    if dose.administration is None:
        db.add(admin)

    await db.commit()

    # Reload to get fresh relationships
    dose = (
        await db.execute(
            select(ScheduledDose)
            .where(ScheduledDose.id == dose_id)
            .options(
                selectinload(ScheduledDose.patient),
                selectinload(ScheduledDose.administration),
            )
        )
    ).scalar_one()
    return _decorate(dose)


@router.post("/{dose_id}/skip", response_model=ScheduledDoseOut)
async def skip(
    dose_id: uuid.UUID,
    payload: SkipIn,
    db: AsyncSession = Depends(get_db),
    current: User = Depends(require_roles(*NURSE_ROLES)),
):
    dose = (
        await db.execute(
            select(ScheduledDose)
            .where(ScheduledDose.id == dose_id)
            .options(
                selectinload(ScheduledDose.patient),
                selectinload(ScheduledDose.administration),
            )
        )
    ).scalar_one_or_none()
    if not dose:
        raise HTTPException(status_code=404, detail="Scheduled dose not found")

    dose.status = DoseStatus.SKIPPED
    admin = dose.administration or MedicationAdministration(dose_id=dose.id)
    admin.administered_by_id = current.id
    admin.administered_at = datetime.now(timezone.utc)
    admin.skip_reason = payload.reason
    admin.skip_notes = payload.notes
    if dose.administration is None:
        db.add(admin)

    await db.commit()

    dose = (
        await db.execute(
            select(ScheduledDose)
            .where(ScheduledDose.id == dose_id)
            .options(
                selectinload(ScheduledDose.patient),
                selectinload(ScheduledDose.administration),
            )
        )
    ).scalar_one()
    return _decorate(dose)
