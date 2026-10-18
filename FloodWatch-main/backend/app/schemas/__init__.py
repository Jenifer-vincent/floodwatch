"""API request/response schemas."""

from app.schemas.alerts import AlertOut, CreateAlertRequest
from app.schemas.analytics import (
    AnalyticsAreasOut,
    AnalyticsFundsOut,
    AnalyticsIncidentsOut,
    AnalyticsOverviewOut,
    AnalyticsSeverityOut,
    SystemStatsOut,
)
from app.schemas.auth import (
    AuthResponseOut,
    LoginRequest,
    LogoutOut,
    RegisterRequest,
    UserOut,
)
from app.schemas.forecast import (
    FloodForecastPointOut,
    ForecastItem,
    ForecastListOut,
    ForecastResponseOut,
)
from app.schemas.funds import (
    AllocateFundRequest,
    AllocateResponseOut,
    AllocationOut,
    FundBalanceOut,
    TransactionOut,
)
from app.schemas.gis import (
    GISDataOut,
    GISLayerOut,
    GISLineOut,
    GISPointOut,
    GISReportOut,
    GISZoneOut,
)
from app.schemas.notifications import NotificationListOut, NotificationOut
from app.schemas.priority import (
    PriorityFactorsConfigOut,
    PriorityZoneOut,
    PriorityZonesResponseOut,
)
from app.schemas.reports import (
    CreateReportRequest,
    ImageUploadOut,
    ReportOut,
    ResolveReportRequest,
    UpdateReportRequest,
    VerifyReportRequest,
)
from app.schemas.common import ApiMessage

__all__ = [
    "AlertOut",
    "CreateAlertRequest",
    "AnalyticsAreasOut",
    "AnalyticsFundsOut",
    "AnalyticsIncidentsOut",
    "AnalyticsOverviewOut",
    "AnalyticsSeverityOut",
    "SystemStatsOut",
    "AuthResponseOut",
    "LoginRequest",
    "LogoutOut",
    "RegisterRequest",
    "UserOut",
    "FloodForecastPointOut",
    "ForecastItem",
    "ForecastListOut",
    "ForecastResponseOut",
    "AllocateFundRequest",
    "AllocateResponseOut",
    "AllocationOut",
    "FundBalanceOut",
    "TransactionOut",
    "GISDataOut",
    "GISLayerOut",
    "GISLineOut",
    "GISPointOut",
    "GISReportOut",
    "GISZoneOut",
    "NotificationListOut",
    "NotificationOut",
    "PriorityZonesResponseOut",
    "CreateReportRequest",
    "ImageUploadOut",
    "ReportOut",
    "ResolveReportRequest",
    "UpdateReportRequest",
    "VerifyReportRequest",
    "ApiMessage",
]