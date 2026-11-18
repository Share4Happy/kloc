import uuid
from datetime import datetime

from pydantic import BaseModel, Field

from app.core.enums import PayoutStatus


class PayoutCreate(BaseModel):
    kol_id: uuid.UUID
    order_id: uuid.UUID | None = None
    amount: int = Field(..., gt=0, description="Amount in VND")
    note: str | None = None


class PayoutStatusUpdate(BaseModel):
    status: PayoutStatus
    note: str | None = None


class PayoutResponse(BaseModel):
    id: uuid.UUID
    kol_id: uuid.UUID
    order_id: uuid.UUID | None
    amount: int
    status: PayoutStatus
    note: str | None
    paid_at: datetime | None
    created_at: datetime
    updated_at: datetime
    kol_name: str | None = None
    order_campaign: str | None = None  # campaign_name from linked order

    model_config = {"from_attributes": True}
