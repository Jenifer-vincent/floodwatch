"""Analytics schemas — Phase 2 analytics contract compatible.

Metrics are computed from stored JSON data at request time; nothing is
hardcoded into responses.
"""

from typing import Literal

from pydantic import BaseModel

from app.schemas.funds import TransactionOut

SeverityBucket = Literal["critical", "high", "medium", "low"]


class AnalyticsDataPointOut(BaseModel):
    label: str
    totalReports: int
    unresolvedReports: int
    verifiedReports: int
    criticalSeverityCount: int


class AnalyticsOverviewOut(BaseModel):
    totalReports: int
    resolvedReports: int
    activeZones: int
    treasuryBalance: float
    reportsTrend: list[AnalyticsDataPointOut]


class AnalyticsIncidentsOut(BaseModel):
    dailySeries: list[AnalyticsDataPointOut]
    weeklySeries: list[AnalyticsDataPointOut]
    monthlySeries: list[AnalyticsDataPointOut]


class SeverityMetricOut(BaseModel):
    name: str
    value: int


class AnalyticsSeverityOut(BaseModel):
    distribution: list[SeverityMetricOut]
    total: int


class AreaStatsOut(BaseModel):
    zoneName: str
    total: int
    critical: int
    high: int
    medium: int
    low: int


class AnalyticsAreasOut(BaseModel):
    areas: list[AreaStatsOut]


class AnalyticsFundsOut(BaseModel):
    totalBudget: float
    allocated: float
    remaining: float
    transactions: list[TransactionOut]


class SystemStatsOut(BaseModel):
    activeReports: int
    highRiskZones: int
    pendingVerifications: int
    availableFunds: float


class ResponseStatsOut(BaseModel):
    """Verification / resolution response-time metrics.

    ``insufficientData`` is True when there is not enough resolved/verified
    history to compute a meaningful average — the frontend renders an
    "Insufficient data" state rather than a fabricated value.
    """

    totalReports: int
    resolvedReports: int
    verifiedReports: int
    resolutionRate: float
    insufficientData: bool
    avgResolutionMinutes: float
    avgVerificationMinutes: float


class ForecastVsActualOut(BaseModel):
    """Comparison of forecast predicted water level vs actual reported depth.

    One row per zone that has a forecast. A zone is reported with
    ``hasActual`` False when no report carries a water depth yet.
    """

    zoneId: str
    zoneName: str
    forecastRisk: str
    predictedWaterLevel: float
    waterLevelStatus: Literal["exceeded", "within", "under"]
    waterLevelDelta: float
    actualDepth: float
    hasActual: bool


class AnalyticsDetailsOut(BaseModel):
    responseStats: ResponseStatsOut
    forecastVsActual: list[ForecastVsActualOut]