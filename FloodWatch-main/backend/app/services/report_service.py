"""Report service: CRUD, verification, resolution, image assignment.

Permission model:
- CITIZEN: create reports, view/manage their own reports.
- ADMIN: view and manage all reports, verify, resolve, delete.
"""

from __future__ import annotations

import uuid

from app.core.responses import AppError, BAD_REQUEST, CONFLICT, FORBIDDEN, NOT_FOUND
from app.models.entities import ReportRecord, UserRecord
from app.schemas.reports import (
    CreateReportRequest,
    ReportOut,
    ResolveReportRequest,
    UpdateReportRequest,
    VerifyReportRequest,
    report_to_view,
)
from app.storage.json_storage import storage


def _now_iso() -> str:
    from datetime import datetime, timezone

    return datetime.now(timezone.utc).isoformat()


def _load_reports() -> list[dict]:
    return storage.load("reports", [])


def _save_reports(reports: list[dict]) -> None:
    storage.save("reports", reports)


def _find_index(reports: list[dict], report_id: str) -> int:
    for i, r in enumerate(reports):
        if r.get("id") == report_id:
            return i
    return -1


def _get_report(report_id: str) -> tuple[list[dict], int]:
    reports = _load_reports()
    index = _find_index(reports, report_id)
    if index == -1:
        raise AppError(404, NOT_FOUND, "Report not found.")
    return reports, index


def _can_access_record(user: UserRecord, record: dict) -> bool:
    return user.role == "admin" or record.get("userId") == user.id


def create(user: UserRecord, request: CreateReportRequest) -> ReportOut:
    reports = _load_reports()

    water_depth, reporter_name, phone = (
        request.waterDepth,
        request.reporterName or user.name,
        request.phone or user.phone,
    )

    record = ReportRecord(
        userId=user.id,
        imageUrl=request.imageUrl,
        latitude=request.latitude,
        longitude=request.longitude,
        location=request.location.strip(),
        severity=request.severity,
        waterDepth=water_depth,
        description=request.description.strip(),
        reporterName=reporter_name,
        phone=phone,
        status="submitted",
        submittedAt=_now_iso(),
    )
    reports.append(record.model_dump())
    _save_reports(reports)
    return report_to_view(record)


def list_visible(user: UserRecord) -> list[ReportOut]:
    reports = _load_reports()
    if user.role != "admin":
        reports = [r for r in reports if r.get("userId") == user.id]
    # Newest first.
    reports.sort(key=lambda r: r.get("submittedAt", ""), reverse=True)
    return [report_to_view(ReportRecord.model_validate(r)) for r in reports]


def list_mine(user: UserRecord) -> list[ReportOut]:
    reports = [r for r in _load_reports() if r.get("userId") == user.id]
    reports.sort(key=lambda r: r.get("submittedAt", ""), reverse=True)
    return [report_to_view(ReportRecord.model_validate(r)) for r in reports]


def get_for(user: UserRecord, report_id: str) -> ReportOut:
    reports, index = _get_report(report_id)
    record = reports[index]
    if not _can_access_record(user, record):
        # Hide existence — same response as a missing report.
        raise AppError(404, NOT_FOUND, "Report not found.")
    return report_to_view(ReportRecord.model_validate(record))


def update(user: UserRecord, report_id: str, request: UpdateReportRequest) -> ReportOut:
    reports, index = _get_report(report_id)
    record = reports[index]

    if not _can_access_record(user, record):
        raise AppError(404, NOT_FOUND, "Report not found.")

    updates = {}
    if request.location is not None:
        updates["location"] = request.location.strip()
    if request.severity is not None:
        updates["severity"] = request.severity
    if request.description is not None:
        updates["description"] = request.description.strip()
    if request.waterDepth is not None:
        updates["waterDepth"] = request.waterDepth
    if request.imageUrl is not None:
        updates["imageUrl"] = request.imageUrl

    # Role-gated fields.
    if user.role == "admin":
        if request.status is not None:
            updates["status"] = request.status
        if request.resolutionNotes is not None:
            updates["resolutionNotes"] = request.resolutionNotes
    elif request.status is not None or request.resolutionNotes is not None:
        raise AppError(
            403,
            FORBIDDEN,
            "Only administrators may change report status or resolution notes.",
        )

    if not updates:
        raise AppError(400, BAD_REQUEST, "No updatable fields were provided.")

    record.update(updates)
    reports[index] = record
    _save_reports(reports)
    return report_to_view(ReportRecord.model_validate(record))


def verify(user: UserRecord, report_id: str, request: VerifyReportRequest) -> ReportOut:
    if user.role != "admin":
        raise AppError(
            403,
            FORBIDDEN,
            "Only administrators may verify reports.",
        )
    reports, index = _get_report(report_id)
    record = reports[index]

    if record.get("status") == "archived":
        raise AppError(409, CONFLICT, "An archived report cannot be verified.")
    if record.get("status") == "resolved":
        raise AppError(409, CONFLICT, "A resolved report cannot be verified.")

    now = _now_iso()
    record["status"] = "verified"
    record["verifiedAt"] = record.get("verifiedAt") or now
    if request.notes:
        record.setdefault("resolutionNotes", request.notes)
    reports[index] = record
    _save_reports(reports)
    return report_to_view(ReportRecord.model_validate(record))


def resolve(user: UserRecord, report_id: str, request: ResolveReportRequest) -> ReportOut:
    if user.role != "admin":
        raise AppError(
            403,
            FORBIDDEN,
            "Only administrators may resolve reports.",
        )
    reports, index = _get_report(report_id)
    record = reports[index]

    if record.get("status") == "archived":
        raise AppError(409, CONFLICT, "An archived report cannot be resolved.")

    record["status"] = "resolved"
    record["resolvedAt"] = record.get("resolvedAt") or _now_iso()
    record["resolutionNotes"] = request.resolutionNotes.strip()
    reports[index] = record
    _save_reports(reports)
    return report_to_view(ReportRecord.model_validate(record))


def delete(user: UserRecord, report_id: str) -> None:
    reports, index = _get_report(report_id)
    record = reports[index]
    if not _can_access_record(user, record):
        raise AppError(404, NOT_FOUND, "Report not found.")
    del reports[index]
    _save_reports(reports)


def set_image(user: UserRecord, report_id: str, image_url: str) -> ReportOut:
    reports, index = _get_report(report_id)
    record = reports[index]
    if not _can_access_record(user, record):
        raise AppError(404, NOT_FOUND, "Report not found.")
    record["imageUrl"] = image_url
    reports[index] = record
    _save_reports(reports)
    return report_to_view(ReportRecord.model_validate(record))


def make_image_filename(original_name: str) -> str:
    """Generate a safe, unique image filename preserving a known extension."""
    ext = ""
    if "." in original_name:
        ext = "." + (original_name.rsplit(".", 1)[1] or "jpg").lower()
    return f"{uuid.uuid4().hex}{ext}"