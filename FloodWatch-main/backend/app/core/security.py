"""Password hashing, JWT handling and authentication dependencies.

Identity is always derived from the JWT — never from client-supplied
fields such as ``userId`` or ``role``.
"""

from __future__ import annotations

import logging
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

import bcrypt
import jwt as pyjwt
from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.config import settings
from app.core.responses import AppError, FORBIDDEN, UNAUTHORIZED
from app.models.entities import UserRecord
from app.storage.json_storage import storage

logger = logging.getLogger("floodwatch.security")

_bearer = HTTPBearer(auto_error=False)

# Default password safety buffer: bcrypt only uses the first 72 bytes.
BCRYPT_MAX_BYTES = 72


def hash_password(password: str) -> str:
    """Hash a password with bcrypt (salt generated automatically)."""
    password_bytes = password.encode("utf-8")[:BCRYPT_MAX_BYTES]
    return bcrypt.hashpw(password_bytes, bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, hashed: str) -> bool:
    """Verify a password against a stored bcrypt hash."""
    try:
        password_bytes = password.encode("utf-8")[:BCRYPT_MAX_BYTES]
        return bcrypt.checkpw(password_bytes, hashed.encode("utf-8"))
    except (ValueError, TypeError):
        return False


def create_access_token(user: UserRecord) -> tuple[str, datetime]:
    """Create a JWT access token. Returns the token and its expiry."""
    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(minutes=settings.access_token_expire_minutes)
    payload = {
        "sub": user.id,
        "role": user.role,
        "email": user.email,
        "jti": uuid.uuid4().hex,
        "iat": now,
        "exp": expires_at,
    }
    token = pyjwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)
    return token, expires_at


def _revoked(token: str) -> bool:
    revoked = storage.load("tokens", {"revoked": []})
    return token in revoked.get("revoked", [])


def revoke_token(token: str) -> None:
    """Invalidate a token so it cannot be used again after logout."""
    revoked = storage.load("tokens", {"revoked": []})
    revoked.setdefault("revoked", [])
    if token not in revoked["revoked"]:
        revoked["revoked"].append(token)
        storage.save("tokens", revoked)


def get_bearer_token(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_bearer),
) -> str:
    """Return the raw bearer token (used by logout to revoke it)."""
    if credentials is None:
        raise AppError(
            401,
            UNAUTHORIZED,
            "Authentication required. Provide a valid Bearer token.",
        )
    return credentials.credentials


def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_bearer),
) -> UserRecord:
    """Resolve the authenticated user from the ``Authorization`` header."""
    if credentials is None:
        raise AppError(
            401,
            UNAUTHORIZED,
            "Authentication required. Provide a valid Bearer token.",
        )

    token = credentials.credentials
    try:
        payload = pyjwt.decode(
            token,
            settings.jwt_secret,
            algorithms=[settings.jwt_algorithm],
        )
    except pyjwt.ExpiredSignatureError:
        raise AppError(401, UNAUTHORIZED, "Token has expired. Please log in again.")
    except pyjwt.InvalidTokenError:
        raise AppError(401, UNAUTHORIZED, "Invalid or malformed token.")

    if _revoked(token):
        raise AppError(401, UNAUTHORIZED, "Token has been revoked. Please log in again.")

    user_id = payload.get("sub")
    if not user_id:
        raise AppError(401, UNAUTHORIZED, "Token is missing a subject claim.")

    users = storage.load("users", [])
    user = next((u for u in users if u.get("id") == user_id), None)
    if user is None:
        raise AppError(401, UNAUTHORIZED, "The account for this token no longer exists.")

    return UserRecord.model_validate(user)


def require_admin(user: UserRecord = Depends(get_current_user)) -> UserRecord:
    """Ensure the authenticated user holds the ADMIN role."""
    if user.role != "admin":
        raise AppError(
            403,
            FORBIDDEN,
            "Administrator privileges are required for this operation.",
        )
    return user