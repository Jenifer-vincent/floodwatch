"""Priority zone routes."""

from fastapi import APIRouter

from app.core.responses import ok
from app.schemas.common import ApiResponse
from app.schemas.priority import PriorityZonesResponseOut
from app.services import priority_service

router = APIRouter(prefix="/priority", tags=["priority"])


@router.get(
    "/zones",
    response_model=ApiResponse[PriorityZonesResponseOut],
    summary="Get priority-ranked zones",
    description=(
        "Returns stored priority-zone records ordered by score."
    ),
)
def get_priority_zones() -> dict:
    return ok(priority_service.get_priority_zones().model_dump())