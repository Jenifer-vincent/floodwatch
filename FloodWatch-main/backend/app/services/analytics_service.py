"""Analytics service — metrics computed live from stored JSON data.

Nothing here is hardcoded; every value is derived from ``reports.json``,
``gis.json`` and ``funds.json`` at request time.
"""

from __future__ import annotations

from collections import defaultdict
from datetime import datetime, timedelta, timezone

from app.schemas.analytics import (
    AnalyticsAreasOut,
    AnalyticsDataPointOut,
    AnalyticsDetailsOut,
    AnalyticsFundsOut,
    AnalyticsIncidentsOut,
    AnalyticsOverviewOut,
    AnalyticsSeverityOut,
    AreaStatsOut,
    ForecastVsActualOut,
    ResponseStatsOut,
    SeverityMetricOut,
    SystemStatsOut,
)
from app.schemas.funds import TransactionOut
from app.services import fund_service, gis_service
from app.storage.json_storage import storage

_ACTIVE_STATUSES = ("submitted", "verified")
_SEVERITY_BUCKETS = ("critical", "high", "medium", "low")


def _active_reports() -> list[dict]:
    reports = storage.load("reports", [])
    return [r for r in reports if r.get("status") in _ACTIVE_STATUSES]


def _all_reports() -> list[dict]:
    return [r for r in storage.load("reports", []) if r.get("status") != "archived"]


def _parse_ts(value: str) -> datetime:
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except (ValueError, TypeError):
        return datetime.now(timezone.utc)


def _zone_name(location: str, latitude: float | None = None, longitude: float | None = None) -> str:
    _, name = gis_service._zone_for_location(location, latitude, longitude)
    return name


def _point(
    label: str,
    bucket_reports: list[dict],
) -> AnalyticsDataPointOut:
    total = len(bucket_reports)
    unresolved = sum(1 for r in bucket_reports if r.get("status") in ("submitted", "verified"))
    verified = sum(1 for r in bucket_reports if r.get("status") == "verified")
    critical = sum(1 for r in bucket_reports if r.get("severity") == "critical")
    return AnalyticsDataPointOut(
        label=label,
        totalReports=total,
        unresolvedReports=unresolved,
        verifiedReports=verified,
        criticalSeverityCount=critical,
    )


def _series(
    reports: list[dict],
    bucket_key: str,
    start: datetime,
    step: timedelta,
    n_buckets: int,
    label_fn,
) -> list[AnalyticsDataPointOut]:
    buckets: dict[str, list[dict]] = defaultdict(list)
    for r in reports:
        ts = _parse_ts(r.get("submittedAt", ""))
        buckets[bucket_key(ts)].append(r)

    out: list[AnalyticsDataPointOut] = []
    for i in range(n_buckets):
        cursor = start + step * (n_buckets - 1 - i)
        label = label_fn(cursor)
        out.append(_point(label, buckets.get(bucket_key(cursor), [])))
    return out


def overview() -> AnalyticsOverviewOut:
    reports = _all_reports()
    total = len(reports)
    resolved = sum(1 for r in reports if r.get("status") == "resolved")
    active_zones = len(
        {
            _zone_name(
                r.get("location", ""),
                r.get("latitude"),
                r.get("longitude"),
            )
            for r in _active_reports()
        }
        - {"Unassigned"}
    )

    now = datetime.now(timezone.utc)
    start = now - timedelta(days=6)
    trend = _series(
        reports,
        lambda ts: ts.strftime("%Y-%m-%d"),
        start,
        timedelta(days=1),
        7,
        lambda ts: ts.strftime("%b %d"),
    )

    return AnalyticsOverviewOut(
        totalReports=total,
        resolvedReports=resolved,
        activeZones=active_zones,
        treasuryBalance=fund_service.balance().availableBalance,
        reportsTrend=trend,
    )


def incidents() -> AnalyticsIncidentsOut:
    reports = _all_reports()
    now = datetime.now(timezone.utc)

    daily = _series(
        reports,
        lambda ts: ts.strftime("%Y-%m-%d"),
        now - timedelta(days=13),
        timedelta(days=1),
        14,
        lambda ts: ts.strftime("%b %d"),
    )
    weekly = _series(
        reports,
        lambda ts: ts.strftime("%Y-%W"),
        now - timedelta(weeks=7),
        timedelta(weeks=1),
        8,
        lambda ts: f"Wk {ts.isocalendar()[1]} ({ts.strftime('%b')})",
    )
    monthly = _series(
        reports,
        lambda ts: ts.strftime("%Y-%m"),
        now - timedelta(weeks=24),
        timedelta(weeks=4),
        6,
        lambda ts: ts.strftime("%b %Y"),
    )

    return AnalyticsIncidentsOut(dailySeries=daily, weeklySeries=weekly, monthlySeries=monthly)


def severity() -> AnalyticsSeverityOut:
    reports = _all_reports()
    counts: dict[str, int] = defaultdict(int)
    for r in reports:
        sev = r.get("severity")
        if sev in _SEVERITY_BUCKETS:
            counts[sev] += 1
    distribution = [
        SeverityMetricOut(name="Critical", value=counts["critical"]),
        SeverityMetricOut(name="High", value=counts["high"]),
        SeverityMetricOut(name="Medium", value=counts["medium"]),
        SeverityMetricOut(name="Low", value=counts["low"]),
    ]
    return AnalyticsSeverityOut(distribution=distribution, total=len(reports))


def areas() -> AnalyticsAreasOut:
    reports = _all_reports()
    grouped: dict[str, list[dict]] = defaultdict(list)
    for r in reports:
        grouped[
            _zone_name(r.get("location", ""), r.get("latitude"), r.get("longitude"))
        ].append(r)

    def stats_for(name: str, rows: list[dict]) -> AreaStatsOut:
        return AreaStatsOut(
            zoneName=name,
            total=len(rows),
            critical=sum(1 for r in rows if r.get("severity") == "critical"),
            high=sum(1 for r in rows if r.get("severity") == "high"),
            medium=sum(1 for r in rows if r.get("severity") == "medium"),
            low=sum(1 for r in rows if r.get("severity") == "low"),
        )

    aggregate = stats_for("All Sectors", [r for rows in grouped.values() for r in rows])
    zone_stats = [
        stats_for(name, rows)
        for name, rows in sorted(grouped.items())
    ]
    # Keep the compact "All Sectors + zones" shape the frontend expects.
    return AnalyticsAreasOut(areas=[aggregate] + zone_stats)


def funds() -> AnalyticsFundsOut:
    funds = storage.load("funds", {"totalBudget": 0, "availableBalance": 0, "transactions": []})
    total = float(funds.get("totalBudget", 0))
    available = float(funds.get("availableBalance", 0))
    txns = sorted(
        funds.get("transactions", []),
        key=lambda t: t.get("timestamp", ""),
        reverse=True,
    )
    return AnalyticsFundsOut(
        totalBudget=total,
        allocated=round(total - available, 2),
        remaining=available,
        transactions=[TransactionOut(**t) for t in txns],
    )


def system_stats() -> SystemStatsOut:
    active = _active_reports()
    pending = sum(1 for r in storage.load("reports", []) if r.get("status") == "submitted")
    high_risk = sum(1 for z in gis_service.zones() if z.riskLevel in ("high", "critical"))
    return SystemStatsOut(
        activeReports=len(active),
        highRiskZones=high_risk,
        pendingVerifications=pending,
        availableFunds=fund_service.balance().availableBalance,
    )


def _minutes_between(start: str, end: str) -> float | None:
    if not start or not end:
        return None
    try:
        return max(0.0, (_parse_ts(end) - _parse_ts(start)).total_seconds() / 60.0)
    except (ValueError, TypeError):
        return None


def details() -> AnalyticsDetailsOut:
    return AnalyticsDetailsOut(
        responseStats=_response_stats(),
        forecastVsActual=_forecast_vs_actual(),
    )


def _response_stats() -> ResponseStatsOut:
    reports = _all_reports()
    total = len(reports)
    resolved = sum(1 for r in reports if r.get("status") == "resolved")
    verified = sum(1 for r in reports if r.get("status") == "verified")

    resolution_rate = round(resolved / total, 4) if total else 0.0

    resolution_latencies = [
        m for r in reports
        if r.get("status") == "resolved" and (m := _minutes_between(r.get("submittedAt"), r.get("resolvedAt"))) is not None
    ]
    verification_latencies = [
        m for r in reports
        if r.get("status") == "verified" and (m := _minutes_between(r.get("submittedAt"), r.get("verifiedAt"))) is not None
    ]

    avg_resolution = round(sum(resolution_latencies) / len(resolution_latencies), 1) if resolution_latencies else 0.0
    avg_verification = round(sum(verification_latencies) / len(verification_latencies), 1) if verification_latencies else 0.0

    return ResponseStatsOut(
        totalReports=total,
        resolvedReports=resolved,
        verifiedReports=verified,
        resolutionRate=resolution_rate,
        insufficientData=total == 0 or not resolution_latencies,
        avgResolutionMinutes=avg_resolution,
        avgVerificationMinutes=avg_verification,
    )


def _forecast_vs_actual() -> list[ForecastVsActualOut]:
    """Compare each zone's latest forecast water level against reported depth."""
    forecasts = storage.load("forecasts", {"items": []}).get("items", [])
    reports = _all_reports()

    zone_for_report = {
        r.get("id"): gis_service._zone_for_location(
            r.get("location", ""), r.get("latitude"), r.get("longitude")
        )[0]
        for r in reports
    }

    rows: list[ForecastVsActualOut] = []
    for zone in gis_service._gis().get("zones", []):
        zone_id = zone.get("id", "")
        location = zone.get("name", "")
        loc_forecasts = [f for f in forecasts if (f.get("location") or "").lower() == (location or "").lower()]
        if not loc_forecasts:
            continue
        predicted = max(float(f.get("predictedWaterLevel") or 0.0) for f in loc_forecasts)
        risk = max(
            loc_forecasts,
            key=lambda f: {"low": 0, "moderate": 1, "high": 2, "critical": 3}.get(f.get("riskLevel"), 0),
        ).get("riskLevel", "low")

        zone_reports = [
            r for r in reports if zone_for_report.get(r.get("id")) == zone_id and r.get("waterDepth") is not None
        ]
        actual = max(float(r["waterDepth"]) for r in zone_reports) if zone_reports else 0.0
        has_actual = bool(zone_reports)

        if not has_actual:
            status = "within"
            delta = 0.0
        elif actual >= predicted:
            status = "exceeded"
            delta = round(actual - predicted, 2)
        else:
            status = "under"
            delta = round(predicted - actual, 2)

        rows.append(
            ForecastVsActualOut(
                zoneId=zone_id,
                zoneName=location,
                forecastRisk=risk,  # type: ignore[arg-type]
                predictedWaterLevel=predicted,
                waterLevelStatus=status,  # type: ignore[arg-type]
                waterLevelDelta=delta,
                actualDepth=actual,
                hasActual=has_actual,
            )
        )
    return rows