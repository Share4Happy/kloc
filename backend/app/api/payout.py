import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.database import get_db
from app.core.deps import get_current_user, require_roles
from app.core.enums import PayoutStatus, UserRole
from app.models.kol_payout import KolPayout
from app.models.order import Order
from app.models.user import User
from app.schemas.payout import PayoutCreate, PayoutResponse, PayoutStatusUpdate

router = APIRouter(prefix="/payouts", tags=["Payouts"])

_MANAGER_ROLES = (UserRole.MANAGER, UserRole.ADMIN)


def _to_response(payout: KolPayout) -> PayoutResponse:
    return PayoutResponse(
        id=payout.id,
        kol_id=payout.kol_id,
        order_id=payout.order_id,
        amount=payout.amount,
        status=payout.status,
        note=payout.note,
        paid_at=payout.paid_at,
        created_at=payout.created_at,
        updated_at=payout.updated_at,
        kol_name=payout.kol.full_name if payout.kol else None,
        order_campaign=payout.order.campaign_name if payout.order else None,
    )


@router.get(
    "/me",
    response_model=list[PayoutResponse],
    summary="KOL xem lich su thanh toan cua chinh minh",
)
def get_my_payouts(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    payouts = db.scalars(
        select(KolPayout)
        .options(selectinload(KolPayout.kol), selectinload(KolPayout.order))
        .where(KolPayout.kol_id == current_user.id)
        .order_by(KolPayout.created_at.desc())
    ).all()
    return [_to_response(p) for p in payouts]


@router.get(
    "",
    response_model=list[PayoutResponse],
    summary="Manager/Admin xem tat ca ban ghi thanh toan",
    dependencies=[Depends(require_roles(*_MANAGER_ROLES))],
)
def get_all_payouts(
    kol_id: uuid.UUID | None = Query(None, description="Loc theo KOL cu the"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    stmt = (
        select(KolPayout)
        .options(selectinload(KolPayout.kol), selectinload(KolPayout.order))
        .order_by(KolPayout.created_at.desc())
    )
    if kol_id is not None:
        stmt = stmt.where(KolPayout.kol_id == kol_id)
    payouts = db.scalars(stmt).all()
    return [_to_response(p) for p in payouts]


@router.post(
    "",
    response_model=PayoutResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Manager tao ban ghi thanh toan cho KOL",
    dependencies=[Depends(require_roles(*_MANAGER_ROLES))],
)
def create_payout(
    body: PayoutCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Validate KOL exists
    kol = db.get(User, body.kol_id)
    if kol is None or kol.role != UserRole.KOL:
        raise HTTPException(status_code=404, detail="KOL not found.")

    # Validate order link if provided
    if body.order_id is not None:
        order = db.get(Order, body.order_id)
        if order is None:
            raise HTTPException(status_code=404, detail="Order not found.")
        if order.kol_id != body.kol_id:
            raise HTTPException(
                status_code=400,
                detail="Order does not belong to the specified KOL.",
            )

    payout = KolPayout(
        kol_id=body.kol_id,
        order_id=body.order_id,
        amount=body.amount,
        status=PayoutStatus.PENDING,
        note=body.note,
    )
    db.add(payout)
    db.commit()
    db.refresh(payout)
    # reload relationships
    db.refresh(payout)
    payout = db.scalar(
        select(KolPayout)
        .options(selectinload(KolPayout.kol), selectinload(KolPayout.order))
        .where(KolPayout.id == payout.id)
    )
    return _to_response(payout)


@router.patch(
    "/{payout_id}",
    response_model=PayoutResponse,
    summary="Manager cap nhat trang thai thanh toan (pending → paid / cancelled)",
    dependencies=[Depends(require_roles(*_MANAGER_ROLES))],
)
def update_payout_status(
    payout_id: uuid.UUID,
    body: PayoutStatusUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    payout = db.scalar(
        select(KolPayout)
        .options(selectinload(KolPayout.kol), selectinload(KolPayout.order))
        .where(KolPayout.id == payout_id)
    )
    if payout is None:
        raise HTTPException(status_code=404, detail="Payout record not found.")

    if payout.status == PayoutStatus.PAID and body.status != PayoutStatus.PAID:
        raise HTTPException(
            status_code=400,
            detail="Cannot revert a payout that has already been marked as paid.",
        )

    payout.status = body.status
    if body.note is not None:
        payout.note = body.note
    if body.status == PayoutStatus.PAID and payout.paid_at is None:
        payout.paid_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(payout)
    payout = db.scalar(
        select(KolPayout)
        .options(selectinload(KolPayout.kol), selectinload(KolPayout.order))
        .where(KolPayout.id == payout_id)
    )
    return _to_response(payout)
