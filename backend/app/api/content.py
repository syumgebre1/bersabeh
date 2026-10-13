"""
Content endpoints — public read for the landing page, admin write for the CMS.

Endpoints:
  GET    /content              public — bundle for a locale
  GET    /content/blocks       admin  — full CMS list with metadata
  GET    /content/{key}        public — single block (locale via query)
  POST   /content              admin  — upsert a block
  PATCH  /content/{id}         admin  — partial update
  POST   /content/reorder      admin  — bulk reorder
  DELETE /content/{id}         admin  — soft delete (is_active=False)

Fallback:
  When locale="am" or "ti" is requested and a block doesn't have a value
  in that locale (or the value starts with "[TODO: translate]"), we fall
  back to the English value. This keeps the frontend from rendering blank
  strings on incomplete translations.

Cache:
  The public bundle is cached in-process for 60 seconds to reduce DB load.
  Invalidate manually by calling `content_cache.clear()` after writes.
"""

from __future__ import annotations

import time
import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import AdminUser, CurrentUser
from app.db.session import get_db
from app.models.content import ContentBlock, ContentCategory
from app.schemas.content import (
    ContentBlockBrief,
    ContentBlockCreate,
    ContentBlockRead,
    ContentBlockUpdate,
    ContentBundle,
    ContentPublic,
    ContentReorder,
)
from app.services.audit import set_audit_actor


router = APIRouter(prefix="/content", tags=["content"])


# ============================================================
# Simple in-process cache for the public bundle
# ============================================================
class _Cache:
    def __init__(self, ttl_seconds: int = 60) -> None:
        self.ttl = ttl_seconds
        self._store: dict[str, tuple[float, dict[str, Any]]] = {}

    def get(self, key: str) -> dict[str, Any] | None:
        item = self._store.get(key)
        if not item:
            return None
        ts, value = item
        if time.time() - ts > self.ttl:
            self._store.pop(key, None)
            return None
        return value

    def set(self, key: str, value: dict[str, Any]) -> None:
        self._store[key] = (time.time(), value)

    def clear(self) -> None:
        self._store.clear()


content_cache = _Cache(ttl_seconds=60)


# ============================================================
# Helpers
# ============================================================
async def _build_bundle(db: AsyncSession, locale: str) -> tuple[dict[str, Any], int]:
    """
    Return (content_dict, count). Fills missing values from English.
    """
    # Load all active blocks for the requested locale AND English (for fallback).
    stmt = (
        select(ContentBlock)
        .where(ContentBlock.is_active.is_(True))
        .where(ContentBlock.locale.in_([locale, "en"]))
    )
    result = await db.execute(stmt)
    rows = list(result.scalars().all())

    # Group by (key, locale).
    by_key: dict[str, dict[str, ContentBlock]] = {}
    for b in rows:
        by_key.setdefault(b.key, {})[b.locale] = b

    out: dict[str, Any] = {}
    for key, loc_map in by_key.items():
        chosen: ContentBlock | None = None
        if locale in loc_map:
            candidate = loc_map[locale]
            # If the description starts with "[TODO: translate]", fall back to English.
            desc = (candidate.description or "")
            if not desc.startswith("[TODO: translate]"):
                chosen = candidate
        if chosen is None:
            chosen = loc_map.get("en") or loc_map.get(locale)
        if chosen is not None:
            out[key] = chosen.value

    return out, len(out)


async def _get_block_or_404(db: AsyncSession, block_id: uuid.UUID) -> ContentBlock:
    result = await db.execute(select(ContentBlock).where(ContentBlock.id == block_id))
    b = result.scalar_one_or_none()
    if b is None:
        raise HTTPException(status_code=404, detail="Content block not found")
    return b


# ============================================================
# GET /content — public bundle
# ============================================================
@router.get(
    "",
    response_model=ContentBundle,
    summary="Public content bundle for a locale",
)
async def get_bundle(
    db: AsyncSession = Depends(get_db),
    locale: str = Query("en", min_length=2, max_length=8),
) -> ContentBundle:
    cached = content_cache.get(locale)
    if cached is not None:
        return ContentBundle(locale=locale, content=cached, count=len(cached))

    content, count = await _build_bundle(db, locale)
    content_cache.set(locale, content)
    return ContentBundle(locale=locale, content=content, count=count)


# ============================================================
# GET /content/blocks — admin CMS list
# ============================================================
@router.get(
    "/blocks",
    response_model=list[ContentBlockBrief],
    summary="List content blocks for CMS (admin)",
)
async def list_blocks(
    _admin: AdminUser,
    db: AsyncSession = Depends(get_db),
    category: ContentCategory | None = Query(None),
    locale: str | None = Query(None, min_length=2, max_length=8),
    is_active: bool | None = Query(None),
    search: str | None = Query(None, min_length=1, max_length=100),
    limit: int = Query(500, ge=1, le=2000),
    offset: int = Query(0, ge=0),
) -> list[ContentBlockBrief]:
    stmt = select(ContentBlock)
    if category is not None:
        stmt = stmt.where(ContentBlock.category == category)
    if locale is not None:
        stmt = stmt.where(ContentBlock.locale == locale)
    if is_active is not None:
        stmt = stmt.where(ContentBlock.is_active == is_active)
    if search:
        like = f"%{search.lower()}%"
        stmt = stmt.where(ContentBlock.key.ilike(like))

    stmt = stmt.order_by(ContentBlock.category, ContentBlock.sort_order, ContentBlock.key)
    stmt = stmt.limit(limit).offset(offset)
    result = await db.execute(stmt)
    return [ContentBlockBrief.model_validate(b) for b in result.scalars().all()]


# ============================================================
# GET /content/{key} — single block (public)
# ============================================================
@router.get(
    "/{key:path}",
    response_model=ContentPublic,
    summary="Get a single content block by key",
)
async def get_block_by_key(
    key: str,
    db: AsyncSession = Depends(get_db),
    locale: str = Query("en", min_length=2, max_length=8),
) -> ContentPublic:
    # Try the requested locale, then fall back to English.
    for try_locale in (locale, "en"):
        result = await db.execute(
            select(ContentBlock)
            .where(ContentBlock.key == key)
            .where(ContentBlock.locale == try_locale)
            .where(ContentBlock.is_active.is_(True))
        )
        block = result.scalar_one_or_none()
        if block is not None:
            return ContentPublic(key=block.key, value=block.value)
    raise HTTPException(status_code=404, detail=f"Content key not found: {key}")


# ============================================================
# POST /content — upsert
# ============================================================
@router.post(
    "",
    response_model=ContentBlockRead,
    status_code=status.HTTP_201_CREATED,
    summary="Create or update a content block (admin)",
)
async def upsert_block(
    payload: ContentBlockCreate,
    admin: AdminUser,
    db: AsyncSession = Depends(get_db),
) -> ContentBlockRead:
    set_audit_actor(db, admin)

    # Look for an existing (key, locale) pair.
    existing = await db.execute(
        select(ContentBlock)
        .where(ContentBlock.key == payload.key)
        .where(ContentBlock.locale == payload.locale)
    )
    block = existing.scalar_one_or_none()

    if block is None:
        block = ContentBlock(
            key=payload.key,
            locale=payload.locale,
            value=payload.value,
            category=payload.category,
            description=payload.description,
            sort_order=payload.sort_order,
            is_active=True,
            updated_by_id=admin.id,
        )
        db.add(block)
    else:
        block.value = payload.value
        block.category = payload.category
        block.description = payload.description
        block.sort_order = payload.sort_order
        block.updated_by_id = admin.id

    await db.commit()
    await db.refresh(block)
    content_cache.clear()    # invalidate
    return ContentBlockRead.model_validate(block)


# ============================================================
# PATCH /content/{id} — partial update
# ============================================================
@router.patch(
    "/{block_id}",
    response_model=ContentBlockRead,
    summary="Partial update (admin)",
)
async def update_block(
    block_id: uuid.UUID,
    payload: ContentBlockUpdate,
    admin: AdminUser,
    db: AsyncSession = Depends(get_db),
) -> ContentBlockRead:
    block = await _get_block_or_404(db, block_id)

    set_audit_actor(db, admin)
    data = payload.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(block, k, v)
    block.updated_by_id = admin.id

    await db.commit()
    await db.refresh(block)
    content_cache.clear()
    return ContentBlockRead.model_validate(block)


# ============================================================
# POST /content/reorder — bulk reorder
# ============================================================
@router.post(
    "/reorder",
    summary="Bulk reorder content blocks (admin)",
)
async def reorder_blocks(
    payload: ContentReorder,
    admin: AdminUser,
    db: AsyncSession = Depends(get_db),
) -> dict:
    set_audit_actor(db, admin)

    ids = [item.id for item in payload.items]
    result = await db.execute(select(ContentBlock).where(ContentBlock.id.in_(ids)))
    rows = {b.id: b for b in result.scalars().all()}

    updated = 0
    for item in payload.items:
        b = rows.get(item.id)
        if b is None:
            continue
        b.sort_order = item.sort_order
        b.updated_by_id = admin.id
        updated += 1

    await db.commit()
    content_cache.clear()
    return {"updated": updated}


# ============================================================
# DELETE /content/{id} — soft delete
# ============================================================
@router.delete(
    "/{block_id}",
    response_model=ContentBlockRead,
    summary="Soft-delete a content block (admin)",
)
async def delete_block(
    block_id: uuid.UUID,
    admin: AdminUser,
    db: AsyncSession = Depends(get_db),
) -> ContentBlockRead:
    block = await _get_block_or_404(db, block_id)

    set_audit_actor(db, admin)
    block.is_active = False
    block.updated_by_id = admin.id

    await db.commit()
    await db.refresh(block)
    content_cache.clear()
    return ContentBlockRead.model_validate(block)
