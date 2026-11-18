import uuid
from datetime import datetime

from pydantic import BaseModel, Field

from app.core.enums import VerificationStatus


# ---------------------------------------------------------------------------
# KOL Onboarding — profile update by KOL
# ---------------------------------------------------------------------------

class KOLOnboardingRequest(BaseModel):
    """KOL updates their profile during onboarding."""

    followers: int | None = Field(None, ge=0)
    engagement_rate: float | None = Field(None, ge=0.0, le=100.0)
    social_links: dict | None = Field(
        None,
        json_schema_extra={
            "example": {
                "tiktok": "https://tiktok.com/@handle",
                "youtube": "https://youtube.com/@channel",
                "instagram": "https://instagram.com/handle",
            }
        },
    )
    bio: str | None = Field(None, max_length=1000)
    niche: list[str] | None = Field(None, description="Danh sách ngách (vd: ['beauty', 'gaming'])")
    min_price: int | None = Field(None, ge=0, description="Giá booking khởi điểm (VNĐ)")
    max_price: int | None = Field(None, ge=0, description="Giá booking tối đa (VNĐ)")
    kol_booking_price: int | None = Field(None, ge=0, description="Giá booking thực nhận cho mỗi đơn (VNĐ)")
    checklist_items: list[str] | None = Field(None, description="Danh sách checklist mà KOL đã xác nhận")
    submit_for_review: bool = Field(False, description="True nếu KOL muốn gửi hồ sơ sang trạng thái chờ duyệt")


class CheckLinksRequest(BaseModel):
    """Request payload to manually check specific social links without saving them first."""
    social_links: dict[str, str] | None = None
    followers: int | None = None


# ---------------------------------------------------------------------------
# Verification — manager review
# ---------------------------------------------------------------------------

class VerifyProfileRequest(BaseModel):
    """KOL_Manager approves or rejects a KOL profile."""

    status: VerificationStatus = Field(
        ...,
        description="Set to 'approved' or 'rejected'.",
    )
    notes: str | None = Field(None, max_length=2000)


# ---------------------------------------------------------------------------
# Visibility toggle
# ---------------------------------------------------------------------------

class ToggleVisibilityRequest(BaseModel):
    """Toggle is_public for a KOL profile."""

    is_public: bool


# ---------------------------------------------------------------------------
# Responses
# ---------------------------------------------------------------------------

from app.schemas.auth import UserResponse


class EvidenceAttachmentResponse(BaseModel):
    """Public metadata for a KOL evidence attachment."""

    attachment_id: str
    file_name: str
    mime_type: str
    size: int
    uploaded_at: datetime

class KOLProfileResponse(BaseModel):
    """Full KOL profile representation."""

    id: uuid.UUID
    user_id: uuid.UUID
    followers: int
    engagement_rate: float
    social_links: dict | None = None
    bio: str | None = None
    avatar_path: str | None = None
    niche: list[str] | None = None
    min_price: int | None = None
    max_price: int | None = None
    kol_booking_price: int | None = Field(None, description="Giá booking KOL nhận được cho mỗi đơn (sau thuế/phí)")
    checklist_items: list[str] | None = None
    checklist_confirmed_at: datetime | None = None
    evidence_attachments: list[EvidenceAttachmentResponse] | None = None
    is_public: bool
    verification_status: VerificationStatus
    verification_notes: str | None = None
    user: UserResponse

    model_config = {"from_attributes": True}


class SocialCheckResult(BaseModel):
    """Result of automatic social link verification."""

    platform: str
    url: str
    is_valid: bool
    message: str
    ownership_status: str = Field(
        default="unverified",
        description="verified | likely_owned | unverified | mismatch | not_applicable",
    )
    confidence_score: int = Field(default=0, ge=0, le=100)
    detected_handle: str | None = None
    follower_count: int | None = Field(default=None, ge=0)
    follower_source: str | None = None
    checked_at: datetime
