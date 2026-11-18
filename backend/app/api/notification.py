"""Notification API endpoints."""
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.notification import Notification
from app.models.user import User
from app.schemas.notification import (
    NotificationMarkRead,
    NotificationResponse,
    NotificationSummary,
)

router = APIRouter(prefix="/notifications", tags=["Notifications"])


# ---------------------------------------------------------------------------
# Helper: Create notification for one or multiple users
# ---------------------------------------------------------------------------

def create_notification(
    db: Session,
    user_id: uuid.UUID,
    title: str,
    message: str,
    type: str = "info",
    ref_type: str | None = None,
    ref_id: uuid.UUID | None = None,
    data_json: dict | None = None,
) -> Notification:
    """Utility function to create a notification. Import and call from other endpoints."""
    notif = Notification(
        user_id=user_id,
        title=title,
        message=message,
        type=type,
        ref_type=ref_type,
        ref_id=ref_id,
        data_json=data_json,
    )
    db.add(notif)
    db.flush()
    return notif


def broadcast_notification(
    db: Session,
    user_ids: list[uuid.UUID],
    title: str,
    message: str,
    type: str = "info",
    ref_type: str | None = None,
    ref_id: uuid.UUID | None = None,
    data_json: dict | None = None,
) -> list[Notification]:
    """Create notifications for multiple users at once."""
    notifs = []
    for uid in user_ids:
        notif = create_notification(
            db, uid, title, message, type, ref_type, ref_id, data_json
        )
        notifs.append(notif)
    return notifs


# ---------------------------------------------------------------------------
# API Endpoints
# ---------------------------------------------------------------------------

@router.get(
    "",
    response_model=list[NotificationResponse],
    summary="Lấy danh sách thông báo của user hiện tại",
)
def list_notifications(
    is_read: bool | None = None,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Lấy danh sách thông báo, mới nhất trước."""
    stmt = select(Notification).where(Notification.user_id == current_user.id)
    if is_read is not None:
        stmt = stmt.where(Notification.is_read == is_read)

    notifications = db.scalars(
        stmt.order_by(Notification.created_at.desc()).limit(limit)
    ).all()
    return list(notifications)


@router.get(
    "/summary",
    response_model=NotificationSummary,
    summary="Tóm tắt số lượng thông báo",
)
def get_notification_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Trả về tổng số thông báo, chưa đọc, và action_required."""
    total = db.query(Notification).filter(Notification.user_id == current_user.id).count()
    unread = db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.is_read == False,  # noqa: E712
    ).count()
    action_required = db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.is_read == False,  # noqa: E712
        Notification.type == "action_required",
    ).count()

    return NotificationSummary(total=total, unread=unread, action_required=action_required)


@router.patch(
    "/{notification_id}/read",
    response_model=NotificationResponse,
    summary="Đánh dấu thông báo đã đọc",
)
def mark_as_read(
    notification_id: uuid.UUID,
    body: NotificationMarkRead,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Đánh dấu một thông báo là đã đọc."""
    notif = db.get(Notification, notification_id)
    if not notif:
        raise HTTPException(status_code=404, detail="Thông báo không tồn tại.")
    if notif.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Bạn không có quyền sửa thông báo này.")

    notif.is_read = body.is_read
    db.commit()
    db.refresh(notif)
    return notif


@router.post(
    "/read-all",
    summary="Đánh dấu tất cả thông báo đã đọc",
)
def mark_all_as_read(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Đánh dấu TẤT CẢ thông báo của user là đã đọc."""
    db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.is_read == False,  # noqa: E712
    ).update({"is_read": True}, synchronize_session="fetch")
    db.commit()
    return {"message": "Đã đánh dấu tất cả thông báo là đã đọc."}


@router.patch(
    "/{notification_id}/viewed",
    summary="Đánh dấu thông báo đã hiện toast",
)
def mark_as_viewed(
    notification_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Đánh dấu thông báo đã được hiện toast (không hiện lại)."""
    notif = db.get(Notification, notification_id)
    if not notif:
        raise HTTPException(status_code=404, detail="Thông báo không tồn tại.")
    if notif.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Bạn không có quyền sửa thông báo này.")

    notif.viewed = True
    db.commit()
    return {"message": "Đã đánh dấu thông báo đã hiện toast."}
