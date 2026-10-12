"""
User model — one table for all roles.

Why one table?
  Seven roles (SUPER_ADMIN, ADMIN, DOCTOR, NURSE, RECEPTION, LAB, PATIENT)
  share 95% of their fields: email, phone, name, password, status, timestamps.
  Only a few fields are role-specific (specialty, license_number, bio).
  Splitting into seven tables would multiply JOINs and migrations for little
  gain. When a role needs substantially more fields (e.g., Patient medical
  history), we add a separate table with a user_id FK.

Why a `status` column separate from `is_deleted`?
  `status` tracks the *account lifecycle* (pending → active → rejected).
  `is_deleted` tracks *anonymization*: the user asked to leave or was removed;
  we scrub PII and keep the row for audit trail and FK integrity.
"""

import enum
import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum as SAEnum, ForeignKey, Index, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


# ============================================================
# Enums
# ============================================================

class UserRole(str, enum.Enum):
    """All seven roles in the platform."""
    SUPER_ADMIN = "super_admin"
    ADMIN = "admin"
    DOCTOR = "doctor"
    NURSE = "nurse"
    RECEPTION = "reception"
    LAB = "lab"
    PATIENT = "patient"


class UserStatus(str, enum.Enum):
    """
    Account lifecycle status.

    Staff created by an admin:     active (immediately)
    Patients who self-register:    pending_admin → (approve) active
                                                 → (reject)  rejected
    Any user disabled by admin:    disabled
    """
    PENDING_ADMIN = "pending_admin"
    ACTIVE = "active"
    REJECTED = "rejected"
    DISABLED = "disabled"


# ============================================================
# Model
# ============================================================

class User(Base):
    """A platform user. One row per human."""

    __tablename__ = "users"

    # ---- Primary key ----
    # UUID (not int) because we expose IDs in URLs/PDFs; non-guessable.
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    # ---- Identity ----
    # Email is stored lowercased (enforced at the API layer) so uniqueness
    # and lookup are case-insensitive.
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    phone: Mapped[str | None] = mapped_column(String(32), nullable=True)
    full_name: Mapped[str] = mapped_column(String(200), nullable=False)

    # ---- Auth ----
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(
        SAEnum(UserRole, name="user_role", values_callable=lambda e: [m.value for m in e]),
        nullable=False,
        index=True,
    )
    status: Mapped[UserStatus] = mapped_column(
        SAEnum(UserStatus, name="user_status", values_callable=lambda e: [m.value for m in e]),
        nullable=False,
        default=UserStatus.PENDING_ADMIN,
        index=True,
    )

    # ---- Role-specific profile (nullable for everyone) ----
    specialty: Mapped[str | None] = mapped_column(String(120), nullable=True)          # Doctor
    years_experience: Mapped[int | None] = mapped_column(Integer, nullable=True)       # Doctor
    license_number: Mapped[str | None] = mapped_column(String(60), nullable=True)      # Doctor / Nurse
    bio: Mapped[str | None] = mapped_column(Text, nullable=True)                       # Doctor / Nurse
    photo_url: Mapped[str | None] = mapped_column(String(500), nullable=True)          # Any
    is_on_duty: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)   # Doctor / Nurse

    # ---- Admin approval (for patient self-registration) ----
    approved_by_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    approved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    rejection_reason: Mapped[str | None] = mapped_column(Text, nullable=True)

    # ---- Soft delete (anonymization) ----
    is_deleted: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, index=True)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # ---- Timestamps ----
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # ---- Relationships ----
    # self-referential: who approved this user?
    approved_by: Mapped["User | None"] = relationship(
        "User",
        remote_side="User.id",
        foreign_keys=[approved_by_id],
        uselist=False,
    )

    # ---- Table-level indexes ----
    __table_args__ = (
        Index("ix_users_role_status", "role", "status"),
    )

    def __repr__(self) -> str:
        return f"<User {self.email} role={self.role.value} status={self.status.value}>"
