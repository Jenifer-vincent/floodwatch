"""Pytest fixtures.

Storage is redirected to a fresh temp directory before any app import so
tests never touch the real ``backend/data`` or ``backend/uploads``.
"""

import os
import tempfile
from pathlib import Path

_TMPDIR = Path(tempfile.mkdtemp(prefix="floodwatch-tests-"))

os.environ["DATA_DIR"] = str(_TMPDIR / "data")
os.environ["UPLOAD_DIR"] = str(_TMPDIR / "uploads")
os.environ["JWT_SECRET"] = "test-only-secret-0123456789abcdef0123456789abcdef"
os.environ["ENVIRONMENT"] = "test"
os.environ["DEBUG"] = "false"

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402
from app.storage.json_storage import storage  # noqa: E402
from app.storage.seed import ensure_seed  # noqa: E402


@pytest.fixture(scope="session")
def client():
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture(autouse=True)
def reset_storage():
    """Reset all JSON collections before each test and re-seed baseline data."""
    for pattern in ("*.json", "*.tmp", "*.json.tmp"):
        for f in storage.data_dir.glob(pattern):
            f.unlink()
    ensure_seed()
    yield


def register(
    client: TestClient,
    email: str,
    password: str = "CitizenPassword123!",
    name: str = "Resident Tester",
) -> dict:
    """Register a citizen via the API and return the auth payload."""
    response = client.post(
        "/auth/register",
        json={
            "name": name,
            "email": email,
            "phone": "555-0100",
            "password": password,
        },
    )
    assert response.status_code == 201, response.text
    return response.json()["data"]


def headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def citizen_a(client: TestClient) -> dict:
    return register(client, "citizen.a@example.com")


@pytest.fixture
def citizen_b(client: TestClient) -> dict:
    return register(client, "citizen.b@example.com")


@pytest.fixture
def admin_a(client: TestClient) -> dict:
    """Create a real admin account by promoting a registered user to ADMIN."""
    token = register(client, "admin.a@example.com", password="AdminMaster123!")["token"]
    users = storage.load("users", [])
    user_id = next(u["id"] for u in users if u["email"] == "admin.a@example.com")
    for u in users:
        if u["id"] == user_id:
            u["role"] = "admin"
    storage.save("users", users)
    login = client.post(
        "/auth/login",
        json={"email": "admin.a@example.com", "password": "AdminMaster123!"},
    )
    assert login.status_code == 200, login.text
    return login.json()["data"]


def create_report(
    client: TestClient,
    token: str,
    *,
    location: str = "412 River Road (Underpass Sector B)",
    latitude: float = 34.0622,
    longitude: float = -118.2237,
    severity: str = "high",
    water_depth: float | None = 1.2,
    description: str = "Riverbank overflow reported near the underpass.",
) -> dict:
    response = client.post(
        "/reports",
        json={
            "location": location,
            "latitude": latitude,
            "longitude": longitude,
            "severity": severity,
            "waterDepth": water_depth,
            "description": description,
        },
        headers=headers(token),
    )
    assert response.status_code == 201, response.text
    return response.json()["data"]