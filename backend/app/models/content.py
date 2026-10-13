"""
ContentBlock — the single table that powers the entire CMS.

Every editable string, number, or object lives here, keyed by a dot-notation
path and a locale. The landing page and mobile app fetch
`GET /content?locale=en` at boot and render whatever the CMS says.

Design:
  - `key`         — e.g. "landing.hero.headline", "departments.cardiology.name"
  - `locale`      — "en" | "am" | "ti"
  - `value`       — JSONB. Can be a string, number, object, or array.
  - `category`    — for CMS grouping (landing, clinic_info, departments, ...)
  - `description` — human-readable label shown in the CMS editor
  - `is_active`   — soft toggle (hide without deleting)
  - `sort_order`  — drag-and-drop ordering within a category

Why JSONB?
  Different content types need different shapes. "Hero headline" is a string.
  "Departments list" is an array of objects. "Working hours" is a nested
  object with weekday/saturday/sunday keys. Storing all of them as JSONB in
  one column means one table, one API, one editor UI.

Why (key, locale) unique?
  The CMS shows the admin "English value" and "Amharic value" side by side
  for the same logical block. Two rows with the same (key, locale) would be
  ambiguous.

Translation fallback:
  When a client requests locale=am and a block has no `am` row, the service
  falls back to `en`. See services/content_seed.py and api/content.py.
"""

import enum
import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    Enum as SAEnum,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


# ============================================================
# Enums
# ============================================================

class ContentCategory(str, enum.Enum):
    LANDING = "landing"              # hero, trust strip, CTA, footer copy
    CLINIC_INFO = "clinic_info"      # phone, address, hours, license
    DEPARTMENTS = "departments"      # department definitions
    SERVICES = "services"            # service names, descriptions, pricing
    DOCTORS = "doctors"              # per-doctor blurb, photo URL, etc.
    ABOUT = "about"                  # about text, mission, history
    LEGAL = "legal"                  # terms, privacy (future)


# ============================================================
# Model
# ============================================================

class ContentBlock(Base):
    __tablename__ = "content_blocks"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4,
    )

    key: Mapped[str] = mapped_column(String(200), nullable=False, index=True)
    locale: Mapped[str] = mapped_column(String(8), nullable=False, default="en", index=True)

    value: Mapped[dict | list | str | int | float | bool | None] = mapped_column(
        JSONB, nullable=True,
    )

    category: Mapped[ContentCategory] = mapped_column(
        SAEnum(ContentCategory, name="content_category",
               values_callable=lambda e: [m.value for m in e]),
        nullable=False, index=True,
    )

    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, index=True)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    updated_by_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now(),
    )

    updated_by = relationship("User", lazy="selectin")

    __table_args__ = (
        # One value per (key, locale).
        UniqueConstraint("key", "locale", name="uq_content_blocks_key_locale"),
        # Fast fetch of everything in a category (for the landing page).
        Index("ix_content_blocks_category_active", "category", "is_active"),
        # Fast fetch of "everything for a locale".
        Index("ix_content_blocks_locale_active", "locale", "is_active"),
    )

    def __repr__(self) -> str:
        v = self.value
        preview = (str(v)[:40] + "...") if v and len(str(v)) > 40 else v
        return f"<ContentBlock {self.key}[{self.locale}] = {preview!r}>"
