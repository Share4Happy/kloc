"""add_kol_payouts_table

Revision ID: a7c2e5f8b391
Revises: f9a1b3c4d820
Create Date: 2026-03-14

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql as pg


# revision identifiers, used by Alembic.
revision: str = "a7c2e5f8b391"
down_revision: Union[str, Sequence[str], None] = "f9a1b3c4d820"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE payout_status AS ENUM ('pending', 'paid', 'cancelled');
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$
    """)

    op.create_table(
        "kol_payouts",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("kol_id", sa.UUID(), nullable=False),
        sa.Column("order_id", sa.UUID(), nullable=True),
        sa.Column("amount", sa.Integer(), nullable=False),
        sa.Column(
            "status",
            pg.ENUM("pending", "paid", "cancelled", name="payout_status", create_type=False),
            nullable=False,
            server_default="pending",
        ),
        sa.Column("note", sa.String(length=1000), nullable=True),
        sa.Column("paid_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["kol_id"], ["users.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["order_id"], ["orders.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_kol_payouts_kol_id", "kol_payouts", ["kol_id"])
    op.create_index("ix_kol_payouts_order_id", "kol_payouts", ["order_id"])


def downgrade() -> None:
    op.drop_index("ix_kol_payouts_order_id", "kol_payouts")
    op.drop_index("ix_kol_payouts_kol_id", "kol_payouts")
    op.drop_table("kol_payouts")
    op.execute("DROP TYPE payout_status")
