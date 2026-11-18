import uuid
from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field

from app.core.enums import OrderStatus
from app.schemas.auth import UserResponse


class OrderBase(BaseModel):
    """Base schema for Order."""

    sale_id: Optional[uuid.UUID] = Field(None, description="ID của Sale tạo đơn")
    kol_id: Optional[uuid.UUID] = Field(None, description="ID của KOL thực hiện đơn")
    campaign_id: Optional[uuid.UUID] = Field(None, description="ID chiến dịch cha (campaign/combo)")
    combo_group_id: Optional[uuid.UUID] = Field(None, description="Mã nhóm combo để gom nhiều order cùng chiến dịch")
    total_amount: int = Field(..., ge=0, description="Tổng giá trị hợp đồng")
    deposit_amount: int = Field(default=0, ge=0, description="Số tiền cọc")

    # Business / campaign info (optional at creation)
    customer_name: Optional[str] = Field(None, description="Tên khách hàng / công ty")
    customer_representative: Optional[str] = Field(None, description="Người đại diện ký hợp đồng")
    campaign_name: Optional[str] = Field(None, description="Tên chiến dịch")
    platform: Optional[str] = Field(None, description="Nền tảng (TikTok, YouTube...)")
    kpi: Optional[str] = Field(None, description="Mô tả KPI")
    booking_type: Optional[Literal["custom", "combo"]] = Field(None, description="Loại booking: custom hoặc combo")
    post_count: Optional[int] = Field(None, ge=1, description="Số lượng content / bài đăng")
    package_definition: Optional[dict] = Field(None, description="Metadata định nghĩa gói combo (preset id, tên gói, thông số)")

    # KOL assignment request notes (Sale ghi chú yêu cầu KOL cho KOL Manager phân bổ)
    kol_request_notes: Optional[str] = Field(None, max_length=2000, description="Ghi chú yêu cầu KOL: niche, phong cách, đối tượng...")


class OrderCreate(OrderBase):
    """Schema for creating a new Order."""

    pass


class OrderStatusUpdate(BaseModel):
    """Schema for Sale/Manager to update Order status."""

    status: OrderStatus = Field(..., description="Trạng thái đơn hàng")


class OrderCancelRequest(BaseModel):
    """Submitted by Sale or KOL to request cancellation."""

    reason: str = Field(..., min_length=5, description="Lý do yêu cầu hủy")


class OrderCancelApprove(BaseModel):
    """Manager/Admin approves or rejects a cancel/refund request."""

    note: Optional[str] = Field(None, description="Ghi chú phê duyệt")


class OrderRefundRequest(BaseModel):
    """Sale or Manager requests refund after cancellation."""

    reason: str = Field(..., min_length=5, description="Lý do yêu cầu hoàn tiền")


class OrderProofSubmit(BaseModel):
    """Schema for KOL to submit proof of work."""

    proof_link: str = Field(..., description="Link nghiệm thu (Google Drive, bài post...)")
    proof_notes: Optional[str] = Field(None, description="Ghi chú thêm từ KOL")


class OrderPriceUpdate(BaseModel):
    """Schema cho Sale/Manager cập nhật giá tiền đơn hàng lúc mới tạo hoặc cọc."""

    total_amount: int = Field(..., ge=0, description="Tổng giá trị hợp đồng")
    deposit_amount: int = Field(..., ge=0, description="Số tiền cọc")



class OrderClaimRequest(BaseModel):
    """Schema for Sale to claim a new request order.

    KOL assignment is optional at claim time. Sale can assign KOL(s) later
    when full information is available.
    """

    kol_id: Optional[uuid.UUID] = Field(None, description="ID của KOL được gán (tùy chọn)")
    total_amount: int = Field(0, ge=0, description="Tổng giá trị hợp đồng đề xuất")
    deposit_amount: int = Field(0, ge=0, description="Số tiền cọc đề xuất")
    booking_type: Optional[Literal["custom", "combo"]] = None


class OrderAssignSale(BaseModel):
    """Schema for Manager/Admin to assign a Sale to an unassigned order."""

    sale_id: uuid.UUID = Field(..., description="ID của Sale được chỉ định")


class OrderAssignKol(BaseModel):
    """Schema for KOL Manager to assign KOL(s) to an order.

    1 KOL → cập nhật đơn hiện tại.
    Nhiều KOL → clone order cho mỗi KOL (combo workflow).
    """

    kol_ids: list[uuid.UUID] = Field(..., min_length=1, description="Danh sách ID KOL được phân bổ")


class OrderUpsaleRequest(BaseModel):
    """Schema cho Sale cập nhật đơn hàng (upsale) - lưu lịch sử thay đổi."""

    total_amount: int = Field(..., ge=0, description="Tổng giá trị hợp đồng mới")
    deposit_amount: int = Field(..., ge=0, description="Số tiền cọc mới")
    campaign_name: Optional[str] = Field(None, description="Tên chiến dịch mới")
    platform: Optional[str] = Field(None, description="Nền tảng mới")
    kpi: Optional[str] = Field(None, description="KPI mới")
    post_count: Optional[int] = Field(None, ge=1, description="Số lượng content mới")
    package_definition: Optional[dict] = Field(None, description="Package definition mới")
    kol_request_notes: Optional[str] = Field(None, max_length=2000, description="Ghi chú yêu cầu KOL mới")
    update_note: Optional[str] = Field(None, max_length=1000, description="Ghi chú lý do cập nhật (VD: khách nâng ngân sách)")


class OrderInfoUpdate(BaseModel):
    """Schema cho Sale cập nhật thông tin đơn hàng (giá, campaign, ghi chú KOL...) khi đơn ở trạng thái INIT.

    Sale KHÔNG được phép gán KOL - chỉ KOL Manager mới có quyền này.
    """

    total_amount: int = Field(..., ge=0, description="Tổng giá trị hợp đồng")
    deposit_amount: int = Field(..., ge=0, description="Số tiền cọc")
    campaign_name: Optional[str] = Field(None, description="Tên chiến dịch")
    platform: Optional[str] = Field(None, description="Nền tảng (TikTok, YouTube...)")
    kpi: Optional[str] = Field(None, description="Mô tả KPI")
    booking_type: Optional[Literal["custom", "combo"]] = Field(None, description="Loại booking")
    post_count: Optional[int] = Field(None, ge=1, description="Số lượng content / bài đăng")
    customer_name: Optional[str] = Field(None, description="Tên khách hàng / công ty")
    customer_representative: Optional[str] = Field(None, description="Người đại diện ký hợp đồng")
    kol_request_notes: Optional[str] = Field(None, max_length=2000, description="Ghi chú yêu cầu KOL cho KOL Manager phân bổ")


class OrderResponse(OrderBase):
    """Schema for returning Order data."""

    id: uuid.UUID
    status: OrderStatus
    customer_phone: Optional[str] = None
    customer_email: Optional[str] = None
    cancel_reason: Optional[str] = None
    cancel_note: Optional[str] = None
    proof_link: Optional[str] = None
    proof_notes: Optional[str] = None
    contract_file_name: Optional[str] = None
    contract_file_mime: Optional[str] = None
    contract_generated_at: Optional[datetime] = None
    contract_generated_by: Optional[uuid.UUID] = None
    proof_file_name: Optional[str] = None
    proof_file_mime: Optional[str] = None
    proof_file_size: Optional[int] = None
    update_history: Optional[list[dict]] = Field(default_factory=list, description="Lịch sử cập nhật đơn hàng")
    sale: UserResponse | None = None
    kol: UserResponse | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class OrderKolResponse(BaseModel):
    """Schema for returning Order data to KOL role - HIDES sensitive financial info.

    KOL chỉ được xem:
    - Giá trị nhận được (kol_received_amount) - sau khi trừ thuế/phí
    - Thông tin chiến dịch (không có thông tin khách hàng)
    - Link proof và file proof của chính mình
    """

    id: uuid.UUID
    status: OrderStatus

    # What KOL gets paid (after tax/fees)
    kol_received_amount: Optional[int] = None

    # Campaign info only (no customer info)
    campaign_name: Optional[str] = None
    platform: Optional[str] = None
    kpi: Optional[str] = None
    booking_type: Optional[str] = None
    post_count: Optional[int] = None

    # Proof fields
    proof_link: Optional[str] = None
    proof_notes: Optional[str] = None
    proof_file_name: Optional[str] = None
    proof_file_mime: Optional[str] = None
    proof_file_size: Optional[int] = None

    # Contract metadata (KOL can see contract exists but not financial details)
    contract_file_name: Optional[str] = None
    contract_generated_at: Optional[datetime] = None

    # Sale contact (just name for communication, no financial role)
    sale_name: Optional[str] = None

    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
