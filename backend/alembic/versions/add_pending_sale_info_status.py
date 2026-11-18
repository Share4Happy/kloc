"""add pending_sale_info to order_status enum

Revision ID: add_pending_sale_info_status
Revises: add_notifications_updated_at
Create Date: 2026-04-11

"""
from alembic import op


revision = 'add_pending_sale_info_status'
down_revision = 'add_notifications_updated_at'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'pending_sale_info'")


def downgrade() -> None:
    # PostgreSQL doesn't support removing enum values directly
    # This would require recreating the enum type, which is complex
    pass
