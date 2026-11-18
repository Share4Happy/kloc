"""add updated_at to notifications

Revision ID: add_notifications_updated_at
Revises: add_notifications
Create Date: 2026-04-11

"""
from alembic import op
import sqlalchemy as sa


revision = 'add_notifications_updated_at'
down_revision = 'add_notifications'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('notifications', sa.Column('updated_at', sa.DateTime(timezone=True), 
                                              nullable=False, server_default=sa.text('now()')))


def downgrade() -> None:
    op.drop_column('notifications', 'updated_at')
