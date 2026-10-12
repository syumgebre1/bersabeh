"""
Pydantic schemas for authentication endpoints.

Conventions:
  - Requests validate strictly (email format, password length, name length).
  - Responses NEVER echo back passwords or password hashes.
  - TokenResponse contains both access and refresh tokens; the client
    stores the refresh token securely and uses it only on /auth/refresh.
"""

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from app.schemas.user import UserRead


# ============================================================
# Password policy
# ============================================================
MIN_PASSWORD_LENGTH = 8


def _validate_password_strength(v: str) -> str:
    """Shared password strength check used by all password fields."""
    if len(v) < MIN_PASSWORD_LENGTH:
        raise ValueError(f"Password must be at least {MIN_PASSWORD_LENGTH} characters")
    if len(v.encode("utf-8")) > 72:
        # bcrypt truncates at 72 bytes; be loud about it.
        raise ValueError("Password exceeds 72 bytes")
    if not any(c.isalpha() for c in v):
        raise ValueError("Password must contain at least one letter")
    if not any(c.isdigit() for c in v):
        raise ValueError("Password must contain at least one digit")
    return v


# ============================================================
# Requests
# ============================================================

class LoginRequest(BaseModel):
    """Email + password login."""
    email: EmailStr
    password: str = Field(..., min_length=1, max_length=128)

    @field_validator("email")
    @classmethod
    def normalize_email(cls, v: str) -> str:
        return v.strip().lower()


class RegisterPatientRequest(BaseModel):
    """
    Self-registration for a patient.

    Creates a user with:
        role   = patient
        status = pending_admin
    The account cannot log in until an admin approves it.
    """
    email: EmailStr
    password: str = Field(..., min_length=MIN_PASSWORD_LENGTH, max_length=72)
    full_name: str = Field(..., min_length=1, max_length=200)
    phone: str | None = Field(None, max_length=32)

    @field_validator("email")
    @classmethod
    def normalize_email(cls, v: str) -> str:
        return v.strip().lower()

    @field_validator("password")
    @classmethod
    def check_password(cls, v: str) -> str:
        return _validate_password_strength(v)


class RegisterStaffRequest(BaseModel):
    """
    Admin-only staff creation.
    Creates a user with status=active immediately and sends a temp-password
    email. (Email sending lives in services/email — wired in a later file.)
    """
    email: EmailStr
    full_name: str = Field(..., min_length=1, max_length=200)
    role: str = Field(..., description="One of: admin, doctor, nurse, reception, lab, super_admin")
    phone: str | None = Field(None, max_length=32)
    specialty: str | None = Field(None, max_length=120)
    years_experience: int | None = Field(None, ge=0, le=80)
    license_number: str | None = Field(None, max_length=60)
    bio: str | None = None

    @field_validator("email")
    @classmethod
    def normalize_email(cls, v: str) -> str:
        return v.strip().lower()


class RefreshRequest(BaseModel):
    """Exchange a valid refresh token for a new access token."""
    refresh_token: str = Field(..., min_length=10)


class ChangePasswordRequest(BaseModel):
    """User changes their own password."""
    current_password: str = Field(..., min_length=1, max_length=128)
    new_password: str = Field(..., min_length=MIN_PASSWORD_LENGTH, max_length=72)

    @field_validator("new_password")
    @classmethod
    def check_password(cls, v: str) -> str:
        return _validate_password_strength(v)


# ============================================================
# Responses
# ============================================================

class TokenResponse(BaseModel):
    """Response from /auth/login and /auth/refresh."""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int  # access token lifetime in seconds


class MessageResponse(BaseModel):
    """Generic single-message response."""
    message: str


class RegisterResponse(BaseModel):
    """Response from patient registration — explains the pending status."""
    message: str
    user: UserRead
