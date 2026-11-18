"""Notification model for in-app notifications."""
import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, String, Text, Integer
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.enums import UserRole
from app.models.base import Base


class Notification(Base):
    """In-app notification for a specific user."""

    __tablename__ = "notifications"

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="info",
        comment="info, success, warning, action_required"
    )
    # Reference to the related entity
    ref_type: Mapped[str | None] = mapped_column(
        String(50), nullable=True,
        comment="order, kol_profile, payout, lead, etc."
    )
    ref_id: Mapped[uuid.UUID | None] = mapped_column(nullable=True)
    # Extra metadata (stored as 'metadata' in DB to avoid Python reserved word)
    data_json: Mapped[dict | None] = mapped_column("metadata", JSONB, nullable=True, default=dict)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, index=True)
    viewed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, index=True, comment="Toast đã hiện cho user")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default="now()",
    )

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="notifications")

    def __repr__(self) -> str:
        return f"<Notification user_id={self.user_id} type={self.type} is_read={self.is_read}>"


from app.models.user import User  # noqa: E402, F401
