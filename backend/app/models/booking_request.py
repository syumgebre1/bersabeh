"""
BookingRequest — guest booking request from the public landing page.

Design (Option C):
  - Guests on the landing page can submit a booking REQUEST.
  - NO user account is created. NO appointment is created.
  - Reception/Admin reviews requests and converts them into real
    appointments (creating/linking a patient) or dismisses them.
  - Matches real clinic workflow: "we'll call you back to confirm."
"""

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import Enum as SAEnum
import enum

from app.db.base import Base


class BookingRequestStatus(str, enum.Enum):
    NEW = "new"
    CONTACTED = "contacted"
    CONVERTED = "converted"
    CANCELLED = "cancelled"
    EXPIRED = "expired"


class BookingRequest(Base):
    __tablename__ = "booking_requests"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4,
    )

    # Guest-provided info
    full_name: Mapped[str] = mapped_column(String(200), nullable=False)
    phone: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    email: Mapped[str | None] = mapped_column(String(320), nullable=True)

    # Preference
    doctor_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    preferred_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True, index=True,
    )
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Workflow
    status: Mapped[BookingRequestStatus] = mapped_column(
        SAEnum(BookingRequestStatus, name="booking_request_status",
               values_callable=lambda e: [m.value for m in e]),
        nullable=False, default=BookingRequestStatus.NEW, index=True,
    )

    # Audit of what happened
    contacted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True,
    )
    converted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True,
    )
    converted_patient_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    converted_appointment_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("appointments.id", ondelete="SET NULL"),
        nullable=True,
    )
    internal_notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(),
        onupdate=func.now(),
    )

    doctor = relationship("User", foreign_keys=[doctor_id], lazy="selectin")
    converted_patient = relationship("User", foreign_keys=[converted_patient_id], lazy="selectin")
