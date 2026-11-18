import csv
import io
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.database import get_db
from app.core.deps import get_current_user, require_roles
from app.core.enums import CampaignStatus, OrderStatus, UserRole
from app.models.campaign import Campaign
from app.models.order import Order
from app.models.user import User
from app.schemas.campaign import (
    CampaignCreateFailure,
    CampaignCreateRequest,
    CampaignCreateResponse,
    CampaignDetailResponse,
    CampaignSummaryResponse,
)
from app.schemas.order import OrderResponse

router = APIRouter(prefix="/campaigns", tags=["Campaign Management"])


def _ensure_campaign_access(campaign: Campaign, current_user: User) -> None:
    if current_user.role == UserRole.SALE and campaign.owner_sale_id != current_user.id:
        raise HTTPException(status_code=403, detail="Bạn không có quyền truy cập campaign này.")


def _build_campaign_summary(campaign: Campaign) -> CampaignSummaryResponse:
    orders = campaign.orders or []
    return CampaignSummaryResponse(
        id=campaign.id,
        name=campaign.name,
        status=campaign.status,
        budget=campaign.budget,
        owner_sale_id=campaign.owner_sale_id,
        combo_group_id=campaign.combo_group_id,
        owner_sale=campaign.owner_sale,
        total_orders=len(orders),
        total_revenue=sum(order.total_amount for order in orders),
        total_deposit=sum(order.deposit_amount for order in orders),
        created_at=campaign.created_at,
        updated_at=campaign.updated_at,
    )


def _build_campaign_detail(campaign: Campaign) -> CampaignDetailResponse:
    summary = _build_campaign_summary(campaign)
    ordered_orders = sorted(campaign.orders or [], key=lambda order: order.created_at, reverse=True)
    return CampaignDetailResponse(
        **summary.model_dump(),
        orders=[OrderResponse.model_validate(order) for order in ordered_orders],
    )


@router.post(
    "",
    response_model=CampaignCreateResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Tạo campaign/combo và gán nhiều KOL",
)
def create_campaign(
    body: CampaignCreateRequest,
    current_user: User = Depends(require_roles(UserRole.SALE, UserRole.MANAGER)),
    db: Session = Depends(get_db),
):
    owner_sale_id = body.owner_sale_id

    if current_user.role == UserRole.SALE:
        if owner_sale_id and owner_sale_id != current_user.id:
            raise HTTPException(status_code=403, detail="Sale chỉ được tạo campaign của chính mình.")
        owner_sale_id = current_user.id
    elif owner_sale_id is None:
        owner_sale_id = current_user.id

    owner_user = db.get(User, owner_sale_id)
    if owner_user is None:
        raise HTTPException(status_code=404, detail="Không tìm thấy owner_sale_id.")
    if owner_user.role not in {UserRole.SALE, UserRole.MANAGER, UserRole.ADMIN}:
        raise HTTPException(status_code=400, detail="owner_sale_id phải là tài khoản nội bộ hợp lệ.")
    if not owner_user.is_active:
        raise HTTPException(status_code=400, detail="Tài khoản Sale phụ trách đang bị vô hiệu hóa.")

    unique_kol_ids = list(dict.fromkeys(body.kol_ids))
    kol_users = db.scalars(
        select(User).where(User.id.in_(unique_kol_ids), User.role == UserRole.KOL)
    ).all()
    kol_by_id = {kol.id: kol for kol in kol_users}

    failures: list[CampaignCreateFailure] = []
    valid_kols: list[User] = []

    for kol_id in unique_kol_ids:
        kol = kol_by_id.get(kol_id)
        if kol is None:
            failures.append(CampaignCreateFailure(kol_id=kol_id, message="KOL không tồn tại."))
            continue
        if not kol.is_active:
            failures.append(
                CampaignCreateFailure(kol_id=kol_id, message="KOL đã bị vô hiệu hóa, không thể gán job mới.")
            )
            continue
        valid_kols.append(kol)

    if body.atomic and failures:
        raise HTTPException(
            status_code=400,
            detail={
                "message": "Không thể tạo campaign do có KOL không hợp lệ.",
                "failures": [failure.model_dump(mode="json") for failure in failures],
            },
        )

    if not valid_kols:
        raise HTTPException(status_code=400, detail="Không có KOL hợp lệ để tạo campaign.")

    combo_group_id = uuid.uuid4()

    campaign = Campaign(
        name=body.name,
        status=body.status,
        budget=body.budget,
        owner_sale_id=owner_sale_id,
        combo_group_id=combo_group_id,
    )
    db.add(campaign)
    db.flush()

    created_orders: list[Order] = []
    for kol in valid_kols:
        order = Order(
            sale_id=owner_sale_id,
            kol_id=kol.id,
            campaign_id=campaign.id,
            combo_group_id=combo_group_id,
            status=OrderStatus.INIT,
            total_amount=body.total_amount,
            deposit_amount=body.deposit_amount,
            customer_name=body.customer_name,
            customer_representative=body.customer_representative,
            campaign_name=body.campaign_name or body.name,
            platform=body.platform,
            kpi=body.kpi,
            booking_type=body.booking_type,
            post_count=body.post_count,
            package_definition=body.package_definition,
        )
        db.add(order)
        created_orders.append(order)

    db.commit()

    campaign = db.scalar(
        select(Campaign)
        .options(
            selectinload(Campaign.owner_sale),
            selectinload(Campaign.orders).selectinload(Order.sale),
            selectinload(Campaign.orders).selectinload(Order.kol),
        )
        .where(Campaign.id == campaign.id)
    )

    if campaign is None:
        raise HTTPException(status_code=500, detail="Không thể nạp lại campaign sau khi tạo.")

    return CampaignCreateResponse(
        campaign=_build_campaign_detail(campaign),
        created_orders=[OrderResponse.model_validate(order) for order in created_orders],
        failures=failures,
    )


@router.get(
    "",
    response_model=list[CampaignSummaryResponse],
    summary="Danh sách campaign/combo",
)
def list_campaigns(
    status_filter: CampaignStatus | None = None,
    owner_sale_id: uuid.UUID | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role not in {UserRole.SALE, UserRole.MANAGER, UserRole.ADMIN}:
        raise HTTPException(status_code=403, detail="Bạn không có quyền truy cập danh sách campaign.")

    stmt = (
        select(Campaign)
        .options(selectinload(Campaign.owner_sale), selectinload(Campaign.orders))
        .order_by(Campaign.created_at.desc())
    )

    if current_user.role == UserRole.SALE:
        stmt = stmt.where(Campaign.owner_sale_id == current_user.id)
    elif owner_sale_id is not None:
        stmt = stmt.where(Campaign.owner_sale_id == owner_sale_id)

    if status_filter is not None:
        stmt = stmt.where(Campaign.status == status_filter)

    campaigns = db.scalars(stmt).all()
    return [_build_campaign_summary(campaign) for campaign in campaigns]


@router.get(
    "/{campaign_id}",
    response_model=CampaignDetailResponse,
    summary="Chi tiết campaign/combo",
)
def get_campaign_detail(
    campaign_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role not in {UserRole.SALE, UserRole.MANAGER, UserRole.ADMIN}:
        raise HTTPException(status_code=403, detail="Bạn không có quyền truy cập campaign.")

    campaign = db.scalar(
        select(Campaign)
        .options(
            selectinload(Campaign.owner_sale),
            selectinload(Campaign.orders).selectinload(Order.sale),
            selectinload(Campaign.orders).selectinload(Order.kol),
        )
        .where(Campaign.id == campaign_id)
    )

    if campaign is None:
        raise HTTPException(status_code=404, detail="Campaign không tồn tại.")

    _ensure_campaign_access(campaign, current_user)
    return _build_campaign_detail(campaign)


@router.get(
    "/{campaign_id}/export.csv",
    summary="Xuất CSV theo campaign",
)
def export_campaign_csv(
    campaign_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role not in {UserRole.SALE, UserRole.MANAGER, UserRole.ADMIN}:
        raise HTTPException(status_code=403, detail="Bạn không có quyền xuất CSV campaign.")

    campaign = db.scalar(
        select(Campaign)
        .options(selectinload(Campaign.orders).selectinload(Order.kol), selectinload(Campaign.orders).selectinload(Order.sale))
        .where(Campaign.id == campaign_id)
    )
    if campaign is None:
        raise HTTPException(status_code=404, detail="Campaign không tồn tại.")

    _ensure_campaign_access(campaign, current_user)

    output = io.StringIO()
    writer = csv.writer(output)

    writer.writerow([
        "campaign_id",
        "campaign_name",
        "order_id",
        "status",
        "sale_name",
        "kol_name",
        "total_amount",
        "deposit_amount",
        "created_at",
    ])

    for order in sorted(campaign.orders, key=lambda item: item.created_at):
        writer.writerow([
            str(campaign.id),
            campaign.name,
            str(order.id),
            order.status.value,
            order.sale.full_name if order.sale else "",
            order.kol.full_name if order.kol else "",
            order.total_amount,
            order.deposit_amount,
            order.created_at.isoformat(),
        ])

    filename = f"campaign-{campaign.id}.csv"
    output.seek(0)

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )
