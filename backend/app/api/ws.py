"""
WebSocket endpoint for real-time notification push.

Handshake:
  1. Client opens WS to /api/v1/ws/notifications
  2. Client sends a JSON line: {"type": "auth", "token": "<JWT access token>"}
  3. Server validates and registers the connection.
  4. Server pushes JSON payloads as they arrive from the message/notify layer.

If the token is invalid or missing, the server closes with code 4401.
"""

import json
import logging
import uuid

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, status
from sqlalchemy import select

from app.core.security import decode_token
from app.db.session import AsyncSessionLocal
from app.models.user import User, UserStatus
from app.services.websocket_manager import manager


logger = logging.getLogger("bersabeh.ws")

router = APIRouter()


@router.websocket("/ws/notifications")
async def notifications_ws(websocket: WebSocket):
    """Real-time push for messages + notifications."""
    # Accept first — we need to be able to send a rejection message.
    await websocket.accept()

    user_id: uuid.UUID | None = None

    try:
        # ---- 1. Wait for auth message ----
        raw = await websocket.receive_text()
        try:
            handshake = json.loads(raw)
        except json.JSONDecodeError:
            await websocket.close(code=4400, reason="First message must be JSON")
            return

        if handshake.get("type") != "auth" or not handshake.get("token"):
            await websocket.close(code=4400, reason="Missing auth handshake")
            return

        try:
            claims = decode_token(handshake["token"], expected_type="access")
        except ValueError as exc:
            await websocket.close(code=4401, reason=f"Invalid token: {exc}")
            return

        user_id = uuid.UUID(claims["sub"])

        # Verify the user is still active.
        async with AsyncSessionLocal() as db:
            result = await db.execute(select(User).where(User.id == user_id))
            user = result.scalar_one_or_none()
            if user is None or user.is_deleted or user.status != UserStatus.ACTIVE:
                await websocket.close(code=4403, reason="Account not usable")
                return

        # ---- 2. Register with manager ----
        # We already accepted above, so this call just registers.
        # But manager.connect() also accepts — we need a variant that
        # skips accept. For simplicity, keep the accept idempotent.
        async with manager._lock:                    # noqa: SLF001 (simple internal use)
            manager._connections[user_id].add(websocket)  # noqa: SLF001

        # Send a confirmation so the client knows it's live.
        await websocket.send_json({
            "type": "connected",
            "user_id": str(user_id),
        })

        # ---- 3. Keep the connection alive until the client disconnects ----
        while True:
            # We don't expect inbound messages after the handshake, but we
            # must await to keep the connection open and detect disconnects.
            try:
                msg = await websocket.receive_text()
                # Optional: handle a client-side ping.
                if msg.strip() == "ping":
                    await websocket.send_text("pong")
            except WebSocketDisconnect:
                break

    except WebSocketDisconnect:
        logger.info("WS client disconnected: user=%s", user_id)
    except Exception as exc:  # noqa: BLE001
        logger.exception("WS error: %s", exc)
    finally:
        if user_id is not None:
            await manager.disconnect(user_id, websocket)
