"""GIS service — map layers assembled from stored JSON data."""

from __future__ import annotations

import threading
from datetime import datetime, timezone
from pathlib import Path

from app.schemas.gis import (
    GISDataOut,
    GISLayerOut,
    GISLineOut,
    GISPointOut,
    GISReportOut,
    GISZoneOut,
)
from app.storage.json_storage import storage


def _gis() -> dict:
    return storage.load(
        "gis",
        {
            "zones": [],
            "roads": [],
            "hospitals": [],
            "shelters": [],
            "rivers": [],
            "evacuationRoutes": [],
        },
    )


def _haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    import math

    r = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlmb = math.radians(lng2 - lng1)
    a = math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dlmb / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def _zone_for_location(
    location: str,
    latitude: float | None = None,
    longitude: float | None = None,
) -> tuple[str, str]:
    """Assign a report to a GIS zone.

    Strategy (in order):
    1. Exact-ish text match against the zone's sector prefix (e.g. "Sector 4").
    2. Proximity fallback: nearest zone center within the zone radius.

    Returns (zone_id, zone_name) or ("unassigned", "Unassigned").
    """
    zones = _gis().get("zones", [])
    lower = (location or "").lower()

    for zone in zones:
        name = zone.get("name", "")
        sector = name.split(":", 1)[0].strip().lower()
        if sector and sector in lower:
            return zone.get("id", "unassigned"), name

    if latitude is not None and longitude is not None:
        best, best_dist = None, float("inf")
        for zone in zones:
            center = zone.get("center") or [0, 0]
            if len(center) < 2:
                continue
            dist = _haversine_km(latitude, longitude, float(center[0]), float(center[1]))
            radius_km = max(float(zone.get("radius", 0)) / 1000.0, 5.0)
            if dist <= radius_km and dist < best_dist:
                best, best_dist = zone, dist
        if best:
            return best.get("id", "unassigned"), best.get("name", "Unassigned")

    return "unassigned", "Unassigned"


def reports() -> list[GISReportOut]:
    reports = storage.load("reports", [])
    reports = [r for r in reports if r.get("status") != "archived"]
    reports.sort(key=lambda r: r.get("submittedAt", ""), reverse=True)
    return [
        GISReportOut(
            id=r.get("id", ""),
            name=r.get("location", ""),
            lat=r.get("latitude", 0),
            lng=r.get("longitude", 0),
            severity=r.get("severity", "low"),
            status=r.get("status", "submitted"),
            submittedAt=r.get("submittedAt", ""),
        )
        for r in reports
    ]


def zones() -> list[GISZoneOut]:
    gis = _gis()
    data = gis.get("zones", [])
    reports = storage.load("reports", [])
    active = [r for r in reports if r.get("status") not in ("resolved", "archived")]
    now = datetime.now(timezone.utc).strftime("%H:%M")

    views = []
    for zone in data:
        zone_id = zone.get("id", "")
        count = sum(
            1
            for r in active
            if _zone_for_location(r.get("location", ""), r.get("latitude"), r.get("longitude"))[0]
            == zone_id
        )
        views.append(
            GISZoneOut(
                id=zone_id,
                name=zone.get("name", ""),
                center=zone.get("center", [0, 0]),
                radius=zone.get("radius", 0),
                riskLevel=zone.get("riskLevel", "low"),
                priorityScore=zone.get("priorityScore", 0),
                activeReportsCount=count,
                lastUpdated=now,
            )
        )
    return views


def _points(rows: list[dict]) -> list[GISPointOut]:
    return [GISPointOut(name=r.get("name", ""), lat=r.get("lat", 0), lng=r.get("lng", 0)) for r in rows]


def _lines(rows: list[dict]) -> list[GISLineOut]:
    return [GISLineOut(name=r.get("name", ""), path=r.get("path", [])) for r in rows]


def roads() -> list[GISLineOut]:
    return _lines(_gis().get("roads", []))


def hospitals() -> list[GISPointOut]:
    return _points(_gis().get("hospitals", []))


def shelters() -> list[GISPointOut]:
    return _points(_gis().get("shelters", []))


def rivers() -> list[GISLineOut]:
    return _lines(_gis().get("rivers", []))


def evacuation_routes() -> list[GISLineOut]:
    return _lines(_gis().get("evacuationRoutes", []))


def data() -> GISDataOut:
    return GISDataOut(
        roads=roads(),
        hospitals=hospitals(),
        shelters=shelters(),
        rivers=rivers(),
        evacuationRoutes=evacuation_routes(),
    )


def layers() -> list[GISLayerOut]:
    report_points = [
        GISPointOut(name=r.name, lat=r.lat, lng=r.lng) for r in reports()
    ]
    zone_points = [
        GISPointOut(name=z.name, lat=z.center[0] if z.center else 0, lng=z.center[1] if z.center else 0)
        for z in zones()
    ]
    return [
        GISLayerOut(id="reports", name="Flood Reports", type="reports", visible=True, data=report_points),
        GISLayerOut(id="zones", name="Risk Zones", type="zones", visible=True, data=zone_points),
        GISLayerOut(id="roads", name="Roads", type="roads", visible=True, data=roads()),
        GISLayerOut(id="hospitals", name="Hospitals", type="hospitals", visible=True, data=hospitals()),
        GISLayerOut(id="shelters", name="Shelters", type="shelters", visible=True, data=shelters()),
        GISLayerOut(id="rivers", name="Rivers", type="rivers", visible=True, data=rivers()),
        GISLayerOut(
            id="evacuation",
            name="Evacuation Routes",
            type="evacuation",
            visible=True,
            data=evacuation_routes(),
        ),
    ]


# ---------------------------------------------------------------------------
# Chennai flood GIS layers: validated read-only outputs of the R pipeline.
# ---------------------------------------------------------------------------

# backend/app/services/gis_service.py -> parents[4] is the folder that holds
# both FloodWatch-main and r-backend (the layout produced by extracting the parts).
CHENNAI_OUTPUT_DIR = Path(__file__).resolve().parents[4] / "r-backend" / "outputs"

CHENNAI_LAYER_FILES: dict[str, str] = {
    "hazard-categories": "15_final_hazard_categories.geojson",
    "density-cells": "15_final_density_region_category.geojson",
    "event-records": "15_final_event_records.geojson",
    "survey-depths": "15_final_survey_depth_points.geojson",
}

_chennai_bytes: dict[str, bytes] = {}
_chennai_lock = threading.Lock()


def chennai_layer_bytes(name: str) -> bytes:
    """Return the raw GeoJSON bytes for one Chennai layer.

    A layer is read from disk at most once per process, on its first request,
    and is then served from memory. Layers that are never requested are never
    read. Raises FileNotFoundError when the R output is missing.
    """
    with _chennai_lock:
        cached = _chennai_bytes.get(name)
        if cached is None:
            cached = (CHENNAI_OUTPUT_DIR / CHENNAI_LAYER_FILES[name]).read_bytes()
            _chennai_bytes[name] = cached
        return cached