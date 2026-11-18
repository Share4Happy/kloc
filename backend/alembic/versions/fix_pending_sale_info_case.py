"""fix pending_sale_info enum case to match other values

Revision ID: fix_pending_sale_info_case
Revises: add_pending_sale_info_status
Create Date: 2026-04-11

"""
from alembic import op


revision = 'fix_pending_sale_info_case'
down_revision = 'add_pending_sale_info_status'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        ALTER TYPE order_status RENAME VALUE 'pending_sale_info' TO 'PENDING_SALE_INFO';
        """
    )


def downgrade() -> None:
    op.execute(
        """
        ALTER TYPE order_status RENAME VALUE 'PENDING_SALE_INFO' TO 'pending_sale_info';
        """
    )
