"""Shared schemas and the standard response envelope."""

from typing import Any, Generic, Optional, TypeVar

from pydantic import BaseModel

T = TypeVar("T")


class ApiResponse(BaseModel, Generic[T]):
    success: bool
    data: T


class ApiMessage(BaseModel):
    success: bool
    message: str


class ErrorDetail(BaseModel):
    code: str
    message: str
    details: Optional[dict[str, Any]] = None


class ApiErrorBody(BaseModel):
    success: bool
    error: ErrorDetail