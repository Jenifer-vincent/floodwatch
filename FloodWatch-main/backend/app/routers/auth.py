"""Authentication routes."""

from fastapi import APIRouter, Depends

from app.core.ratelimit import rate_limit
from app.core.responses import ok
from app.core.security import get_bearer_token, get_current_user
from app.models.entities import UserRecord
from app.schemas.auth import (
    AuthResponseOut,
    LoginRequest,
    LogoutOut,
    RegisterRequest,
    UserOut,
)
from app.schemas.common import ApiResponse
from app.services import auth_service

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post(
    "/register",
    response_model=ApiResponse[AuthResponseOut],
    status_code=201,
    summary="Register a new citizen account",
    description=(
        "Creates a CITIZEN account and returns a JWT access token. "
        "ADMIN accounts can never be created through this endpoint."
    ),
)
def register(
    request: RegisterRequest,
    _: None = Depends(rate_limit("auth")),
) -> dict:
    return ok(auth_service.register(request).model_dump())


@router.post(
    "/login",
    response_model=ApiResponse[AuthResponseOut],
    summary="Log in with email and password",
    description="Verifies credentials and returns a JWT access token.",
)
def login(
    request: LoginRequest,
    _: None = Depends(rate_limit("auth")),
) -> dict:
    return ok(auth_service.login(request).model_dump())


@router.post(
    "/logout",
    response_model=ApiResponse[LogoutOut],
    summary="Log out the current session",
    description="Revokes the presented access token so it can no longer be used.",
)
def logout(token: str = Depends(get_bearer_token)) -> dict:
    auth_service.logout(token)
    return ok({"success": True})


@router.get(
    "/me",
    response_model=ApiResponse[UserOut],
    summary="Get the authenticated user",
    description=(
        "Returns the profile of the user identified by the Bearer token. "
        "Requires authentication."
    ),
)
def me(user: UserRecord = Depends(get_current_user)) -> dict:
    return ok(user.public_dict())