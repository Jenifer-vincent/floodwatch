"""Forecast schemas.

Data is stored/returned using the canonical fields
``locationId, location, timestamp, horizon, riskLevel,
predictedWaterLevel, confidence``. Responses also expose Phase 2-compatible
``FloodForecastPoint`` fields (``timeWindow``, ``notes``).
"""

from typing import Optional

from pydantic import BaseModel

from app.models.entities import ForecastRiskLevel


class ForecastItem(BaseModel):
    locationId: str
    location: str
    timestamp: str
    horizon: str
    riskLevel: ForecastRiskLevel
    predictedWaterLevel: Optional[float] = None
    confidence: float


class ForecastListOut(BaseModel):
    generatedAt: str
    locations: list[str]
    forecasts: list[ForecastItem]


class FloodForecastPointOut(BaseModel):
    # Phase 2 frontend contract (FloodForecastPoint)
    timeWindow: str
    riskLevel: ForecastRiskLevel
    predictedWaterLevel: Optional[float] = None
    confidence: Optional[float] = None
    timestamp: str
    location: str
    notes: str
    # Canonical backend fields (aliases of the above)
    horizon: str
    locationId: str


class ForecastResponseOut(BaseModel):
    location: str
    forecasts: list[FloodForecastPointOut]
    generatedAt: str