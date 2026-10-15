"""
Room — physical room in the clinic.

Matches the DB schema created by the original nurse backend:
  - room_type is a Postgres ENUM (general / private / icu / isolation / maternity)
  - floor is a varchar (free-form like "1", "B1", "3F")
"""

import enum
import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    Enum as SAEnum,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class RoomType(str, enum.Enum):
    GENERAL = "general"
    PRIVATE = "private"
    ICU = "icu"
    ISOLATION = "isolation"
    MATERNITY = "maternity"


class Room(Base):
    __tablename__ = "rooms"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4,
    )
    number: Mapped[str] = mapped_column(String(20), nullable=False, unique=True, index=True)
    ward: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    floor: Mapped[str | None] = mapped_column(String(20), nullable=True)
    room_type: Mapped[RoomType] = mapped_column(
        SAEnum(RoomType, name="room_type",
               values_callable=lambda e: [m.value for m in e]),
        nullable=False, default=RoomType.GENERAL, index=True,
    )
    capacity: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, index=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now(),
    )

    assignments = relationship(
        "BedAssignment",
        back_populates="room",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return f"<Room {self.number} ward={self.ward} type={self.room_type.value}>"
