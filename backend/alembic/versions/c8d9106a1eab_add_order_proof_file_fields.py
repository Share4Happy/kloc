"""add_order_proof_file_fields

Revision ID: c8d9106a1eab
Revises: a1e2f4b7c902
Create Date: 2026-03-14

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "c8d9106a1eab"
down_revision: Union[str, Sequence[str], None] = "a1e2f4b7c902"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("orders", sa.Column("proof_file_path", sa.String(length=1000), nullable=True))
    op.add_column("orders", sa.Column("proof_file_name", sa.String(length=255), nullable=True))
    op.add_column("orders", sa.Column("proof_file_mime", sa.String(length=100), nullable=True))
    op.add_column("orders", sa.Column("proof_file_size", sa.Integer(), nullable=True))


def downgrade() -> None:
    op.drop_column("orders", "proof_file_size")
    op.drop_column("orders", "proof_file_mime")
    op.drop_column("orders", "proof_file_name")
    op.drop_column("orders", "proof_file_path")
