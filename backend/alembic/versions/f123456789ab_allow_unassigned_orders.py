"""allow_unassigned_orders

Revision ID: f123456789ab
Revises: 8b5c2d1e3f07
Create Date: 2026-03-22
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "f123456789ab"
down_revision: Union[str, Sequence[str], None] = "8b5c2d1e3f07"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add new order_status enum values
    op.execute("ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'new_request'")
    op.execute("ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'pending_approval'")

    # Alter columns
    op.alter_column("orders", "sale_id", existing_type=sa.UUID(), nullable=True)
    op.alter_column("orders", "kol_id", existing_type=sa.UUID(), nullable=True)

    # Add columns
    op.add_column("orders", sa.Column("customer_phone", sa.String(length=50), nullable=True))
    op.add_column("orders", sa.Column("customer_email", sa.String(length=255), nullable=True))


def downgrade() -> None:
    op.drop_column("orders", "customer_email")
    op.drop_column("orders", "customer_phone")
    op.alter_column("orders", "kol_id", existing_type=sa.UUID(), nullable=False)
    op.alter_column("orders", "sale_id", existing_type=sa.UUID(), nullable=False)
