"""Analytics routes — operational metrics computed from stored data."""

from fastapi import APIRouter, Depends

from app.core.responses import ok
from app.core.security import require_admin
from app.models.entities import UserRecord
from app.schemas.analytics import (
    AnalyticsAreasOut,
    AnalyticsDetailsOut,
    AnalyticsFundsOut,
    AnalyticsIncidentsOut,
    AnalyticsOverviewOut,
    AnalyticsSeverityOut,
    SystemStatsOut,
)
from app.schemas.common import ApiResponse
from app.services import analytics_service

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get(
    "/overview",
    response_model=ApiResponse[AnalyticsOverviewOut],
    summary="Analytics overview",
    description="Admin-only. High-level report and treasury metrics.",
)
def overview(admin: UserRecord = Depends(require_admin)) -> dict:
    return ok(analytics_service.overview().model_dump())


@router.get(
    "/incidents",
    response_model=ApiResponse[AnalyticsIncidentsOut],
    summary="Incident time series",
    description="Admin-only. Daily, weekly and monthly incident series.",
)
def incidents(admin: UserRecord = Depends(require_admin)) -> dict:
    return ok(analytics_service.incidents().model_dump())


@router.get(
    "/severity",
    response_model=ApiResponse[AnalyticsSeverityOut],
    summary="Severity distribution",
    description="Admin-only. Report counts grouped by severity.",
)
def severity(admin: UserRecord = Depends(require_admin)) -> dict:
    return ok(analytics_service.severity().model_dump())


@router.get(
    "/areas",
    response_model=ApiResponse[AnalyticsAreasOut],
    summary="Area statistics",
    description="Admin-only. Report totals per risk zone by severity.",
)
def areas(admin: UserRecord = Depends(require_admin)) -> dict:
    return ok(analytics_service.areas().model_dump())


@router.get(
    "/funds",
    response_model=ApiResponse[AnalyticsFundsOut],
    summary="Fund analytics",
    description="Admin-only. Treasury budget, allocated and remaining funds.",
)
def funds(admin: UserRecord = Depends(require_admin)) -> dict:
    return ok(analytics_service.funds().model_dump())


@router.get(
    "/system-stats",
    response_model=ApiResponse[SystemStatsOut],
    summary="System stats",
    description="Admin-only. Compact dashboard counters (Phase 2 SystemStats).",
)
def system_stats(admin: UserRecord = Depends(require_admin)) -> dict:
    return ok(analytics_service.system_stats().model_dump())


@router.get(
    "/details",
    response_model=ApiResponse[AnalyticsDetailsOut],
    summary="Response stats and forecast-vs-actual",
    description=(
        "Admin-only. Response-time statistics (verification/resolution) plus a "
        "forecast-vs-actual water-level comparison per zone. Zones without "
        "actual readings are flagged with hasActual=false."
    ),
)
def details(admin: UserRecord = Depends(require_admin)) -> dict:
    return ok(analytics_service.details().model_dump())