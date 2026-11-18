"""add_order_combo_group_id

Revision ID: aa32c94d17bf
Revises: c6f1b2d9a401
Create Date: 2026-03-15

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = "aa32c94d17bf"
down_revision: Union[str, Sequence[str], None] = "c6f1b2d9a401"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "orders",
        sa.Column("combo_group_id", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.create_index(
        op.f("ix_orders_combo_group_id"),
        "orders",
        ["combo_group_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_orders_combo_group_id"), table_name="orders")
    op.drop_column("orders", "combo_group_id")
