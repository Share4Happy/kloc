from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from fastapi import APIRouter, Depends

from app.core.database import get_db
from app.core.deps import get_current_user
from app.core.enums import OrderStatus, PayoutStatus, UserRole, VerificationStatus
from app.models.kol_profile import KOLProfile
from app.models.kol_payout import KolPayout
from app.models.lead import Lead
from app.models.order import Order
from app.models.user import User
from app.schemas.dashboard import DashboardOrderSummary, DashboardSummaryResponse

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


def _build_orders_stmt(current_user: User):
    stmt = select(Order).options(selectinload(Order.sale), selectinload(Order.kol))

    if current_user.role == UserRole.KOL:
        stmt = stmt.where(Order.kol_id == current_user.id)
    elif current_user.role == UserRole.SALE:
        stmt = stmt.where(Order.sale_id == current_user.id)

    return stmt.order_by(Order.created_at.desc())


@router.get(
    "/summary",
    response_model=DashboardSummaryResponse,
    summary="Tong hop metric dashboard theo role",
)
def get_dashboard_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    orders = db.scalars(_build_orders_stmt(current_user)).all()

    summary = DashboardSummaryResponse(
        role=current_user.role,
        total_orders=len(orders),
        pending_review_orders=sum(1 for order in orders if order.status == OrderStatus.PENDING_REVIEW),
        running_orders=sum(1 for order in orders if order.status == OrderStatus.RUNNING),
        completed_orders=sum(1 for order in orders if order.status == OrderStatus.COMPLETED),
        total_revenue=sum(order.total_amount for order in orders if order.status not in {OrderStatus.CANCELLED, OrderStatus.REFUNDED}),
        total_deposit=sum(order.deposit_amount for order in orders if order.status not in {OrderStatus.CANCELLED, OrderStatus.REFUNDED}),
        recent_orders=[
            DashboardOrderSummary(
                id=str(order.id),
                status=order.status,
                total_amount=order.total_amount,
                deposit_amount=order.deposit_amount,
                created_at=order.created_at,
                sale_id=str(order.sale_id),
                sale_name=order.sale.full_name if order.sale else None,
                kol_id=str(order.kol_id),
                kol_name=order.kol.full_name if order.kol else None,
            )
            for order in orders[:5]
        ],
    )

    if current_user.role in {UserRole.ADMIN, UserRole.MANAGER, UserRole.KOL_MANAGER}:
        summary.active_kols = db.scalar(
            select(func.count())
            .select_from(KOLProfile)
            .join(User, User.id == KOLProfile.user_id)
            .where(
                KOLProfile.verification_status == VerificationStatus.APPROVED,
                User.role == UserRole.KOL,
                User.is_active.is_(True),
            )
        ) or 0
        summary.pending_kol_profiles = len(
            db.scalars(select(KOLProfile).where(KOLProfile.verification_status == VerificationStatus.PENDING)).all()
        )

    if current_user.role in {UserRole.ADMIN, UserRole.MANAGER}:
        summary.active_sales = len(
            db.scalars(select(User).where(User.role == UserRole.SALE, User.is_active == True)).all()
        )

    if current_user.role in {UserRole.ADMIN, UserRole.MANAGER, UserRole.SALE}:
        summary.total_leads = len(db.scalars(select(Lead)).all())

    if current_user.role == UserRole.KOL:
        profile = db.scalar(select(KOLProfile).where(KOLProfile.user_id == current_user.id))
        summary.current_profile_status = profile.verification_status if profile else None

        payouts = db.scalars(
            select(KolPayout).where(KolPayout.kol_id == current_user.id)
        ).all()
        summary.total_paid_payout = sum(p.amount for p in payouts if p.status == PayoutStatus.PAID)
        summary.total_pending_payout = sum(p.amount for p in payouts if p.status == PayoutStatus.PENDING)

    return summary
