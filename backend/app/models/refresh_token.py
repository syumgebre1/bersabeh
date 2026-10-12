"""
RefreshToken model — server-side revocation list.

Why this table?
  JWTs are stateless: once issued, anyone holding a valid, unexpired token
  can use it. That's fine for short-lived access tokens (30 min), but for
  refresh tokens (7 days) we need the ability to revoke them.

  So: on every successful login we store the refresh token's `jti` (JWT ID)
  here. On logout or on suspected compromise, we mark it revoked. Every
  /auth/refresh request checks this table — if the jti isn't present or is
  revoked, the token is refused even if the signature is valid.

Cleanup:
  Revoked/expired rows accumulate. A periodic job (added later) prunes
  anything whose expires_at is more than N days in the past.
"""

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class RefreshToken(Base):
    """One row per issued refresh token."""

    __tablename__ = "refresh_tokens"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    jti: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    issued_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Optional — for future "suspicious activity" features
    issued_ip: Mapped[str | None] = mapped_column(String(45), nullable=True)     # IPv6 max length
    user_agent: Mapped[str | None] = mapped_column(String(300), nullable=True)

    __table_args__ = (
        Index("ix_refresh_tokens_user_revoked", "user_id", "revoked_at"),
    )

    def __repr__(self) -> str:
        return f"<RefreshToken jti={self.jti} user={self.user_id} revoked={self.revoked_at is not None}>"
