"""
File storage service — one interface, local-disk implementation for now.

Design goals:
  - APIs import a single `storage` object and call save/delete/url_for.
  - Changing to S3/R2 later means changing ONE class, not every endpoint.
  - Filenames are sanitized: the user's original name is stored as metadata,
    the actual on-disk file is renamed with a UUID + safe extension.
  - All files land under ./uploads/ (configurable via settings.UPLOAD_DIR).

Typical usage in an API:

    from app.services.storage import storage

    saved = await storage.save(upload_file, folder="chat")
    print(saved.url)         # "/uploads/chat/2026/10/abc123.pdf"
    print(saved.size_bytes)  # 12345
"""

from __future__ import annotations

import os
import re
import secrets
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Protocol

from fastapi import UploadFile

from app.core.config import settings


# ============================================================
# Result type
# ============================================================

@dataclass(frozen=True)
class SavedFile:
    """What a successful save returns."""
    relative_path: str      # "chat/2026/10/abc123.pdf" (no leading slash)
    url: str                # "/uploads/chat/2026/10/abc123.pdf"
    original_filename: str  # what the user called it
    content_type: str
    size_bytes: int


# ============================================================
# Content-type whitelist
# ============================================================

# Non-video types (smaller limits)
IMAGE_TYPES = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
}

PDF_TYPES = {
    "application/pdf": ".pdf",
}

VIDEO_TYPES = {
    "video/mp4": ".mp4",
    "video/webm": ".webm",
    "video/quicktime": ".mov",
}

ALLOWED_TYPES: dict[str, str] = {**IMAGE_TYPES, **PDF_TYPES, **VIDEO_TYPES}

# Per-category size limits (from .env, converted to bytes).
MAX_IMAGE_BYTES = settings.MAX_IMAGE_MB * 1024 * 1024
MAX_PDF_BYTES = settings.MAX_PDF_MB * 1024 * 1024
MAX_VIDEO_BYTES = settings.MAX_VIDEO_MB * 1024 * 1024


# ============================================================
# Interface
# ============================================================

class StorageService(Protocol):
    async def save(self, upload: UploadFile, folder: str = "chat") -> SavedFile: ...
    def delete(self, relative_path: str) -> None: ...
    def url_for(self, relative_path: str) -> str: ...


# ============================================================
# Local-disk implementation
# ============================================================

_SAFE_FILENAME_RE = re.compile(r"[^A-Za-z0-9._-]+")


def _sanitize_ext(original_filename: str, content_type: str) -> str:
    """
    Decide what extension the saved file should have.
    We trust content_type over the original filename (browsers lie).
    """
    if content_type in ALLOWED_TYPES:
        return ALLOWED_TYPES[content_type]
    # Fallback to the original extension if it looks safe.
    ext = Path(original_filename).suffix.lower()
    if re.fullmatch(r"\.[a-z0-9]{1,5}", ext):
        return ext
    return ".bin"


def _safe_display_name(original_filename: str) -> str:
    """Strip path components and unsafe chars from the display filename."""
    name = Path(original_filename).name
    return _SAFE_FILENAME_RE.sub("_", name)[:200] or "file"


class LocalStorageService:
    """Stores files on local disk under settings.UPLOAD_DIR."""

    def __init__(self, base_dir: str | None = None, public_prefix: str = "/uploads") -> None:
        self.base_dir = Path(base_dir or settings.UPLOAD_DIR).resolve()
        self.public_prefix = public_prefix.rstrip("/")
        self.base_dir.mkdir(parents=True, exist_ok=True)

    # ---- Save ----
    async def save(self, upload: UploadFile, folder: str = "chat") -> SavedFile:
        original = upload.filename or "unnamed"
        content_type = upload.content_type or "application/octet-stream"

        # Whitelist check.
        if content_type not in ALLOWED_TYPES:
            raise ValueError(
                f"Unsupported file type {content_type!r}. "
                f"Allowed: {sorted(ALLOWED_TYPES.keys())}"
            )

        # Read the file into memory to check size (fine for our limits).
        data = await upload.read()
        size = len(data)

        # Per-category size check.
        if content_type in IMAGE_TYPES and size > MAX_IMAGE_BYTES:
            raise ValueError(f"Image exceeds {settings.MAX_IMAGE_MB} MB limit")
        if content_type in PDF_TYPES and size > MAX_PDF_BYTES:
            raise ValueError(f"PDF exceeds {settings.MAX_PDF_MB} MB limit")
        if content_type in VIDEO_TYPES and size > MAX_VIDEO_BYTES:
            raise ValueError(f"Video exceeds {settings.MAX_VIDEO_MB} MB limit")

        # Build the safe path: folder/YYYY/MM/uuid.ext
        now = datetime.now(timezone.utc)
        ext = _sanitize_ext(original, content_type)
        unique = secrets.token_hex(12)
        rel_dir = Path(folder) / f"{now.year}" / f"{now.month:02d}"
        rel_filename = f"{unique}{ext}"
        rel_path = rel_dir / rel_filename

        abs_dir = self.base_dir / rel_dir
        abs_dir.mkdir(parents=True, exist_ok=True)
        abs_path = self.base_dir / rel_path

        with open(abs_path, "wb") as f:
            f.write(data)

        rel_str = str(rel_path).replace(os.sep, "/")
        return SavedFile(
            relative_path=rel_str,
            url=f"{self.public_prefix}/{rel_str}",
            original_filename=_safe_display_name(original),
            content_type=content_type,
            size_bytes=size,
        )

    # ---- Delete ----
    def delete(self, relative_path: str) -> None:
        """Delete a file. Silently ignores missing files."""
        abs_path = self.base_dir / relative_path
        try:
            abs_path.unlink()
        except FileNotFoundError:
            pass

    # ---- URL ----
    def url_for(self, relative_path: str) -> str:
        return f"{self.public_prefix}/{relative_path.lstrip('/')}"


# ============================================================
# Module-level singleton
# ============================================================
storage: StorageService = LocalStorageService()
