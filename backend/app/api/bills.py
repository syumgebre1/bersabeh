"""
Billing endpoints.

Role permissions:
                            Patient  Doctor  Nurse  Reception  Lab  Admin
  POST   /bills               ❌      ❌      ❌      ✅         ❌   ✅
  GET    /bills               own     read    read   all        ❌   all
  GET    /bills/{id}          own     read    read   all        ❌   all
  POST   /bills/{id}/pay      ❌      ❌      ❌      ✅         ❌   ✅
  POST   /bills/{id}/cancel   ❌      ❌      ❌      ✅         ❌   ✅
  POST   /bills/{id}/pdf      own     read    read   all        ❌   all

Note: patient "read" of own bills is currently filtered server-side. The
PDF export currently returns a plain text fallback — the PDF service will
gain a billing template in a later iteration (see DECISIONS.md D019).
"""

import uuid
from datetime import datetime, timezone
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import CurrentUser
from app.db.session import get_db
from app.models.billing import Bill, BillItem, BillStatus
from app.models.encounter import Encounter
from app.models.user import User, UserRole
from app.schemas.billing import (
    BillBrief,
    BillCreate,
    BillRead,
    PaymentRecord,
)
from app.services.audit import set_audit_actor


router = APIRouter(prefix="/bills", tags=["bills"])


# ============================================================
# Helpers
# ============================================================
def _is_adminish(user: User) -> bool:
    return user.role in (UserRole.ADMIN, UserRole.SUPER_ADMIN)


def _can_write(user: User) -> bool:
    return _is_adminish(user) or user.role == UserRole.RECEPTION


async def _get_bill_or_404(db: AsyncSession, bill_id: uuid.UUID) -> Bill:
    result = await db.execute(select(Bill).where(Bill.id == bill_id))
    b = result.scalar_one_or_none()
    if b is None:
        raise HTTPException(status_code=404, detail="Bill not found")
    return b


def _can_view(user: User, b: Bill) -> bool:
    if _is_adminish(user):
        return True
    if user.role == UserRole.PATIENT:
        return b.patient_id == user.id
    if user.role in (UserRole.RECEPTION, UserRole.DOCTOR, UserRole.NURSE):
        return True
    return False


# ============================================================
# POST /bills
# ============================================================
@router.post(
    "",
    response_model=BillRead,
    status_code=status.HTTP_201_CREATED,
    summary="Create a bill for an encounter",
)
async def create_bill(
    payload: BillCreate,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> BillRead:
    if not _can_write(current_user):
        raise HTTPException(status_code=403, detail="Only reception/admin can create bills")

    # Verify encounter exists.
    enc_result = await db.execute(select(Encounter).where(Encounter.id == payload.encounter_id))
    enc = enc_result.scalar_one_or_none()
    if enc is None:
        raise HTTPException(status_code=404, detail="Encounter not found")

    # Compute total from items.
    total = Decimal("0")
    for item in payload.items:
        total += (item.unit_price_etb * item.quantity).quantize(Decimal("0.01"))

    set_audit_actor(db, current_user)

    b = Bill(
        patient_id=enc.patient_id,
        encounter_id=enc.id,
        created_by_id=current_user.id,
        amount_etb=total,
        paid_amount_etb=Decimal("0"),
        currency="ETB",
        status=BillStatus.UNPAID,
        notes=payload.notes,
    )
    db.add(b)
    await db.flush()

    for i, item in enumerate(payload.items):
        amount = (item.unit_price_etb * item.quantity).quantize(Decimal("0.01"))
        db.add(BillItem(
            bill_id=b.id,
            description=item.description,
            quantity=item.quantity,
            unit_price_etb=item.unit_price_etb,
            amount_etb=amount,
            sort_order=i,
        ))

    await db.commit()
    await db.refresh(b)
    return BillRead.model_validate(b)


# ============================================================
# GET /bills
# ============================================================
@router.get(
    "",
    response_model=list[BillBrief],
    summary="List bills (role-filtered)",
)
async def list_bills(
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
    status_filter: BillStatus | None = Query(None, alias="status"),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
) -> list[BillBrief]:
    if current_user.role == UserRole.LAB:
        raise HTTPException(status_code=403, detail="Lab staff cannot view bills")

    stmt = select(Bill)
    if current_user.role == UserRole.PATIENT:
        stmt = stmt.where(Bill.patient_id == current_user.id)
    # Doctor/Nurse/Reception/Admin: all.

    if status_filter is not None:
        stmt = stmt.where(Bill.status == status_filter)

    stmt = stmt.order_by(Bill.created_at.desc()).limit(limit).offset(offset)
    result = await db.execute(stmt)
    return [BillBrief.model_validate(b) for b in result.scalars().all()]


# ============================================================
# GET /bills/{id}
# ============================================================
@router.get(
    "/{bill_id}",
    response_model=BillRead,
    summary="Get one bill",
)
async def get_bill(
    bill_id: uuid.UUID,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> BillRead:
    b = await _get_bill_or_404(db, bill_id)
    if not _can_view(current_user, b):
        raise HTTPException(status_code=403, detail="Not allowed to view this bill")
    return BillRead.model_validate(b)


# ============================================================
# POST /bills/{id}/pay
# ============================================================
@router.post(
    "/{bill_id}/pay",
    response_model=BillRead,
    summary="Record a payment against a bill",
)
async def record_payment(
    bill_id: uuid.UUID,
    payload: PaymentRecord,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> BillRead:
    if not _can_write(current_user):
        raise HTTPException(status_code=403, detail="Only reception/admin can record payments")

    b = await _get_bill_or_404(db, bill_id)
    if b.status == BillStatus.CANCELLED:
        raise HTTPException(status_code=400, detail="Cannot pay a cancelled bill")
    if b.status == BillStatus.PAID:
        raise HTTPException(status_code=400, detail="Bill is already paid")

    remaining = Decimal(b.amount_etb) - Decimal(b.paid_amount_etb)
    if payload.amount_etb > remaining:
        raise HTTPException(
            status_code=400,
            detail=f"Payment exceeds remaining balance ({remaining} ETB)",
        )

    set_audit_actor(db, current_user)

    b.paid_amount_etb = Decimal(b.paid_amount_etb) + payload.amount_etb
    b.payment_method = payload.payment_method
    if payload.notes:
        b.notes = (b.notes or "") + ("\n" if b.notes else "") + payload.notes

    # Update status.
    if Decimal(b.paid_amount_etb) >= Decimal(b.amount_etb):
        b.status = BillStatus.PAID
        b.paid_at = datetime.now(timezone.utc)
    else:
        b.status = BillStatus.PARTIAL

    b.updated_at = datetime.now(timezone.utc)

    await db.commit()
    await db.refresh(b)
    return BillRead.model_validate(b)


# ============================================================
# POST /bills/{id}/cancel
# ============================================================
@router.post(
    "/{bill_id}/cancel",
    response_model=BillRead,
    summary="Cancel a bill",
)
async def cancel_bill(
    bill_id: uuid.UUID,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> BillRead:
    if not _can_write(current_user):
        raise HTTPException(status_code=403, detail="Only reception/admin can cancel bills")

    b = await _get_bill_or_404(db, bill_id)
    if b.status == BillStatus.PAID:
        raise HTTPException(status_code=400, detail="Cannot cancel a paid bill")
    if b.status == BillStatus.CANCELLED:
        raise HTTPException(status_code=400, detail="Already cancelled")

    set_audit_actor(db, current_user)

    b.status = BillStatus.CANCELLED
    b.updated_at = datetime.now(timezone.utc)

    await db.commit()
    await db.refresh(b)
    return BillRead.model_validate(b)


# ============================================================
# GET /bills/{id}/pdf (placeholder — plain text for now)
# ============================================================
@router.get(
    "/{bill_id}/pdf",
    summary="Download a bill as a PDF (placeholder for now)",
    response_class=Response,
)
async def download_bill_pdf(
    bill_id: uuid.UUID,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    b = await _get_bill_or_404(db, bill_id)
    if not _can_view(current_user, b):
        raise HTTPException(status_code=403, detail="Not allowed")

    # Simple plain-text placeholder — the real PDF template lands in a later
    # iteration (see DECISIONS.md D019 — services/pdf.py).
    lines = [
        f"Bersabeh Clinic — Bill {b.id}",
        f"Patient: {b.patient.full_name if b.patient else '—'}",
        f"Amount:  {b.amount_etb} {b.currency}",
        f"Paid:    {b.paid_amount_etb} {b.currency}",
        f"Status:  {b.status.value}",
        "",
        "Items:",
    ]
    for it in b.items:
        lines.append(f"  - {it.description} × {it.quantity} = {it.amount_etb} ETB")
    text = "\n".join(lines)

    return Response(
        content=text,
        media_type="text/plain",
        headers={"Content-Disposition": f'inline; filename="bill-{b.id}.txt"'},
    )
