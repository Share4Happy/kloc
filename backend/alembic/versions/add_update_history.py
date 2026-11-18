"""add update_history to orders

Revision ID: add_update_history
Revises: add_kol_request_notes
Create Date: 2026-04-06

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB


revision = 'add_update_history'
down_revision = 'add_kol_request_notes'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('orders', sa.Column('update_history', JSONB, nullable=True, server_default='[]'))


def downgrade() -> None:
    op.drop_column('orders', 'update_history')
