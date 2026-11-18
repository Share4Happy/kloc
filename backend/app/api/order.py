import uuid
import os
import io
import filetype
import logging
from pathlib import Path
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status, Request, Query
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import BaseModel
from sqlalchemy import select, or_
from sqlalchemy.orm import Session, selectinload
from openpyxl import Workbook
from openpyxl.styles import PatternFill, Font

from app.core.limiter import limiter
from app.core.database import get_db
from app.core.deps import get_current_user, require_roles
from app.core.enums import OrderStatus, UserRole
from app.models.campaign import Campaign
from app.models.kol_profile import KOLProfile
from app.models.order import Order
from app.models.user import User
from app.api.notification import create_notification, broadcast_notification
from app.schemas.order import (
    OrderAssignKol,
    OrderAssignSale,
    OrderCancelApprove,
    OrderCancelRequest,
    OrderCreate,
    OrderInfoUpdate,
    OrderKolResponse,
    OrderPriceUpdate,
    OrderProofSubmit,
    OrderRefundRequest,
    OrderResponse,
    OrderResponse,
    OrderStatusUpdate,
    OrderClaimRequest,
    OrderUpsaleRequest,
)

router = APIRouter(prefix="/orders", tags=["Order Management"])
logger = logging.getLogger(__name__)

_ORDER_STATUS_TRANSITIONS: dict[OrderStatus, set[OrderStatus]] = {
    OrderStatus.INIT: {OrderStatus.DEPOSITED},
    OrderStatus.DEPOSITED: {OrderStatus.RUNNING},
    OrderStatus.RUNNING: {OrderStatus.PENDING_REVIEW},
    OrderStatus.PENDING_REVIEW: {OrderStatus.COMPLETED},
    OrderStatus.COMPLETED: set(),
}


def _ensure_valid_order_transition(current_status: OrderStatus, target_status: OrderStatus) -> None:
    """Enforce sequential transition for the core order pipeline."""
    if current_status == target_status:
        return

    allowed_next_statuses = _ORDER_STATUS_TRANSITIONS.get(current_status)
    if allowed_next_statuses is None:
        raise HTTPException(
            status_code=400,
            detail=(
                "Khong the cap nhat qua endpoint nay vi don dang o trang thai ngoai pipeline chinh "
                f"('{current_status.value}')."
            ),
        )

    if target_status not in allowed_next_statuses:
        expected = ", ".join(status.value for status in sorted(allowed_next_statuses, key=lambda x: x.value))
        raise HTTPException(
            status_code=400,
            detail=(
                "Chuyen trang thai khong hop le. "
                f"Tu '{current_status.value}' chi duoc sang: {expected or 'khong co buoc tiep theo'}; "
                f"nhan: '{target_status.value}'."
            ),
        )


def _get_order_with_relations(db: Session, order_id: uuid.UUID) -> Order | None:
    return db.scalar(
        select(Order)
        .options(selectinload(Order.sale), selectinload(Order.kol), selectinload(Order.campaign))
        .where(Order.id == order_id)
    )

UPLOAD_DIR = Path(__file__).resolve().parents[2] / "uploads" / "order_proofs"
MAX_PROOF_FILE_SIZE = 20 * 1024 * 1024  # 20MB
ALLOWED_PROOF_MIME_TYPES = {
    "application/pdf",
    "image/png",
    "image/jpeg",
    "image/webp",
    "video/mp4",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
}


def _save_proof_file(order_id: uuid.UUID, proof_file: UploadFile) -> tuple[str, str, str, int]:
    """Save uploaded proof file locally and return metadata."""
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

    original_name = proof_file.filename or "proof-file"
    safe_name = f"{order_id}_{uuid.uuid4().hex}{Path(original_name).suffix}"
    output_path = UPLOAD_DIR / safe_name

    total_size = 0
    with output_path.open("wb") as out:
        is_first_chunk = True
        while True:
            chunk = proof_file.file.read(1024 * 1024)
            if not chunk:
                break
            
            if is_first_chunk:
                is_first_chunk = False
                kind = filetype.guess(chunk)
                if kind is None or kind.mime not in ALLOWED_PROOF_MIME_TYPES:
                    out.close()
                    output_path.unlink(missing_ok=True)
                    raise HTTPException(
                        status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                        detail="Tep tin khong hop le hoac bi tu choi do ly do bao mat.",
                    )

            total_size += len(chunk)
            if total_size > MAX_PROOF_FILE_SIZE:
                out.close()
                output_path.unlink(missing_ok=True)
                raise HTTPException(
                    status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                    detail="File proof vuot qua gioi han 20MB.",
                )
            out.write(chunk)
            
    try:
        os.chmod(output_path, 0o644)
    except Exception as e:
        logger.warning(f"Could not change permissions for {output_path}: {e}")

    return (
        str(output_path),
        original_name,
        proof_file.content_type or "application/octet-stream",
        total_size,
    )


def _authorize_order_file_access(current_user: User, order: Order):
    """Authorize current user for order proof file access."""
    if current_user.role == UserRole.KOL and order.kol_id != current_user.id:
        raise HTTPException(status_code=403, detail="Ban khong co quyen xem file proof cua don nay.")

    if current_user.role == UserRole.SALE and order.sale_id != current_user.id:
        raise HTTPException(status_code=403, detail="Ban khong co quyen xem file proof cua don nay.")

    if current_user.role in {UserRole.ADMIN, UserRole.MANAGER, UserRole.KOL_MANAGER, UserRole.SALE, UserRole.KOL}:
        return

    raise HTTPException(status_code=403, detail="Ban khong co quyen truy cap tai nguyen nay.")


@router.post(
    "",
    response_model=OrderResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Khởi tạo một đơn hàng mới (Booking Order)",
)
def create_order(
    body: OrderCreate,
    current_user: User = Depends(require_roles(UserRole.SALE, UserRole.MANAGER)),
    db: Session = Depends(get_db),
):
    """(Sale / Manager) Tạo một đơn Order phân công KOL."""

    # Verify Sale ID matches requesting user (or user is Manager/Admin)
    if current_user.role == UserRole.SALE and body.sale_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tài khoản Sale chỉ có thể tạo đơn hàng cho chính mình.",
        )

    # Verify KOL exists
    kol = db.scalar(select(User).where(User.id == body.kol_id, User.role == UserRole.KOL))
    if not kol:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="KOL không tồn tại.",
        )

    # Offboarding guard: deactivated KOL cannot receive new jobs
    if not kol.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="KOL đã bị vô hiệu hóa và không thể nhận đơn hàng mới.",
        )

    # Optional campaign binding
    campaign = None
    if body.campaign_id is not None:
        campaign = db.get(Campaign, body.campaign_id)
        if campaign is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Chiến dịch không tồn tại.",
            )
        if current_user.role == UserRole.SALE and campaign.owner_sale_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Sale chỉ được tạo đơn trong chiến dịch do mình phụ trách.",
            )

    # For combo bookings, auto-generate a group ID if client does not provide one.
    combo_group_id = body.combo_group_id
    if body.booking_type == "combo" and combo_group_id is None:
        combo_group_id = campaign.combo_group_id if campaign is not None else uuid.uuid4()

    new_order = Order(
        sale_id=body.sale_id,
        kol_id=body.kol_id,
        campaign_id=body.campaign_id,
        combo_group_id=combo_group_id,
        total_amount=body.total_amount,
        deposit_amount=body.deposit_amount,
        customer_name=body.customer_name,
        customer_representative=body.customer_representative,
        campaign_name=body.campaign_name,
        platform=body.platform,
        kpi=body.kpi,
        booking_type=body.booking_type,
        post_count=body.post_count,
        package_definition=body.package_definition,
        kol_request_notes=body.kol_request_notes,
        status=OrderStatus.INIT,
    )
    db.add(new_order)
    db.commit()
    return _get_order_with_relations(db, new_order.id) or new_order


@router.patch(
    "/{order_id}/status",
    response_model=OrderResponse,
    summary="Cập nhật trạng thái đơn hàng",
)
def update_order_status(
    order_id: uuid.UUID,
    body: OrderStatusUpdate,
    current_user: User = Depends(
        require_roles(UserRole.SALE, UserRole.MANAGER, UserRole.KOL_MANAGER)
    ),
    db: Session = Depends(get_db),
):
    """(Nội bộ) Cập nhật tiến độ đơn hàng. Vd: INIT -> DEPOSITED -> RUNNING."""
    order = db.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order không tồn tại.")

    if current_user.role == UserRole.SALE and order.sale_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Sale chỉ có thể cập nhật trạng thái đơn hàng do chính mình phụ trách.",
        )

    _ensure_valid_order_transition(order.status, body.status)
    
    # Nếu đơn thuộc nhóm Combo, cập nhật trạng thái cho toàn bộ nhóm
    if order.combo_group_id:
        db.query(Order).filter(
            Order.combo_group_id == order.combo_group_id
        ).update(
            {"status": body.status}, synchronize_session='fetch'
        )
    else:
        order.status = body.status
    
    db.commit()
    return _get_order_with_relations(db, order_id) or order


@router.patch(
    "/{order_id}/price",
    response_model=OrderResponse,
    summary="Cập nhật giá tiền và cọc lúc khởi tạo",
)
def update_order_price(
    order_id: uuid.UUID,
    body: OrderPriceUpdate,
    current_user: User = Depends(require_roles(UserRole.SALE, UserRole.MANAGER, UserRole.ADMIN)),
    db: Session = Depends(get_db),
):
    """(Sale / Manager / Admin) Cập nhật giá tổng và giá cọc khi đơn chưa bắt đầu chạy."""
    order = db.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order không tồn tại.")

    if current_user.role == UserRole.SALE and order.sale_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Sale chỉ có thể cập nhật giá đơn hàng do chính mình phụ trách.",
        )

    if order.status not in {OrderStatus.INIT, OrderStatus.DEPOSITED}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Chỉ có thể cập nhật giá khi đơn ở trạng thái INIT hoặc DEPOSITED (hiện tại: {order.status.value})."
        )

    order.total_amount = body.total_amount
    order.deposit_amount = body.deposit_amount
    db.commit()
    return _get_order_with_relations(db, order_id) or order


@router.patch(
    "/{order_id}/proof",
    response_model=OrderResponse,
    summary="KOL nộp link nghiệm thu để rà soát",
)
def submit_order_proof(
    order_id: uuid.UUID,
    body: OrderProofSubmit,
    current_user: User = Depends(require_roles(UserRole.KOL)),
    db: Session = Depends(get_db),
):
    """(KOL) Nộp link thành phẩm/nghiệm thu. Order chuyển qua PENDING_REVIEW."""
    order = db.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order không tồn tại.")

    if order.kol_id != current_user.id:
        raise HTTPException(status_code=403, detail="Bạn không phải chủ đơn hàng này.")

    if order.status != OrderStatus.RUNNING:
        raise HTTPException(
            status_code=400,
            detail=(
                "Chi co the nop proof khi don hang dang o trang thai 'running' "
                f"(hien tai: '{order.status.value}')."
            ),
        )

    order.proof_link = body.proof_link
    order.proof_notes = body.proof_notes
    order.status = OrderStatus.PENDING_REVIEW
    db.commit()
    return _get_order_with_relations(db, order_id) or order


@router.patch(
    "/{order_id}/proof-upload",
    response_model=OrderResponse,
    summary="KOL nop proof bang link hoac file",
)
@limiter.limit("10/minute")
def submit_order_proof_upload(
    request: Request,
    order_id: uuid.UUID,
    proof_link: str | None = Form(None),
    proof_notes: str | None = Form(None),
    proof_file: UploadFile | None = File(None),
    current_user: User = Depends(require_roles(UserRole.KOL)),
    db: Session = Depends(get_db),
):
    """(KOL) Nop proof qua link va/hoac file, order chuyen sang pending_review."""
    order = db.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order khong ton tai.")

    if order.kol_id != current_user.id:
        raise HTTPException(status_code=403, detail="Ban khong phai chu don hang nay.")

    if order.status != OrderStatus.RUNNING:
        raise HTTPException(
            status_code=400,
            detail=(
                "Chi co the nop proof khi don hang dang o trang thai 'running' "
                f"(hien tai: '{order.status.value}')."
            ),
        )

    if (not proof_link or not proof_link.strip()) and proof_file is None:
        raise HTTPException(status_code=400, detail="Can it nhat mot trong hai: proof_link hoac proof_file.")

    if proof_file is not None:
        if proof_file.content_type and proof_file.content_type not in ALLOWED_PROOF_MIME_TYPES:
            raise HTTPException(status_code=400, detail="Dinh dang file proof khong duoc ho tro.")

        if order.proof_file_path:
            Path(order.proof_file_path).unlink(missing_ok=True)

        saved_path, original_name, mime, size = _save_proof_file(order_id, proof_file)
        order.proof_file_path = saved_path
        order.proof_file_name = original_name
        order.proof_file_mime = mime
        order.proof_file_size = size

    if proof_link is not None:
        normalized_link = proof_link.strip()
        order.proof_link = normalized_link if normalized_link else None

    if proof_notes is not None:
        order.proof_notes = proof_notes

    order.status = OrderStatus.PENDING_REVIEW
    db.commit()
    return _get_order_with_relations(db, order_id) or order


@router.get(
    "/{order_id}/proof-file",
    summary="Tai file proof cua order",
)
def download_order_proof_file(
    order_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """(Internal/KOL owner) Tai file proof da nop."""
    order = db.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order khong ton tai.")

    _authorize_order_file_access(current_user, order)

    if not order.proof_file_path:
        raise HTTPException(status_code=404, detail="Order chua co file proof.")

    file_path = Path(order.proof_file_path)
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Khong tim thay file proof tren he thong.")

    return FileResponse(
        path=str(file_path),
        filename=order.proof_file_name or file_path.name,
        media_type=order.proof_file_mime or "application/octet-stream",
    )


@router.get(
    "",
    summary="Lấy danh sách đơn hàng",
)
def list_orders(
    status: OrderStatus | None = None,
    kol_id: uuid.UUID | None = None,
    sale_id: uuid.UUID | None = None,
    campaign_id: uuid.UUID | None = None,
    combo_group_id: uuid.UUID | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Lấy danh sách đơn hàng.

    - Admin/Manager/KOL_Manager: Xem tất cả (có hỗ trợ filter).
    - Sale: Chỉ xem các đơn do chính Sale đó phụ trách.
    - KOL: Chỉ xem đơn hàng của chính KOL đó, KHÔNG thấy thông tin nhạy cảm (giá hợp đồng, SĐT khách...).
    """
    stmt = select(Order).options(selectinload(Order.sale), selectinload(Order.kol))

    if current_user.role == UserRole.KOL:
        stmt = stmt.where(
            Order.kol_id == current_user.id,
            Order.status.notin_([OrderStatus.INIT, OrderStatus.DEPOSITED])
        )
        if status:
            stmt = stmt.where(Order.status == status)
        if campaign_id:
            stmt = stmt.where(Order.campaign_id == campaign_id)
        if combo_group_id:
            stmt = stmt.where(Order.combo_group_id == combo_group_id)
    elif current_user.role == UserRole.SALE:
        # Enforce strict RBAC for Sale: always scope to own orders OR new requests.
        # Query param `sale_id` is intentionally ignored for this role.
        stmt = stmt.where(
            or_(
                Order.sale_id == current_user.id,
                Order.status == OrderStatus.NEW_REQUEST
            )
        )
        if status:
            stmt = stmt.where(Order.status == status)
        if kol_id:
            stmt = stmt.where(Order.kol_id == kol_id)
        if campaign_id:
            stmt = stmt.where(Order.campaign_id == campaign_id)
        if combo_group_id:
            stmt = stmt.where(Order.combo_group_id == combo_group_id)
    else:
        # Filter for internal staff
        if status:
            stmt = stmt.where(Order.status == status)
        else:
            # KOL_MANAGER: chỉ thấy đơn từ INIT trở đi (sau khi Sale cập nhật xong thông tin)
            # KHÔNG thấy NEW_REQUEST, PENDING_APPROVAL, PENDING_SALE_INFO
            if current_user.role == UserRole.KOL_MANAGER:
                stmt = stmt.where(
                    Order.status.in_([
                        OrderStatus.INIT,
                        OrderStatus.DEPOSITED,
                        OrderStatus.RUNNING,
                        OrderStatus.PENDING_REVIEW,
                        OrderStatus.COMPLETED,
                        OrderStatus.CANCEL_REQUESTED,
                        OrderStatus.CANCELLED,
                        OrderStatus.REFUND_REQUESTED,
                        OrderStatus.REFUNDED,
                    ])
                )
        if kol_id:
            stmt = stmt.where(Order.kol_id == kol_id)
        if sale_id:
            stmt = stmt.where(Order.sale_id == sale_id)
        if campaign_id:
            stmt = stmt.where(Order.campaign_id == campaign_id)
        if combo_group_id:
            stmt = stmt.where(Order.combo_group_id == combo_group_id)

    orders = db.scalars(stmt.order_by(Order.created_at.desc())).all()

    # For KOL role: return sanitized response (hide sensitive financial info)
    if current_user.role == UserRole.KOL:
        return [
            OrderKolResponse(
                id=o.id,
                status=o.status,
                kol_received_amount=o.kol_received_amount,
                campaign_name=o.campaign_name,
                platform=o.platform,
                kpi=o.kpi,
                booking_type=o.booking_type,
                post_count=o.post_count,
                proof_link=o.proof_link,
                proof_notes=o.proof_notes,
                proof_file_name=o.proof_file_name,
                proof_file_mime=o.proof_file_mime,
                proof_file_size=o.proof_file_size,
                contract_file_name=o.contract_file_name,
                contract_generated_at=o.contract_generated_at,
                sale_name=o.sale.full_name if o.sale else None,
                created_at=o.created_at,
                updated_at=o.updated_at,
            )
            for o in orders
        ]

    return list(orders)


# ---------------------------------------------------------------------------
# Export Proof Report (Excel)
# ---------------------------------------------------------------------------

class ExportProofReportRequest(BaseModel):
    """Request body for exporting selected orders to Excel."""
    order_ids: list[uuid.UUID]
    report_type: str  # 'pending_review' or 'completed'


def _build_proof_report_workbook(orders: list[Order], report_type: str) -> io.BytesIO:
    """Build Excel workbook for proof report. Returns BytesIO buffer."""
    wb = Workbook()
    ws = wb.active
    ws.title = "Bao cao nghiem thu KOL"

    if report_type == "completed":
        # Completed report: gọn nhẹ, chỉ gửi khách hàng
        headers = [
            "STT",
            "Tên KOL",
            "Trạng thái",
            "Link nghiệm thu",
            "Ghi chú",
        ]
        for col_idx, header in enumerate(headers, start=1):
            cell = ws.cell(row=1, column=col_idx, value=header)
            cell.font = Font(bold=True, color="FFFFFF")
            cell.fill = PatternFill(start_color="10B981", end_color="10B981", fill_type="solid")

        status_labels: dict[OrderStatus, str] = {
            OrderStatus.COMPLETED: "Hoàn thành",
        }

        for row_idx, order in enumerate(orders, start=2):
            ws.cell(row=row_idx, column=1, value=row_idx - 1)
            ws.cell(row=row_idx, column=2, value=order.kol.full_name if order.kol else order.kol_id)
            ws.cell(row=row_idx, column=3, value=status_labels.get(order.status, order.status))
            ws.cell(row=row_idx, column=4, value=order.proof_link or "")
            ws.cell(row=row_idx, column=5, value=order.proof_notes or "")
    else:
        # Pending review / overview: đầy đủ thông tin
        headers = [
            "STT",
            "Mã Đơn Hàng",
            "Tên KOL",
            "Email KOL",
            "Số điện thoại",
            "Nền tảng",
            "Chiến dịch",
            "Loại Booking",
            "Trạng thái",
            "Link nghiệm thu",
            "Tên file proof",
            "Ghi chú proof",
            "Ngày nộp proof",
            "Sale phụ trách",
        ]
        for col_idx, header in enumerate(headers, start=1):
            cell = ws.cell(row=1, column=col_idx, value=header)
            cell.font = Font(bold=True, color="FFFFFF")
            cell.fill = PatternFill(start_color="4472C4", end_color="4472C4", fill_type="solid")

        all_status_labels: dict[OrderStatus, str] = {
            OrderStatus.INIT: "Khởi tạo",
            OrderStatus.DEPOSITED: "Đã cọc",
            OrderStatus.RUNNING: "Đang chạy",
            OrderStatus.PENDING_REVIEW: "Chờ nghiệm thu",
            OrderStatus.COMPLETED: "Hoàn thành",
            OrderStatus.CANCELLED: "Đã hủy",
            OrderStatus.CANCEL_REQUESTED: "Yêu cầu hủy",
            OrderStatus.REFUND_REQUESTED: "Yêu cầu hoàn tiền",
            OrderStatus.REFUNDED: "Đã hoàn tiền",
        }

        for row_idx, order in enumerate(orders, start=2):
            proof_date = ""
            if order.updated_at:
                if order.updated_at.tzinfo:
                    proof_date = order.updated_at.astimezone(timezone.utc).strftime("%d/%m/%Y %H:%M")
                else:
                    proof_date = order.updated_at.strftime("%d/%m/%Y %H:%M")

            ws.cell(row=row_idx, column=1, value=row_idx - 1)
            ws.cell(row=row_idx, column=2, value=str(order.id))
            ws.cell(row=row_idx, column=3, value=order.kol.full_name if order.kol else order.kol_id)
            ws.cell(row=row_idx, column=4, value=order.kol.email if order.kol else "")
            ws.cell(row=row_idx, column=5, value=order.kol.phone if order.kol else "")
            ws.cell(row=row_idx, column=6, value=order.platform or "")
            ws.cell(row=row_idx, column=7, value=order.campaign_name or "")
            ws.cell(row=row_idx, column=8, value=order.booking_type or "custom")
            ws.cell(row=row_idx, column=9, value=all_status_labels.get(order.status, order.status))
            ws.cell(row=row_idx, column=10, value=order.proof_link or "")
            ws.cell(row=row_idx, column=11, value=order.proof_file_name or "")
            ws.cell(row=row_idx, column=12, value=order.proof_notes or "")
            ws.cell(row=row_idx, column=13, value=proof_date)
            ws.cell(row=row_idx, column=14, value=order.sale.full_name if order.sale else "")

    # Auto-adjust column widths
    for column_cells in ws.columns:
        max_length = 0
        column_letter = column_cells[0].column_letter
        for cell in column_cells:
            if cell.value:
                max_length = max(max_length, min(len(str(cell.value)), 50))
        ws.column_dimensions[column_letter].width = max_length + 4

    output = io.BytesIO()
    wb.save(output)
    output.seek(0)
    return output


@router.get(
    "/export-proof-report/orders",
    summary="Lấy danh sách đơn để chọn xuất báo cáo",
)
def get_exportable_orders(
    status_filter: str = "pending_review",
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.KOL_MANAGER)),
    db: Session = Depends(get_db),
):
    """Lấy danh sách orders để hiển thị trong modal chọn đơn xuất báo cáo.

    status_filter: 'pending_review' hoặc 'completed'
    """
    stmt = select(Order).options(selectinload(Order.sale), selectinload(Order.kol))

    if status_filter == "completed":
        stmt = stmt.where(Order.status == OrderStatus.COMPLETED)
    else:
        stmt = stmt.where(Order.status == OrderStatus.PENDING_REVIEW)

    orders = db.scalars(stmt.order_by(Order.created_at.desc())).all()

    result = []
    for o in orders:
        result.append({
            "id": str(o.id),
            "kol_name": o.kol.full_name if o.kol else o.kol_id,
            "kol_email": o.kol.email if o.kol else "",
            "sale_name": o.sale.full_name if o.sale else "",
            "campaign_name": o.campaign_name or "",
            "platform": o.platform or "",
            "status": o.status,
            "proof_link": o.proof_link,
            "proof_file_name": o.proof_file_name,
            "created_at": o.created_at.isoformat() if o.created_at else "",
        })
    return result


@router.post(
    "/export-proof-report",
    summary="Xuất file Excel báo cáo nghiệm thu (theo danh sách chọn)",
)
def export_selected_proof_report(
    body: ExportProofReportRequest,
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.KOL_MANAGER)),
    db: Session = Depends(get_db),
):
    """Xuất Excel cho các đơn được chọn.

    report_type: 'pending_review' (đầy đủ) hoặc 'completed' (gọn nhẹ gửi khách)
    """
    if not body.order_ids:
        raise HTTPException(status_code=400, detail="Vui lòng chọn ít nhất một đơn hàng.")

    stmt = (
        select(Order)
        .options(selectinload(Order.sale), selectinload(Order.kol))
        .where(Order.id.in_(body.order_ids))
    )
    orders = list(db.scalars(stmt).all())

    if not orders:
        raise HTTPException(status_code=404, detail="Không tìm thấy đơn hàng nào.")

    output = _build_proof_report_workbook(orders, body.report_type)

    prefix = "nghiem-thu-hoan-thanh" if body.report_type == "completed" else "cho-nghiem-thu"
    filename = f"{prefix}-{datetime.now().strftime('%Y%m%d-%H%M%S')}.xlsx"

    return StreamingResponse(
        iter(lambda: output.read(8192), b""),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get(
    "/export-proof-report",
    summary="Xuất báo cáo tổng quan (tất cả đơn có proof)",
)
def export_proof_report_overview(
    campaign_id: uuid.UUID | None = None,
    combo_group_id: uuid.UUID | None = None,
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.KOL_MANAGER)),
    db: Session = Depends(get_db),
):
    """Xuất file Excel tổng quan - TẤT CẢ orders đã có proof."""
    stmt = (
        select(Order)
        .options(selectinload(Order.sale), selectinload(Order.kol))
        .where(
            or_(
                Order.proof_link.isnot(None),
                Order.proof_file_name.isnot(None),
                Order.status == OrderStatus.PENDING_REVIEW,
            )
        )
    )

    if campaign_id:
        stmt = stmt.where(Order.campaign_id == campaign_id)
    if combo_group_id:
        stmt = stmt.where(Order.combo_group_id == combo_group_id)

    orders = list(db.scalars(stmt.order_by(Order.created_at)).all())

    if not orders:
        raise HTTPException(status_code=404, detail="Không có đơn hàng nào để xuất báo cáo.")

    output = _build_proof_report_workbook(orders, "overview")

    filename = f"bao-cao-nghiem-thu-{datetime.now().strftime('%Y%m%d-%H%M%S')}.xlsx"

    return StreamingResponse(
        iter(lambda: output.read(8192), b""),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


# ---------------------------------------------------------------------------
# Claim Request workflow
# ---------------------------------------------------------------------------

@router.patch(
    "/{order_id}/claim",
    response_model=OrderResponse,
    summary="Sale nhận đơn yếu cầu từ public",
)
def claim_order(
    order_id: uuid.UUID,
    body: OrderClaimRequest,
    current_user: User = Depends(require_roles(UserRole.SALE)),
    db: Session = Depends(get_db),
):
    """(Sale) Nhận đơn yêu cầu (NEW_REQUEST). Gán Sale, tùy chọn gán KOL và giá. Chuyển sang PENDING_APPROVAL."""
    order = db.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order không tồn tại.")

    if order.status != OrderStatus.NEW_REQUEST:
        raise HTTPException(
            status_code=400,
            detail=f"Chỉ có thể nhận đơn ở trạng thái 'new_request' (hiện tại: '{order.status.value}').",
        )

    # KOL assignment is optional at claim time
    if body.kol_id:
        kol = db.scalar(select(User).where(User.id == body.kol_id, User.role == UserRole.KOL))
        if not kol:
            raise HTTPException(status_code=404, detail="KOL không tồn tại.")
        if not kol.is_active:
            raise HTTPException(status_code=400, detail="KOL đã bị vô hiệu hóa.")
        order.kol_id = body.kol_id

    order.sale_id = current_user.id
    order.total_amount = body.total_amount
    order.deposit_amount = body.deposit_amount
    if body.booking_type:
        order.booking_type = body.booking_type
        
    order.status = OrderStatus.PENDING_APPROVAL
    db.commit()
    return _get_order_with_relations(db, order_id) or order


@router.patch(
    "/{order_id}/approve-claim",
    response_model=OrderResponse,
    summary="Manager duyệt Sale nhận đơn",
)
def approve_claim(
    order_id: uuid.UUID,
    current_user: User = Depends(require_roles(UserRole.MANAGER, UserRole.ADMIN)),
    db: Session = Depends(get_db),
):
    """(Manager/Admin) Duyệt đơn Sale vừa nhận (từ PENDING_APPROVAL -> INIT)."""
    order = db.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order không tồn tại.")

    if order.status != OrderStatus.PENDING_APPROVAL:
        raise HTTPException(
            status_code=400,
            detail=f"Chỉ có thể duyệt đơn ở trạng thái 'pending_approval' (hiện tại: '{order.status.value}').",
        )

    order.status = OrderStatus.PENDING_SALE_INFO
    db.commit()

    # N-S02: Notify Sale that claim was approved
    if order.sale_id:
        customer_label = order.customer_name or order.campaign_name or f"Đơn {order_id}"
        create_notification(
            db, order.sale_id,
            title="Đơn nhận của bạn đã được duyệt",
            message=f"Đơn {customer_label} (Mã: {str(order_id)[:8]}) đã được duyệt. Vui lòng cập nhật thông tin chi tiết (ngân sách, chiến dịch, ghi chú KOL) để chuyển sang trạng thái sẵn sàng phân bổ KOL.",
            type="action_required",
            ref_type="order", ref_id=order_id,
            data_json={"order_id": str(order_id)},
        )
        db.commit()

    return _get_order_with_relations(db, order_id) or order


@router.patch(
    "/{order_id}/reject-claim",
    response_model=OrderResponse,
    summary="Manager từ chối Sale nhận đơn",
)
def reject_claim(
    order_id: uuid.UUID,
    current_user: User = Depends(require_roles(UserRole.MANAGER, UserRole.ADMIN)),
    db: Session = Depends(get_db),
):
    """(Manager/Admin) Từ chối đơn Sale vừa nhận (từ PENDING_APPROVAL -> NEW_REQUEST).

    Xóa sale_id để đơn hiện lại cho tất cả Sale khác có thể nhận.
    """
    order = db.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order không tồn tại.")

    if order.status != OrderStatus.PENDING_APPROVAL:
        raise HTTPException(
            status_code=400,
            detail=f"Chỉ có thể từ chối đơn ở trạng thái 'pending_approval' (hiện tại: '{order.status.value}').",
        )

    # Capture Sale ID before nullifying (N-S03)
    rejected_sale_id = order.sale_id

    order.sale_id = None
    order.kol_id = None
    order.total_amount = 0
    order.deposit_amount = 0
    order.status = OrderStatus.NEW_REQUEST
    db.commit()

    # N-S03: Notify Sale that claim was rejected
    if rejected_sale_id:
        customer_label = order.customer_name or order.campaign_name or f"Đơn {order_id}"
        create_notification(
            db, rejected_sale_id,
            title="Yêu cầu nhận đơn bị từ chối",
            message=f"Yêu cầu nhận đơn {customer_label} (Mã: {str(order_id)[:8]}) của bạn đã bị từ chối. Đơn đã được trả lại danh sách công khai.",
            type="warning",
            ref_type="order", ref_id=order_id,
            data_json={"order_id": str(order_id)},
        )
        db.commit()

    return _get_order_with_relations(db, order_id) or order


@router.patch(
    "/{order_id}/assign-sale",
    response_model=OrderResponse,
    summary="Manager/Admin chỉ định Sale cho đơn mới",
)
def assign_sale(
    order_id: uuid.UUID,
    body: OrderAssignSale,
    current_user: User = Depends(require_roles(UserRole.MANAGER, UserRole.ADMIN)),
    db: Session = Depends(get_db),
):
    """(Manager/Admin) Chỉ định Sale phụ trách cho đơn hàng mới (NEW_REQUEST).

    Đơn sẽ chuyển thẳng từ NEW_REQUEST -> PENDING_SALE_INFO để Sale cập nhật thông tin.
    """
    order = db.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order không tồn tại.")

    if order.status != OrderStatus.NEW_REQUEST:
        raise HTTPException(
            status_code=400,
            detail=f"Chỉ có thể chỉ định Sale cho đơn ở trạng thái 'new_request' (hiện tại: '{order.status.value}').",
        )

    # Verify the assigned sale exists and has SALE role
    sale_user = db.scalar(select(User).where(User.id == body.sale_id, User.role == UserRole.SALE))
    if not sale_user:
        raise HTTPException(status_code=404, detail="Sale được chỉ định không tồn tại.")

    if not sale_user.is_active:
        raise HTTPException(status_code=400, detail="Sale đã bị vô hiệu hóa.")

    order.sale_id = body.sale_id
    order.status = OrderStatus.PENDING_SALE_INFO
    db.commit()

    # N-S01: Notify Sale about new order assignment
    customer_label = order.customer_name or order.campaign_name or f"Đơn {order_id}"
    create_notification(
        db, body.sale_id,
        title="Bạn có đơn hàng mới được chỉ định",
        message=f"Bạn được chỉ định đơn: {customer_label} (Mã: {str(order_id)[:8]}). Vui lòng cập nhật thông tin chiến dịch và ghi chú yêu cầu KOL.",
        type="action_required",
        ref_type="order", ref_id=order_id,
        data_json={"order_id": str(order_id), "campaign_name": order.campaign_name},
    )
    db.commit()

    return _get_order_with_relations(db, order_id) or order


@router.patch(
    "/{order_id}/assign-kol",
    response_model=OrderResponse,
    summary="KOL Manager phân bổ KOL cho đơn hàng (hỗ trợ nhiều KOL)",
)
def assign_kol(
    order_id: uuid.UUID,
    body: OrderAssignKol,
    current_user: User = Depends(require_roles(UserRole.KOL_MANAGER, UserRole.MANAGER, UserRole.ADMIN)),
    db: Session = Depends(get_db),
):
    """(KOL Manager/Manager/Admin) Phân bổ KOL cho đơn hàng chưa có KOL.

    - Nếu chọn 1 KOL: cập nhật order hiện tại
    - Nếu chọn nhiều KOL: clone order cho mỗi KOL (combo workflow)
    """
    order = db.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order không tồn tại.")

    if order.status != OrderStatus.INIT:
        raise HTTPException(
            status_code=400,
            detail=f"Chỉ có thể phân bổ KOL cho đơn ở trạng thái 'init' (hiện tại: '{order.status.value}').",
        )

    if len(body.kol_ids) == 0:
        raise HTTPException(status_code=400, detail="Vui lòng chọn ít nhất một KOL.")

    # Auto-generate combo_group_id if multiple KOLs
    combo_group_id = order.combo_group_id
    if len(body.kol_ids) > 1 and combo_group_id is None:
        combo_group_id = uuid.uuid4()

    results = []

    for idx, kol_id in enumerate(body.kol_ids):
        # Verify KOL exists
        kol = db.scalar(select(User).where(User.id == kol_id, User.role == UserRole.KOL))
        if not kol:
            raise HTTPException(status_code=404, detail=f"KOL không tồn tại: {kol_id}")

        if not kol.is_active:
            raise HTTPException(status_code=400, detail=f"KOL đã bị vô hiệu hóa: {kol.full_name}")

        # Get KOL profile to auto-set kol_received_amount
        kol_profile = db.scalar(select(KOLProfile).where(KOLProfile.user_id == kol_id))
        kol_received = kol_profile.kol_booking_price if kol_profile else None

        if idx == 0:
            # Update the original order
            target_order = order
        else:
            # Clone the order for additional KOLs
            target_order = Order(
                sale_id=order.sale_id,
                kol_id=None,  # Will be set below
                campaign_id=order.campaign_id,
                combo_group_id=combo_group_id,
                total_amount=order.total_amount,
                deposit_amount=order.deposit_amount,
                customer_name=order.customer_name,
                customer_representative=order.customer_representative,
                campaign_name=order.campaign_name,
                platform=order.platform,
                kpi=order.kpi,
                booking_type=order.booking_type,
                post_count=order.post_count,
                package_definition=order.package_definition,
                kol_request_notes=order.kol_request_notes,
                status=OrderStatus.INIT,
            )
            db.add(target_order)
            db.flush()

        # Set KOL info
        target_order.kol_id = kol_id
        if kol_received is not None:
            target_order.kol_received_amount = kol_received

        results.append(target_order)

    # If multiple KOLs, mark the original order as part of a combo
    if len(body.kol_ids) > 1:
        order.combo_group_id = combo_group_id

    db.commit()

    # N-K01: Notify each KOL about order assignment
    customer_label = order.customer_name or order.campaign_name or f"Đơn {order_id}"
    for kol_id in body.kol_ids:
        create_notification(
            db, kol_id,
            title="Bạn được phân vào đơn hàng mới",
            message=f"Bạn được phân bổ vào đơn: {customer_label} (Mã: {str(order_id)[:8]}). Vui lòng kiểm tra và chuẩn bị thực hiện.",
            type="action_required",
            ref_type="order", ref_id=order_id,
            data_json={"order_id": str(order_id), "campaign_name": order.campaign_name},
        )

    # N-S04: Notify Sale that KOL has been assigned
    if order.sale_id:
        kol_names = []
        for kid in body.kol_ids:
            k = db.scalar(select(User).where(User.id == kid))
            if k: kol_names.append(k.full_name)
        kol_list = ", ".join(kol_names) if kol_names else "KOL"

        create_notification(
            db, order.sale_id,
            title=f"KOL đã được phân bổ cho đơn hàng",
            message=f"KOL {kol_list} đã được phân bổ cho đơn {customer_label} (Mã: {str(order_id)[:8]}). Bạn có thể tiếp tục xử lý hợp đồng.",
            type="info",
            ref_type="order", ref_id=order_id,
            data_json={"order_id": str(order_id), "kol_names": kol_list},
        )
        db.commit()

    # Return the first (original) order
    return _get_order_with_relations(db, results[0].id) or results[0]


@router.patch(
    "/{order_id}/update-info",
    response_model=OrderResponse,
    summary="Sale cập nhật thông tin đơn hàng (giá, campaign, ghi chú KOL)",
)
def update_order_info(
    order_id: uuid.UUID,
    body: OrderInfoUpdate,
    current_user: User = Depends(require_roles(UserRole.SALE, UserRole.MANAGER)),
    db: Session = Depends(get_db),
):
    """(Sale/Manager) Cập nhật thông tin đơn hàng khi đơn ở trạng thái INIT.

    Sale KHÔNG được phép gán KOL - chỉ KOL Manager mới có quyền này qua endpoint /assign-kol.
    """
    order = db.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order không tồn tại.")

    if current_user.role == UserRole.SALE and order.sale_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Sale chỉ có thể cập nhật đơn hàng do chính mình phụ trách.",
        )

    if order.status not in {OrderStatus.PENDING_SALE_INFO, OrderStatus.INIT}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Chỉ có thể cập nhật thông tin khi đơn ở trạng thái 'pending_sale_info' hoặc 'init' (hiện tại: '{order.status.value}').",
        )

    # Update order fields (NO kol_id - only KOL Manager can assign via /assign-kol)
    order.total_amount = body.total_amount
    order.deposit_amount = body.deposit_amount
    order.customer_name = body.customer_name
    order.customer_representative = body.customer_representative
    order.campaign_name = body.campaign_name
    order.platform = body.platform
    order.kpi = body.kpi
    order.booking_type = body.booking_type
    order.post_count = body.post_count
    order.kol_request_notes = body.kol_request_notes

    # Transition from PENDING_SALE_INFO → INIT (Sale has finished updating info)
    needs_kol_assignment = False
    if order.status == OrderStatus.PENDING_SALE_INFO:
        order.status = OrderStatus.INIT
        needs_kol_assignment = True

    db.commit()

    # N-KM01: Chỉ notify KOL Manager khi Sale ĐÃ cập nhật xong thông tin
    if needs_kol_assignment and not order.kol_id:
        customer_label = order.customer_name or order.campaign_name or f"Đơn {order_id}"
        kol_manager_ids = db.scalars(
            select(User.id).where(User.role == UserRole.KOL_MANAGER, User.is_active == True)
        ).all()
        if kol_manager_ids:
            broadcast_notification(
                db, list(kol_manager_ids),
                title="Có đơn cần phân bổ KOL",
                message=f"Đơn {customer_label} (Mã: {str(order_id)[:8]}) đã được Sale cập nhật thông tin và sẵn sàng phân bổ KOL.",
                type="action_required",
                ref_type="order", ref_id=order_id,
                data_json={"order_id": str(order_id), "campaign_name": order.campaign_name},
            )
            db.commit()

    return _get_order_with_relations(db, order_id) or order


@router.patch(
    "/{order_id}/upsale",
    response_model=OrderResponse,
    summary="Sale cập nhật đơn hàng (upsale) - lưu lịch sử thay đổi",
)
def upsale_order(
    order_id: uuid.UUID,
    body: OrderUpsaleRequest,
    current_user: User = Depends(require_roles(UserRole.SALE, UserRole.MANAGER)),
    db: Session = Depends(get_db),
):
    """(Sale/Manager) Cập nhật đơn hàng sau khi khách nâng cấp.

    Lưu snapshot giá trị TRƯỚC khi cập nhật vào update_history để dễ so sánh.
    """
    order = db.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order không tồn tại.")

    if current_user.role == UserRole.SALE and order.sale_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Sale chỉ có thể cập nhật đơn hàng do chính mình phụ trách.",
        )

    if order.status not in {OrderStatus.INIT, OrderStatus.DEPOSITED, OrderStatus.RUNNING}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Chỉ có thể upsale đơn ở trạng thái INIT, DEPOSITED hoặc RUNNING (hiện tại: '{order.status.value}').",
        )

    from datetime import datetime, timezone

    # Build snapshot of current values
    snapshot = {
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "updated_by": str(current_user.id),
        "updated_by_name": current_user.full_name or current_user.email,
        "update_note": body.update_note or "",
        "changes": {},
    }

    # Track only fields that actually changed
    field_labels = {
        "total_amount": "Tổng giá trị",
        "deposit_amount": "Tiền cọc",
        "campaign_name": "Chiến dịch",
        "platform": "Nền tảng",
        "kpi": "KPI",
        "post_count": "Số bài đăng",
        "kol_request_notes": "Ghi chú KOL",
    }

    for field_name, label in field_labels.items():
        old_val = getattr(order, field_name)
        new_val = getattr(body, field_name)
        if old_val != new_val:
            snapshot["changes"][field_name] = {
                "label": label,
                "old": old_val,
                "new": new_val,
            }
            setattr(order, field_name, new_val)

    # If no changes, return early
    if not snapshot["changes"]:
        raise HTTPException(status_code=400, detail="Không có thay đổi nào so với giá trị hiện tại.")

    # Save snapshot to history
    if order.update_history is None:
        order.update_history = []
    order.update_history.append(snapshot)

    db.commit()
    return _get_order_with_relations(db, order_id) or order


# ---------------------------------------------------------------------------
# Cancel / Refund workflow
# ---------------------------------------------------------------------------


# Statuses that are considered "active" (can be cancelled)
_CANCELLABLE_STATUSES = {
    OrderStatus.INIT,
    OrderStatus.DEPOSITED,
    OrderStatus.RUNNING,
    OrderStatus.PENDING_REVIEW,
}


def _ensure_order_exists(db: Session, order_id: uuid.UUID) -> Order:
    order = db.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order khong ton tai.")
    return order


def _ensure_can_cancel_order(current_user: User, order: Order) -> None:
    if current_user.role == UserRole.SALE and order.sale_id != current_user.id:
        raise HTTPException(status_code=403, detail="Ban chi co the huy don cua chinh minh.")
    if current_user.role == UserRole.KOL and order.kol_id != current_user.id:
        raise HTTPException(status_code=403, detail="Ban chi co the yeu cau huy don minh tham gia.")


def _ensure_cancellable_status(order: Order, action_label: str) -> None:
    if order.status not in _CANCELLABLE_STATUSES:
        raise HTTPException(
            status_code=400,
            detail=f"Khong the {action_label} o trang thai '{order.status.value}'.",
        )


def _finalize_cancel(order: Order, reason: str, note: str | None = None) -> None:
    order.status = OrderStatus.CANCELLED
    order.cancel_reason = reason
    if note is not None:
        order.cancel_note = note


@router.post(
    "/{order_id}/cancel",
    response_model=OrderResponse,
    summary="Huy don hang truc tiep (Sale / Manager / Admin)",
)
def cancel_order(
    order_id: uuid.UUID,
    body: OrderCancelRequest,
    current_user: User = Depends(require_roles(UserRole.SALE, UserRole.MANAGER, UserRole.ADMIN)),
    db: Session = Depends(get_db),
):
    """(Sale / Manager / Admin) Huy don hang truc tiep, bo qua buoc cancel_requested."""
    order = _ensure_order_exists(db, order_id)

    _ensure_can_cancel_order(current_user, order)
    _ensure_cancellable_status(order, "huy don")

    _finalize_cancel(order, body.reason, note="Huy truc tiep boi noi bo.")
    db.commit()
    return _get_order_with_relations(db, order_id) or order


@router.post(
    "/{order_id}/request-cancel",
    response_model=OrderResponse,
    summary="Yeu cau huy don hang (KOL)",
)
def request_cancel(
    order_id: uuid.UUID,
    body: OrderCancelRequest,
    current_user: User = Depends(require_roles(UserRole.KOL)),
    db: Session = Depends(get_db),
):
    """(KOL) Yeu cau huy don hang. Don hang chuyen sang CANCEL_REQUESTED de Manager/Admin duyet."""
    order = _ensure_order_exists(db, order_id)

    _ensure_can_cancel_order(current_user, order)
    _ensure_cancellable_status(order, "yeu cau huy don")

    order.status = OrderStatus.CANCEL_REQUESTED
    order.cancel_reason = body.reason
    order.cancel_note = None
    db.commit()
    return _get_order_with_relations(db, order_id) or order


@router.post(
    "/{order_id}/approve-cancel",
    response_model=OrderResponse,
    summary="Duyet huy don hang (Manager / Admin)",
)
def approve_cancel(
    order_id: uuid.UUID,
    body: OrderCancelApprove,
    current_user: User = Depends(require_roles(UserRole.MANAGER, UserRole.ADMIN)),
    db: Session = Depends(get_db),
):
    """(Manager / Admin) Phe duyet huy don hang. Don hang chuyen sang CANCELLED."""
    order = _ensure_order_exists(db, order_id)

    if order.status != OrderStatus.CANCEL_REQUESTED:
        raise HTTPException(
            status_code=400,
            detail=f"Don hang phai o trang thai 'cancel_requested' de phe duyet huy (hien tai: '{order.status.value}').",
        )

    _finalize_cancel(order, order.cancel_reason or "KOL yeu cau huy don.", note=body.note)
    db.commit()
    return _get_order_with_relations(db, order_id) or order


@router.post(
    "/{order_id}/request-refund",
    response_model=OrderResponse,
    summary="Yeu cau hoan tien (Sale / Manager)",
)
def request_refund(
    order_id: uuid.UUID,
    body: OrderRefundRequest,
    current_user: User = Depends(require_roles(UserRole.SALE, UserRole.MANAGER)),
    db: Session = Depends(get_db),
):
    """(Sale / Manager) Yeu cau hoan tien sau khi don bi huy hoac tu trang thai co coc.
    Don hang phai da bi huy hoac da coc de co the yeu cau hoan tien."""
    order = db.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order khong ton tai.")

    if current_user.role == UserRole.SALE and order.sale_id != current_user.id:
        raise HTTPException(status_code=403, detail="Ban chi co the yeu cau hoan tien cho don cua chinh minh.")

    if order.status not in {OrderStatus.CANCELLED, OrderStatus.DEPOSITED}:
        raise HTTPException(
            status_code=400,
            detail=f"Chi co the yeu cau hoan tien khi don da huy hoac da coc (hien tai: '{order.status.value}').",
        )

    if order.deposit_amount <= 0:
        raise HTTPException(status_code=400, detail="Don hang khong co tien coc de hoan tra.")

    order.status = OrderStatus.REFUND_REQUESTED
    order.cancel_reason = body.reason
    db.commit()
    return _get_order_with_relations(db, order_id) or order


@router.post(
    "/{order_id}/approve-refund",
    response_model=OrderResponse,
    summary="Duyet hoan tien (Manager / Admin)",
)
def approve_refund(
    order_id: uuid.UUID,
    body: OrderCancelApprove,
    current_user: User = Depends(require_roles(UserRole.MANAGER, UserRole.ADMIN)),
    db: Session = Depends(get_db),
):
    """(Manager / Admin) Xac nhan da hoan tien thanh cong. Don hang chuyen sang REFUNDED."""
    order = db.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order khong ton tai.")

    if order.status != OrderStatus.REFUND_REQUESTED:
        raise HTTPException(
            status_code=400,
            detail=f"Don hang phai o trang thai 'refund_requested' de xac nhan hoan tien (hien tai: '{order.status.value}').",
        )

    order.status = OrderStatus.REFUNDED
    if body.note:
        order.cancel_note = body.note
    db.commit()
    return _get_order_with_relations(db, order_id) or order
