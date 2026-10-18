"""Alert broadcast tests."""

from tests.conftest import headers


def test_list_alerts_public(client):
    assert client.get("/alerts").status_code == 200


def test_create_alert_admin_only(client, citizen_a):
    response = client.post(
        "/alerts",
        json={"message": "Not allowed.", "severity": "high"},
        headers=headers(citizen_a["token"]),
    )
    assert response.status_code == 403


def test_create_and_list_alert(client, admin_a):
    response = client.post(
        "/alerts",
        json={"message": "Evacuation advised for Sector 4.", "severity": "critical", "zone": "Sector 4: Lower River Basin"},
        headers=headers(admin_a["token"]),
    )
    assert response.status_code == 201
    alert = response.json()["data"]
    assert alert["active"] is True
    assert alert["createdBy"] == admin_a["user"]["id"]
    assert alert["zone"] == "Sector 4: Lower River Basin"

    listing = client.get("/alerts").json()["data"]
    assert any(a["id"] == alert["id"] for a in listing)


def test_delete_alert_admin_only(client, citizen_a, admin_a):
    alert = client.post(
        "/alerts",
        json={"message": "Temporary.", "severity": "medium"},
        headers=headers(admin_a["token"]),
    ).json()["data"]

    assert client.delete(f"/alerts/{alert['id']}", headers=headers(citizen_a["token"])).status_code == 403

    response = client.delete(f"/alerts/{alert['id']}", headers=headers(admin_a["token"]))
    assert response.status_code == 200
    remaining = client.get("/alerts").json()["data"]
    assert not any(a["id"] == alert["id"] for a in remaining)


def test_delete_missing_alert_404(client, admin_a):
    assert client.delete("/alerts/does-not-exist", headers=headers(admin_a["token"])).status_code == 404


def test_alert_fans_out_notifications(client, citizen_a, citizen_b, admin_a):
    client.post(
        "/alerts",
        json={"message": "Heavy rain incoming.", "severity": "high"},
        headers=headers(admin_a["token"]),
    )
    for token_fixture in (citizen_a, citizen_b):
        notifs = client.get("/notifications", headers=headers(token_fixture["token"]))
        assert notifs.json()["data"]["unreadCount"] == 1
        assert notifs.json()["data"]["notifications"][0]["title"] == "New alert"


def test_create_alert_validation(client, admin_a):
    response = client.post(
        "/alerts",
        json={"message": "x", "severity": "high"},
        headers=headers(admin_a["token"]),
    )
    assert response.status_code == 422