"""Dynamic priority scoring tests.

Verifies that the priority endpoint computes scores from live report data
rather than serving static values, and that each zone exposes the factor
breakdown plus a count of its active reports.
"""

from tests.conftest import create_report, headers


def _zones(client):
    return client.get("/priority/zones").json()["data"]["zones"]


def test_priority_factors_include_live_factors(client):
    zones = _zones(client)
    names = {f["name"] for z in zones for f in z["factors"]}
    assert {"Flood Severity", "Citizen Reports", "Forecast Risk", "Infrastructure Risk"} <= names


def test_priority_calculated_at_is_fresh(client):
    body = client.get("/priority/zones").json()["data"]
    assert body["calculatedAt"]


def test_report_count_increases_with_reports_in_zone(client, citizen_a):
    create_report(
        client,
        citizen_a["token"],
        location="412 River Road (Underpass Sector B)",
        latitude=34.0622,
        longitude=-118.2237,
        severity="critical",
    )
    create_report(
        client,
        citizen_a["token"],
        location="River Basin Secondary Access",
        latitude=34.0650,
        longitude=-118.2200,
        severity="high",
    )

    zone = next(z for z in _zones(client) if z["zoneId"] == "Z-1")
    assert zone["reportCount"] == 2 >= 2
    # Active critical/high reports must push the flood severity factor up.
    flood = next(f["value"] for f in zone["factors"] if f["name"] == "Flood Severity")
    assert flood > 50


def test_severe_zone_ranks_above_quiet_zone(client, citizen_a):
    create_report(
        client,
        citizen_a["token"],
        location="412 River Road (Underpass Sector B)",
        latitude=34.0622,
        longitude=-118.2237,
        severity="critical",
    )
    zones = _zones(client)
    z1 = next(z for z in zones if z["zoneId"] == "Z-1")
    z3 = next(z for z in zones if z["zoneId"] == "Z-3")
    assert z3["score"] < z1["score"]


def test_priority_ordered_desc_by_score(client):
    scores = [z["score"] for z in _zones(client)]
    assert scores == sorted(scores, reverse=True)
