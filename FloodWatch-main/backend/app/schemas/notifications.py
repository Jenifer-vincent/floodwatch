"""Notification schemas."""

from pydantic import BaseModel

from app.models.entities import NotificationRecord, NotificationType, Severity


class NotificationOut(BaseModel):
    id: str
    userId: str
    title: str
    message: str
    severity: Severity
    type: NotificationType
    read: bool
    createdAt: str

    # Phase 2 frontend compatibility alias
    timestamp: str


class NotificationListOut(BaseModel):
    notifications: list[NotificationOut]
    unreadCount: int


def notification_to_view(n: NotificationRecord) -> NotificationOut:
    return NotificationOut(
        id=n.id,
        userId=n.userId,
        title=n.title,
        message=n.message,
        severity=n.severity,
        type=n.type,
        read=n.read,
        createdAt=n.createdAt,
        timestamp=n.createdAt,
    )