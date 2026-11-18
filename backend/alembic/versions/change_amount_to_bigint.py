"""change order amount columns to bigint

Revision ID: change_amount_to_bigint
Revises: add_kol_booking_price
Create Date: 2026-04-06

"""
from alembic import op
import sqlalchemy as sa


revision = 'change_amount_to_bigint'
down_revision = 'add_kol_booking_price'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column('orders', 'total_amount',
                    existing_type=sa.Integer(),
                    type_=sa.BigInteger(),
                    existing_nullable=False)
    op.alter_column('orders', 'deposit_amount',
                    existing_type=sa.Integer(),
                    type_=sa.BigInteger(),
                    existing_nullable=False)
    op.alter_column('orders', 'kol_received_amount',
                    existing_type=sa.Integer(),
                    type_=sa.BigInteger(),
                    existing_nullable=True)


def downgrade() -> None:
    op.alter_column('orders', 'kol_received_amount',
                    existing_type=sa.BigInteger(),
                    type_=sa.Integer(),
                    existing_nullable=True)
    op.alter_column('orders', 'deposit_amount',
                    existing_type=sa.BigInteger(),
                    type_=sa.Integer(),
                    existing_nullable=False)
    op.alter_column('orders', 'total_amount',
                    existing_type=sa.BigInteger(),
                    type_=sa.Integer(),
                    existing_nullable=False)
