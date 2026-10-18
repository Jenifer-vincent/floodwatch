"""Priority zone schemas — Phase 2 ``PriorityZonesResponse`` compatible."""

from pydantic import BaseModel

from app.models.entities import Severity


class PriorityFactorOut(BaseModel):
    name: str
    value: float


class PriorityZoneOut(BaseModel):
    zoneId: str
    zoneName: str
    score: float
    riskLevel: Severity
    reportCount: int
    factors: list[PriorityFactorOut]
    recommendedAction: str


class PriorityFactorsConfigOut(BaseModel):
    floodSeverityWeight: float
    infrastructureRiskWeight: float
    populationDensityWeight: float
    roadAccessWeight: float


class PriorityZonesResponseOut(BaseModel):
    zones: list[PriorityZoneOut]
    config: PriorityFactorsConfigOut
    calculatedAt: str