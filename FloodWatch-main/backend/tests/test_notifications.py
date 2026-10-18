"""Notification access-control tests."""

from tests.conftest import headers


def test_notifications_require_auth(client):
    assert client.get("/notifications").status_code == 401


def test_citizen_notifications_from_admin_alert(client, citizen_a, admin_a):
    admin = admin_a["token"]
    citizen = citizen_a["token"]

    alert = client.post(
        "/alerts",
        json={"message": "Rising water near Sector 4.", "severity": "high"},
        headers=headers(admin),
    )
    assert alert.status_code == 201

    response = client.get("/notifications", headers=headers(citizen))
    assert response.status_code == 200
    body = response.json()["data"]
    assert body["unreadCount"] == 1
    notif = body["notifications"][0]
    assert notif["read"] is False
    assert notif["type"] == "alert"
    assert notif["severity"] == "high"


def test_mark_notification_read(client, citizen_a, admin_a):
    client.post(
        "/alerts",
        json={"message": "Heads up.", "severity": "medium"},
        headers=headers(admin_a["token"]),
    )

    listing = client.get("/notifications", headers=headers(citizen_a["token"]))
    notif_id = listing.json()["data"]["notifications"][0]["id"]

    response = client.patch(
        f"/notifications/{notif_id}/read",
        headers=headers(citizen_a["token"]),
    )
    assert response.status_code == 200
    body = response.json()["data"]
    assert body["unreadCount"] == 0
    assert body["notifications"][0]["read"] is True


def test_mark_all_read(client, citizen_a, admin_a):
    admin = admin_a["token"]
    for message in ("Alert one.", "Alert two.", "Alert three."):
        client.post("/alerts", json={"message": message, "severity": "low"}, headers=headers(admin))

    response = client.patch("/notifications/read-all", headers=headers(citizen_a["token"]))
    assert response.status_code == 200
    body = response.json()["data"]
    assert body["unreadCount"] == 0
    assert len(body["notifications"]) == 3


def test_cannot_mark_other_users_notification(client, citizen_a, citizen_b, admin_a):
    client.post(
        "/alerts",
        json={"message": "Only A sees me.", "severity": "medium"},
        headers=headers(admin_a["token"]),
    )
    a_notifs = client.get("/notifications", headers=headers(citizen_a["token"])).json()["data"]
    other_id = a_notifs["notifications"][0]["id"]

    # Citizen B cannot read A's notification (treated as 404).
    response = client.patch(
        f"/notifications/{other_id}/read",
        headers=headers(citizen_b["token"]),
    )
    assert response.status_code == 404


def test_notifications_have_expected_fields(client, citizen_a, admin_a):
    client.post(
        "/alerts",
        json={"message": "Field structure check.", "severity": "critical"},
        headers=headers(admin_a["token"]),
    )
    notif = client.get("/notifications", headers=headers(citizen_a["token"]))
    item = notif.json()["data"]["notifications"][0]
    for field in ("id", "userId", "title", "message", "severity", "type", "read", "createdAt", "timestamp"):
        assert field in item