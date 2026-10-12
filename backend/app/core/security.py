"""
Password hashing and JWT token management.

Two concerns, cleanly separated:

  1. PASSWORDS
     We use bcrypt directly (not passlib — see DECISIONS.md D003).
     Cost factor 12 balances security and speed for a clinic workload.

  2. TOKENS
     Two token types, signed with DIFFERENT secrets:
       - access:  short-lived (30 min), sent on every API request.
       - refresh: long-lived (7 days), sent only to /auth/refresh.
     Both carry a `type` claim. verify_token() refuses if the type doesn't
     match the expected kind — so a refresh token can never be passed off
     as an access token, even if the attacker steals it.

     Refresh tokens also carry a `jti` (JWT ID). We store the jti in the
     DB (see auth.py in M2 File 7) so we can revoke individual refresh
     tokens — that's how logout actually logs a user out instead of just
     relying on the client to delete the token.

Why two secrets?
     Defence in depth. If one secret leaks, tokens of the other type remain
     unforgeable. Cheap to set up, meaningful security improvement.
"""

import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Literal

from jose import JWTError, jwt

from app.core.config import settings


# ============================================================
# Password hashing
# ============================================================

# bcrypt cost factor. 12 = ~250ms per hash on a modern laptop.
# Higher = slower attacker, but slower login. 12 is the current sweet spot.
BCRYPT_ROUNDS = 12


def hash_password(plain: str) -> str:
    """Hash a plaintext password with bcrypt. Returns the bcrypt hash string."""
    import bcrypt
    # bcrypt expects bytes and truncates at 72 bytes. We explicitly guard.
    if len(plain) > 72:
        raise ValueError("Password exceeds bcrypt's 72-byte limit")
    return bcrypt.hashpw(plain.encode("utf-8"), bcrypt.gensalt(rounds=BCRYPT_ROUNDS)).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    """Check a plaintext password against a bcrypt hash. Returns True on match."""
    import bcrypt
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except (ValueError, TypeError):
        # Malformed hash — treat as "does not match" rather than raising.
        return False


# ============================================================
# JWT
# ============================================================

TokenType = Literal["access", "refresh"]


def _create_token(
    subject: str,
    role: str,
    token_type: TokenType,
    expires_delta: timedelta,
    secret: str,
) -> str:
    """
    Internal token builder. Not exported — use create_access_token or
    create_refresh_token so the right secret is picked automatically.
    """
    now = datetime.now(timezone.utc)
    payload: dict[str, Any] = {
        "sub": subject,               # user id (UUID as string)
        "role": role,                 # role at time of issuance
        "type": token_type,           # 'access' or 'refresh'
        "iat": int(now.timestamp()),  # issued-at
        "exp": int((now + expires_delta).timestamp()),  # expiry
        "jti": str(uuid.uuid4()),     # unique token id (used for refresh revocation)
    }
    return jwt.encode(payload, secret, algorithm=settings.JWT_ALGORITHM)


def create_access_token(user_id: str, role: str) -> str:
    """Create a short-lived access token."""
    return _create_token(
        subject=user_id,
        role=role,
        token_type="access",
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
        secret=settings.JWT_SECRET_KEY,
    )


def create_refresh_token(user_id: str, role: str) -> str:
    """Create a long-lived refresh token (used to obtain new access tokens)."""
    return _create_token(
        subject=user_id,
        role=role,
        token_type="refresh",
        expires_delta=timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
        secret=settings.JWT_REFRESH_SECRET_KEY,
    )


def decode_token(token: str, expected_type: TokenType) -> dict[str, Any]:
    """
    Verify a token and return its payload.

    Raises ValueError on:
      - invalid signature
      - expired token
      - wrong `type` claim (access vs refresh)
      - missing required claims

    We raise ValueError (not HTTPException) so this function stays
    framework-agnostic. The FastAPI dependency layer converts to HTTP.
    """
    secret = (
        settings.JWT_SECRET_KEY if expected_type == "access"
        else settings.JWT_REFRESH_SECRET_KEY
    )
    try:
        payload = jwt.decode(token, secret, algorithms=[settings.JWT_ALGORITHM])
    except JWTError as exc:
        raise ValueError(f"Invalid token: {exc}") from exc

    if payload.get("type") != expected_type:
        raise ValueError(f"Token type mismatch: expected {expected_type!r}, got {payload.get('type')!r}")

    for required in ("sub", "role", "exp", "jti"):
        if required not in payload:
            raise ValueError(f"Token missing required claim: {required}")

    return payload
