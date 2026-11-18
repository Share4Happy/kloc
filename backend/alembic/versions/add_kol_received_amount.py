"""add kol_received_amount to orders

Revision ID: add_kol_received_amount
Revises: add_update_history
Create Date: 2026-04-06

"""
from alembic import op
import sqlalchemy as sa


revision = 'add_kol_received_amount'
down_revision = 'add_update_history'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('orders', sa.Column('kol_received_amount', sa.Integer(), nullable=True))


def downgrade() -> None:
    op.drop_column('orders', 'kol_received_amount')
