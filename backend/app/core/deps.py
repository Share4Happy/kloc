from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.enums import UserRole
from app.core.security import decode_access_token
from app.models.user import User

# ---------------------------------------------------------------------------
# Bearer token extraction
# ---------------------------------------------------------------------------
_bearer_scheme = HTTPBearer()


# ---------------------------------------------------------------------------
# get_current_user — core auth dependency
# ---------------------------------------------------------------------------
async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    """Validate JWT and return the active User ORM object.

    Raises:
        401 — missing / invalid / expired token
        403 — account deactivated (soft-deleted)
    """
    token = credentials.credentials
    try:
        payload = decode_access_token(token)
        user_id: str | None = payload.get("sub")
        if user_id is None:
            raise JWTError("Missing sub claim")
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token không hợp lệ hoặc đã hết hạn.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Người dùng không tồn tại.",
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tài khoản đã bị vô hiệu hóa.",
        )
    return user


# ---------------------------------------------------------------------------
# require_roles — RBAC dependency factory
# ---------------------------------------------------------------------------
def require_roles(*allowed_roles: UserRole):
    """Return a FastAPI dependency that enforces role-based access.

    Admin always passes regardless of ``allowed_roles``.

    Usage::

        @router.get("/admin-only", dependencies=[Depends(require_roles(UserRole.ADMIN))])
        @router.get("/sales-area", dependencies=[Depends(require_roles(UserRole.SALE, UserRole.MANAGER))])
    """

    async def _check_role(
        current_user: User = Depends(get_current_user),
    ) -> User:
        # Admin has full access to everything
        if current_user.role == UserRole.ADMIN:
            return current_user

        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Bạn không có quyền truy cập tài nguyên này.",
            )
        return current_user

    return _check_role
