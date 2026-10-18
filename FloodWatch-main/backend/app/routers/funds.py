"""Fund routes — admin-only treasury operations."""

from fastapi import APIRouter, Depends

from app.core.responses import ok
from app.core.security import require_admin
from app.models.entities import UserRecord
from app.schemas.common import ApiResponse
from app.schemas.funds import (
    AllocateFundRequest,
    AllocateResponseOut,
    AllocationOut,
    FundBalanceOut,
    TransactionOut,
)
from app.services import fund_service

router = APIRouter(prefix="/funds", tags=["funds"])


@router.get(
    "",
    response_model=ApiResponse[FundBalanceOut],
    summary="Get treasury balance",
    description="Admin-only. Returns the authoritative server-side balance.",
)
def get_balance(admin: UserRecord = Depends(require_admin)) -> dict:
    return ok(fund_service.balance().model_dump())


@router.get(
    "/allocations",
    response_model=ApiResponse[list[AllocationOut]],
    summary="List fund allocations",
    description="Admin-only. Lists all recorded allocations, newest first.",
)
def get_allocations(admin: UserRecord = Depends(require_admin)) -> dict:
    return ok([a.model_dump() for a in fund_service.allocations()])


@router.get(
    "/transactions",
    response_model=ApiResponse[list[TransactionOut]],
    summary="List fund transactions",
    description="Admin-only. Lists the ledger of fund transactions.",
)
def get_transactions(admin: UserRecord = Depends(require_admin)) -> dict:
    return ok([t.model_dump() for t in fund_service.transactions()])


@router.post(
    "/allocate",
    response_model=ApiResponse[AllocateResponseOut],
    status_code=201,
    summary="Allocate funds to a zone/category",
    description=(
        "Admin-only. Validates the amount client-side against the stored "
        "balance (never trusting client calculations) and records an "
        "allocation plus a transaction if sufficient funds remain."
    ),
)
def allocate_funds(
    request: AllocateFundRequest,
    admin: UserRecord = Depends(require_admin),
) -> dict:
    return ok(fund_service.allocate(admin, request).model_dump())