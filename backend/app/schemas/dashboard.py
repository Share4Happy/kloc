from datetime import datetime

from pydantic import BaseModel

from app.core.enums import OrderStatus, UserRole, VerificationStatus


class DashboardOrderSummary(BaseModel):
    id: str
    status: OrderStatus
    total_amount: int
    deposit_amount: int
    created_at: datetime
    sale_id: str
    sale_name: str | None = None
    kol_id: str
    kol_name: str | None = None


class DashboardSummaryResponse(BaseModel):
    role: UserRole
    total_orders: int
    pending_review_orders: int
    running_orders: int
    completed_orders: int
    total_revenue: int
    total_deposit: int
    # KOL payout tracking
    total_paid_payout: int | None = None    # sum of PAID payout records
    total_pending_payout: int | None = None  # sum of PENDING payout records
    active_kols: int | None = None
    active_sales: int | None = None
    pending_kol_profiles: int | None = None
    total_leads: int | None = None
    current_profile_status: VerificationStatus | None = None
    recent_orders: list[DashboardOrderSummary]
