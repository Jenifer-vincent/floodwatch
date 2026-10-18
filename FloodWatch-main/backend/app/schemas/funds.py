"""Fund schemas."""

from typing import Literal, Optional

from pydantic import BaseModel, Field

from app.models.entities import FundCategory

TransactionStatus = Literal["pending", "approved", "completed"]


class AllocateFundRequest(BaseModel):
    zone: str = Field(min_length=2, max_length=200)
    category: FundCategory
    amount: float = Field(gt=0, le=1_000_000_000)
    reason: str = Field(min_length=3, max_length=2000)


class FundBalanceOut(BaseModel):
    availableBalance: float
    allocatedAmount: float
    remainingBalance: float


class AllocationOut(BaseModel):
    id: str
    transactionId: str
    zone: str
    zoneName: str  # Phase 2 frontend compatibility alias
    category: FundCategory
    amount: float
    reason: str
    adminId: str
    createdAt: str
    date: str  # Phase 2 frontend compatibility alias


class TransactionOut(BaseModel):
    transactionId: str
    zone: str
    category: FundCategory
    amount: float
    reason: str
    status: TransactionStatus
    adminId: str
    timestamp: str


class AllocateResponseOut(BaseModel):
    success: bool
    transaction: Optional[TransactionOut] = None
    remainingBalance: float
    error: Optional[str] = None