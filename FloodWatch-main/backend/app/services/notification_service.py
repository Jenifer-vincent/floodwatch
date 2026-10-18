"""Notification service — notifications always scoped to their owner."""

from __future__ import annotations

from datetime import datetime, timezone

from app.core.responses import AppError, NOT_FOUND
from app.models.entities import NotificationRecord, NotificationType, Severity, UserRecord
from app.schemas.notifications import NotificationListOut, NotificationOut, notification_to_view
from app.storage.json_storage import storage


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _load() -> list[dict]:
    return storage.load("notifications", [])


def _save(notifications: list[dict]) -> None:
    storage.save("notifications", notifications)


def list_for_user(user: UserRecord) -> NotificationListOut:
    notifications = [
        n for n in _load() if n.get("userId") == user.id
    ]
    notifications.sort(key=lambda n: n.get("createdAt", ""), reverse=True)
    views = [notification_to_view(NotificationRecord.model_validate(n)) for n in notifications]
    unread = sum(1 for v in views if not v.read)
    return NotificationListOut(notifications=views, unreadCount=unread)


def _find_for_user(user: UserRecord, notification_id: str) -> tuple[list[dict], int]:
    notifications = _load()
    for i, n in enumerate(notifications):
        if n.get("id") == notification_id and n.get("userId") == user.id:
            return notifications, i
    raise AppError(404, NOT_FOUND, "Notification not found.")


def mark_read(user: UserRecord, notification_id: str) -> NotificationListOut:
    notifications, index = _find_for_user(user, notification_id)
    notifications[index]["read"] = True
    _save(notifications)
    return list_for_user(user)


def mark_all_read(user: UserRecord) -> NotificationListOut:
    notifications = _load()
    for n in notifications:
        if n.get("userId") == user.id:
            n["read"] = True
    _save(notifications)
    return list_for_user(user)


def create(
    user_id: str,
    title: str,
    message: str,
    severity: Severity,
    notification_type: NotificationType = "system",
) -> NotificationRecord:
    record = NotificationRecord(
        userId=user_id,
        title=title,
        message=message,
        severity=severity,
        type=notification_type,
        read=False,
        createdAt=_now_iso(),
    )
    notifications = _load()
    notifications.append(record.model_dump())
    _save(notifications)
    return record