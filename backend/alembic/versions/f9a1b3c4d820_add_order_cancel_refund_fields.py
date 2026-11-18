"""add_order_cancel_refund_fields

Revision ID: f9a1b3c4d820
Revises: d3c8e5f1a472
Create Date: 2026-03-14

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "f9a1b3c4d820"
down_revision: Union[str, Sequence[str], None] = "d3c8e5f1a472"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add new values to the order_status enum
    op.execute("ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'cancel_requested'")
    op.execute("ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'cancelled'")
    op.execute("ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'refund_requested'")
    op.execute("ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'refunded'")

    # Add audit-trail columns
    op.add_column("orders", sa.Column("cancel_reason", sa.String(length=1000), nullable=True))
    op.add_column("orders", sa.Column("cancel_note", sa.String(length=1000), nullable=True))


def downgrade() -> None:
    # Note: PostgreSQL does not support removing enum values.
    # Only drop the audit columns.
    op.drop_column("orders", "cancel_note")
    op.drop_column("orders", "cancel_reason")
