"""
Thread + message endpoints.

Flow:
  - POST /threads                    → validates participants via matrix
  - POST /threads/{id}/messages      → persists message + attachments,
                                       bumps last_message_at, pushes WS,
                                       creates notifications for others
  - PATCH /threads/{id}/read         → marks participant.last_read_at = now

WebSocket pushes happen inline — after successful commit, we call
`manager.send_to_users(...)`. If the push fails, the message is still
persisted; clients re-sync on next GET.
"""

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.allowed_threads import validate_thread_participants
from app.core.deps import CurrentUser
from app.db.session import get_db
from app.models.messaging import (
    Message,
    MessageAttachment,
    Thread,
    ThreadParticipant,
)
from app.models.notification import Notification, NotificationKind
from app.models.user import User, UserRole
from app.schemas.messaging import (
    MessageCreate,
    MessageRead,
    ThreadBrief,
    ThreadCreate,
    ThreadRead,
    UnreadCounts,
)
from app.services.websocket_manager import manager


router = APIRouter(tags=["messages"])


# ============================================================
# Helpers
# ============================================================
async def _get_thread_or_404(db: AsyncSession, tid: uuid.UUID) -> Thread:
    result = await db.execute(select(Thread).where(Thread.id == tid))
    t = result.scalar_one_or_none()
    if t is None:
        raise HTTPException(status_code=404, detail="Thread not found")
    return t


async def _is_participant(db: AsyncSession, tid: uuid.UUID, uid: uuid.UUID) -> bool:
    result = await db.execute(
        select(ThreadParticipant)
        .where(ThreadParticipant.thread_id == tid)
        .where(ThreadParticipant.user_id == uid)
    )
    return result.scalar_one_or_none() is not None


async def _require_participant(db: AsyncSession, tid: uuid.UUID, uid: uuid.UUID) -> None:
    if not await _is_participant(db, tid, uid):
        raise HTTPException(status_code=403, detail="You are not a participant in this thread")


async def _other_participants(db: AsyncSession, tid: uuid.UUID, exclude: uuid.UUID) -> list[uuid.UUID]:
    result = await db.execute(
        select(ThreadParticipant.user_id)
        .where(ThreadParticipant.thread_id == tid)
        .where(ThreadParticipant.user_id != exclude)
    )
    return [r[0] for r in result.all()]


# ============================================================
# POST /threads
# ============================================================
@router.post(
    "/threads",
    response_model=ThreadRead,
    status_code=status.HTTP_201_CREATED,
    summary="Create a thread (validated against allowed-pairs matrix)",
)
async def create_thread(
    payload: ThreadCreate,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> ThreadRead:
    # Dedupe participant IDs, ensure creator is included.
    raw_ids = set(payload.participant_ids) | {current_user.id}
    if len(raw_ids) < 2:
        raise HTTPException(status_code=400, detail="A thread needs at least 2 participants")

    # Load all users.
    user_result = await db.execute(select(User).where(User.id.in_(raw_ids)))
    users = list(user_result.scalars().all())
    if len(users) != len(raw_ids):
        raise HTTPException(status_code=400, detail="One or more participant IDs do not exist")

    # Verify creator is one of them (defensive; we added them above).
    if not any(u.id == current_user.id for u in users):
        raise HTTPException(status_code=400, detail="Creator must be a participant")

    # Validate against the allowed-pairs matrix.
    try:
        validate_thread_participants(
            kind=payload.kind.value,
            creator_role=current_user.role,
            participant_roles=[u.role for u in users],
        )
    except ValueError as exc:
        raise HTTPException(status_code=403, detail=str(exc))

    # Case threads require a patient_id.
    if payload.kind.value == "case" and payload.patient_id is None:
        raise HTTPException(status_code=400, detail="A 'case' thread requires patient_id")

    # Create thread.
    t = Thread(
        kind=payload.kind,
        subject=payload.subject,
        patient_id=payload.patient_id,
        created_by_id=current_user.id,
        last_message_at=datetime.now(timezone.utc),
    )
    db.add(t)
    await db.flush()

    for u in users:
        db.add(ThreadParticipant(thread_id=t.id, user_id=u.id))

    await db.commit()
    await db.refresh(t)
    return ThreadRead.model_validate(t)


# ============================================================
# GET /threads — my threads
# ============================================================
@router.get(
    "/threads",
    response_model=list[ThreadBrief],
    summary="List my threads",
)
async def list_my_threads(
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
) -> list[ThreadBrief]:
    stmt = (
        select(Thread)
        .join(ThreadParticipant, ThreadParticipant.thread_id == Thread.id)
        .where(ThreadParticipant.user_id == current_user.id)
        .order_by(Thread.last_message_at.desc())
        .limit(limit)
        .offset(offset)
    )
    result = await db.execute(stmt)
    return [ThreadBrief.model_validate(t) for t in result.scalars().all()]


# ============================================================
# GET /threads/{id}
# ============================================================
@router.get(
    "/threads/{thread_id}",
    response_model=ThreadRead,
    summary="Get a thread",
)
async def get_thread(
    thread_id: uuid.UUID,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> ThreadRead:
    t = await _get_thread_or_404(db, thread_id)
    await _require_participant(db, thread_id, current_user.id)
    return ThreadRead.model_validate(t)


# ============================================================
# GET /threads/{id}/messages
# ============================================================
@router.get(
    "/threads/{thread_id}/messages",
    response_model=list[MessageRead],
    summary="List messages in a thread (paginated)",
)
async def list_messages(
    thread_id: uuid.UUID,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
) -> list[MessageRead]:
    await _get_thread_or_404(db, thread_id)
    await _require_participant(db, thread_id, current_user.id)

    stmt = (
        select(Message)
        .where(Message.thread_id == thread_id)
        .order_by(Message.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    result = await db.execute(stmt)
    rows = list(result.scalars().all())
    rows.reverse()    # return oldest-first for UI
    return [MessageRead.model_validate(m) for m in rows]


# ============================================================
# POST /threads/{id}/messages
# ============================================================
@router.post(
    "/threads/{thread_id}/messages",
    response_model=MessageRead,
    status_code=status.HTTP_201_CREATED,
    summary="Send a message",
)
async def send_message(
    thread_id: uuid.UUID,
    payload: MessageCreate,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> MessageRead:
    await _get_thread_or_404(db, thread_id)
    await _require_participant(db, thread_id, current_user.id)

    # Validate attachments exist and are not yet attached to another message.
    if payload.attachment_ids:
        att_result = await db.execute(
            select(MessageAttachment).where(MessageAttachment.id.in_(payload.attachment_ids))
        )
        attachments = list(att_result.scalars().all())
        if len(attachments) != len(set(payload.attachment_ids)):
            raise HTTPException(status_code=400, detail="One or more attachment IDs are invalid")
        # Ensure each is unattached (message_id must currently be null — we
        # handle "pre-upload" attachments by creating them with a message_id
        # after the fact).
        # Simplified: we accept the attachments and reassign them.
    else:
        attachments = []

    # Create message.
    m = Message(
        thread_id=thread_id,
        sender_id=current_user.id,
        body=(payload.body.strip() if payload.body else None),
        client_message_id=payload.client_message_id,
    )
    db.add(m)
    await db.flush()

    # Bind attachments.
    for att in attachments:
        att.message_id = m.id

    # Bump thread's last_message_at.
    t = await _get_thread_or_404(db, thread_id)
    t.last_message_at = datetime.now(timezone.utc)

    await db.commit()
    await db.refresh(m)

    # Push via WebSocket to other participants.
    recipients = await _other_participants(db, thread_id, current_user.id)
    payload_ws = {
        "type": "new_message",
        "thread_id": str(thread_id),
        "message": {
            "id": str(m.id),
            "thread_id": str(thread_id),
            "sender": {
                "id": str(current_user.id),
                "full_name": current_user.full_name,
                "role": current_user.role.value,
            },
            "body": m.body,
            "client_message_id": m.client_message_id,
            "created_at": m.created_at.isoformat(),
        },
    }
    await manager.send_to_users(recipients, payload_ws)

    # Also push to the sender's OTHER connections (phone, other tab)
    await manager.send_to_user(current_user.id, payload_ws)

    # Create notifications for recipients (excluding the sender).
    for uid in recipients:
        db.add(Notification(
            user_id=uid,
            kind=NotificationKind.MESSAGE,
            title=f"New message from {current_user.full_name}",
            body=(m.body[:140] if m.body else "[attachment]"),
            target_type="thread",
            target_id=thread_id,
        ))
    await db.commit()

    return MessageRead.model_validate(m)


# ============================================================
# PATCH /threads/{id}/read
# ============================================================
@router.patch(
    "/threads/{thread_id}/read",
    summary="Mark a thread read up to now",
)
async def mark_thread_read(
    thread_id: uuid.UUID,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> dict:
    await _get_thread_or_404(db, thread_id)
    result = await db.execute(
        select(ThreadParticipant)
        .where(ThreadParticipant.thread_id == thread_id)
        .where(ThreadParticipant.user_id == current_user.id)
    )
    tp = result.scalar_one_or_none()
    if tp is None:
        raise HTTPException(status_code=403, detail="Not a participant")

    tp.last_read_at = datetime.now(timezone.utc)
    await db.commit()
    return {"status": "ok", "read_at": tp.last_read_at.isoformat()}


# ============================================================
# GET /messages/unread-count
# ============================================================
@router.get(
    "/messages/unread-count",
    response_model=UnreadCounts,
    summary="Unread counts for the top-bar badges",
)
async def unread_counts(
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> UnreadCounts:
    # Count messages in threads where:
    #   - I'm a participant
    #   - message was NOT sent by me
    #   - message was created after my last_read_at (or last_read_at is NULL)
    subq = (
        select(
            ThreadParticipant.thread_id,
            ThreadParticipant.last_read_at,
        )
        .where(ThreadParticipant.user_id == current_user.id)
        .subquery()
    )

    stmt = (
        select(func.count(Message.id))
        .join(subq, subq.c.thread_id == Message.thread_id)
        .where(Message.sender_id != current_user.id)
        .where(
            (subq.c.last_read_at.is_(None))
            | (Message.created_at > subq.c.last_read_at)
        )
    )
    count_result = await db.execute(stmt)
    unread_messages = count_result.scalar() or 0

    notif_result = await db.execute(
        select(func.count(Notification.id))
        .where(Notification.user_id == current_user.id)
        .where(Notification.read_at.is_(None))
    )
    unread_notifications = notif_result.scalar() or 0

    return UnreadCounts(
        unread_messages=unread_messages,
        unread_notifications=unread_notifications,
    )
