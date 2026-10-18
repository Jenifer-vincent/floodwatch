"""Alert routes — public reads, admin-only writes."""

from fastapi import APIRouter, Depends

from app.core.responses import ok
from app.core.security import require_admin
from app.models.entities import UserRecord
from app.schemas.alerts import AlertOut, CreateAlertRequest
from app.schemas.common import ApiMessage, ApiResponse
from app.services import alert_service

router = APIRouter(prefix="/alerts", tags=["alerts"])


@router.get(
    "",
    response_model=ApiResponse[list[AlertOut]],
    summary="List alerts",
    description="Returns public broadcast alerts (newest first, active on top).",
)
def list_alerts() -> dict:
    return ok([a.model_dump() for a in alert_service.list_alerts()])


@router.post(
    "",
    response_model=ApiResponse[AlertOut],
    status_code=201,
    summary="Create an alert",
    description=(
        "Admin-only. Broadcasts a new alert and creates a notification for "
        "every registered user."
    ),
)
def create_alert(
    request: CreateAlertRequest,
    admin: UserRecord = Depends(require_admin),
) -> dict:
    return ok(alert_service.create_alert(admin, request).model_dump())


@router.delete(
    "/{alert_id}",
    response_model=ApiResponse[ApiMessage],
    summary="Delete an alert",
    description="Admin-only. Removes an existing alert.",
)
def delete_alert(
    alert_id: str,
    admin: UserRecord = Depends(require_admin),
) -> dict:
    alert_service.delete_alert(admin, alert_id)
    return ok({"success": True, "message": "Alert deleted."})