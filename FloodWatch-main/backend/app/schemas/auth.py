"""Auth schemas (registration, login, current user)."""

from typing import Optional

from pydantic import BaseModel, EmailStr, Field, field_validator

from app.core.security import BCRYPT_MAX_BYTES
from app.models.entities import UserRole


class RegisterRequest(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    email: EmailStr
    phone: Optional[str] = Field(
        default=None, max_length=30, pattern=r"^[0-9+\-().\s]{0,30}$"
    )
    password: str = Field(min_length=8, max_length=BCRYPT_MAX_BYTES)

    @field_validator("name")
    @classmethod
    def name_not_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Name must not be blank.")
        return v.strip()


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=BCRYPT_MAX_BYTES)


class UserOut(BaseModel):
    id: str
    name: str
    email: EmailStr
    phone: Optional[str] = None
    role: UserRole
    createdAt: str


class AuthResponseOut(BaseModel):
    user: UserOut
    token: str
    expiresAt: str


class LogoutOut(BaseModel):
    success: bool