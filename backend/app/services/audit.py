"""
Audit log service — auto-logs mutations on sensitive models.

How it works:
  1. The API layer stores the current actor on the DB session:
         db.info["actor"] = current_user   # dict-like access
     This is done by a small helper `set_audit_actor(db, user)`.

  2. This module registers a SQLAlchemy `before_flush` event listener that
     inspects pending changes (session.new / session.dirty / session.deleted)
     and, for each change to an audited model, creates an AuditLog row.

  3. Because AuditLog itself is added to the session during the listener,
     we mark it in `_already_audited` so the listener doesn't try to audit
     its own audit rows.

Covered models:
  User, Appointment, Encounter, Prescription, Vital, LabOrder, LabResult,
  Bill, VideoCall, Thread, Message

Not covered (would be noise or recursion):
  RefreshToken, Notification, MessageAttachment, BillItem, ThreadParticipant,
  AuditLog
"""

from __future__ import annotations

import logging
from typing import Any

from sqlalchemy import event, inspect as sa_inspect
from sqlalchemy.orm import Session

from app.models.appointment import Appointment
from app.models.audit_log import AuditAction, AuditLog
from app.models.billing import Bill
from app.models.call import VideoCall
from app.models.content import ContentBlock
from app.models.encounter import Encounter
from app.models.lab import LabOrder, LabResult
from app.models.messaging import Message, Thread
from app.models.prescription import Prescription
from app.models.user import User
from app.models.vital import Vital


logger = logging.getLogger("bersabeh.audit")


# ============================================================
# Which models to audit
# ============================================================
AUDITED_MODELS: set[type] = {
    User,
    Appointment,
    Encounter,
    Prescription,
    Vital,
    LabOrder,
    LabResult,
    Bill,
    VideoCall,
    Thread,
    Message,
    ContentBlock,
}


# Fields we never store in the audit snapshot (sensitive or noisy).
FORBIDDEN_FIELDS: set[str] = {
    "hashed_password",
    "before_json",
    "after_json",
    "diff_json",
    "updated_at",   # noisy — changes every save
}


# ============================================================
# Actor setting helper
# ============================================================
def set_audit_actor(db: Session, user: Any | None) -> None:
    """
    Store the current actor on the session so the event listener can find it.
    Call this at the top of any endpoint that mutates data (or in a dependency).
    """
    try:
        db.info["actor_id"] = getattr(user, "id", None) if user else None
    except Exception:  # noqa: BLE001
        db.info["actor_id"] = None


# ============================================================
# Snapshot helpers
# ============================================================
def _snapshot(obj: Any) -> dict[str, Any]:
    """Return a JSON-friendly snapshot of an ORM object's columns."""
    result: dict[str, Any] = {}
    try:
        for column in sa_inspect(obj).mapper.columns:
            name = column.key
            if name in FORBIDDEN_FIELDS:
                continue
            value = getattr(obj, name, None)
            # Serialize simple types to strings for JSON safety
            if value is None or isinstance(value, (str, int, float, bool)):
                result[name] = value
            else:
                try:
                    result[name] = str(value)
                except Exception:  # noqa: BLE001
                    result[name] = None
    except Exception as exc:  # noqa: BLE001
        logger.debug("Snapshot failed: %s", exc)
    return result


def _diff(before: dict[str, Any], after: dict[str, Any]) -> dict[str, Any]:
    """Return only keys whose values changed."""
    out: dict[str, Any] = {}
    for k, v in after.items():
        if before.get(k) != v:
            out[k] = {"from": before.get(k), "to": v}
    return out


# ============================================================
# The event listener
# ============================================================
@event.listens_for(Session, "before_flush")
def _audit_before_flush(session: Session, flush_context, instances) -> None:
    actor_id = session.info.get("actor_id")

    # ---- NEW objects ----
    for obj in list(session.new):
        if type(obj) not in AUDITED_MODELS:
            continue
        after = _snapshot(obj)
        session.add(AuditLog(
            actor_id=actor_id,
            action=AuditAction.CREATE,
            entity_type=type(obj).__name__,
            entity_id=getattr(obj, "id", None),
            description=f"Created {type(obj).__name__}",
            after_json=after,
        ))

    # ---- DIRTY objects (updates) ----
    for obj in list(session.dirty):
        if type(obj) not in AUDITED_MODELS:
            continue
        try:
            state = sa_inspect(obj)
            before: dict[str, Any] = {}
            after: dict[str, Any] = {}
            for attr in state.attrs:
                hist = attr.load_history()
                if hist.has_changes() and hist.deleted:
                    before[attr.key] = hist.deleted[0] if hist.deleted else None
                    after[attr.key] = getattr(obj, attr.key, None)
                elif attr.key in state.dict:
                    after[attr.key] = getattr(obj, attr.key, None)
            # Filter forbidden fields
            before = {k: v for k, v in before.items() if k not in FORBIDDEN_FIELDS}
            after = {k: v for k, v in after.items() if k not in FORBIDDEN_FIELDS}
            # Serialize non-primitives
            for d in (before, after):
                for k, v in list(d.items()):
                    if v is not None and not isinstance(v, (str, int, float, bool)):
                        try:
                            d[k] = str(v)
                        except Exception:  # noqa: BLE001
                            d[k] = None
            if not before and not after:
                continue
            diff = _diff(before, after)
            if not diff:
                continue
            session.add(AuditLog(
                actor_id=actor_id,
                action=AuditAction.UPDATE,
                entity_type=type(obj).__name__,
                entity_id=getattr(obj, "id", None),
                description=f"Updated {type(obj).__name__}",
                before_json=before,
                after_json=after,
                diff_json=diff,
            ))
        except Exception as exc:  # noqa: BLE001
            logger.debug("Update audit failed: %s", exc)

    # ---- DELETED objects ----
    for obj in list(session.deleted):
        if type(obj) not in AUDITED_MODELS:
            continue
        before = _snapshot(obj)
        session.add(AuditLog(
            actor_id=actor_id,
            action=AuditAction.DELETE,
            entity_type=type(obj).__name__,
            entity_id=getattr(obj, "id", None),
            description=f"Deleted {type(obj).__name__}",
            before_json=before,
        ))
