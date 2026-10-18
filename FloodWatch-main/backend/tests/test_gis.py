"""GIS endpoint tests — seeded baseline, live report points and Chennai layers."""

import pytest

from app.services import gis_service
from tests.conftest import create_report, headers


def _all_gis(client):
    paths = [
        "/gis/zones",
        "/gis/layers",
        "/gis/roads",
        "/gis/hospitals",
        "/gis/shelters",
        "/gis/rivers",
        "/gis/evacuation-routes",
        "/gis/data",
        "/gis/reports",
    ]
    out = {}
    for path in paths:
        response = client.get(path)
        assert response.status_code == 200, path
        assert response.json()["success"] is True
        out[path] = response.json()["data"]
    return out


def test_gis_baseline_seeded(client):
    data = _all_gis(client)
    assert len(data["/gis/zones"]) == 4
    assert len(data["/gis/roads"]) == 2
    assert len(data["/gis/hospitals"]) == 2
    assert len(data["/gis/shelters"]) == 2
    assert len(data["/gis/rivers"]) == 1
    assert len(data["/gis/evacuation-routes"]) == 2


def test_gis_zone_fields_match_frontend_contract(client):
    zones = client.get("/gis/zones").json()["data"]
    zone = zones[0]
    for field in ("id", "name", "center", "radius", "riskLevel", "priorityScore", "activeReportsCount", "lastUpdated"):
        assert field in zone


def test_gis_layers_include_all_types(client):
    layers = client.get("/gis/layers").json()["data"]
    types = {layer["type"] for layer in layers}
    assert types == {"reports", "zones", "roads", "hospitals", "shelters", "rivers", "evacuation"}


def test_gis_reports_include_live_reports(client, citizen_a):
    report = create_report(client, citizen_a["token"], severity="medium")
    reports = client.get("/gis/reports").json()["data"]
    assert any(r["id"] == report["id"] and r["lat"] == report["latitude"] for r in reports)


def test_gis_data_shape_matches_gisdataresponse(client):
    data = client.get("/gis/data").json()["data"]
    for key in ("roads", "hospitals", "shelters", "rivers", "evacuationRoutes"):
        assert key in data


# ---------------------------------------------------------------------------
# Chennai flood layers (validated R outputs). Skipped if the R outputs folder
# is not present next to FloodWatch-main.
# ---------------------------------------------------------------------------

CHENNAI_FILES_PRESENT = all(
    (gis_service.CHENNAI_OUTPUT_DIR / name).is_file()
    for name in gis_service.CHENNAI_LAYER_FILES.values()
)
requires_chennai_outputs = pytest.mark.skipif(
    not CHENNAI_FILES_PRESENT,
    reason="validated Chennai R outputs not found next to FloodWatch-main",
)

# Feature counts from the validated R run: 5 hazard categories, 15 region-by-category
# cells, 753 event records (15_table_verification.csv) and 192 survey depth points.
CHENNAI_EXPECTED_FEATURES = {
    "/gis/chennai/hazard-categories": 5,
    "/gis/chennai/density-cells": 15,
    "/gis/chennai/event-records": 753,
    "/gis/chennai/survey-depths": 192,
}


def _chennai_features(client, path):
    response = client.get(path)
    assert response.status_code == 200, path
    body = response.json()
    assert body["success"] is True
    return body["data"]["features"]


def _positions(geometry):
    """Yield every [lng, lat] position in a GeoJSON geometry, including GeometryCollections."""
    if geometry["type"] == "GeometryCollection":
        for part in geometry["geometries"]:
            yield from _positions(part)
        return
    stack = [geometry["coordinates"]]
    while stack:
        item = stack.pop()
        if isinstance(item[0], (int, float)):
            yield item
        else:
            stack.extend(item)


@requires_chennai_outputs
def test_chennai_layers_feature_counts_match_validated_outputs(client):
    for path, expected in CHENNAI_EXPECTED_FEATURES.items():
        assert len(_chennai_features(client, path)) == expected, path


@requires_chennai_outputs
def test_chennai_layers_are_wgs84_inside_chennai_study_area(client):
    for path in CHENNAI_EXPECTED_FEATURES:
        for feature in _chennai_features(client, path):
            for lng, lat in _positions(feature["geometry"]):
                assert 79.9 <= lng <= 80.5 and 12.6 <= lat <= 13.4, path


@requires_chennai_outputs
def test_chennai_hazard_categories_are_source_categories_with_no_very_high_survey(client):
    categories = {
        f["properties"]["category"]: f["properties"]
        for f in _chennai_features(client, "/gis/chennai/hazard-categories")
    }
    assert set(categories) == {"Very Low", "Low", "Moderate", "High", "Very High"}
    assert categories["Very High"]["survey_points_n"] == 0
    assert "not evidence of absence of flooding" in categories["Very High"]["data_note"]
    for name in ("Very Low", "Low", "Moderate", "High"):
        assert "not independently validated" in categories[name]["data_note"]


@requires_chennai_outputs
def test_chennai_event_records_carry_non_depth_caveat(client):
    for feature in _chennai_features(client, "/gis/chennai/event-records"):
        assert "Not a measured depth" in feature["properties"]["data_note"]


@requires_chennai_outputs
def test_chennai_survey_depths_are_metres_converted_from_inches(client):
    for feature in _chennai_features(client, "/gis/chennai/survey-depths"):
        props = feature["properties"]
        assert 0.1 < props["depth_m"] < 2.0
        assert abs(props["depth_m"] - props["depth_inches"] * 0.0254) < 0.0005
        assert "not evidence of no flooding" in props["data_note"]


def test_chennai_layer_missing_file_returns_not_found_envelope(client, monkeypatch, tmp_path):
    monkeypatch.setattr(gis_service, "CHENNAI_OUTPUT_DIR", tmp_path)
    monkeypatch.setattr(gis_service, "_chennai_bytes", {})
    response = client.get("/gis/chennai/event-records")
    assert response.status_code == 404
    body = response.json()
    assert body["success"] is False
    assert body["error"]["code"] == "NOT_FOUND"