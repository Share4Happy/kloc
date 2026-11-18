"""add_kol_checklist_and_evidence

Revision ID: e41c67f2b213
Revises: c8d9106a1eab
Create Date: 2026-03-14

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = "e41c67f2b213"
down_revision: Union[str, Sequence[str], None] = "c8d9106a1eab"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("kol_profiles", sa.Column("checklist_items", postgresql.JSONB(astext_type=sa.Text()), nullable=True))
    op.add_column("kol_profiles", sa.Column("checklist_confirmed_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("kol_profiles", sa.Column("evidence_attachments", postgresql.JSONB(astext_type=sa.Text()), nullable=True))


def downgrade() -> None:
    op.drop_column("kol_profiles", "evidence_attachments")
    op.drop_column("kol_profiles", "checklist_confirmed_at")
    op.drop_column("kol_profiles", "checklist_items")
