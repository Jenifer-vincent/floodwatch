"""Rate limiter unit tests (auth brute-force protection)."""

import pytest

from app.core import ratelimit
from app.core.responses import AppError


class _FakeRequest:
    client = type("Client", (), {"host": "203.0.113.7"})()
    headers = {}


def test_rate_limit_allows_under_limit(monkeypatch):
    monkeypatch.setattr(ratelimit.settings, "environment", "development")
    dep = ratelimit.rate_limit("auth")
    for _ in range(5):
        dep(_FakeRequest())  # must not raise


def test_rate_limit_rejects_after_limit(monkeypatch):
    monkeypatch.setattr(ratelimit.settings, "environment", "development")
    dep = ratelimit.rate_limit("auth")
    # Clear state for the key to make this test self-contained.
    ratelimit._hits.pop("auth:203.0.113.7", None)
    for _ in range(10):
        dep(_FakeRequest())
    with pytest.raises(AppError) as exc:
        dep(_FakeRequest())
    assert exc.value.status_code == 429
    assert exc.value.code == "RATE_LIMITED"


def test_rate_limit_disabled_in_test_environment(monkeypatch):
    monkeypatch.setattr(ratelimit.settings, "environment", "test")
    dep = ratelimit.rate_limit("auth")
    ratelimit._hits.pop("auth:203.0.113.7", None)
    for _ in range(25):
        dep(_FakeRequest())  # unlimited in test env
