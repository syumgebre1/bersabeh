"""
Jitsi Meet room URL generator.

Design:
  - Room names are deterministic: `bersabeh-call-{call_id}`. If we ever lose
    the URL stored on the VideoCall row, we can regenerate the same one.
  - Base URL is configurable (JITSI_BASE_URL). Default: meet.jit.si (the
    public Jitsi Meet service). For production, point at a self-hosted Jitsi
    (e.g. https://meet.bersabehclinic.com) — see DECISIONS.md D007.
  - No JWT signing is done for meet.jit.si (it's an open room).
    For self-hosted Jitsi with JWT auth, we'd add signing here.

Why Jitsi and not custom WebRTC?
  See DECISIONS.md D007. Real WebRTC needs STUN/TURN + signaling + native
  media negotiation — weeks of work. Jitsi delivers working HD video in a
  WebView with zero media plumbing.
"""

from __future__ import annotations

import uuid

from app.core.config import settings


# ------------------------------------------------------------
# Config accessors
# ------------------------------------------------------------
def _base_url() -> str:
    """The Jitsi base URL, trailing slash removed."""
    url = getattr(settings, "JITSI_BASE_URL", "https://meet.jit.si")
    return url.rstrip("/")


# ------------------------------------------------------------
# Public API
# ------------------------------------------------------------
def generate_room_name(call_id: uuid.UUID | str) -> str:
    """
    Deterministic, URL-safe room name for a call.

    Format: bersabeh-call-<uuid-hex>
    Example: bersabeh-call-3a4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f
    """
    if isinstance(call_id, uuid.UUID):
        suffix = call_id.hex
    else:
        # Accept a string UUID — normalize to hex form
        suffix = uuid.UUID(str(call_id)).hex
    return f"bersabeh-call-{suffix}"


def generate_room_url(call_id: uuid.UUID | str) -> str:
    """Full URL both parties open to join the call."""
    return f"{_base_url()}/{generate_room_name(call_id)}"


def verify_room_url(url: str) -> bool:
    """
    Basic sanity check: is this URL a Jitsi room on our configured base?
    Used as a defensive check when accepting a call.
    """
    if not url:
        return False
    return url.startswith(_base_url() + "/bersabeh-call-")
