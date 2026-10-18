"""Priority service — dynamic, data-driven priority scoring for risk zones.

Scores are recomputed on every request from live stored data rather than
served from static values:

* Flood severity factor — derived from the severity of active reports
  currently assigned to each zone.
* Water depth factor — from the deepest reported water level in the zone.
* Citizen report factor — from the number of active reports in the zone.
* Forecast risk factor — from the forecast risk level for the zone's locality.
* Infrastructure / population / road factors — from the calibration config
  stored in ``priority.json`` (baseline risk attributes for each sector).

The final score is a weighted, normalized 0-100 index. ``calculatedAt`` is
always the moment the score was computed.
"""

from __future__ import annotations

from datetime import datetime, timezone

from app.schemas.priority import (
    PriorityFactorOut,
    PriorityFactorsConfigOut,
    PriorityZoneOut,
    PriorityZonesResponseOut,
)
from app.services import gis_service
from app.storage.json_storage import storage

_ACTIVE_STATUSES = ("submitted", "verified")
_SEVERITY_VALUE = {"low": 25.0, "medium": 50.0, "high": 75.0, "critical": 100.0}
_FORECAST_RISK_VALUE = {"low": 20.0, "moderate": 50.0, "high": 75.0, "critical": 100.0}


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _load_priority() -> dict:
    return storage.load(
        "priority",
        {"zones": [], "config": {}, "calculatedAt": None},
    )


def _active_reports() -> list[dict]:
    return [
        r
        for r in storage.load("reports", [])
        if r.get("status") in _ACTIVE_STATUSES
    ]


def _zone_of(report: dict) -> str:
    return gis_service._zone_for_location(
        report.get("location", ""),
        report.get("latitude"),
        report.get("longitude"),
    )[0]


def _forecast_risk_for(location: str) -> float:
    """Return the highest forecast risk (0-100) matching a zone's location."""
    if not location:
        return _FORECAST_RISK_VALUE["low"]
    bucket = "low"
    for item in storage.load("forecasts", {"items": []}).get("items", []):
        if (item.get("location") or "").lower() == location.lower():
            value = _FORECAST_RISK_VALUE.get(item.get("riskLevel"), _FORECAST_RISK_VALUE["low"])
            if value > _FORECAST_RISK_VALUE.get(bucket, 0):
                bucket = item.get("riskLevel", "low")
    return _FORECAST_RISK_VALUE.get(bucket, _FORECAST_RISK_VALUE["low"])


def _factors_for_zone(zone_id: str, stored_zone: dict, report_rows: list[dict], location: str) -> list[PriorityFactorOut]:
    """Build the per-zone factor breakdown from live + calibration data."""
    baseline = {f.get("name", ""): float(f.get("value", 0)) for f in stored_zone.get("factors", [])}

    flood_base = baseline.get("Flood Severity", 30.0)
    if report_rows:
        avg_sev = sum(_SEVERITY_VALUE.get(r.get("severity", "low"), 0) for r in report_rows) / len(report_rows)
        flood = round(0.6 * avg_sev + 0.4 * flood_base, 1)
    else:
        flood = round(flood_base, 1)

    depth_values = [float(r["waterDepth"]) for r in report_rows if r.get("waterDepth") is not None]
    depth = round(min(100.0, max(depth_values) / 2.0 * 100.0), 1) if depth_values else 0.0
    depth = min(100.0, depth)

    report_density = round(min(100.0, (len(report_rows) / 10.0) * 100.0), 1)

    infrastructure = round(baseline.get("Infrastructure Risk", 30.0), 1)
    population = round(baseline.get("Population Density", 30.0), 1)
    road_access = round(baseline.get("Road Access", 30.0), 1)

    forecast = round(_forecast_risk_for(location), 1)

    return [
        PriorityFactorOut(name="Flood Severity", value=flood),
        PriorityFactorOut(name="Water Depth", value=depth),
        PriorityFactorOut(name="Citizen Reports", value=report_density),
        PriorityFactorOut(name="Forecast Risk", value=forecast),
        PriorityFactorOut(name="Infrastructure Risk", value=infrastructure),
        PriorityFactorOut(name="Population Density", value=population),
        PriorityFactorOut(name="Road Access", value=road_access),
    ]


def _risk_level(score: float) -> str:
    if score >= 75:
        return "critical"
    if score >= 50:
        return "high"
    if score >= 25:
        return "medium"
    return "low"


def _score(factors: list[PriorityFactorOut], config: PriorityFactorsConfigOut) -> float:
    by_name = {f.name: f.value for f in factors}
    total_weight = (
        config.floodSeverityWeight
        + config.infrastructureRiskWeight
        + config.populationDensityWeight
        + config.roadAccessWeight
        + 1.0  # citizen reports
        + 1.0  # forecast risk
        + 1.0  # water depth
    )
    raw = (
        by_name["Flood Severity"] * config.floodSeverityWeight
        + by_name["Infrastructure Risk"] * config.infrastructureRiskWeight
        + by_name["Population Density"] * config.populationDensityWeight
        + by_name["Road Access"] * config.roadAccessWeight
        + by_name["Citizen Reports"] * 1.0
        + by_name["Forecast Risk"] * 1.0
        + by_name["Water Depth"] * 1.0
    )
    return round(max(0.0, min(100.0, raw / total_weight)), 1)


def get_priority_zones() -> PriorityZonesResponseOut:
    data = _load_priority()
    actives = _active_reports()
    zone_report_map: dict[str, list[dict]] = {}
    for r in actives:
        zone_report_map.setdefault(_zone_of(r), []).append(r)

    config = PriorityFactorsConfigOut(
        floodSeverityWeight=data.get("config", {}).get("floodSeverityWeight", 1.2),
        infrastructureRiskWeight=data.get("config", {}).get("infrastructureRiskWeight", 1.0),
        populationDensityWeight=data.get("config", {}).get("populationDensityWeight", 0.8),
        roadAccessWeight=data.get("config", {}).get("roadAccessWeight", 0.6),
    )

    stored_zones = data.get("zones", [])
    views: list[PriorityZoneOut] = []
    for zone in stored_zones:
        zone_id = zone.get("zoneId", "")
        rows = zone_report_map.get(zone_id, [])
        location = zone.get("zoneName", "")
        factors = _factors_for_zone(zone_id, zone, rows, location)
        score = _score(factors, config)
        views.append(
            PriorityZoneOut(
                zoneId=zone_id,
                zoneName=zone.get("zoneName", ""),
                score=score,
                riskLevel=_risk_level(score),  # type: ignore[arg-type]
                reportCount=len(rows),
                factors=factors,
                recommendedAction=_recommended_action(_risk_level(score)),
            )
        )

    views.sort(key=lambda z: z.score, reverse=True)
    return PriorityZonesResponseOut(
        zones=views,
        config=config,
        calculatedAt=_now_iso(),
    )


def _recommended_action(risk_level: str) -> str:
    if risk_level == "critical":
        return "Immediate emergency response deployment. Evacuate affected zones."
    if risk_level == "high":
        return "Elevated monitoring. Pre-position emergency response units."
    if risk_level == "medium":
        return "Active monitoring. Prepare contingency resources."
    return "Standard monitoring. No immediate action required."
