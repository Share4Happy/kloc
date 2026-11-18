"""add_order_contract_metadata

Revision ID: b8a4d6c1e902
Revises: a7c2e5f8b391
Create Date: 2026-03-14

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = "b8a4d6c1e902"
down_revision: Union[str, Sequence[str], None] = "a7c2e5f8b391"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("orders", sa.Column("contract_file_path", sa.String(length=1000), nullable=True))
    op.add_column("orders", sa.Column("contract_file_name", sa.String(length=255), nullable=True))
    op.add_column("orders", sa.Column("contract_file_mime", sa.String(length=100), nullable=True))
    op.add_column("orders", sa.Column("contract_generated_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column(
        "orders",
        sa.Column("contract_generated_by", sa.UUID(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
    )
    op.add_column(
        "orders",
        sa.Column("contract_payload", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    )
    op.create_index("ix_orders_contract_generated_by", "orders", ["contract_generated_by"])


def downgrade() -> None:
    op.drop_index("ix_orders_contract_generated_by", table_name="orders")
    op.drop_column("orders", "contract_payload")
    op.drop_column("orders", "contract_generated_by")
    op.drop_column("orders", "contract_generated_at")
    op.drop_column("orders", "contract_file_mime")
    op.drop_column("orders", "contract_file_name")
    op.drop_column("orders", "contract_file_path")
