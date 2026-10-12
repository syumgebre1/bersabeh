"""
WebSocket connection manager.

Tracks all open WebSocket connections grouped by user_id. A single user can
have multiple connections (phone + laptop + multiple browser tabs) — every
one of them receives the same push payloads.

Scope:
  - This is a SINGLE-PROCESS manager. It works correctly with one uvicorn
    worker. For multi-worker deployment, replace the in-memory dict with
    Redis pub/sub — the interface (connect/disconnect/send_to_user) stays
    the same.

Thread-safety:
  - All mutations to `_connections` are guarded by `_lock`.
  - Sends happen outside the lock to avoid blocking other connects while
    waiting on a slow client.
"""

from __future__ import annotations

import asyncio
import json
import logging
import uuid
from collections import defaultdict
from typing import Any

from fastapi import WebSocket


logger = logging.getLogger("bersabeh.ws")


class WebSocketManager:
    """In-memory registry of live WebSocket connections, keyed by user_id."""

    def __init__(self) -> None:
        self._connections: dict[uuid.UUID, set[WebSocket]] = defaultdict(set)
        self._lock = asyncio.Lock()

    # ------------------------------------------------------------
    # Registration
    # ------------------------------------------------------------
    async def connect(self, user_id: uuid.UUID, websocket: WebSocket) -> None:
        """Accept the connection and register it."""
        await websocket.accept()
        async with self._lock:
            self._connections[user_id].add(websocket)
        logger.info(
            "WS connected: user=%s total_for_user=%d",
            user_id, len(self._connections[user_id]),
        )

    async def disconnect(self, user_id: uuid.UUID, websocket: WebSocket) -> None:
        """Remove a connection. Safe to call even if not present."""
        async with self._lock:
            conns = self._connections.get(user_id)
            if conns and websocket in conns:
                conns.discard(websocket)
            if not conns:
                self._connections.pop(user_id, None)
        logger.info("WS disconnected: user=%s", user_id)

    # ------------------------------------------------------------
    # Sending
    # ------------------------------------------------------------
    async def send_to_user(self, user_id: uuid.UUID, payload: dict[str, Any]) -> int:
        """
        Deliver a payload to every open connection of one user.
        Returns the number of connections the payload was delivered to.
        """
        # Snapshot the set — avoids holding the lock during network I/O.
        async with self._lock:
            conns = list(self._connections.get(user_id, ()))

        if not conns:
            return 0

        message = json.dumps(payload, default=str)
        delivered = 0
        dead: list[WebSocket] = []
        for ws in conns:
            try:
                await ws.send_text(message)
                delivered += 1
            except Exception as exc:  # noqa: BLE001
                logger.debug("WS send failed (marking dead): %s", exc)
                dead.append(ws)

        # Cleanup any dead connections.
        if dead:
            async with self._lock:
                live = self._connections.get(user_id)
                if live:
                    for ws in dead:
                        live.discard(ws)
                    if not live:
                        self._connections.pop(user_id, None)

        return delivered

    async def send_to_users(
        self, user_ids: list[uuid.UUID], payload: dict[str, Any]
    ) -> int:
        """Broadcast a payload to multiple users. Returns total deliveries."""
        total = 0
        for uid in set(user_ids):
            total += await self.send_to_user(uid, payload)
        return total

    async def broadcast(self, payload: dict[str, Any]) -> int:
        """Send a payload to every connected user. For system announcements."""
        async with self._lock:
            all_user_ids = list(self._connections.keys())
        return await self.send_to_users(all_user_ids, payload)

    # ------------------------------------------------------------
    # Introspection (for /health checks and debugging)
    # ------------------------------------------------------------
    def online_user_count(self) -> int:
        return len(self._connections)

    def total_connection_count(self) -> int:
        return sum(len(s) for s in self._connections.values())


# ============================================================
# Module-level singleton
# ============================================================
manager = WebSocketManager()
