"""Fund service — treasury balance and allocations.

The balance is authoritative server-side state; the client is never trusted
with balance math. Allocations decrement the stored ``availableBalance``.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from app.models.entities import (
    FundAllocationRecord,
    FundTransactionRecord,
    UserRecord,
)
from app.schemas.funds import (
    AllocateFundRequest,
    AllocateResponseOut,
    AllocationOut,
    FundBalanceOut,
    TransactionOut,
)
from app.storage.json_storage import storage


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _load_funds() -> dict:
    return storage.load("funds", {"totalBudget": 0, "availableBalance": 0, "allocations": [], "transactions": []})


def _save_funds(funds: dict) -> None:
    storage.save("funds", funds)


def balance() -> FundBalanceOut:
    funds = _load_funds()
    available = float(funds.get("availableBalance", 0))
    total = float(funds.get("totalBudget", available))
    allocated = max(0.0, total - available)
    return FundBalanceOut(
        availableBalance=available,
        allocatedAmount=allocated,
        remainingBalance=available,
    )


def allocations() -> list[AllocationOut]:
    funds = _load_funds()
    rows = sorted(
        funds.get("allocations", []),
        key=lambda a: a.get("createdAt", ""),
        reverse=True,
    )
    views = []
    for row in rows:
        tx_id = row.get("transactionId", "")
        views.append(
            AllocationOut(
                id=tx_id,
                transactionId=tx_id,
                zone=row.get("zone", ""),
                zoneName=row.get("zone", ""),
                category=row.get("category", "Drainage"),
                amount=row.get("amount", 0),
                reason=row.get("reason", ""),
                adminId=row.get("adminId", ""),
                createdAt=row.get("createdAt", ""),
                date=(row.get("createdAt", "") or "")[:10],
            )
        )
    return views


def transactions() -> list[TransactionOut]:
    funds = _load_funds()
    rows = sorted(
        funds.get("transactions", []),
        key=lambda t: t.get("timestamp", ""),
        reverse=True,
    )
    return [TransactionOut(**row) for row in rows]


def allocate(admin: UserRecord, request: AllocateFundRequest) -> AllocateResponseOut:
    funds = _load_funds()
    available = float(funds.get("availableBalance", 0))

    if request.amount > available:
        return AllocateResponseOut(
            success=False,
            transaction=None,
            remainingBalance=available,
            error="Insufficient treasury reserves for this allocation.",
        )

    tx_id = f"TX-{uuid.uuid4().hex[:6].upper()}"
    now = _now_iso()

    transaction = FundTransactionRecord(
        transactionId=tx_id,
        zone=request.zone.strip(),
        category=request.category,
        amount=request.amount,
        reason=request.reason.strip(),
        status="approved",
        adminId=admin.id,
        timestamp=now,
    )
    allocation = FundAllocationRecord(
        transactionId=tx_id,
        zone=request.zone.strip(),
        category=request.category,
        amount=request.amount,
        reason=request.reason.strip(),
        adminId=admin.id,
        createdAt=now,
    )

    funds["availableBalance"] = round(available - request.amount, 2)
    funds.setdefault("allocations", []).append(allocation.model_dump())
    funds.setdefault("transactions", []).append(transaction.model_dump())
    _save_funds(funds)

    return AllocateResponseOut(
        success=True,
        transaction=TransactionOut(**transaction.model_dump()),
        remainingBalance=funds["availableBalance"],
    )


def system_available_funds() -> float:
    return balance().availableBalance