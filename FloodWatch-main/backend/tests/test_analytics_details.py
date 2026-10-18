"""Analytics /details tests — response stats and forecast-vs-actual."""

from tests.conftest import create_report, headers


def _auth(admin_a):
    return headers(admin_a["token"])


def test_details_require_admin(client, citizen_a):
    assert client.get("/analytics/details").status_code == 401
    assert client.get("/analytics/details", headers=headers(citizen_a["token"])).status_code == 403


def test_details_response_stats_insufficient_when_empty(client, admin_a):
    body = client.get("/analytics/details", headers=_auth(admin_a)).json()["data"]
    stats = body["responseStats"]
    assert stats["totalReports"] == 0
    assert stats["insufficientData"] is True


def test_details_reflects_resolved_reports(client, citizen_a, admin_a):
    report = create_report(client, citizen_a["token"], severity="high")
    client.patch(
        f"/reports/{report['id']}/resolve",
        json={"resolutionNotes": "Crew cleared the basin."},
        headers=_auth(admin_a),
    )

    stats = client.get("/analytics/details", headers=_auth(admin_a)).json()["data"]["responseStats"]
    assert stats["totalReports"] == 1
    assert stats["resolvedReports"] == 1
    assert stats["resolutionRate"] == 1.0
    assert stats["insufficientData"] is False
    assert stats["avgResolutionMinutes"] >= 0


def test_details_forecast_vs_actual_zoned(client, citizen_a, admin_a):
    # A report in Sector 3 (Z-4) with a known water depth should compare
    # against that sector's stored forecast.
    create_report(
        client,
        citizen_a["token"],
        location="East Creek Park & Walking Trail",
        latitude=34.0482,
        longitude=-118.2580,
        severity="medium",
        water_depth=0.25,
    )

    rows = client.get("/analytics/details", headers=_auth(admin_a)).json()["data"]["forecastVsActual"]
    assert rows
    z4 = next(r for r in rows if r["zoneId"] == "Z-4")
    assert z4["hasActual"] is True
    assert z4["actualDepth"] == 0.25
    assert z4["predictedWaterLevel"] > 0
    assert z4["waterLevelStatus"] in ("exceeded", "within", "under")


def test_details_forecast_vs_actual_flags_no_actual(client, admin_a):
    rows = client.get("/analytics/details", headers=_auth(admin_a)).json()["data"]["forecastVsActual"]
    # Zone sectors with forecasts but no reported depth must be flagged.
    for row in rows:
        assert row["hasActual"] is False
        assert row["waterLevelStatus"] == "within"
