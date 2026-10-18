"""Flood report permission and lifecycle tests."""

from tests.conftest import create_report, headers


def test_create_report_requires_auth(client):
    response = client.post(
        "/reports",
        json={
            "location": "Somewhere",
            "latitude": 34.0,
            "longitude": -118.0,
            "severity": "low",
            "waterDepth": 0.5,
            "description": "Minor pooling.",
        },
    )
    assert response.status_code == 401


def test_citizen_creates_report(client, citizen_a):
    data = create_report(client, citizen_a["token"])
    assert data["status"] == "submitted"
    assert data["userId"] == citizen_a["user"]["id"]
    assert data["phase2Status"] == "pending"
    assert data["date"] == data["submittedAt"]
    assert data["waterLevelDepth"] == "1.2 m"
    assert data["reporterName"] == citizen_a["user"]["name"]


def test_invalid_coordinates_rejected(client, citizen_a):
    token = citizen_a["token"]
    cases = [
        {"latitude": 91.0, "longitude": -118.0},
        {"latitude": 34.0, "longitude": -181.0},
        {"latitude": -91.0, "longitude": 0.0},
    ]
    for coords in cases:
        response = client.post(
            "/reports",
            json={
                "location": "Somewhere",
                "latitude": coords["latitude"],
                "longitude": coords["longitude"],
                "severity": "low",
                "waterDepth": 0.5,
                "description": "Minor pooling.",
            },
            headers=headers(token),
        )
        assert response.status_code == 422


def test_invalid_severity_and_depth(client, citizen_a):
    token = citizen_a["token"]
    base = {
        "location": "Somewhere",
        "latitude": 34.0,
        "longitude": -118.0,
        "waterDepth": 0.5,
        "description": "Minor pooling.",
    }
    assert client.post("/reports", json={**base, "severity": "extreme"}, headers=headers(token)).status_code == 422
    assert client.post("/reports", json={**base, "severity": "low", "waterDepth": -1}, headers=headers(token)).status_code == 422


def test_citizen_lists_only_own_reports(client, citizen_a, citizen_b):
    create_report(client, citizen_a["token"], location="A location")
    create_report(client, citizen_a["token"], location="B location")
    create_report(client, citizen_b["token"], location="C location")

    mine = client.get("/reports/my", headers=headers(citizen_a["token"]))
    assert mine.status_code == 200
    assert {r["location"] for r in mine.json()["data"]} == {"A location", "B location"}

    listed = client.get("/reports", headers=headers(citizen_a["token"]))
    assert len(listed.json()["data"]) == 2


def test_citizen_cannot_view_other_users_report(client, citizen_a, citizen_b):
    other = create_report(client, citizen_b["token"], location="Private location")
    response = client.get(f"/reports/{other['id']}", headers=headers(citizen_a["token"]))
    assert response.status_code == 404


def test_get_own_report(client, citizen_a):
    report = create_report(client, citizen_a["token"])
    response = client.get(f"/reports/{report['id']}", headers=headers(citizen_a["token"]))
    assert response.status_code == 200
    assert response.json()["data"]["id"] == report["id"]


def test_unknown_report_404(client, citizen_a):
    assert client.get("/reports/nope", headers=headers(citizen_a["token"])).status_code == 404


def test_citizen_updates_own_report(client, citizen_a):
    report = create_report(client, citizen_a["token"])
    response = client.patch(
        f"/reports/{report['id']}",
        json={"description": "Updated description of the flooding."},
        headers=headers(citizen_a["token"]),
    )
    assert response.status_code == 200
    assert response.json()["data"]["description"] == "Updated description of the flooding."


def test_citizen_cannot_set_status_via_patch(client, citizen_a):
    report = create_report(client, citizen_a["token"])
    response = client.patch(
        f"/reports/{report['id']}",
        json={"status": "verified"},
        headers=headers(citizen_a["token"]),
    )
    assert response.status_code == 403


def test_admin_verifies_report(client, citizen_a, admin_a):
    report = create_report(client, citizen_a["token"])
    response = client.patch(
        f"/reports/{report['id']}/verify",
        json={"notes": "Field inspection complete."},
        headers=headers(admin_a["token"]),
    )
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["status"] == "verified"
    assert data["verifiedAt"] is not None


def test_citizen_cannot_verify_report(client, citizen_a, citizen_b):
    report = create_report(client, citizen_a["token"])
    response = client.patch(
        f"/reports/{report['id']}/verify",
        json={},
        headers=headers(citizen_b["token"]),
    )
    assert response.status_code == 403


def test_admin_resolves_report(client, citizen_a, admin_a):
    report = create_report(client, citizen_a["token"])
    response = client.patch(
        f"/reports/{report['id']}/resolve",
        json={"resolutionNotes": "Crew cleared the blocked catch basin."},
        headers=headers(admin_a["token"]),
    )
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["status"] == "resolved"
    assert data["resolvedAt"] is not None
    assert data["resolutionNotes"] == "Crew cleared the blocked catch basin."
    assert data["adminNotes"] == "Crew cleared the blocked catch basin."


def test_citizen_cannot_resolve_report(client, citizen_a, citizen_b):
    report = create_report(client, citizen_a["token"])
    response = client.patch(
        f"/reports/{report['id']}/resolve",
        json={"resolutionNotes": "Nope."},
        headers=headers(citizen_b["token"]),
    )
    assert response.status_code == 403


def test_admin_sees_all_reports_and_pending_synonym(client, citizen_a, citizen_b, admin_a):
    r1 = create_report(client, citizen_a["token"])
    create_report(client, citizen_b["token"])

    all_reports = client.get("/reports", headers=headers(admin_a["token"]))
    assert all_reports.status_code == 200
    assert len(all_reports.json()["data"]) == 2

    # ``pending`` is accepted as a synonym for ``submitted``.
    response = client.patch(
        f"/reports/{r1['id']}",
        json={"status": "pending"},
        headers=headers(admin_a["token"]),
    )
    assert response.status_code == 200
    assert response.json()["data"]["status"] == "submitted"


def test_owner_can_delete_own_report(client, citizen_a):
    report = create_report(client, citizen_a["token"])
    response = client.delete(f"/reports/{report['id']}", headers=headers(citizen_a["token"]))
    assert response.status_code == 200
    assert client.get(f"/reports/{report['id']}", headers=headers(citizen_a["token"])).status_code == 404


def test_citizen_cannot_delete_other_users_report(client, citizen_a, citizen_b):
    report = create_report(client, citizen_b["token"])
    response = client.delete(f"/reports/{report['id']}", headers=headers(citizen_a["token"]))
    assert response.status_code == 404


def test_admin_cannot_verify_resolved_report(client, citizen_a, admin_a):
    report = create_report(client, citizen_a["token"])
    client.patch(
        f"/reports/{report['id']}/resolve",
        json={"resolutionNotes": "Done."},
        headers=headers(admin_a["token"]),
    )
    response = client.patch(
        f"/reports/{report['id']}/verify",
        json={},
        headers=headers(admin_a["token"]),
    )
    assert response.status_code == 409