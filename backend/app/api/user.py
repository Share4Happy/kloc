"""User management API endpoints."""
import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import require_roles
from app.core.enums import UserRole
from app.models.user import User
from pydantic import BaseModel

router = APIRouter(prefix="/users", tags=["User Management"])


class UserSaleResponse(BaseModel):
    id: uuid.UUID
    email: str
    full_name: str
    is_active: bool

    model_config = {"from_attributes": True}


@router.get(
    "/sales",
    response_model=list[UserSaleResponse],
    summary="Lấy danh sách tất cả Sale",
)
def list_sales(
    current_user: User = Depends(require_roles(UserRole.MANAGER, UserRole.ADMIN)),
    db: Session = Depends(get_db),
):
    """(Manager/Admin) Lấy danh sách tất cả user có role=SALE đang active."""
    stmt = select(User).where(User.role == UserRole.SALE, User.is_active == True).order_by(User.full_name)
    users = db.scalars(stmt).all()
    return list(users)
