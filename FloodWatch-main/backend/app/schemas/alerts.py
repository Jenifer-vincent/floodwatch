"""Alert schemas."""

from typing import Optional

from pydantic import BaseModel, Field

from app.models.entities import Severity


class CreateAlertRequest(BaseModel):
    message: str = Field(min_length=3, max_length=1000)
    severity: Severity = "medium"
    zone: Optional[str] = Field(default=None, max_length=200)


class AlertOut(BaseModel):
    id: str
    message: str
    severity: Severity
    zone: Optional[str] = None
    active: bool
    createdAt: str
    createdBy: str