import uuid
from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.database import get_db
from app.core.deps import get_current_user, require_roles
from app.core.enums import UserRole
from app.models.order import Order
from app.models.user import User
from app.schemas.contract import ContractGenerateRequest
from app.services.contract_engine import ContractEngineError, generate_contract_docx

router = APIRouter(prefix="/contracts", tags=["Contract Management"])

DOCX_MIME_TYPE = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
CONTRACT_UPLOAD_DIR = Path(__file__).resolve().parents[2] / "uploads" / "contracts"


def _sanitize_filename(text: str) -> str:
    return "-".join(text.strip().split()) or "contract"


def _get_order_or_404(db: Session, order_id: uuid.UUID) -> Order:
    order = db.scalar(
        select(Order)
        .options(selectinload(Order.kol), selectinload(Order.sale))
        .where(Order.id == order_id)
    )
    if order is None:
        raise HTTPException(status_code=404, detail="Order không tồn tại.")
    return order


def _authorize_generate_from_order(current_user: User, order: Order):
    if current_user.role == UserRole.SALE and order.sale_id != current_user.id:
        raise HTTPException(status_code=403, detail="Bạn chỉ có thể tạo hợp đồng cho đơn hàng của chính mình.")


def _authorize_contract_download(current_user: User, order: Order):
    if current_user.role == UserRole.KOL and order.kol_id != current_user.id:
        raise HTTPException(status_code=403, detail="Bạn không có quyền tải hợp đồng của đơn hàng này.")
    if current_user.role == UserRole.SALE and order.sale_id != current_user.id:
        raise HTTPException(status_code=403, detail="Bạn không có quyền tải hợp đồng của đơn hàng này.")


def _build_contract_payload_from_order(order: Order) -> ContractGenerateRequest:
    missing_fields: list[str] = []
    if not order.customer_name:
        missing_fields.append("customer_name")
    if not order.customer_representative:
        missing_fields.append("customer_representative")
    if not order.kpi:
        missing_fields.append("kpi")
    if order.kol is None or not order.kol.full_name:
        missing_fields.append("kol_name")

    if missing_fields:
        raise HTTPException(
            status_code=400,
            detail=(
                "Order chưa đủ dữ liệu để sinh hợp đồng. "
                f"Thiếu: {', '.join(missing_fields)}."
            ),
        )

    return ContractGenerateRequest(
        customer_name=order.customer_name or "",
        customer_representative=order.customer_representative or "",
        kol_name=order.kol.full_name,
        platform=order.platform or "TikTok",
        post_count=order.post_count or 1,
        kpi=order.kpi or "",
        total_amount=order.total_amount,
        deposit_amount=order.deposit_amount,
    )


def _persist_contract_file(
    db: Session,
    order: Order,
    generated_by: User,
    filename: str,
    content: bytes,
    payload: ContractGenerateRequest,
) -> Path:
    CONTRACT_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

    if order.contract_file_path:
        Path(order.contract_file_path).unlink(missing_ok=True)

    stored_name = f"{order.id}_{uuid.uuid4().hex}.docx"
    output_path = CONTRACT_UPLOAD_DIR / stored_name
    output_path.write_bytes(content)

    order.contract_file_path = str(output_path)
    order.contract_file_name = filename
    order.contract_file_mime = DOCX_MIME_TYPE
    order.contract_generated_at = datetime.now(timezone.utc)
    order.contract_generated_by = generated_by.id
    order.contract_payload = payload.model_dump()
    db.commit()

    return output_path


@router.post(
    "/generate",
    summary="Tạo file hợp đồng DOCX từ template",
)
def generate_contract(
    body: ContractGenerateRequest,
    _current_user: User = Depends(require_roles(UserRole.KOL_MANAGER, UserRole.SALE)),
):
    """API để tạo file hợp đồng `.docx` điền sẵn thông tin.

    Chỉ `Sale` và `KOL_Manager` (và Admin) được phép dùng.
    Trả về file tải xuống trực tiếp.
    """
    try:
        buffer = generate_contract_docx(body)
    except ContractEngineError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )

    # Header for file download
    # E.g., hop-dong-Nguyen-Van-A-13-3-2026.docx
    filename = f"hop-dong-{body.kol_name.replace(' ', '-')}.docx"
    
    headers = {
        "Content-Disposition": f"attachment; filename={filename}"
    }

    return StreamingResponse(
        buffer,
        media_type=DOCX_MIME_TYPE,
        headers=headers,
    )


@router.post(
    "/orders/{order_id}/generate",
    summary="Tạo hợp đồng DOCX từ dữ liệu Order và lưu metadata vào Order",
)
def generate_contract_from_order(
    order_id: uuid.UUID,
    current_user: User = Depends(require_roles(UserRole.SALE, UserRole.MANAGER, UserRole.KOL_MANAGER)),
    db: Session = Depends(get_db),
):
    """Sinh hợp đồng từ một order có sẵn, đồng thời lưu metadata file vào order để truy vết."""
    order = _get_order_or_404(db, order_id)
    _authorize_generate_from_order(current_user, order)

    contract_payload = _build_contract_payload_from_order(order)

    try:
        buffer = generate_contract_docx(contract_payload)
    except ContractEngineError as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

    safe_kol_name = _sanitize_filename(contract_payload.kol_name)
    download_name = f"hop-dong-order-{order.id}-{safe_kol_name}.docx"
    content = buffer.getvalue()

    output_path = _persist_contract_file(
        db=db,
        order=order,
        generated_by=current_user,
        filename=download_name,
        content=content,
        payload=contract_payload,
    )

    return FileResponse(
        path=str(output_path),
        media_type=DOCX_MIME_TYPE,
        filename=download_name,
    )


@router.get(
    "/orders/{order_id}/file",
    summary="Tải lại hợp đồng đã sinh của Order",
)
def download_generated_contract(
    order_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Truy vết hợp đồng đã sinh từ order và tải lại file."""
    order = _get_order_or_404(db, order_id)
    _authorize_contract_download(current_user, order)

    if not order.contract_file_path:
        raise HTTPException(status_code=404, detail="Order chưa có hợp đồng đã sinh.")

    file_path = Path(order.contract_file_path)
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Không tìm thấy file hợp đồng trên hệ thống.")

    return FileResponse(
        path=str(file_path),
        media_type=order.contract_file_mime or DOCX_MIME_TYPE,
        filename=order.contract_file_name or file_path.name,
    )
