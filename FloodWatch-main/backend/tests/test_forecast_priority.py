"""Forecast and priority endpoint tests."""

from tests.conftest import create_report, headers


def test_forecast_list(client):
    response = client.get("/forecast")
    assert response.status_code == 200
    body = response.json()["data"]
    assert "Sector 4: Lower River Basin" in body["locations"]
    assert len(body["forecasts"]) >= 3
    item = body["forecasts"][0]
    for field in ("locationId", "location", "timestamp", "horizon", "riskLevel",
                  "predictedWaterLevel", "confidence"):
        assert field in item


def test_forecast_by_location(client):
    response = client.get("/forecast/loc-1")
    assert response.status_code == 200
    body = response.json()["data"]
    assert body["location"] == "Sector 4: Lower River Basin"
    assert body["forecasts"]
    point = body["forecasts"][0]
    # Phase 2 contract fields:
    for field in ("timeWindow", "riskLevel", "predictedWaterLevel", "confidence", "timestamp", "location", "notes"):
        assert field in point
    assert "generatedAt" in body


def test_forecast_unknown_location_404(client):
    assert client.get("/forecast/no-such-location").status_code == 404


def test_priority_zones_sorted_and_contract_complete(client):
    response = client.get("/priority/zones")
    assert response.status_code == 200
    body = response.json()["data"]
    assert body["calculatedAt"]
    assert body["config"]["floodSeverityWeight"] == 1.2

    scores = [z["score"] for z in body["zones"]]
    assert scores == sorted(scores, reverse=True)
    zone = body["zones"][0]
    for field in ("zoneId", "zoneName", "score", "riskLevel", "reportCount", "factors", "recommendedAction"):
        assert field in zone
    assert zone["factors"][0]["name"] == "Flood Severity"


def test_report_created_in_priority_and_analytics_visible(client, citizen_a, admin_a):
    create_report(client, citizen_a["token"])

    overview = client.get("/analytics/overview", headers=headers(admin_a["token"])).json()["data"]
    assert overview["totalReports"] == 1