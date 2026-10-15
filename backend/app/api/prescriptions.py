"""
Prescription endpoints.

Role permissions:
                            Patient  Doctor    Nurse  Reception  Lab  Admin
  POST   /prescriptions       ❌      ✅        ❌      ❌        ❌   ✅
  GET    /prescriptions       own     own       read   read      ❌   all
  GET    /prescriptions/{id}  own     own       read   read      ❌   all
  PATCH  /prescriptions/{id}  ❌      own       ❌      ❌        ❌   ✅
  POST   /prescriptions/{id}/cancel ❌ own      ❌      ❌        ❌   ✅
  GET    /prescriptions/{id}/pdf    own own     read   read      ❌   all
"""

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import CurrentUser
from app.db.session import get_db
from app.models.medication import MedicationAdministration
from datetime import datetime, timedelta, timezone

from app.models.encounter import Encounter
from app.models.prescription import (
    Prescription,
    PrescriptionItem,
    PrescriptionStatus,
)
from app.models.user import User, UserRole
from app.schemas.prescription import (
    PrescriptionBrief,
    PrescriptionCreate,
    PrescriptionRead,
    PrescriptionUpdate,
)
from app.core.pdf_translations import get_medical_translations
from app.services.medication_scheduler import (
    cancel_prescription_doses,
    schedule_prescription,
)
from app.services.pdf import render_prescription_pdf


router = APIRouter(prefix="/prescriptions", tags=["prescriptions"])


# ============================================================
# Helpers
# ============================================================
def _is_adminish(user: User) -> bool:
    return user.role in (UserRole.ADMIN, UserRole.SUPER_ADMIN)


async def _get_prescription_or_404(db: AsyncSession, pid: uuid.UUID) -> Prescription:
    result = await db.execute(select(Prescription).where(Prescription.id == pid))
    p = result.scalar_one_or_none()
    if p is None:
        raise HTTPException(status_code=404, detail="Prescription not found")
    return p


def _can_view(user: User, p: Prescription) -> bool:
    if user.role == UserRole.PATIENT:
        return p.patient_id == user.id
    if user.role == UserRole.DOCTOR:
        return p.doctor_id == user.id
    if user.role in (UserRole.NURSE, UserRole.RECEPTION, UserRole.ADMIN, UserRole.SUPER_ADMIN):
        return True
    return False


def _can_edit(user: User, p: Prescription) -> bool:
    if _is_adminish(user):
        return True
    return user.role == UserRole.DOCTOR and p.doctor_id == user.id


# ============================================================
# POST /prescriptions
# ============================================================
@router.post(
    "",
    response_model=PrescriptionRead,
    status_code=status.HTTP_201_CREATED,
    summary="Write a prescription (doctor)",
)
async def create_prescription(
    payload: PrescriptionCreate,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> PrescriptionRead:
    if current_user.role != UserRole.DOCTOR and not _is_adminish(current_user):
        raise HTTPException(status_code=403, detail="Only doctors can write prescriptions")

    # Verify the encounter exists and this doctor owns it (unless admin).
    enc_result = await db.execute(select(Encounter).where(Encounter.id == payload.encounter_id))
    enc = enc_result.scalar_one_or_none()
    if enc is None:
        raise HTTPException(status_code=404, detail="Encounter not found")
    if current_user.role == UserRole.DOCTOR and enc.doctor_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your encounter")

    p = Prescription(
        encounter_id=enc.id,
        patient_id=enc.patient_id,
        doctor_id=enc.doctor_id,
        notes=payload.notes,
        follow_up_date=payload.follow_up_date,
        status=PrescriptionStatus.ACTIVE,
        created_by_id=current_user.id,
    )
    db.add(p)
    await db.flush()   # get p.id

    for i, item in enumerate(payload.items):
        db.add(PrescriptionItem(
            prescription_id=p.id,
            medication_name=item.medication_name,
            dose=item.dose,
            frequency=item.frequency,
            duration_days=item.duration_days,
            instructions=item.instructions,
            sort_order=i,
        ))

    await db.flush()

    # Auto-schedule doses (Decision 2 hybrid)
    await schedule_prescription(db, p)

    await db.commit()
    await db.refresh(p)
    return PrescriptionRead.model_validate(p)


# ============================================================
# GET /prescriptions
# ============================================================
@router.get(
    "",
    response_model=list[PrescriptionBrief],
    summary="List prescriptions (role-filtered)",
)
async def list_prescriptions(
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
    status_filter: PrescriptionStatus | None = Query(None, alias="status"),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
) -> list[PrescriptionBrief]:
    if current_user.role == UserRole.LAB:
        raise HTTPException(status_code=403, detail="Lab staff cannot view prescriptions")

    stmt = select(Prescription).options(selectinload(Prescription.items))
    if current_user.role == UserRole.PATIENT:
        stmt = stmt.where(Prescription.patient_id == current_user.id)
    elif current_user.role == UserRole.DOCTOR:
        stmt = stmt.where(Prescription.doctor_id == current_user.id)
    # Nurse, Reception, Admin: all.

    if status_filter is not None:
        stmt = stmt.where(Prescription.status == status_filter)

    stmt = stmt.order_by(Prescription.created_at.desc()).limit(limit).offset(offset)
    result = await db.execute(stmt)
    return [PrescriptionBrief.model_validate(p) for p in result.scalars().all()]


# ============================================================
# GET /prescriptions/{id}
# ============================================================
@router.get(
    "/{prescription_id}",
    response_model=PrescriptionRead,
    summary="Get a prescription",
)
async def get_prescription(
    prescription_id: uuid.UUID,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> PrescriptionRead:
    p = await _get_prescription_or_404(db, prescription_id)
    if not _can_view(current_user, p):
        raise HTTPException(status_code=403, detail="Not allowed to view this prescription")
    return PrescriptionRead.model_validate(p)


# ============================================================
# PATCH /prescriptions/{id}
# ============================================================
@router.patch(
    "/{prescription_id}",
    response_model=PrescriptionRead,
    summary="Update status/notes/follow-up (doctor)",
)
async def update_prescription(
    prescription_id: uuid.UUID,
    payload: PrescriptionUpdate,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> PrescriptionRead:
    p = await _get_prescription_or_404(db, prescription_id)
    if not _can_edit(current_user, p):
        raise HTTPException(status_code=403, detail="Only the prescriber can edit this prescription")

    data = payload.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(p, k, v)
    p.updated_at = datetime.now(timezone.utc)

    await db.commit()
    await db.refresh(p)
    return PrescriptionRead.model_validate(p)


# ============================================================
# POST /prescriptions/{id}/cancel
# ============================================================
@router.post(
    "/{prescription_id}/cancel",
    response_model=PrescriptionRead,
    summary="Cancel a prescription (doctor)",
)
async def cancel_prescription(
    prescription_id: uuid.UUID,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> PrescriptionRead:
    p = await _get_prescription_or_404(db, prescription_id)
    if not _can_edit(current_user, p):
        raise HTTPException(status_code=403, detail="Only the prescriber can cancel")

    if p.status == PrescriptionStatus.CANCELLED:
        raise HTTPException(status_code=400, detail="Prescription is already cancelled")

    p.status = PrescriptionStatus.CANCELLED
    p.updated_at = datetime.now(timezone.utc)

    # Cancel all pending doses for this prescription
    await cancel_prescription_doses(db, p)

    await db.commit()
    await db.refresh(p)
    return PrescriptionRead.model_validate(p)


# ============================================================
# GET /prescriptions/{id}/pdf
# ============================================================
@router.get(
    "/{prescription_id}/pdf",
    summary="Download prescription as PDF",
    response_class=Response,
)
async def download_prescription_pdf(
    prescription_id: uuid.UUID,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
    locale: str = Query("en", description="PDF language: en | am | ti"),
):
    p = await _get_prescription_or_404(db, prescription_id)
    if not _can_view(current_user, p):
        raise HTTPException(status_code=403, detail="Not allowed to view this prescription")

    # Translate medical values (frequency, instructions) for the PDF locale
    med_map = get_medical_translations(locale)

    def _med(v: str | None) -> str | None:
        if not v:
            return v
        return med_map.get(v, v)

    pdf_bytes = render_prescription_pdf(
        {
            "ref_id": str(p.id),
            "patient": {
                "full_name": p.patient.full_name if p.patient else "—",
                "phone": p.patient.phone if p.patient else None,
            },
            "doctor": {
                "full_name": p.doctor.full_name if p.doctor else "—",
                "specialty": p.doctor.specialty if p.doctor else None,
                "license_number": p.doctor.license_number if p.doctor else None,
            },
            "items": [
                {
                    "medication_name": i.medication_name,
                    "dose": i.dose,
                    "frequency": _med(i.frequency),
                    "duration_days": i.duration_days,
                    "instructions": _med(i.instructions),
                }
                for i in p.items
            ],
            "notes": p.notes,
            "follow_up_date": p.follow_up_date.isoformat() if p.follow_up_date else None,
        },
        locale=locale,
    )

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'inline; filename="prescription-{p.id}.pdf"',
        },
    )



def _parse_frequency_per_day(freq: str) -> int:
    """Map common frequency strings to doses-per-day."""
    if not freq:
        return 1
    f = freq.lower().strip()
    table = {
        "1x daily": 1, "once daily": 1, "qd": 1,
        "2x daily": 2, "twice daily": 2, "bid": 2,
        "3x daily": 3, "three times daily": 3, "tid": 3,
        "4x daily": 4, "four times daily": 4, "qid": 4,
        "as needed": 0, "prn": 0,
    }
    for k, v in table.items():
        if k in f:
            return v
    # Numeric fallback e.g. "3 times"
    import re
    m = re.search(r"(\d+)", f)
    if m:
        return int(m.group(1))
    return 1


async def _spawn_administrations(
    db: AsyncSession,
    prescription_id,
    patient_id,
    items,
):
    """Create MedicationAdministration rows for every scheduled dose."""
    now = datetime.now(timezone.utc).replace(second=0, microsecond=0)
    rows = []
    for item in items:
        per_day = _parse_frequency_per_day(item.frequency)
        days = item.duration_days or 1
        if per_day <= 0:
            # as-needed — one row, no schedule
            rows.append(MedicationAdministration(
                prescription_item_id=item.id,
                patient_id=patient_id,
                scheduled_at=now,
                status="pending",
                notes="PRN — administer as needed",
            ))
            continue
        interval_hours = 24 // per_day
        for d in range(days):
            for dose_i in range(per_day):
                scheduled = now + timedelta(
                    days=d, hours=dose_i * interval_hours
                )
                rows.append(MedicationAdministration(
                    prescription_item_id=item.id,
                    patient_id=patient_id,
                    scheduled_at=scheduled,
                    status="pending",
                ))
    if rows:
        db.add_all(rows)
        await db.commit()

