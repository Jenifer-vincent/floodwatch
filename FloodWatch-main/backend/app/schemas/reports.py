"""Report schemas.

The API uses the canonical backend statuses ``submitted | verified | resolved |
archived``. ``submitted`` is the server-side synonym of the Phase 2 frontend
``pending`` status; responses expose an explicit ``phase2Status`` alias plus
``date``/``photoUrl``/``waterLevelDepth``/``adminNotes`` compatibility fields
so the existing frontend trade can bind with minimal changes.
"""

from typing import Optional

from pydantic import BaseModel, Field, field_validator

from app.models.entities import ReportRecord, ReportStatus, Severity

_PHASE2_STATUS_MAP = {
    "submitted": "pending",
    "verified": "verified",
    "resolved": "resolved",
    "archived": "archived",
}


class Coordinates(BaseModel):
    latitude: float = Field(ge=-90.0, le=90.0)
    longitude: float = Field(ge=-180.0, le=180.0)


class CreateReportRequest(Coordinates):
    location: str = Field(min_length=2, max_length=200)
    severity: Severity
    description: str = Field(min_length=3, max_length=5000)
    waterDepth: Optional[float] = Field(default=None, ge=0.0, le=20.0)
    imageUrl: Optional[str] = Field(default=None, max_length=500)
    reporterName: Optional[str] = Field(default=None, max_length=100)
    phone: Optional[str] = Field(default=None, max_length=30)

    @field_validator("location")
    @classmethod
    def location_not_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Location must not be blank.")
        return v.strip()


class UpdateReportRequest(BaseModel):
    location: Optional[str] = Field(default=None, min_length=2, max_length=200)
    severity: Optional[Severity] = None
    description: Optional[str] = Field(default=None, min_length=3, max_length=5000)
    waterDepth: Optional[float] = Field(default=None, ge=0.0, le=20.0)
    imageUrl: Optional[str] = Field(default=None, max_length=500)
    status: Optional[str] = None
    resolutionNotes: Optional[str] = Field(default=None, max_length=5000)

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        normalized = {"pending": "submitted"}.get(v, v)
        if normalized not in ("submitted", "verified", "resolved", "archived"):
            raise ValueError(
                f"Status must be one of: submitted, verified, resolved, archived "
                f"(pending is accepted as a synonym for submitted)."
            )
        return normalized


class VerifyReportRequest(BaseModel):
    notes: Optional[str] = Field(default=None, max_length=500)


class ResolveReportRequest(BaseModel):
    resolutionNotes: str = Field(min_length=3, max_length=5000)


class ReportOut(BaseModel):
    id: str
    userId: str
    imageUrl: Optional[str] = None
    latitude: float
    longitude: float
    location: str
    severity: Severity
    waterDepth: Optional[float] = None
    description: str
    status: ReportStatus
    submittedAt: str
    verifiedAt: Optional[str] = None
    resolvedAt: Optional[str] = None
    resolutionNotes: Optional[str] = None
    reporterName: str
    phone: Optional[str] = None

    # Phase 2 frontend compatibility aliases ---------------------------------
    phase2Status: str
    date: str
    photoUrl: Optional[str] = None
    waterLevelDepth: Optional[str] = None
    adminNotes: Optional[str] = None


class ImageUploadOut(BaseModel):
    success: bool
    message: str
    imageUrl: str


def format_depth(meters: Optional[float]) -> Optional[str]:
    if meters is None:
        return None
    return f"{meters:g} m"


def report_to_view(report: ReportRecord) -> ReportOut:
    return ReportOut(
        id=report.id,
        userId=report.userId,
        imageUrl=report.imageUrl,
        latitude=report.latitude,
        longitude=report.longitude,
        location=report.location,
        severity=report.severity,
        waterDepth=report.waterDepth,
        description=report.description,
        status=report.status,
        submittedAt=report.submittedAt,
        verifiedAt=report.verifiedAt,
        resolvedAt=report.resolvedAt,
        resolutionNotes=report.resolutionNotes,
        reporterName=report.reporterName,
        phone=report.phone,
        phase2Status=_PHASE2_STATUS_MAP.get(report.status, report.status),
        date=report.submittedAt,
        photoUrl=report.imageUrl,
        waterLevelDepth=format_depth(report.waterDepth),
        adminNotes=report.resolutionNotes,
    )


def ensure_water_depth(
    request: "CreateReportRequest", current_user_name: str, current_user_phone: Optional[str]
) -> tuple[Optional[float], str, Optional[str]]:
    """Normalize optional identity fields for a report record.

    ``reporterName`` and ``phone`` fall back to the authenticated user when the
    client does not supply them — the client can never override identity.
    """
    if request.waterDepth is not None and (request.waterDepth < 0 or request.waterDepth > 20):
        raise ValueError("Water depth must be between 0 and 20 meters.")
    return (
        request.waterDepth,
        (request.reporterName or current_user_name).strip(),
        request.phone or current_user_phone,
    )