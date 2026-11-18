"""add viewed column to notifications

Revision ID: add_notification_viewed
Revises: fix_pending_sale_info_case
Create Date: 2026-04-11

"""
from alembic import op
import sqlalchemy as sa


revision = 'add_notification_viewed'
down_revision = 'fix_pending_sale_info_case'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        'notifications',
        sa.Column('viewed', sa.Boolean(), nullable=False, server_default='true'),
    )
    op.create_index('ix_notifications_viewed', 'notifications', ['viewed'])


def downgrade() -> None:
    op.drop_index('ix_notifications_viewed', 'notifications')
    op.drop_column('notifications', 'viewed')
