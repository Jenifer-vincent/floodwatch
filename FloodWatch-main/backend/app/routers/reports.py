"""Flood report routes."""

from __future__ import annotations

from fastapi import APIRouter, Depends, File, UploadFile

from app.core.config import settings
from app.core.responses import AppError, BAD_REQUEST, ok
from app.core.security import get_current_user, require_admin
from app.models.entities import UserRecord
from app.schemas.common import ApiMessage, ApiResponse
from app.schemas.reports import (
    CreateReportRequest,
    ImageUploadOut,
    ReportOut,
    ResolveReportRequest,
    UpdateReportRequest,
    VerifyReportRequest,
)
from app.services import report_service

router = APIRouter(prefix="/reports", tags=["reports"])

_ALLOWED_CONTENT_TYPES = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
    "image/bmp": ".bmp",
}

# Magic-number signatures keyed by the content types we accept. The MIME type
# alone is client-supplied and trivial to spoof, so the first bytes of the file
# must also match before we persist it.
_MAGIC_BYTES = {
    "image/jpeg": (b"\xff\xd8\xff",),
    "image/png": (b"\x89PNG\r\n\x1a\n",),
    "image/webp": (b"RIFF", b"WEBP"),
    "image/gif": (b"GIF87a", b"GIF89a"),
    "image/bmp": (b"BM",),
}


def _validate_image_signature(content_type: str, data: bytes) -> bool:
    """Return True when the file's leading bytes match the claimed type."""
    signatures = _MAGIC_BYTES.get(content_type)
    if not signatures:
        return False
    # The (multi-token) WEBP signature is checked as a sequence; the rest as
    # single leading prefixes.
    if content_type == "image/webp":
        return len(data) >= 12 and data[:4] == b"RIFF" and data[8:12] == b"WEBP"
    return data.startswith(signatures[0])


@router.post(
    "",
    response_model=ApiResponse[ReportOut],
    status_code=201,
    summary="Create a flood report",
    description=(
        "Creates a report authored by the authenticated user (the userId is "
        "always derived from the JWT, never from the request body)."
    ),
)
def create_report(
    request: CreateReportRequest,
    user: UserRecord = Depends(get_current_user),
) -> dict:
    return ok(report_service.create(user, request).model_dump())


@router.get(
    "",
    response_model=ApiResponse[list[ReportOut]],
    summary="List reports",
    description=(
        "Admins see every report; citizens only see their own reports."
    ),
)
def list_reports(user: UserRecord = Depends(get_current_user)) -> dict:
    views = report_service.list_visible(user)
    return ok([v.model_dump() for v in views])


@router.get(
    "/my",
    response_model=ApiResponse[list[ReportOut]],
    summary="List my reports",
    description="Returns only the reports belonging to the authenticated user.",
)
def my_reports(user: UserRecord = Depends(get_current_user)) -> dict:
    views = report_service.list_mine(user)
    return ok([v.model_dump() for v in views])


@router.get(
    "/{report_id}",
    response_model=ApiResponse[ReportOut],
    summary="Get a report by id",
    description=(
        "Admins may view any report; citizens may only view their own. "
        "Unknown or forbidden reports return 404."
    ),
)
def get_report(report_id: str, user: UserRecord = Depends(get_current_user)) -> dict:
    return ok(report_service.get_for(user, report_id).model_dump())


@router.patch(
    "/{report_id}",
    response_model=ApiResponse[ReportOut],
    summary="Update a report",
    description=(
        "Owners may update descriptive fields. Admins may additionally update "
        "status and resolution notes."
    ),
)
def update_report(
    report_id: str,
    request: UpdateReportRequest,
    user: UserRecord = Depends(get_current_user),
) -> dict:
    return ok(report_service.update(user, report_id, request).model_dump())


@router.patch(
    "/{report_id}/verify",
    response_model=ApiResponse[ReportOut],
    summary="Verify a report",
    description="Admin-only. Transitions a submitted report to verified.",
)
def verify_report(
    report_id: str,
    request: VerifyReportRequest,
    user: UserRecord = Depends(require_admin),
) -> dict:
    return ok(report_service.verify(user, report_id, request).model_dump())


@router.patch(
    "/{report_id}/resolve",
    response_model=ApiResponse[ReportOut],
    summary="Resolve a report",
    description="Admin-only. Marks a report resolved with administrative notes.",
)
def resolve_report(
    report_id: str,
    request: ResolveReportRequest,
    user: UserRecord = Depends(require_admin),
) -> dict:
    return ok(report_service.resolve(user, report_id, request).model_dump())


@router.delete(
    "/{report_id}",
    response_model=ApiResponse[ApiMessage],
    summary="Delete a report",
    description=(
        "Owners may delete their own reports; admins may delete any report."
    ),
)
def delete_report(
    report_id: str,
    user: UserRecord = Depends(get_current_user),
) -> dict:
    report_service.delete(user, report_id)
    return ok({"success": True, "message": "Report deleted."})


@router.post(
    "/{report_id}/image",
    response_model=ApiResponse[ImageUploadOut],
    summary="Upload an image for a report",
    description=(
        "Stores the uploaded image under the configured upload directory and "
        "associates its URL with the report. Owners/admins only."
    ),
)
async def upload_report_image(
    report_id: str,
    image: UploadFile = File(...),
    user: UserRecord = Depends(get_current_user),
) -> dict:
    content_type = image.content_type or ""
    extension = _ALLOWED_CONTENT_TYPES.get(content_type)
    if extension is None:
        raise AppError(
            400,
            BAD_REQUEST,
            "Unsupported image type. Allowed: JPEG, PNG, WebP, GIF, BMP.",
        )

    data = await image.read()
    if len(data) == 0:
        raise AppError(400, BAD_REQUEST, "The uploaded file is empty.")
    if len(data) > settings.max_upload_bytes:
        raise AppError(
            413,
            "PAYLOAD_TOO_LARGE",
            f"Image exceeds the {settings.max_upload_size_mb} MB size limit.",
        )
    if not _validate_image_signature(content_type, data):
        raise AppError(
            400,
            BAD_REQUEST,
            "The uploaded file's contents do not match its declared image type.",
        )

    filename = report_service.make_image_filename(f"report{extension}")
    report_dir = settings.upload_path / "reports" / report_id
    report_dir.mkdir(parents=True, exist_ok=True)
    target = report_dir / filename
    target.write_bytes(data)

    image_url = f"/uploads/reports/{report_id}/{filename}"
    report_service.set_image(user, report_id, image_url)

    return ok(
        {
            "success": True,
            "message": "Image uploaded.",
            "imageUrl": image_url,
        }
    )