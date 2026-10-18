"""Notification routes — every handler is scoped to the current user."""

from fastapi import APIRouter, Depends

from app.core.responses import ok
from app.core.security import get_current_user
from app.models.entities import UserRecord
from app.schemas.common import ApiResponse
from app.schemas.notifications import NotificationListOut
from app.services import notification_service

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get(
    "",
    response_model=ApiResponse[NotificationListOut],
    summary="List notifications",
    description="Returns the notifications belonging to the authenticated user.",
)
def list_notifications(user: UserRecord = Depends(get_current_user)) -> dict:
    return ok(notification_service.list_for_user(user).model_dump())


@router.patch(
    "/read-all",
    response_model=ApiResponse[NotificationListOut],
    summary="Mark all notifications as read",
    description="Marks every notification of the authenticated user as read.",
)
def mark_all_read(user: UserRecord = Depends(get_current_user)) -> dict:
    return ok(notification_service.mark_all_read(user).model_dump())


@router.patch(
    "/{notification_id}/read",
    response_model=ApiResponse[NotificationListOut],
    summary="Mark a notification as read",
    description=(
        "Marks a single notification read. Users can only modify their own "
        "notifications; anything else returns 404."
    ),
)
def mark_read(
    notification_id: str,
    user: UserRecord = Depends(get_current_user),
) -> dict:
    return ok(notification_service.mark_read(user, notification_id).model_dump())