"""Authentication tests."""

from tests.conftest import headers, register


def test_register_success(client):
    data = register(client, "new.user@example.com")
    assert data["token"]
    assert data["user"]["email"] == "new.user@example.com"
    assert data["user"]["role"] == "citizen"
    assert "createdAt" in data["user"]
    assert "expiresAt" in data


def test_register_duplicate_email_conflict(client):
    register(client, "dup@example.com")
    response = client.post(
        "/auth/register",
        json={
            "name": "Another",
            "email": "dup@example.com",
            "phone": "555-0199",
            "password": "Whatever123!",
        },
    )
    assert response.status_code == 409
    body = response.json()
    assert body["success"] is False
    assert body["error"]["code"] == "CONFLICT"


def test_register_cannot_become_admin(client):
    response = client.post(
        "/auth/register",
        json={
            "name": "Sneaky",
            "email": "sneaky@example.com",
            "phone": "555-0111",
            "password": "Whatever123!",
            "role": "admin",
        },
    )
    assert response.status_code == 201
    assert response.json()["data"]["user"]["role"] == "citizen"


def test_register_validation_errors(client):
    # Weak password
    r = client.post(
        "/auth/register",
        json={"name": "X", "email": "x@example.com", "phone": "", "password": "short"},
    )
    assert r.status_code == 422
    body = r.json()
    assert body["success"] is False
    assert body["error"]["code"] == "VALIDATION_ERROR"

    # Invalid email
    r = client.post(
        "/auth/register",
        json={
            "name": "Valid Name",
            "email": "not-an-email",
            "phone": "",
            "password": "GoodPassword1!",
        },
    )
    assert r.status_code == 422


def test_login_success(client):
    register(client, "login.user@example.com")
    response = client.post(
        "/auth/login",
        json={"email": "login.user@example.com", "password": "CitizenPassword123!"},
    )
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["user"]["email"] == "login.user@example.com"
    assert data["token"]


def test_login_invalid_password(client):
    register(client, "badpass@example.com")
    response = client.post(
        "/auth/login",
        json={"email": "badpass@example.com", "password": "DefinitelyWrong!"},
    )
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "UNAUTHORIZED"


def test_login_unknown_email(client):
    response = client.post(
        "/auth/login",
        json={"email": "ghost@example.com", "password": "Whatever123!"},
    )
    assert response.status_code == 401


def test_me_requires_authentication(client):
    assert client.get("/auth/me").status_code == 401
    assert client.get("/auth/me", headers=headers("garbage.token")).status_code == 401


def test_me_returns_current_user(client):
    data = register(client, "me.user@example.com")
    response = client.get("/auth/me", headers=headers(data["token"]))
    assert response.status_code == 200
    assert response.json()["data"]["id"] == data["user"]["id"]


def test_logout_revokes_token(client):
    data = register(client, "logout.user@example.com")
    token = data["token"]

    assert client.get("/auth/me", headers=headers(token)).status_code == 200

    response = client.post("/auth/logout", headers=headers(token))
    assert response.status_code == 200
    assert response.json()["data"]["success"] is True

    # The same token must now be rejected.
    assert client.get("/auth/me", headers=headers(token)).status_code == 401

    # Login again issues a fresh, valid token.
    fresh = client.post(
        "/auth/login",
        json={"email": "logout.user@example.com", "password": "CitizenPassword123!"},
    )
    assert fresh.status_code == 200
    assert client.get(
        "/auth/me", headers=headers(fresh.json()["data"]["token"])
    ).status_code == 200