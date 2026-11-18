import uuid

from pydantic import BaseModel, EmailStr, Field

from app.core.enums import UserRole


# ---------------------------------------------------------------------------
# Auth requests
# ---------------------------------------------------------------------------

class RegisterRequest(BaseModel):
    """KOL self-registration payload."""

    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)
    full_name: str = Field(..., min_length=1, max_length=255)
    phone: str | None = Field(None, max_length=20)


class LoginRequest(BaseModel):
    """Login payload."""

    email: EmailStr
    password: str


# ---------------------------------------------------------------------------
# Auth responses
# ---------------------------------------------------------------------------

class TokenResponse(BaseModel):
    """JWT token response."""

    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    """Public user representation."""

    id: uuid.UUID
    email: str
    full_name: str
    phone: str | None = None
    role: UserRole
    is_active: bool

    model_config = {"from_attributes": True}
