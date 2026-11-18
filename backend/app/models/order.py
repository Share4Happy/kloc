import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, String, BigInteger
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.enums import OrderStatus
from app.models.base import Base


class Order(Base):
    """Booking Order establishing a task/contract between a Sale and a KOL."""

    __tablename__ = "orders"

    sale_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=True,
        index=True,
    )
    kol_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=True,
        index=True,
    )
    campaign_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("campaigns.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    combo_group_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        nullable=True,
        index=True,
    )
    status: Mapped[OrderStatus] = mapped_column(
        Enum(OrderStatus, name="order_status", create_constraint=True),
        default=OrderStatus.INIT,
        nullable=False,
    )
    total_amount: Mapped[int] = mapped_column(BigInteger, nullable=False)
    deposit_amount: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)

    # KOL received amount (after tax/fees deduction - what KOL actually gets paid)
    kol_received_amount: Mapped[int | None] = mapped_column(BigInteger, nullable=True)

    # Business / campaign info
    customer_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    customer_phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    customer_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    customer_representative: Mapped[str | None] = mapped_column(String(255), nullable=True)
    campaign_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    platform: Mapped[str | None] = mapped_column(String(100), nullable=True)
    kpi: Mapped[str | None] = mapped_column(String(500), nullable=True)
    booking_type: Mapped[str | None] = mapped_column(String(50), nullable=True)  # 'custom' | 'combo'
    post_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    package_definition: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True)

    # KOL assignment request notes (Sale ghi chú yêu cầu KOL cho KOL Manager phân bổ)
    kol_request_notes: Mapped[str | None] = mapped_column(String(2000), nullable=True)

    # Update history (JSONB array of snapshots: [{field, old_value, new_value, updated_by, updated_at}])
    update_history: Mapped[list[dict[str, Any]] | None] = mapped_column(JSONB, nullable=True, default=list)

    # Cancel / refund audit trail
    cancel_reason: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    cancel_note: Mapped[str | None] = mapped_column(String(1000), nullable=True)

    # Proof of work (submitted by KOL)
    proof_link: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    proof_notes: Mapped[str | None] = mapped_column(String(2000), nullable=True)
    proof_file_path: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    proof_file_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    proof_file_mime: Mapped[str | None] = mapped_column(String(100), nullable=True)
    proof_file_size: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # Contract metadata (generated from Order)
    contract_file_path: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    contract_file_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    contract_file_mime: Mapped[str | None] = mapped_column(String(100), nullable=True)
    contract_generated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    contract_generated_by: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    contract_payload: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True)

    # Note: If `user.py` needs a backref we can add it there, 
    # but for simple APIs we can just define relationships here for convenience.
    sale: Mapped["User"] = relationship("User", foreign_keys=[sale_id])
    kol: Mapped["User"] = relationship("User", foreign_keys=[kol_id])
    campaign: Mapped["Campaign | None"] = relationship("Campaign", back_populates="orders")
    contract_generator: Mapped["User | None"] = relationship("User", foreign_keys=[contract_generated_by])

    def __repr__(self) -> str:
        return f"<Order {self.id} status={self.status.value}>"

from app.models.user import User  # noqa: E402, F401
