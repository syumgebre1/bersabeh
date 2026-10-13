"""
Pydantic schemas for content endpoints.

Two response shapes:
  - ContentBlockRead / Brief — for the CMS UI (full metadata)
  - ContentPublic / Bundle   — for the landing page + mobile app (minimal)

The public shape strips is_active, sort_order, category, description, etc.
The bundle is a flat `{key: value}` dict so the frontend can do
`content["landing.hero.headline"]` directly.

Request shapes:
  - ContentBlockCreate — upsert semantics (create-or-replace the (key, locale) row)
  - ContentBlockUpdate — partial update of an existing block
  - ContentReorder     — bulk sort_order updates
"""

import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from app.models.content import ContentCategory


# ============================================================
# Requests
# ============================================================

class ContentBlockCreate(BaseModel):
    """
    Create or update a content block.

    Upsert semantics: if (key, locale) already exists, its value/description/
    category are replaced. Otherwise, a new row is created.
    """
    key: str = Field(..., min_length=1, max_length=200)
    locale: str = Field("en", min_length=2, max_length=8)
    value: Any = None    # JSONB — accept anything
    category: ContentCategory
    description: str | None = Field(None, max_length=500)
    sort_order: int = 0


class ContentBlockUpdate(BaseModel):
    """Partial update. All fields optional."""
    value: Any = None
    description: str | None = Field(None, max_length=500)
    is_active: bool | None = None
    sort_order: int | None = None


class ContentReorderItem(BaseModel):
    id: uuid.UUID
    sort_order: int


class ContentReorder(BaseModel):
    items: list[ContentReorderItem] = Field(..., min_length=1, max_length=200)


# ============================================================
# Responses — CMS
# ============================================================

class ContentBlockRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    key: str
    locale: str
    value: Any = None
    category: ContentCategory
    description: str | None = None
    is_active: bool
    sort_order: int
    updated_by_id: uuid.UUID | None = None
    created_at: datetime
    updated_at: datetime


class ContentBlockBrief(BaseModel):
    """Slim CMS row for list views."""
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    key: str
    locale: str
    category: ContentCategory
    description: str | None = None
    is_active: bool
    sort_order: int
    updated_at: datetime


# ============================================================
# Responses — public
# ============================================================

class ContentPublic(BaseModel):
    """Minimal shape for public consumption (landing page / mobile)."""
    model_config = ConfigDict(from_attributes=True)

    key: str
    value: Any = None


class ContentBundle(BaseModel):
    """
    Everything for one locale, as a flat {key: value} dict.
    The frontend can look up any string by its dotted key.
    """
    locale: str
    content: dict[str, Any]
    count: int
