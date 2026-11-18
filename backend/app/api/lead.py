from fastapi import APIRouter, Depends, status
from sqlalchemy import select
from sqlalchemy.orm import Session
import logging
import re

from app.core.database import get_db
from app.core.deps import require_roles
from app.core.enums import UserRole
from app.models.lead import Lead
from app.models.user import User
from app.models.order import Order
from app.core.enums import OrderStatus, UserRole
from app.schemas.lead import LeadCreateRequest, LeadResponse, LeadSource
from app.api.notification import broadcast_notification

router = APIRouter(prefix="/leads", tags=["Lead Management"])
logger = logging.getLogger(__name__)


def _parse_booking_form_message(message: str) -> dict:
    """Parse structured message từ BookingForm để trích xuất thông tin.

    Message format:
    Loại booking: Theo gói Combo
    Ngân sách: 30 - 50 triệu
    Số lượng KOL: 10-30 KOL
    Nền tảng: TikTok
    ---
    Chi tiết: Chiến dịch ra mắt sản phẩm skincare...
    """
    result = {
        "booking_type": None,
        "platform": None,
        "kol_request_notes": None,
    }

    lines = message.strip().split("\n")
    parsed_data = {}
    detail_parts = []
    parsing_detail = False

    for line in lines:
        line = line.strip()
        if line == "---":
            parsing_detail = True
            continue

        if parsing_detail:
            if line.startswith("Chi tiết:"):
                detail_parts.append(line.replace("Chi tiết:", "").strip())
            else:
                detail_parts.append(line)
        elif line.startswith("Loại booking:"):
            val = line.replace("Loại booking:", "").strip().lower()
            result["booking_type"] = "combo" if "combo" in val else "custom"
        elif line.startswith("Nền tảng:"):
            result["platform"] = line.replace("Nền tảng:", "").strip()
        elif line.startswith("Số lượng KOL:"):
            parsed_data["kol_count"] = line.replace("Số lượng KOL:", "").strip()
        elif line.startswith("Ngân sách:"):
            parsed_data["budget"] = line.replace("Ngân sách:", "").strip()

    # Format kol_request_notes với prefix rõ ràng để frontend dễ parse
    notes_parts = []
    if "budget" in parsed_data:
        notes_parts.append(f"💰 Ngân sách: {parsed_data['budget']}")
    if "kol_count" in parsed_data:
        notes_parts.append(f"👥 Số lượng KOL: {parsed_data['kol_count']}")
    detail_text = " ".join(p for p in detail_parts if p).strip()
    if detail_text:
        notes_parts.append(f"📝 Chi tiết: {detail_text}")

    result["kol_request_notes"] = "\n".join(notes_parts) if notes_parts else None
    return result


@router.post(
    "",
    response_model=LeadResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Public gửi lead booking/liên hệ",
)
def create_lead(
    body: LeadCreateRequest,
    db: Session = Depends(get_db),
):
    """Public API: lưu lead từ Landing BookingForm hoặc Contact form."""
    lead = Lead(
        full_name=body.full_name,
        phone=body.phone,
        email=body.email,
        company=body.company,
        subject=body.subject,
        message=body.message,
        source=body.source,
    )
    db.add(lead)

    # Auto-create Unassigned Order for Sale to claim
    parsed = {}
    if body.source == "booking_form" and body.message:
        parsed = _parse_booking_form_message(body.message)

    order = Order(
        sale_id=None,
        kol_id=None,
        status=OrderStatus.NEW_REQUEST,
        total_amount=0,
        deposit_amount=0,
        customer_name=body.full_name,
        customer_phone=body.phone,
        customer_email=body.email,
        # Parse thông tin từ form → đưa vào đúng field
        platform=parsed.get("platform"),
        booking_type=parsed.get("booking_type"),
        post_count=None,  # Chưa có → để trống
        # Ghi chú cho KOL Manager (từ phần "Chi tiết" trong form)
        kol_request_notes=parsed.get("kol_request_notes"),
    )
    db.add(order)

    db.commit()

    # N-M01: Notify Manager/Admin about new booking form submission
    if body.source == "booking_form":
        # Notify Managers to assign
        manager_admin_ids = db.scalars(
            select(User.id).where(
                User.role.in_([UserRole.MANAGER, UserRole.ADMIN]),
                User.is_active == True
            )
        ).all()
        if manager_admin_ids:
            broadcast_notification(
                db, list(manager_admin_ids),
                title="Có đơn hàng mới từ Landing Page",
                message=f"Khách hàng {body.full_name} đã gửi yêu cầu booking. Cần chỉ định Sale để xử lý.",
                type="action_required",
                ref_type="order", ref_id=order.id,
                data_json={"order_id": str(order.id), "customer_name": body.full_name},
            )

        # N-S09: Notify ALL Sales about new order available for claiming
        sale_ids = db.scalars(
            select(User.id).where(
                User.role == UserRole.SALE,
                User.is_active == True
            )
        ).all()
        if sale_ids:
            broadcast_notification(
                db, list(sale_ids),
                title="Đơn hàng mới chờ nhận (Claim)",
                message="Có đơn hàng mới từ khách hàng đang chờ các bạn nhận. Hãy vào Sale Portal để nhận đơn.",
                type="action_required",
                ref_type="order", ref_id=order.id,
                data_json={"order_id": str(order.id)},
            )
            
        db.commit()

    db.refresh(lead)
    return lead


@router.get(
    "",
    response_model=list[LeadResponse],
    summary="Nội bộ xem danh sách lead",
)
def list_leads(
    source: LeadSource | None = None,
    status_filter: str | None = None,
    _current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALE)),
    db: Session = Depends(get_db),
):
    """Internal API: danh sách lead cho Sale/Manager/Admin."""
    stmt = select(Lead).order_by(Lead.created_at.desc())
    if source is not None:
        stmt = stmt.where(Lead.source == source)
    if status_filter is not None:
        stmt = stmt.where(Lead.status == status_filter)

    leads = db.scalars(stmt).all()
    return list(leads)
