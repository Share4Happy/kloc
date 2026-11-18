from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.core.enums import UserRole
from app.core.security import create_access_token, hash_password, verify_password
from app.models.user import User
from app.schemas.auth import (
    LoginRequest,
    RegisterRequest,
    TokenResponse,
    UserResponse,
)
from app.core.limiter import limiter

router = APIRouter(prefix="/auth", tags=["Authentication"])


# ---------------------------------------------------------------------------
# POST /auth/register — KOL self-registration
# ---------------------------------------------------------------------------
@router.post(
    "/register",
    response_model=TokenResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Đăng ký tài khoản KOL",
)
@limiter.limit("3/minute")
def register(request: Request, body: RegisterRequest, db: Session = Depends(get_db)):
    """Cho phép KOL/KOC tự tạo tài khoản.
    Role luôn được đặt là **KOL** — không cho phép đăng ký role khác.
    """
    # Check duplicate email
    existing = db.query(User).filter(User.email == body.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email đã được sử dụng.",
        )

    user = User(
        email=body.email,
        hashed_password=hash_password(body.password),
        full_name=body.full_name,
        phone=body.phone,
        role=UserRole.KOL,        # Always KOL on self-register
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token({"sub": str(user.id), "role": user.role.value})
    return TokenResponse(access_token=token)


# ---------------------------------------------------------------------------
# POST /auth/login
# ---------------------------------------------------------------------------
@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Đăng nhập",
)
@limiter.limit("5/minute")
def login(request: Request, body: LoginRequest, db: Session = Depends(get_db)):
    """Authenticate any user (Admin, Manager, Sale, KOL_Manager, KOL)."""
    user = db.query(User).filter(User.email == body.email).first()

    if user is None or not verify_password(body.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email hoặc mật khẩu không chính xác.",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tài khoản đã bị vô hiệu hóa.",
        )

    token = create_access_token({"sub": str(user.id), "role": user.role.value})
    return TokenResponse(access_token=token)


# ---------------------------------------------------------------------------
# GET /auth/me — current user profile
# ---------------------------------------------------------------------------
@router.get(
    "/me",
    response_model=UserResponse,
    summary="Thông tin tài khoản hiện tại",
)
def me(current_user: User = Depends(get_current_user)):
    """Return the currently authenticated user's profile."""
    return current_user
