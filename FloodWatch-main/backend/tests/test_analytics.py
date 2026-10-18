"""Analytics tests — verify metrics are computed, not hardcoded."""

from tests.conftest import create_report, headers


def _auth(admin_a):
    return headers(admin_a["token"])


def test_analytics_require_admin(client, citizen_a):
    assert client.get("/analytics/overview", headers=headers(citizen_a["token"])).status_code == 403
    assert client.get("/analytics/severity", headers=headers(citizen_a["token"])).status_code == 403
    assert client.get("/analytics/funds", headers=headers(citizen_a["token"])).status_code == 403
    assert client.get("/analytics/overview").status_code == 401


def test_overview_reflects_reports(client, citizen_a, admin_a):
    auth = _auth(admin_a)

    model = client.get("/analytics/overview", headers=auth)
    assert model.status_code == 200
    assert model.json()["data"]["totalReports"] == 0

    create_report(client, citizen_a["token"], severity="critical")
    create_report(client, citizen_a["token"], severity="high")

    overview = client.get("/analytics/overview", headers=auth).json()["data"]
    assert overview["totalReports"] == 2
    assert overview["treasuryBalance"] == 1420000.0
    assert len(overview["reportsTrend"]) == 7
    # Series is newest-first; today's bucket should contain the reports created now.
    assert overview["reportsTrend"][0]["totalReports"] == 2


def test_severity_distribution(client, citizen_a, admin_a):
    auth = _auth(admin_a)
    create_report(client, citizen_a["token"], severity="critical")
    create_report(client, citizen_a["token"], severity="high")
    create_report(client, citizen_a["token"], severity="high")

    body = client.get("/analytics/severity", headers=auth).json()["data"]
    assert body["total"] == 3
    buckets = {m["name"]: m["value"] for m in body["distribution"]}
    assert buckets == {"Critical": 1, "High": 2, "Medium": 0, "Low": 0}


def test_areas_grouped(client, citizen_a, admin_a):
    auth = _auth(admin_a)
    # Distinct coordinates near each zone's center so proximity assignment works.
    create_report(client, citizen_a["token"], location="412 River Road (Underpass Sector B)", latitude=34.0622, longitude=-118.2237, severity="high")
    create_report(client, citizen_a["token"], location="805 North Boulevard (Commercial Strip)", latitude=34.0754, longitude=-118.2105, severity="medium")
    create_report(client, citizen_a["token"], location="East Creek Park & Walking Trail", latitude=34.0482, longitude=-118.2580, severity="medium")

    body = client.get("/analytics/areas", headers=auth).json()["data"]
    areas = body["areas"]
    # First row is the "All Sectors" aggregate.
    assert areas[0]["zoneName"] == "All Sectors"
    assert areas[0]["total"] == 3
    assert any(a["zoneName"] == "Sector 4: Lower River Basin" and a["total"] == 1 for a in areas)
    assert any(a["zoneName"] == "Sector 3: Downtown Plaza Gutterway" and a["total"] == 1 for a in areas)


def test_incidents_series(client, citizen_a, admin_a):
    auth = _auth(admin_a)
    create_report(client, citizen_a["token"])

    body = client.get("/analytics/incidents", headers=auth).json()["data"]
    assert body["dailySeries"]
    assert body["weeklySeries"]
    assert body["monthlySeries"]
    assert body["dailySeries"][0]["totalReports"] >= 1
    point = body["dailySeries"][0]
    assert point["label"]
    assert point["totalReports"] >= 0


def test_funds_analytics(client, citizen_a, admin_a):
    auth = _auth(admin_a)
    client.post(
        "/funds/allocate",
        json={"zone": "Sector 4", "category": "Drainage", "amount": 200000.0, "reason": "Gutter clearing."},
        headers=auth,
    )
    body = client.get("/analytics/funds", headers=auth).json()["data"]
    assert body["totalBudget"] == 1420000.0
    assert body["allocated"] == 200000.0
    assert body["remaining"] == 1220000.0
    assert len(body["transactions"]) == 1


def test_system_stats(client, citizen_a, admin_a):
    auth = _auth(admin_a)
    create_report(client, citizen_a["token"], severity="high")

    body = client.get("/analytics/system-stats", headers=auth).json()["data"]
    assert body["activeReports"] == 1
    assert body["pendingVerifications"] == 1
    assert body["availableFunds"] == 1420000.0
    assert body["highRiskZones"] >= 1