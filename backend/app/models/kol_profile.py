import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum, Float, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.enums import VerificationStatus
from app.models.base import Base


class KOLProfile(Base):
    """Extended profile for users with the KOL role (one-to-one with User)."""

    __tablename__ = "kol_profiles"

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
        index=True,
    )
    followers: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    engagement_rate: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    social_links: Mapped[dict | None] = mapped_column(JSONB, nullable=True, default=dict)
    bio: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    avatar_path: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    is_public: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # For Smart Filter
    min_price: Mapped[int | None] = mapped_column(Integer, nullable=True)
    max_price: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # KOL booking price (what KOL actually gets paid per booking - auto-applied to orders)
    kol_booking_price: Mapped[int | None] = mapped_column(Integer, nullable=True)
    niche: Mapped[list[str] | None] = mapped_column(JSONB, nullable=True)
    checklist_items: Mapped[list[str] | None] = mapped_column(JSONB, nullable=True)
    checklist_confirmed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    evidence_attachments: Mapped[list[dict] | None] = mapped_column(JSONB, nullable=True, default=list)

    # Verification workflow
    verification_status: Mapped[VerificationStatus] = mapped_column(
        Enum(VerificationStatus, name="verification_status", create_constraint=True),
        nullable=False,
        default=VerificationStatus.PENDING,
    )
    verification_notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="kol_profile")

    def __repr__(self) -> str:
        return f"<KOLProfile user_id={self.user_id} status={self.verification_status.value}>"


from app.models.user import User  # noqa: E402, F401
