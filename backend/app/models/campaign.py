import uuid

from sqlalchemy import Enum, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.enums import CampaignStatus
from app.models.base import Base


class Campaign(Base):
    """Parent entity representing a campaign/combo containing multiple orders."""

    __tablename__ = "campaigns"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[CampaignStatus] = mapped_column(
        Enum(CampaignStatus, name="campaign_status", create_constraint=True),
        default=CampaignStatus.PLANNING,
        nullable=False,
    )
    budget: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    owner_sale_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    combo_group_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        nullable=False,
        unique=True,
        index=True,
    )

    owner_sale: Mapped["User"] = relationship("User", foreign_keys=[owner_sale_id])
    orders: Mapped[list["Order"]] = relationship("Order", back_populates="campaign")
