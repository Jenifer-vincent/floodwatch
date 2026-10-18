"""GIS schemas, kept compatible with the Phase 2 frontend GIS types."""

from typing import Union

from pydantic import BaseModel

from app.models.entities import (  # noqa: F401  (re-exported for consumers)
    GISLineRecord,
    GISPointRecord,
    GISZoneRecord,
    Severity,
)


class GISPointOut(BaseModel):
    name: str
    lat: float
    lng: float


class GISLineOut(BaseModel):
    name: str
    path: list[list[float]]


class GISZoneOut(BaseModel):
    id: str
    name: str
    center: list[float]  # [lat, lng]
    radius: float
    riskLevel: Severity
    priorityScore: float
    activeReportsCount: int
    lastUpdated: str


class GISReportOut(BaseModel):
    id: str
    name: str  # report location (point label)
    lat: float
    lng: float
    severity: Severity
    status: str
    submittedAt: str


class GISLayerOut(BaseModel):
    id: str
    name: str
    type: str
    visible: bool
    data: list[Union[GISPointOut, GISLineOut]]


class GISDataOut(BaseModel):
    roads: list[GISLineOut]
    hospitals: list[GISPointOut]
    shelters: list[GISPointOut]
    rivers: list[GISLineOut]
    evacuationRoutes: list[GISLineOut]