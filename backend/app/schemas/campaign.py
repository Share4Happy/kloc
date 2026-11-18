import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

from app.core.enums import CampaignStatus
from app.schemas.auth import UserResponse
from app.schemas.order import OrderResponse


class CampaignCreateRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    budget: int = Field(0, ge=0)
    owner_sale_id: uuid.UUID | None = Field(None, description="Sale owner của campaign")
    status: CampaignStatus = Field(default=CampaignStatus.PLANNING)
    atomic: bool = Field(default=True, description="True: lỗi 1 KOL thì rollback toàn bộ")

    kol_ids: list[uuid.UUID] = Field(..., min_length=1, description="Danh sách KOL được gán vào campaign")

    total_amount: int = Field(..., ge=0)
    deposit_amount: int = Field(default=0, ge=0)

    customer_name: str | None = None
    customer_representative: str | None = None
    campaign_name: str | None = None
    platform: str | None = None
    kpi: str | None = None
    booking_type: Literal["custom", "combo"] = Field(default="combo")
    post_count: int | None = Field(default=None, ge=1)
    package_definition: dict | None = None


class CampaignCreateFailure(BaseModel):
    kol_id: uuid.UUID
    message: str


class CampaignSummaryResponse(BaseModel):
    id: uuid.UUID
    name: str
    status: CampaignStatus
    budget: int
    owner_sale_id: uuid.UUID
    combo_group_id: uuid.UUID
    owner_sale: UserResponse | None = None
    total_orders: int
    total_revenue: int
    total_deposit: int
    created_at: datetime
    updated_at: datetime


class CampaignDetailResponse(CampaignSummaryResponse):
    orders: list[OrderResponse]


class CampaignCreateResponse(BaseModel):
    campaign: CampaignDetailResponse
    created_orders: list[OrderResponse]
    failures: list[CampaignCreateFailure] = Field(default_factory=list)

    model_config = {"from_attributes": True}
