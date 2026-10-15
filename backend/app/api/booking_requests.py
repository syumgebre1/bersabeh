"""
Booking requests — public submit + staff review.

Public:
  POST /booking-requests                (no auth)

Staff:
  GET   /booking-requests               (reception/admin/super_admin)
  GET   /booking-requests/{id}
  POST  /booking-requests/{id}/contact  (mark contacted)
  POST  /booking-requests/{id}/convert  (create real appointment)
  POST  /booking-requests/{id}/cancel
"""

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.deps import CurrentUser, require_roles
from app.db.session import get_db
from app.models.appointment import Appointment
from app.models.booking_request import BookingRequest, BookingRequestStatus
from app.models.user import User, UserRole, UserStatus
from app.schemas.booking_request import (
    BookingRequestConvert,
    BookingRequestCreate,
    BookingRequestPublic,
    BookingRequestRead,
)


router = APIRouter(prefix="/booking-requests", tags=["booking-requests"])

STAFF = (UserRole.RECEPTION, UserRole.ADMIN, UserRole.SUPER_ADMIN)


# ============================================================
# Public — guest submits a request
# ============================================================

@router.post(
    "",
    response_model=BookingRequestPublic,
    status_code=status.HTTP_201_CREATED,
    summary="Submit a booking request (public)",
)
async def create_booking_request(
    payload: BookingRequestCreate,
    db: AsyncSession = Depends(get_db),
) -> BookingRequestPublic:
    # Verify doctor exists if provided
    doctor_name: str | None = None
    if payload.doctor_id:
        doc = (
            await db.execute(
                select(User).where(
                    User.id == payload.doctor_id,
                    User.role == UserRole.DOCTOR,
                    User.is_deleted.is_(False),
                )
            )
        ).scalar_one_or_none()
        if not doc:
            raise HTTPException(status_code=404, detail="Doctor not found")
        doctor_name = doc.full_name

    req = BookingRequest(
        full_name=payload.full_name.strip(),
        phone=payload.phone,
        email=payload.email,
        doctor_id=payload.doctor_id,
        preferred_at=payload.preferred_at,
        reason=payload.reason,
        status=BookingRequestStatus.NEW,
    )
    db.add(req)
    await db.commit()
    await db.refresh(req)

    return BookingRequestPublic(
        id=req.id,
        status=req.status.value,
        preferred_at=req.preferred_at,
        doctor_name=doctor_name,
    )


# ============================================================
# Staff — review + convert
# ============================================================

@router.get(
    "",
    response_model=list[BookingRequestRead],
    summary="List booking requests (staff)",
)
async def list_booking_requests(
    current: User = Depends(require_roles(*STAFF)),
    db: AsyncSession = Depends(get_db),
    status_filter: str | None = Query(None, alias="status"),
    limit: int = Query(100, ge=1, le=500),
) -> list[BookingRequestRead]:
    stmt = select(BookingRequest).order_by(BookingRequest.created_at.desc()).limit(limit)
    if status_filter:
        try:
            st = BookingRequestStatus(status_filter)
            stmt = stmt.where(BookingRequest.status == st)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid status: {status_filter}")

    rows = (await db.execute(stmt)).scalars().all()
    return [BookingRequestRead.model_validate(r) for r in rows]


@router.get(
    "/{request_id}",
    response_model=BookingRequestRead,
    summary="Get one booking request (staff)",
)
async def get_booking_request(
    request_id: uuid.UUID,
    current: User = Depends(require_roles(*STAFF)),
    db: AsyncSession = Depends(get_db),
) -> BookingRequestRead:
    req = (
        await db.execute(select(BookingRequest).where(BookingRequest.id == request_id))
    ).scalar_one_or_none()
    if not req:
        raise HTTPException(status_code=404, detail="Booking request not found")
    return BookingRequestRead.model_validate(req)


@router.post(
    "/{request_id}/contact",
    response_model=BookingRequestRead,
    summary="Mark a request as contacted (staff)",
)
async def mark_contacted(
    request_id: uuid.UUID,
    current: User = Depends(require_roles(*STAFF)),
    db: AsyncSession = Depends(get_db),
) -> BookingRequestRead:
    req = (
        await db.execute(select(BookingRequest).where(BookingRequest.id == request_id))
    ).scalar_one_or_none()
    if not req:
        raise HTTPException(status_code=404, detail="Booking request not found")
    if req.status not in (BookingRequestStatus.NEW, BookingRequestStatus.CONTACTED):
        raise HTTPException(status_code=409, detail=f"Cannot contact a {req.status.value} request")

    req.status = BookingRequestStatus.CONTACTED
    req.contacted_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(req)
    return BookingRequestRead.model_validate(req)


@router.post(
    "/{request_id}/cancel",
    response_model=BookingRequestRead,
    summary="Cancel a request (staff)",
)
async def cancel_request(
    request_id: uuid.UUID,
    current: User = Depends(require_roles(*STAFF)),
    db: AsyncSession = Depends(get_db),
) -> BookingRequestRead:
    req = (
        await db.execute(select(BookingRequest).where(BookingRequest.id == request_id))
    ).scalar_one_or_none()
    if not req:
        raise HTTPException(status_code=404, detail="Booking request not found")
    if req.status in (BookingRequestStatus.CONVERTED, BookingRequestStatus.CANCELLED):
        raise HTTPException(status_code=409, detail=f"Request already {req.status.value}")

    req.status = BookingRequestStatus.CANCELLED
    await db.commit()
    await db.refresh(req)
    return BookingRequestRead.model_validate(req)


@router.post(
    "/{request_id}/convert",
    response_model=BookingRequestRead,
    summary="Convert a request into a real appointment (staff)",
)
async def convert_request(
    request_id: uuid.UUID,
    payload: BookingRequestConvert,
    current: User = Depends(require_roles(*STAFF)),
    db: AsyncSession = Depends(get_db),
) -> BookingRequestRead:
    req = (
        await db.execute(select(BookingRequest).where(BookingRequest.id == request_id))
    ).scalar_one_or_none()
    if not req:
        raise HTTPException(status_code=404, detail="Booking request not found")
    if req.status == BookingRequestStatus.CONVERTED:
        raise HTTPException(status_code=409, detail="Request already converted")
    if req.status == BookingRequestStatus.CANCELLED:
        raise HTTPException(status_code=409, detail="Cannot convert a cancelled request")

    # 1. Resolve patient
    patient: User | None = None
    if payload.existing_patient_id:
        patient = (
            await db.execute(
                select(User).where(
                    User.id == payload.existing_patient_id,
                    User.role == UserRole.PATIENT,
                    User.is_deleted.is_(False),
                )
            )
        ).scalar_one_or_none()
        if not patient:
            raise HTTPException(status_code=404, detail="Existing patient not found")
    else:
        # Match by phone first (avoid dupes); else create pending patient
        patient_result = await db.execute(
            select(User).where(
                User.phone == req.phone,
                User.role == UserRole.PATIENT,
                User.is_deleted.is_(False),
            ).limit(1)
        )
        patient = patient_result.scalars().first()

        if not patient:
            # Create a pending patient. Password is random — they can reset later.
            import secrets
            from app.core.security import hash_password
            patient = User(
                email=req.email or f"guest+{uuid.uuid4().hex[:8]}@bersabeh.local",
                full_name=req.full_name,
                phone=req.phone,
                role=UserRole.PATIENT,
                status=UserStatus.PENDING_ADMIN,
                hashed_password=hash_password(secrets.token_urlsafe(32)),
            )
            db.add(patient)
            await db.flush()

    # 2. Create the appointment
    appt = Appointment(
        patient_id=patient.id,
        doctor_id=req.doctor_id,
        scheduled_at=payload.scheduled_at,
        duration_minutes=payload.duration_minutes,
        reason=payload.reason or req.reason,
        status="scheduled",
        created_by_id=current.id,
    )
    db.add(appt)
    await db.flush()

    # 3. Update the request
    req.status = BookingRequestStatus.CONVERTED
    req.converted_at = datetime.now(timezone.utc)
    req.converted_patient_id = patient.id
    req.converted_appointment_id = appt.id
    if payload.notes:
        req.internal_notes = payload.notes

    await db.commit()
    await db.refresh(req)
    return BookingRequestRead.model_validate(req)
