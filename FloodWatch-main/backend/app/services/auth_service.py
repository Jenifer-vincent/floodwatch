"""Authentication service: registration, login, logout."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from app.core.responses import AppError, CONFLICT, UNAUTHORIZED
from app.core.security import create_access_token, hash_password, verify_password
from app.models.entities import UserRecord
from app.schemas.auth import AuthResponseOut, LoginRequest, RegisterRequest, UserOut
from app.storage.json_storage import storage


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def register(request: RegisterRequest) -> AuthResponseOut:
    users: list[dict] = storage.load("users", [])

    email = request.email.lower()
    if any(u.get("email", "").lower() == email for u in users):
        raise AppError(409, CONFLICT, "An account with this email already exists.")

    user = UserRecord(
        id=f"usr_{_new_hex()}",
        name=request.name,
        email=email,
        phone=request.phone,
        role="citizen",  # normal registration can never create an ADMIN
        password_hash=hash_password(request.password),
        createdAt=_now_iso(),
    )
    users.append(user.model_dump())
    storage.save("users", users)

    token, expires_at = create_access_token(user)
    return AuthResponseOut(
        user=UserOut(**user.public_dict()),
        token=token,
        expiresAt=expires_at.isoformat(),
    )


def login(request: LoginRequest) -> AuthResponseOut:
    users: list[dict] = storage.load("users", [])
    email = request.email.lower()

    record = next((u for u in users if u.get("email", "").lower() == email), None)
    if record is None or not verify_password(request.password, record.get("password_hash", "")):
        raise AppError(
            401,
            UNAUTHORIZED,
            "Invalid email or password.",
        )

    user = UserRecord.model_validate(record)
    token, expires_at = create_access_token(user)
    return AuthResponseOut(
        user=UserOut(**user.public_dict()),
        token=token,
        expiresAt=expires_at.isoformat(),
    )


def logout(token: str) -> None:
    from app.core.security import revoke_token

    revoke_token(token)


def get_user_by_id(user_id: str) -> Optional[UserRecord]:
    users: list[dict] = storage.load("users", [])
    record = next((u for u in users if u.get("id") == user_id), None)
    if record is None:
        return None
    return UserRecord.model_validate(record)


def _new_hex() -> str:
    import uuid

    return uuid.uuid4().hex[:12]