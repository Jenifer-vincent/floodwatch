"""Report image upload tests."""

from io import BytesIO

from tests.conftest import create_report, headers


def _png_bytes() -> bytes:
    # Minimal valid PNG signature + minimal payload.
    signature = b"\x89PNG\r\n\x1a\n"
    return signature + b"00000000000000000000000000000000"


def test_upload_image_sets_image_url(client, citizen_a):
    report = create_report(client, citizen_a["token"])
    response = client.post(
        f"/reports/{report['id']}/image",
        files={"image": ("photo.png", BytesIO(_png_bytes()), "image/png")},
        headers=headers(citizen_a["token"]),
    )
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["imageUrl"].startswith("/uploads/reports/")

    detail = client.get(f"/reports/{report['id']}", headers=headers(citizen_a["token"]))
    assert detail.json()["data"]["imageUrl"] == data["imageUrl"]
    assert detail.json()["data"]["photoUrl"] == data["imageUrl"]


def test_upload_rejects_unsupported_content_type(client, citizen_a):
    report = create_report(client, citizen_a["token"])
    response = client.post(
        f"/reports/{report['id']}/image",
        files={"image": ("evil.txt", BytesIO(b"javascript:alert(1)"), "text/plain")},
        headers=headers(citizen_a["token"]),
    )
    assert response.status_code == 400


def test_upload_rejects_oversize_image(client, citizen_a, monkeypatch):
    from app.core.config import settings

    report = create_report(client, citizen_a["token"])

    original = settings.max_upload_size_mb
    settings.max_upload_size_mb = 1  # shrink the limit to 1 MB
    try:
        response = client.post(
            f"/reports/{report['id']}/image",
            files={"image": ("big.png", BytesIO(b"0" * (2 * 1024 * 1024)), "image/png")},
            headers=headers(citizen_a["token"]),
        )
    finally:
        settings.max_upload_size_mb = original

    assert response.status_code == 413
    assert response.json()["error"]["code"] == "PAYLOAD_TOO_LARGE"


def test_upload_requires_owner_or_admin(client, citizen_a, citizen_b):
    report = create_report(client, citizen_b["token"])
    response = client.post(
        f"/reports/{report['id']}/image",
        files={"image": ("photo.png", BytesIO(_png_bytes()), "image/png")},
        headers=headers(citizen_a["token"]),
    )
    assert response.status_code == 404


def test_upload_rejects_spoofed_content_type(client, citizen_a):
    """A text payload mislabeled as image/png must fail magic-byte validation."""
    report = create_report(client, citizen_a["token"])
    response = client.post(
        f"/reports/{report['id']}/image",
        files={"image": ("photo.png", BytesIO(b"<script>alert(1)</script>"), "image/png")},
        headers=headers(citizen_a["token"]),
    )
    assert response.status_code == 400
    assert "contents do not match" in response.json()["error"]["message"]


def test_default_upload_limit_is_4_mib() -> None:
    from app.core.config import Settings

    assert Settings.model_fields["max_upload_size_mb"].default == 4
