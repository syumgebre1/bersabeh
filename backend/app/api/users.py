"""
User management endpoints.

Self-service:
  GET   /users/me                    — own profile
  PATCH /users/me                    — update own profile

Admin-only:
  GET   /users                       — list users (filter by role, status, search)
  GET   /users/pending               — pending patient registrations
  POST  /users/{user_id}/approve     — approve a pending patient
  POST  /users/{user_id}/reject      — reject with reason
  PATCH /users/{user_id}             — admin edit user
  DELETE /users/{user_id}            — soft-delete + anonymize (see DECISIONS.md D006)

Design:
  - Patients/staff see only themselves via /me.
  - Admin endpoints are guarded by `AdminUser` (ADMIN or SUPER_ADMIN).
  - Delete is an anonymize: email/name/phone/photo are scrubbed, hashed_password
    is invalidated, is_deleted=True. Row + FKs preserved for medical record
    integrity and audit trail.
"""

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import AdminUser, CurrentUser
from app.core.security import hash_password
from app.db.session import get_db
from app.models.user import User, UserRole, UserStatus
from app.schemas.user import (
    UserApproval,
    UserPending,
    UserRead,
    UserUpdate,
)


router = APIRouter(prefix="/users", tags=["users"])


# ============================================================
# Self-service endpoints
# ============================================================
@router.get(
    "/me",
    response_model=UserRead,
    summary="Get my profile",
)
async def get_me(current_user: CurrentUser) -> UserRead:
    return UserRead.model_validate(current_user)


@router.patch(
    "/me",
    response_model=UserRead,
    summary="Update my profile",
    description="Name, phone, photo, bio, specialty fields. Cannot change role or status.",
)
async def update_me(
    payload: UserUpdate,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> UserRead:
    # Only allow fields a user may change about themselves.
    # Note: is_on_duty / specialty / license_number are staff-only; we
    # allow them through this endpoint because only staff can be logged
    # in when they're relevant. Patients simply have these as null.
    data = payload.model_dump(exclude_unset=True)
    for key, value in data.items():
        setattr(current_user, key, value)

    current_user.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(current_user)

    return UserRead.model_validate(current_user)


# ============================================================
# Admin endpoints
# ============================================================

# ---- List users ----
@router.get(
    "",
    response_model=list[UserRead],
    summary="List users (admin)",
    description="Filter by role, status, and free-text search on name/email.",
)
async def list_users(
    _admin: AdminUser,
    db: AsyncSession = Depends(get_db),
    role: UserRole | None = Query(None, description="Filter by role"),
    status_filter: UserStatus | None = Query(None, alias="status", description="Filter by status"),
    search: str | None = Query(None, min_length=1, max_length=100, description="Search name or email"),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
) -> list[UserRead]:
    stmt = select(User).where(User.is_deleted.is_(False))

    if role is not None:
        stmt = stmt.where(User.role == role)
    if status_filter is not None:
        stmt = stmt.where(User.status == status_filter)
    if search:
        like = f"%{search.lower()}%"
        stmt = stmt.where(
            or_(
                func.lower(User.full_name).like(like),
                func.lower(User.email).like(like),
            )
        )

    stmt = stmt.order_by(User.created_at.desc()).limit(limit).offset(offset)
    result = await db.execute(stmt)
    users = result.scalars().all()
    return [UserRead.model_validate(u) for u in users]


# ---- Pending patient approvals queue ----
@router.get(
    "/pending",
    response_model=list[UserPending],
    summary="Pending patient registrations (admin)",
)
async def list_pending(_admin: AdminUser, db: AsyncSession = Depends(get_db)) -> list[UserPending]:
    stmt = (
        select(User)
        .where(User.role == UserRole.PATIENT)
        .where(User.status == UserStatus.PENDING_ADMIN)
        .where(User.is_deleted.is_(False))
        .order_by(User.created_at.asc())
    )
    result = await db.execute(stmt)
    return [UserPending.model_validate(u) for u in result.scalars().all()]


# ---- Approve / reject ----
@router.post(
    "/{user_id}/approve",
    response_model=UserRead,
    summary="Approve a pending patient (admin)",
)
async def approve_user(
    user_id: uuid.UUID,
    admin: AdminUser,
    db: AsyncSession = Depends(get_db),
) -> UserRead:
    user = await _get_user_or_404(db, user_id)

    if user.status != UserStatus.PENDING_ADMIN:
        raise HTTPException(
            status_code=400,
            detail=f"User is not pending_admin (current: {user.status.value})",
        )

    user.status = UserStatus.ACTIVE
    user.approved_by_id = admin.id
    user.approved_at = datetime.now(timezone.utc)
    user.rejection_reason = None
    user.updated_at = datetime.now(timezone.utc)

    await db.commit()
    await db.refresh(user)
    return UserRead.model_validate(user)


@router.post(
    "/{user_id}/reject",
    response_model=UserRead,
    summary="Reject a pending patient with a reason (admin)",
)
async def reject_user(
    user_id: uuid.UUID,
    payload: UserApproval,
    admin: AdminUser,
    db: AsyncSession = Depends(get_db),
) -> UserRead:
    if payload.approve:
        raise HTTPException(status_code=400, detail="Use /approve for approvals")

    user = await _get_user_or_404(db, user_id)
    if user.status != UserStatus.PENDING_ADMIN:
        raise HTTPException(
            status_code=400,
            detail=f"User is not pending_admin (current: {user.status.value})",
        )

    user.status = UserStatus.REJECTED
    user.rejection_reason = payload.reason
    user.approved_by_id = admin.id
    user.approved_at = datetime.now(timezone.utc)
    user.updated_at = datetime.now(timezone.utc)

    await db.commit()
    await db.refresh(user)
    return UserRead.model_validate(user)


# ---- Admin edit user ----
@router.patch(
    "/{user_id}",
    response_model=UserRead,
    summary="Edit any user (admin)",
)
async def admin_update_user(
    user_id: uuid.UUID,
    payload: UserUpdate,
    _admin: AdminUser,
    db: AsyncSession = Depends(get_db),
) -> UserRead:
    user = await _get_user_or_404(db, user_id)
    data = payload.model_dump(exclude_unset=True)
    for key, value in data.items():
        setattr(user, key, value)

    user.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(user)
    return UserRead.model_validate(user)


# ---- Soft-delete + anonymize ----
@router.delete(
    "/{user_id}",
    response_model=UserRead,
    summary="Anonymize and delete a user (admin)",
    description=(
        "Anonymizes the user: PII is scrubbed, password is invalidated, and "
        "is_deleted=True. The row stays for audit + medical record integrity."
    ),
)
async def delete_user(
    user_id: uuid.UUID,
    admin: AdminUser,
    db: AsyncSession = Depends(get_db),
) -> UserRead:
    user = await _get_user_or_404(db, user_id)

    if user.id == admin.id:
        raise HTTPException(status_code=400, detail="You cannot delete your own account")
    if user.is_deleted:
        raise HTTPException(status_code=400, detail="User is already deleted")

    # Anonymize per DECISIONS.md D006.
    placeholder = f"deleted+{user.id}@example.invalid"
    user.email = placeholder
    user.full_name = f"Deleted User #{str(user.id)[:8]}"
    user.phone = None
    user.photo_url = None
    user.bio = None
    user.specialty = None
    user.years_experience = None
    user.license_number = None
    # Invalidate password: random hex, not derivable from anything.
    import secrets
    user.hashed_password = hash_password(secrets.token_urlsafe(32))
    user.is_deleted = True
    user.deleted_at = datetime.now(timezone.utc)
    user.status = UserStatus.DISABLED
    user.updated_at = datetime.now(timezone.utc)

    await db.commit()
    await db.refresh(user)
    return UserRead.model_validate(user)


# ============================================================
# Helper
# ============================================================
async def _get_user_or_404(db: AsyncSession, user_id: uuid.UUID) -> User:
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user
