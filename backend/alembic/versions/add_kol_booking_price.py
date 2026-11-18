"""add kol_booking_price to kol_profiles

Revision ID: add_kol_booking_price
Revises: add_kol_received_amount
Create Date: 2026-04-06

"""
from alembic import op
import sqlalchemy as sa


revision = 'add_kol_booking_price'
down_revision = 'add_kol_received_amount'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('kol_profiles', sa.Column('kol_booking_price', sa.Integer(), nullable=True))


def downgrade() -> None:
    op.drop_column('kol_profiles', 'kol_booking_price')
