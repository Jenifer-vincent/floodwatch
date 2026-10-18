"""Consistent API response and error helpers.

Successful responses use::

    {"success": true, "data": ...}

Errors use::

    {"success": false, "error": {"code": "...", "message": "...", "details": {...}}}

Codes are stable, machine-readable strings (e.g. ``NOT_FOUND``).
"""

from typing import Any

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

VALIDATION_ERROR_ILLEGAL = object()

ErrorCode = str

# Common error codes
BAD_REQUEST = "BAD_REQUEST"
UNAUTHORIZED = "UNAUTHORIZED"
FORBIDDEN = "FORBIDDEN"
NOT_FOUND = "NOT_FOUND"
CONFLICT = "CONFLICT"
VALIDATION_ERROR = "VALIDATION_ERROR"
INTERNAL_ERROR = "INTERNAL_ERROR"


class AppError(Exception):
    """Domain error carrying an HTTP status, error code and message."""

    def __init__(
        self,
        status_code: int,
        code: ErrorCode,
        message: str,
        details: dict[str, Any] | None = None,
    ) -> None:
        super().__init__(message)
        self.status_code = status_code
        self.code = code
        self.message = message
        self.details = details


def ok(data: Any = None) -> dict[str, Any]:
    """Build a standard success payload."""
    return {"success": True, "data": data}


def _error_body(
    code: ErrorCode,
    message: str,
    details: dict[str, Any] | None = None,
) -> dict[str, Any]:
    payload: dict[str, Any] = {"code": code, "message": message}
    if details:
        payload["details"] = details
    return {"success": False, "error": payload}


def register_exception_handlers(app: FastAPI) -> None:
    """Attach consistent JSON error handlers to the application."""

    @app.exception_handler(AppError)
    async def app_error_handler(request: Request, exc: AppError) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code,
            content=_error_body(exc.code, exc.message, exc.details),
        )

    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(
        request: Request, exc: StarletteHTTPException
    ) -> JSONResponse:
        if exc.detail:
            if isinstance(exc.detail, str):
                message = exc.detail
            else:
                message = "Request failed."
        else:
            message = "Request failed."

        code = _code_for_status(exc.status_code)
        return JSONResponse(
            status_code=exc.status_code,
            content=_error_body(code, message),
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(
        request: Request, exc: RequestValidationError
    ) -> JSONResponse:
        details: dict[str, str] = {}
        for err in exc.errors():
            loc = ".".join(str(part) for part in err.get("loc", []))
            if loc:
                details[loc] = err.get("msg", "Invalid value.")
            else:
                details.setdefault("_", err.get("msg", "Invalid value."))
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content=_error_body(
                VALIDATION_ERROR,
                "The request payload is invalid. See details.",
                details,
            ),
        )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
        # Log the real error, never surface internals to the client.
        import logging

        logging.getLogger("floodwatch").exception("Unhandled error", exc_info=exc)
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content=_error_body(INTERNAL_ERROR, "An internal server error occurred."),
        )


def _code_for_status(status_code: int) -> ErrorCode:
    return {
        status.HTTP_400_BAD_REQUEST: BAD_REQUEST,
        status.HTTP_401_UNAUTHORIZED: UNAUTHORIZED,
        status.HTTP_403_FORBIDDEN: FORBIDDEN,
        status.HTTP_404_NOT_FOUND: NOT_FOUND,
        status.HTTP_409_CONFLICT: CONFLICT,
    }.get(status_code, INTERNAL_ERROR)