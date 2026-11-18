import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.enums import PayoutStatus
from app.models.base import Base


class KolPayout(Base):
    """Records an individual payment made (or owed) to a KOL.

    Created by Manager/Admin; status progresses pending → paid.
    """

    __tablename__ = "kol_payouts"

    kol_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    # Optional link to a specific order this payment belongs to
    order_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("orders.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    amount: Mapped[int] = mapped_column(Integer, nullable=False)  # amount in VND
    status: Mapped[PayoutStatus] = mapped_column(
        Enum(PayoutStatus, name="payout_status", create_constraint=True),
        default=PayoutStatus.PENDING,
        nullable=False,
    )
    note: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    paid_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    kol: Mapped["User"] = relationship("User", foreign_keys=[kol_id])  # noqa: F821
    order: Mapped["Order | None"] = relationship("Order", foreign_keys=[order_id])  # noqa: F821
