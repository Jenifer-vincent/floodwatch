"""Simple in-memory rate limiter.

Security hardening for unauthenticated, credential-bearing endpoints (login
and register) where an attacker could otherwise brute-force credentials or
spam account creation. The limiter is an in-process sliding-window counter
keyed by client IP.

This is intentionally lightweight and process-local: it protects a single
FastAPI instance. For a horizontally scaled deployment a shared store (e.g.
a cache/DB) would be required — a documented production consideration.
"""

from __future__ import annotations

import time
from collections import defaultdict
from collections.abc import Callable
from threading import Lock

from fastapi import Request

from app.core.config import settings
from app.core.responses import AppError, BAD_REQUEST

# Per-window limits with the endpoint as the key. (max_requests, window_seconds)
_LIMITS: dict[str, tuple[int, float]] = {
    "auth": (10, 60.0),     # 10 auth attempts (register+login) per minute per IP
}

_hits: dict[str, list[float]] = defaultdict(list)
_lock = Lock()


def _client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def _prune(key: str, window: float) -> None:
    cutoff = time.monotonic() - window
    _hits[key] = [t for t in _hits[key] if t > cutoff]


def rate_limit(bucket: str = "auth") -> Callable[[Request], None]:
    """Return a FastAPI dependency that enforces the limit for ``bucket``."""

    def _dep(request: Request) -> None:
        # Rate limiting is disabled in the test environment so the automated
        # suite (which issues many registrations from one IP) is unaffected.
        if settings.environment == "test":
            return
        max_requests, window = _LIMITS.get(bucket, (10, 60.0))
        ip = _client_ip(request)
        key = f"{bucket}:{ip}"
        now = time.monotonic()
        with _lock:
            _prune(key, window)
            if len(_hits[key]) >= max_requests:
                raise AppError(
                    429,
                    "RATE_LIMITED",
                    "Too many requests. Please retry shortly.",
                )
            _hits[key].append(now)

    return _dep
