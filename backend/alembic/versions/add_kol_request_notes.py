"""add kol_request_notes to orders

Revision ID: add_kol_request_notes
Revises: auto
Create Date: 2026-04-06

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_kol_request_notes'
down_revision = 'f123456789ac'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('orders', sa.Column('kol_request_notes', sa.String(2000), nullable=True))


def downgrade() -> None:
    op.drop_column('orders', 'kol_request_notes')
