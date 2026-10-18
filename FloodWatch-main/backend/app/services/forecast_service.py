"""Forecast service — reads stored forecast records from ``forecasts.json``."""

from __future__ import annotations

from datetime import datetime, timezone

from app.core.responses import AppError, NOT_FOUND
from app.schemas.forecast import (
    FloodForecastPointOut,
    ForecastItem,
    ForecastListOut,
    ForecastResponseOut,
)
from app.storage.json_storage import storage


def _load() -> dict:
    return storage.load("forecasts", {"items": [], "source": "stored-calibration", "updatedAt": None})


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def list_forecasts() -> ForecastListOut:
    data = _load()
    items = data.get("items", [])
    locations = list(dict.fromkeys(item.get("location") for item in items))
    return ForecastListOut(
        generatedAt=data.get("updatedAt") or _now_iso(),
        locations=locations,
        forecasts=[ForecastItem(**item) for item in items],
    )


def _item_to_point(item: ForecastItem) -> FloodForecastPointOut:
    return FloodForecastPointOut(
        timeWindow=item.horizon,
        riskLevel=item.riskLevel,
        predictedWaterLevel=item.predictedWaterLevel,
        confidence=item.confidence,
        timestamp=item.timestamp,
        location=item.location,
        notes=f"Forecast for {item.location} over {item.horizon}.",
        horizon=item.horizon,
        locationId=item.locationId,
    )


def by_location(location_id: str) -> ForecastResponseOut:
    data = _load()
    items = [ForecastItem(**i) for i in data.get("items", []) if i.get("locationId") == location_id]
    if not items:
        raise AppError(404, NOT_FOUND, f"No forecast found for location '{location_id}'.")
    location = items[0].location
    points = sorted(items, key=lambda i: i.horizon)
    return ForecastResponseOut(
        location=location,
        forecasts=[_item_to_point(i) for i in points],
        generatedAt=data.get("updatedAt") or _now_iso(),
    )