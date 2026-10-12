"""
Pydantic schemas for User objects.

Separation of concerns:
  - UserBase       — fields common to create/read
  - UserRead       — what the API returns (never includes hashed_password)
  - UserPublic     — minimal info, safe to show on landing pages / to patients
  - UserUpdate     — fields an admin can patch (all optional)
  - UserApproval   — the request to approve or reject a pending patient

Every "Read" schema has `from_attributes=True` so we can build it from a
SQLAlchemy User object directly:

    return UserRead.model_validate(user)
"""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from app.models.user import UserRole, UserStatus


# ============================================================
# Read schemas — what the API sends back
# ============================================================

class UserBase(BaseModel):
    """Fields common to all user representations."""
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: EmailStr
    full_name: str
    role: UserRole
    status: UserStatus
    phone: str | None = None
    photo_url: str | None = None
    created_at: datetime


class UserRead(UserBase):
    """
    Full user object as returned by /users/me and admin endpoints.

    Notably excludes:
      - hashed_password (never leaves the server)
      - approved_by relationship (loaded separately if needed)
    """
    specialty: str | None = None
    years_experience: int | None = None
    license_number: str | None = None
    bio: str | None = None
    is_on_duty: bool = False
    approved_at: datetime | None = None
    rejection_reason: str | None = None
    last_login_at: datetime | None = None
    updated_at: datetime | None = None


class UserPublic(BaseModel):
    """
    Minimal, safe representation for public consumption.
    Used on landing pages and by patients viewing their own care team.
    """
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    full_name: str
    role: UserRole
    specialty: str | None = None
    years_experience: int | None = None
    photo_url: str | None = None


class UserPending(BaseModel):
    """Slim representation for the admin pending-approvals queue."""
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: EmailStr
    full_name: str
    phone: str | None = None
    created_at: datetime


# ============================================================
# Write schemas — what the API accepts
# ============================================================

class UserUpdate(BaseModel):
    """
    Admin-editable fields on a user. All optional.
    Password changes go through a dedicated endpoint, not here.
    """
    full_name: str | None = Field(None, min_length=1, max_length=200)
    phone: str | None = Field(None, max_length=32)
    specialty: str | None = Field(None, max_length=120)
    years_experience: int | None = Field(None, ge=0, le=80)
    license_number: str | None = Field(None, max_length=60)
    bio: str | None = None
    photo_url: str | None = Field(None, max_length=500)
    is_on_duty: bool | None = None


class UserApproval(BaseModel):
    """Admin approves or rejects a pending patient."""
    approve: bool
    reason: str | None = Field(None, max_length=1000, description="Required if approve=False")

    @field_validator("reason")
    @classmethod
    def reason_required_on_reject(cls, v, info):
        # This validator uses values from OTHER fields, which requires
        # `mode="after"` and access to `info.data`. Since 'approve' is
        # declared before 'reason', it will be available here.
        if info.data.get("approve") is False and not v:
            raise ValueError("reason is required when rejecting a patient")
        return v
