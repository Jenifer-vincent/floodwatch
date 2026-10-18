"""Treasury fund tests — server-side balance is authoritative."""

from tests.conftest import headers


def test_funds_require_admin(client, citizen_a):
    assert client.get("/funds", headers=headers(citizen_a["token"])).status_code == 403
    assert client.get("/funds/allocations", headers=headers(citizen_a["token"])).status_code == 403
    assert client.get("/funds/transactions", headers=headers(citizen_a["token"])).status_code == 403
    assert client.post(
        "/funds/allocate",
        json={"zone": "Sector 4", "category": "Drainage", "amount": 1000, "reason": "Test"},
        headers=headers(citizen_a["token"]),
    ).status_code == 403


def test_funds_require_auth(client):
    assert client.get("/funds").status_code == 401
    assert client.get("/funds/allocations").status_code == 401


def test_initial_balance(client, admin_a):
    response = client.get("/funds", headers=headers(admin_a["token"]))
    assert response.status_code == 200
    body = response.json()["data"]
    assert body["availableBalance"] == 1420000.0
    assert body["remainingBalance"] == body["availableBalance"]
    assert body["allocatedAmount"] == 0.0


def test_allocate_funds_success(client, admin_a):
    response = client.post(
        "/funds/allocate",
        json={
            "zone": "Sector 12: East Creek Outlet",
            "category": "Emergency Relief",
            "amount": 120000.0,
            "reason": "Pre-positioning response packs.",
        },
        headers=headers(admin_a["token"]),
    )
    assert response.status_code == 201
    body = response.json()["data"]
    assert body["success"] is True
    assert body["remainingBalance"] == 1420000.0 - 120000.0
    assert body["transaction"]["transactionId"].startswith("TX-")

    balance = client.get("/funds", headers=headers(admin_a["token"])).json()["data"]
    assert balance["availableBalance"] == 1300000.0
    assert balance["allocatedAmount"] == 120000.0

    allocations = client.get("/funds/allocations", headers=headers(admin_a["token"])).json()["data"]
    assert len(allocations) == 1
    assert allocations[0]["zoneName"] == "Sector 12: East Creek Outlet"
    assert allocations[0]["date"] == allocations[0]["createdAt"][:10]

    transactions = client.get("/funds/transactions", headers=headers(admin_a["token"])).json()["data"]
    assert len(transactions) == 1
    assert transactions[0]["status"] == "approved"


def test_allocate_insufficient_funds(client, admin_a):
    response = client.post(
        "/funds/allocate",
        json={
            "zone": "Sector 4",
            "category": "Road Repair",
            "amount": 9_999_999.0,
            "reason": "Over the top.",
        },
        headers=headers(admin_a["token"]),
    )
    assert response.status_code == 201  # business-failure payload, HTTP 201
    body = response.json()["data"]
    assert body["success"] is False
    assert body["error"] == "Insufficient treasury reserves for this allocation."
    assert body["remainingBalance"] == 1420000.0

    # Balance unchanged.
    balance = client.get("/funds", headers=headers(admin_a["token"])).json()["data"]
    assert balance["availableBalance"] == 1420000.0


def test_allocate_amount_validation(client, admin_a):
    response = client.post(
        "/funds/allocate",
        json={
            "zone": "Sector 4",
            "category": "Drainage",
            "amount": -500.0,
            "reason": "Negative amount.",
        },
        headers=headers(admin_a["token"]),
    )
    assert response.status_code == 422

    response = client.post(
        "/funds/allocate",
        json={"zone": "Sector 4", "category": "Drainage", "amount": 0.0, "reason": "Zero."},
        headers=headers(admin_a["token"]),
    )
    assert response.status_code == 422


def test_multiple_allocations_accumulate(client, admin_a):
    admin = headers(admin_a["token"])
    for amount in (100000.0, 200000.0):
        client.post(
            "/funds/allocate",
            json={"zone": "Sector 4", "category": "Drainage", "amount": amount, "reason": "Serially."},
            headers=admin,
        )
    balance = client.get("/funds", headers=admin).json()["data"]
    assert balance["availableBalance"] == 1420000.0 - 300000.0