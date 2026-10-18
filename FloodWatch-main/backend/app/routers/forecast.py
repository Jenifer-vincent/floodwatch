"""Forecast routes."""

from fastapi import APIRouter

from app.core.responses import ok
from app.schemas.common import ApiResponse
from app.schemas.forecast import ForecastListOut, ForecastResponseOut
from app.services import forecast_service

router = APIRouter(prefix="/forecast", tags=["forecast"])


@router.get(
    "",
    response_model=ApiResponse[ForecastListOut],
    summary="List available forecasts",
    description=(
        "Returns all stored forecast records plus the list of locations."
    ),
)
def list_forecasts() -> dict:
    return ok(forecast_service.list_forecasts().model_dump())


@router.get(
    "/{location_id}",
    response_model=ApiResponse[ForecastResponseOut],
    summary="Get forecast for a location",
    description=(
        "Returns forecast points for a single location, normalized to the "
        "Phase 2 ``ForecastResponse`` shape."
    ),
)
def get_forecast(location_id: str) -> dict:
    return ok(forecast_service.by_location(location_id).model_dump())