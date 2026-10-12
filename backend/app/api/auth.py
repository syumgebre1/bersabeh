"""
Authentication endpoints.

Endpoints in this module:
  POST /auth/register/patient   — self-registration, status=pending_admin
  POST /auth/login              — returns access + refresh tokens
  POST /auth/refresh            — rotates the refresh token, issues new access
  POST /auth/logout             — revokes a refresh token
  POST /auth/change-password    — user changes their own password

Auth model:
  - access token   : short-lived (30 min), sent on every request.
  - refresh token  : long-lived (7 days), only sent to /auth/refresh.
  - every refresh token is tracked in the DB (refresh_tokens.jti) so that
    /auth/logout can actually revoke it server-side, not just client-side.

Errors:
  - 401 for bad credentials or bad token.
  - 403 for accounts that exist but are not usable (pending, rejected, disabled).
  - 409 for emails that are already registered.
  - 429 for rate-limit violations (via slowapi).
"""

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.deps import CurrentUser
from app.core.rate_limit import limiter
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.db.session import get_db
from app.models.refresh_token import RefreshToken
from app.models.user import User, UserRole, UserStatus
from app.schemas.auth import (
    ChangePasswordRequest,
    LoginRequest,
    MessageResponse,
    RefreshRequest,
    RegisterPatientRequest,
    RegisterResponse,
    TokenResponse,
)
from app.schemas.user import UserRead


router = APIRouter(prefix="/auth", tags=["auth"])
bearer_scheme = HTTPBearer(auto_error=False)


# ============================================================
# Helpers
# ============================================================
async def _issue_tokens(
    db: AsyncSession,
    user: User,
    *,
    ip: str | None = None,
    user_agent: str | None = None,
) -> TokenResponse:
    """
    Create an access + refresh token pair for a user, store the refresh
    token's jti in the DB (so it can be revoked), and return both tokens.
    """
    access = create_access_token(user_id=str(user.id), role=user.role.value)
    refresh = create_refresh_token(user_id=str(user.id), role=user.role.value)

    # Decode the refresh token we just made to get its jti + exp.
    payload = decode_token(refresh, expected_type="refresh")
    jti = payload["jti"]
    exp = datetime.fromtimestamp(payload["exp"], tz=timezone.utc)

    db.add(RefreshToken(
        jti=jti,
        user_id=user.id,
        expires_at=exp,
        issued_ip=ip,
        user_agent=(user_agent[:300] if user_agent else None),
    ))
    await db.commit()

    return TokenResponse(
        access_token=access,
        refresh_token=refresh,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


def _client_ip(request: Request) -> str | None:
    """Best-effort client IP (works behind simple proxies too)."""
    xff = request.headers.get("x-forwarded-for")
    if xff:
        return xff.split(",")[0].strip()
    return request.client.host if request.client else None


# ============================================================
# POST /auth/register/patient
# ============================================================
@router.post(
    "/register/patient",
    response_model=RegisterResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a patient (self-service)",
    description=(
        "Creates a patient account in `pending_admin` status. "
        "The account cannot log in until an admin approves it."
    ),
)
async def register_patient(
    payload: RegisterPatientRequest,
    db: AsyncSession = Depends(get_db),
) -> RegisterResponse:
    # Uniqueness check (case-insensitive because payload.email is normalized).
    existing = await db.execute(select(User).where(User.email == payload.email))
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered",
        )

    user = User(
        email=payload.email,
        full_name=payload.full_name,
        phone=payload.phone,
        hashed_password=hash_password(payload.password),
        role=UserRole.PATIENT,
        status=UserStatus.PENDING_ADMIN,
    )
    db.add(user)
    try:
        await db.commit()
    except IntegrityError:
        # Race between the check and the insert.
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered",
        )
    await db.refresh(user)

    return RegisterResponse(
        message=(
            "Registration received. Your account is pending admin approval. "
            "You will be notified once it is reviewed."
        ),
        user=UserRead.model_validate(user),
    )


# ============================================================
# POST /auth/login
# ============================================================
@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Log in",
    description="Returns access + refresh tokens on valid credentials.",
)
@limiter.limit(settings.AUTH_RATE_LIMIT)
async def login(
    request: Request,
    payload: LoginRequest,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    # Look up by email. Use a generic error message for both "no user" and
    # "wrong password" so attackers can't enumerate registered emails.
    result = await db.execute(select(User).where(User.email == payload.email))
    user = result.scalar_one_or_none()

    if user is None or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Account-state gates.
    if user.is_deleted:
        raise HTTPException(status_code=403, detail="Account has been deleted")
    if user.status == UserStatus.PENDING_ADMIN:
        raise HTTPException(
            status_code=403,
            detail="Account is pending admin approval",
        )
    if user.status == UserStatus.REJECTED:
        raise HTTPException(
            status_code=403,
            detail=user.rejection_reason or "Account registration was rejected",
        )
    if user.status == UserStatus.DISABLED:
        raise HTTPException(status_code=403, detail="Account is disabled")

    # Record login time.
    user.last_login_at = datetime.now(timezone.utc)

    tokens = await _issue_tokens(
        db, user,
        ip=_client_ip(request),
        user_agent=request.headers.get("user-agent"),
    )
    return tokens


# ============================================================
# POST /auth/refresh
# ============================================================
@router.post(
    "/refresh",
    response_model=TokenResponse,
    summary="Refresh access token",
    description="Exchange a valid refresh token for a new access + refresh pair.",
)
async def refresh(
    payload: RefreshRequest,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    # 1. Decode + verify signature + type.
    try:
        claims = decode_token(payload.refresh_token, expected_type="refresh")
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    # 2. Look up the jti in our revocation table.
    jti = claims["jti"]
    result = await db.execute(select(RefreshToken).where(RefreshToken.jti == jti))
    row = result.scalar_one_or_none()
    if row is None:
        raise HTTPException(status_code=401, detail="Refresh token not recognized")
    if row.revoked_at is not None:
        raise HTTPException(status_code=401, detail="Refresh token has been revoked")

    # 3. Load the user and re-check state.
    user_result = await db.execute(select(User).where(User.id == claims["sub"]))
    user = user_result.scalar_one_or_none()
    if user is None or user.is_deleted or user.status != UserStatus.ACTIVE:
        raise HTTPException(status_code=401, detail="User is not active")

    # 4. Rotate: revoke the old token, issue a new pair.
    row.revoked_at = datetime.now(timezone.utc)
    await db.flush()

    return await _issue_tokens(db, user)


# ============================================================
# POST /auth/logout
# ============================================================
@router.post(
    "/logout",
    response_model=MessageResponse,
    summary="Log out",
    description="Revokes the given refresh token. Access tokens expire naturally.",
)
async def logout(
    payload: RefreshRequest,
    db: AsyncSession = Depends(get_db),
) -> MessageResponse:
    try:
        claims = decode_token(payload.refresh_token, expected_type="refresh")
    except ValueError:
        # Even a bad token should return success — logout should be idempotent.
        return MessageResponse(message="Logged out")

    result = await db.execute(select(RefreshToken).where(RefreshToken.jti == claims["jti"]))
    row = result.scalar_one_or_none()
    if row and row.revoked_at is None:
        row.revoked_at = datetime.now(timezone.utc)
        await db.commit()

    return MessageResponse(message="Logged out")


# ============================================================
# POST /auth/change-password
# ============================================================
@router.post(
    "/change-password",
    response_model=MessageResponse,
    summary="Change own password",
    description="Requires the current password for confirmation.",
)
async def change_password(
    payload: ChangePasswordRequest,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> MessageResponse:
    if not verify_password(payload.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")

    current_user.hashed_password = hash_password(payload.new_password)
    await db.commit()

    return MessageResponse(message="Password changed successfully")
