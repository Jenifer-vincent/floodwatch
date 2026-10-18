"""Internal persisted-entity models.

These are the JSON document shapes stored on disk. They are intentionally
separate from the API schemas in ``app/schemas`` — services convert
entities into API view models.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field

UserRole = Literal["citizen", "admin"]
Severity = Literal["low", "medium", "high", "critical"]
ReportStatus = Literal["submitted", "verified", "resolved", "archived"]
NotificationType = Literal["alert", "update", "system", "report"]
FundCategory = Literal[
    "Emergency Relief",
    "Road Repair",
    "Drainage",
    "Medical",
    "Rehabilitation",
]
ForecastRiskLevel = Literal["low", "moderate", "high", "critical"]


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _new_id(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:12]}"


class UserRecord(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    name: str
    email: str
    phone: Optional[str] = None
    role: UserRole = "citizen"
    password_hash: str
    createdAt: str = Field(default_factory=_now_iso)

    def public_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "email": self.email,
            "phone": self.phone,
            "role": self.role,
            "createdAt": self.createdAt,
        }


class ReportRecord(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str = Field(default_factory=lambda: _new_id("rep"))
    userId: str
    imageUrl: Optional[str] = None
    latitude: float
    longitude: float
    location: str
    severity: Severity
    waterDepth: Optional[float] = None
    description: str
    reporterName: str
    phone: Optional[str] = None
    status: ReportStatus = "submitted"
    submittedAt: str = Field(default_factory=_now_iso)
    verifiedAt: Optional[str] = None
    resolvedAt: Optional[str] = None
    resolutionNotes: Optional[str] = None


class NotificationRecord(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str = Field(default_factory=lambda: _new_id("notif"))
    userId: str
    title: str
    message: str
    severity: Severity = "medium"
    type: NotificationType = "system"
    read: bool = False
    createdAt: str = Field(default_factory=_now_iso)


class AlertRecord(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str = Field(default_factory=lambda: _new_id("alert"))
    message: str
    severity: Severity = "medium"
    zone: Optional[str] = None
    active: bool = True
    createdAt: str = Field(default_factory=_now_iso)
    createdBy: str


class FundAllocationRecord(BaseModel):
    model_config = ConfigDict(extra="ignore")

    transactionId: str
    zone: str
    category: FundCategory
    amount: float
    reason: str
    adminId: str
    createdAt: str = Field(default_factory=_now_iso)


class FundTransactionRecord(BaseModel):
    model_config = ConfigDict(extra="ignore")

    transactionId: str
    zone: str
    category: FundCategory
    amount: float
    reason: str
    status: Literal["pending", "approved", "completed"] = "approved"
    adminId: str
    timestamp: str = Field(default_factory=_now_iso)


class GISPointRecord(BaseModel):
    model_config = ConfigDict(extra="ignore")

    name: str
    lat: float
    lng: float


class GISLineRecord(BaseModel):
    model_config = ConfigDict(extra="ignore")

    name: str
    path: list[list[float]]


class GISZoneRecord(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    name: str
    center: list[float]
    radius: float
    riskLevel: Severity
    priorityScore: float


class ForecastRecord(BaseModel):
    model_config = ConfigDict(extra="ignore")

    locationId: str
    location: str
    timestamp: str
    horizon: str
    riskLevel: ForecastRiskLevel
    predictedWaterLevel: Optional[float] = None
    confidence: float


class PriorityZoneRecord(BaseModel):
    model_config = ConfigDict(extra="ignore")

    zoneId: str
    zoneName: str
    score: float
    riskLevel: Severity
    reportCount: int
    factors: list[dict]
    recommendedAction: str