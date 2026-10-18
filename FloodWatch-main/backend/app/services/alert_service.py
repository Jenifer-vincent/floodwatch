"""Alert service — admin broadcast alerts that fan out to citizen notifications."""

from __future__ import annotations

from datetime import datetime, timezone

from app.core.responses import AppError, NOT_FOUND
from app.models.entities import AlertRecord, UserRecord
from app.schemas.alerts import AlertOut, CreateAlertRequest
from app.services import notification_service
from app.storage.json_storage import storage


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _load() -> list[dict]:
    return storage.load("alerts", [])


def _save(alerts: list[dict]) -> None:
    storage.save("alerts", alerts)


def list_alerts() -> list[AlertOut]:
    alerts = _load()
    alerts.sort(
        key=lambda a: (not a.get("active", True), a.get("createdAt", "")),
        reverse=True,
    )
    return [AlertOut(**a) for a in alerts]


def create_alert(admin: UserRecord, request: CreateAlertRequest) -> AlertOut:
    record = AlertRecord(
        message=request.message.strip(),
        severity=request.severity,
        zone=request.zone,
        active=True,
        createdAt=_now_iso(),
        createdBy=admin.id,
    )
    alerts = _load()
    alerts.append(record.model_dump())
    _save(alerts)

    # Fan out notifications to every registered citizen so the alert is
    # visible in the notification center.
    title = "New critical alert" if request.severity == "critical" else "New alert"
    users = storage.load("users", [])
    for user in users:
        notification_service.create(
            user_id=user.get("id"),
            title=title,
            message=request.message.strip(),
            severity=request.severity,
            notification_type="alert",
        )

    return AlertOut(**record.model_dump())


def delete_alert(admin: UserRecord, alert_id: str) -> None:
    alerts = _load()
    index = next((i for i, a in enumerate(alerts) if a.get("id") == alert_id), -1)
    if index == -1:
        raise AppError(404, NOT_FOUND, "Alert not found.")
    del alerts[index]
    _save(alerts)