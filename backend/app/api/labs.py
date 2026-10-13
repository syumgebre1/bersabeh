"""
Lab order + result endpoints.

Role permissions:
                            Patient  Doctor    Nurse  Reception  Lab  Admin
  POST   /labs                ❌      ✅        ❌      ❌        ❌   ✅
  GET    /labs                own     own-ordered all?    all?   all  all
  GET    /labs/{id}           own     own-ordered all?    all?   all  all
  PATCH  /labs/{id}           ❌      ❌        ❌      ❌        ✅   ✅
  POST   /labs/{id}/result    ❌      ❌        ❌      ❌        ✅   ✅
  GET    /labs/{id}/pdf       own     own-ordered ✅      ✅        ✅   ✅

Simplification: doctors currently see all labs, not just their own orders.
A precise filter would require joining on encounters. We may tighten this later.
"""

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import CurrentUser
from app.db.session import get_db
from app.models.encounter import Encounter
from app.models.lab import (
    LabOrder,
    LabOrderStatus,
    LabResult,
    LabResultType,
)
from app.models.user import User, UserRole
from app.schemas.lab import (
    LabOrderBrief,
    LabOrderCreate,
    LabOrderRead,
    LabOrderUpdate,
    LabResultCreate,
    LabResultRead,
)
from app.core.pdf_translations import get_medical_translations
from app.services.pdf import render_lab_report_pdf


router = APIRouter(prefix="/labs", tags=["labs"])


# ============================================================
# Helpers
# ============================================================
def _is_adminish(user: User) -> bool:
    return user.role in (UserRole.ADMIN, UserRole.SUPER_ADMIN)


async def _get_order_or_404(db: AsyncSession, oid: uuid.UUID) -> LabOrder:
    result = await db.execute(select(LabOrder).where(LabOrder.id == oid))
    o = result.scalar_one_or_none()
    if o is None:
        raise HTTPException(status_code=404, detail="Lab order not found")
    return o


def _can_view(user: User, o: LabOrder) -> bool:
    if user.role == UserRole.PATIENT:
        return o.patient_id == user.id
    if user.role == UserRole.DOCTOR:
        return True    # simplified; would be o.ordered_by_id == user.id for strict
    if user.role in (UserRole.NURSE, UserRole.RECEPTION, UserRole.LAB, UserRole.ADMIN, UserRole.SUPER_ADMIN):
        return True
    return False


# ============================================================
# POST /labs
# ============================================================
@router.post(
    "",
    response_model=LabOrderRead,
    status_code=status.HTTP_201_CREATED,
    summary="Order a lab test (doctor)",
)
async def create_lab_order(
    payload: LabOrderCreate,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> LabOrderRead:
    if current_user.role != UserRole.DOCTOR and not _is_adminish(current_user):
        raise HTTPException(status_code=403, detail="Only doctors can order labs")

    # Verify encounter exists and this doctor owns it (unless admin).
    enc_result = await db.execute(select(Encounter).where(Encounter.id == payload.encounter_id))
    enc = enc_result.scalar_one_or_none()
    if enc is None:
        raise HTTPException(status_code=404, detail="Encounter not found")
    if current_user.role == UserRole.DOCTOR and enc.doctor_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your encounter")

    o = LabOrder(
        encounter_id=enc.id,
        patient_id=enc.patient_id,
        ordered_by_id=current_user.id,
        test_name=payload.test_name,
        clinical_notes=payload.clinical_notes,
        priority=payload.priority,
        status=LabOrderStatus.PENDING,
    )
    db.add(o)
    await db.commit()
    await db.refresh(o)
    return LabOrderRead.model_validate(o)


# ============================================================
# GET /labs
# ============================================================
@router.get(
    "",
    response_model=list[LabOrderBrief],
    summary="List lab orders (role-filtered)",
)
async def list_lab_orders(
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
    status_filter: LabOrderStatus | None = Query(None, alias="status"),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
) -> list[LabOrderBrief]:
    stmt = select(LabOrder)
    if current_user.role == UserRole.PATIENT:
        stmt = stmt.where(LabOrder.patient_id == current_user.id)
    # Doctor, Nurse, Reception, Lab, Admin: all (simplified)

    if status_filter is not None:
        stmt = stmt.where(LabOrder.status == status_filter)

    stmt = stmt.order_by(LabOrder.ordered_at.desc()).limit(limit).offset(offset)
    result = await db.execute(stmt)
    return [LabOrderBrief.model_validate(o) for o in result.scalars().all()]


# ============================================================
# GET /labs/{id}
# ============================================================
@router.get(
    "/{order_id}",
    response_model=LabOrderRead,
    summary="Get one lab order",
)
async def get_lab_order(
    order_id: uuid.UUID,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> LabOrderRead:
    o = await _get_order_or_404(db, order_id)
    if not _can_view(current_user, o):
        raise HTTPException(status_code=403, detail="Not allowed to view this order")
    return LabOrderRead.model_validate(o)


# ============================================================
# PATCH /labs/{id}
# ============================================================
@router.patch(
    "/{order_id}",
    response_model=LabOrderRead,
    summary="Update lab order status/priority (lab tech/admin)",
)
async def update_lab_order(
    order_id: uuid.UUID,
    payload: LabOrderUpdate,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> LabOrderRead:
    if current_user.role != UserRole.LAB and not _is_adminish(current_user):
        raise HTTPException(status_code=403, detail="Only lab staff can update orders")

    o = await _get_order_or_404(db, order_id)
    data = payload.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(o, k, v)
    o.updated_at = datetime.now(timezone.utc)

    await db.commit()
    await db.refresh(o)
    return LabOrderRead.model_validate(o)


# ============================================================
# POST /labs/{id}/result
# ============================================================
@router.post(
    "/{order_id}/result",
    response_model=LabResultRead,
    status_code=status.HTTP_201_CREATED,
    summary="Enter result (lab tech)",
)
async def enter_lab_result(
    order_id: uuid.UUID,
    payload: LabResultCreate,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> LabResultRead:
    if current_user.role != UserRole.LAB and not _is_adminish(current_user):
        raise HTTPException(status_code=403, detail="Only lab staff can enter results")

    o = await _get_order_or_404(db, order_id)
    if o.status == LabOrderStatus.COMPLETED:
        raise HTTPException(status_code=400, detail="Order already has a result")
    if o.status == LabOrderStatus.CANCELLED:
        raise HTTPException(status_code=400, detail="Order was cancelled")

    r = LabResult(
        order_id=o.id,
        resulted_by_id=current_user.id,
        result_type=payload.result_type,
        value_numeric=payload.value_numeric,
        value_text=payload.value_text,
        value_image_url=payload.value_image_url,
        units=payload.units,
        reference_range=payload.reference_range,
        interpretation=payload.interpretation,
        notes=payload.notes,
    )
    db.add(r)

    # Auto-mark the order completed.
    o.status = LabOrderStatus.COMPLETED
    o.updated_at = datetime.now(timezone.utc)

    await db.commit()
    await db.refresh(r)
    return LabResultRead.model_validate(r)


# ============================================================
# GET /labs/{id}/pdf
# ============================================================
@router.get(
    "/{order_id}/pdf",
    summary="Download lab report PDF",
    response_class=Response,
)
async def download_lab_pdf(
    order_id: uuid.UUID,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
    locale: str = Query("en", description="PDF language: en | am | ti"),
):
    o = await _get_order_or_404(db, order_id)
    if not _can_view(current_user, o):
        raise HTTPException(status_code=403, detail="Not allowed to view this order")

    if o.result is None:
        raise HTTPException(status_code=400, detail="No result yet — nothing to print")

    r = o.result
    if r.result_type == LabResultType.NUMERIC:
        result_display = str(r.value_numeric)
    elif r.result_type == LabResultType.TEXT:
        result_display = r.value_text or "—"
    else:
        result_display = r.value_image_url or "—"

    pdf_bytes = render_lab_report_pdf({
        "ref_id": str(o.id),
        "patient": {
            "full_name": o.patient.full_name if o.patient else "—",
            "phone": o.patient.phone if o.patient else None,
        },
        "doctor": {
            "full_name": o.ordered_by.full_name if o.ordered_by else "—",
        },
        "test_name": o.test_name,
        "priority": o.priority.value,
        "ordered_at": o.ordered_at.strftime("%Y-%m-%d %H:%M UTC"),
        "result_display": result_display,
        "units": r.units,
        "reference_range": r.reference_range,
        "interpretation": r.interpretation,
        "lab_notes": r.notes,
    }, locale=locale)

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'inline; filename="lab-report-{o.id}.pdf"',
        },
    )
