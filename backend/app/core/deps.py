"""
FastAPI dependencies — authentication and authorization.

Exports:
  - get_current_user: extracts the user from the bearer token.
  - require_role(*roles): dependency factory enforcing one of the given roles.
  - CurrentUser:    Annotated alias for `User = Depends(get_current_user)`.
  - AdminUser:      requires role=ADMIN or SUPER_ADMIN
  - SuperAdminUser: requires role=SUPER_ADMIN
  - StaffUser:      requires any non-PATIENT role (admin/staff of the clinic)
  - ActiveUser:     alias for get_current_user (user is guaranteed active)

Design notes:
  - We return the SQLAlchemy User object so endpoints get real attributes
    (id, role, status, ...) without a second DB call.
  - We check `is_deleted`, `status`, and `is_active` semantics in one place
    so endpoints can trust that the user they receive is usable.
  - `HTTPBearer` handles "Authorization: Bearer <token>" extraction; if the
    header is missing or malformed, FastAPI returns 403 automatically.
"""

from typing import Annotated, Any, Callable

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import decode_token
from app.db.session import get_db
from app.models.user import User, UserRole, UserStatus


# ============================================================
# Bearer token extractor
# ============================================================
# auto_error=True → FastAPI returns 403 if the header is missing/malformed.
# We customize the error to 401 below where appropriate.
bearer_scheme = HTTPBearer(auto_error=True)


# ============================================================
# get_current_user
# ============================================================
async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(bearer_scheme)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> User:
    """
    Decode the bearer token, load the user, and return them.

    Raises:
        401 if the token is invalid, expired, or the user no longer exists.
        403 if the user exists but is deleted, disabled, or not active.
    """
    invalid_creds = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired token",
        headers={"WWW-Authenticate": "Bearer"},
    )

    # ---- 1. Decode the token ----
    try:
        payload = decode_token(credentials.credentials, expected_type="access")
    except ValueError:
        raise invalid_creds

    user_id = payload.get("sub")
    if not user_id:
        raise invalid_creds

    # ---- 2. Load the user ----
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise invalid_creds

    # ---- 3. Enforce account state ----
    # We're explicit about which states are forbidden, so future us can
    # see why a particular rejection happens.
    if user.is_deleted:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account has been deleted",
        )
    if user.status == UserStatus.DISABLED:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is disabled",
        )
    if user.status == UserStatus.REJECTED:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account registration was rejected",
        )
    if user.status == UserStatus.PENDING_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is pending admin approval",
        )

    return user


# Convenience alias — use `current_user: CurrentUser` in endpoint signatures.
CurrentUser = Annotated[User, Depends(get_current_user)]


# ============================================================
# require_role — role-based access control
# ============================================================
def require_role(*allowed_roles: UserRole | str) -> Callable[..., Any]:
    """
    Factory that returns a FastAPI dependency enforcing role membership.

    Usage:
        @router.post("/approve/{user_id}")
        async def approve(user_id: UUID, admin: User = Depends(require_role("admin", "super_admin"))):
            ...

    Accepts either UserRole enum values or their string names (e.g. "admin").
    """
    # Normalize everything to UserRole enum for comparison.
    normalized: set[UserRole] = set()
    for r in allowed_roles:
        if isinstance(r, UserRole):
            normalized.add(r)
        else:
            try:
                normalized.add(UserRole(r))
            except ValueError:
                # Allow short names like "admin" too.
                normalized.add(UserRole[r.upper()])

    async def _checker(user: CurrentUser) -> User:
        if user.role not in normalized:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Requires one of roles: {sorted(r.value for r in normalized)}",
            )
        return user

    return _checker


# ============================================================
# Ready-made dependencies for common cases
# ============================================================
AdminUser = Annotated[User, Depends(require_role(UserRole.ADMIN, UserRole.SUPER_ADMIN))]
SuperAdminUser = Annotated[User, Depends(require_role(UserRole.SUPER_ADMIN))]
StaffUser = Annotated[
    User,
    Depends(require_role(
        UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.DOCTOR,
        UserRole.NURSE, UserRole.RECEPTION, UserRole.LAB,
    )),
]
DoctorUser = Annotated[User, Depends(require_role(UserRole.DOCTOR))]
NurseUser = Annotated[User, Depends(require_role(UserRole.NURSE))]
ReceptionUser = Annotated[User, Depends(require_role(UserRole.RECEPTION))]
LabUser = Annotated[User, Depends(require_role(UserRole.LAB))]
PatientUser = Annotated[User, Depends(require_role(UserRole.PATIENT))]
