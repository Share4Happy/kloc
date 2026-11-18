"""add_order_business_fields

Revision ID: b7f3a2d9e051
Revises: e41c67f2b213
Create Date: 2026-03-14

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "b7f3a2d9e051"
down_revision: Union[str, Sequence[str], None] = "e41c67f2b213"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("orders", sa.Column("customer_name", sa.String(length=255), nullable=True))
    op.add_column("orders", sa.Column("customer_representative", sa.String(length=255), nullable=True))
    op.add_column("orders", sa.Column("campaign_name", sa.String(length=255), nullable=True))
    op.add_column("orders", sa.Column("platform", sa.String(length=100), nullable=True))
    op.add_column("orders", sa.Column("kpi", sa.String(length=500), nullable=True))
    op.add_column("orders", sa.Column("booking_type", sa.String(length=50), nullable=True))
    op.add_column("orders", sa.Column("post_count", sa.Integer(), nullable=True))


def downgrade() -> None:
    op.drop_column("orders", "post_count")
    op.drop_column("orders", "booking_type")
    op.drop_column("orders", "kpi")
    op.drop_column("orders", "platform")
    op.drop_column("orders", "campaign_name")
    op.drop_column("orders", "customer_representative")
    op.drop_column("orders", "customer_name")
