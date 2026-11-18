"""mark existing notifications as viewed

Revision ID: mark_notifications_viewed
Revises: add_notification_viewed
Create Date: 2026-04-12

"""
from alembic import op


revision = 'mark_notifications_viewed'
down_revision = 'add_notification_viewed'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Mark all existing notifications as viewed so they don't trigger toasts
    op.execute("UPDATE notifications SET viewed = true WHERE viewed = false")


def downgrade() -> None:
    op.execute("UPDATE notifications SET viewed = false")
