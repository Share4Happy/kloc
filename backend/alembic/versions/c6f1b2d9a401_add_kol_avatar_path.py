"""add_kol_avatar_path

Revision ID: c6f1b2d9a401
Revises: b8a4d6c1e902
Create Date: 2026-03-14

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


# revision identifiers, used by Alembic.
revision: str = "c6f1b2d9a401"
down_revision: Union[str, Sequence[str], None] = "b8a4d6c1e902"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("kol_profiles", sa.Column("avatar_path", sa.String(length=1000), nullable=True))


def downgrade() -> None:
    op.drop_column("kol_profiles", "avatar_path")
