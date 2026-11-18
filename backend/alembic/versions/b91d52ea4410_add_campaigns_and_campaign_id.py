"""add_campaigns_and_campaign_id

Revision ID: b91d52ea4410
Revises: aa32c94d17bf
Create Date: 2026-03-15

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = "b91d52ea4410"
down_revision: Union[str, Sequence[str], None] = "aa32c94d17bf"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


campaign_status_enum = postgresql.ENUM(
    "planning",
    "running",
    "completed",
    "cancelled",
    name="campaign_status",
)

campaign_status_enum_for_column = postgresql.ENUM(
    "planning",
    "running",
    "completed",
    "cancelled",
    name="campaign_status",
    create_type=False,
)


def upgrade() -> None:
    campaign_status_enum.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "campaigns",
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("status", campaign_status_enum_for_column, nullable=False, server_default="planning"),
        sa.Column("budget", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("owner_sale_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("combo_group_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["owner_sale_id"], ["users.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("combo_group_id"),
    )
    op.create_index(op.f("ix_campaigns_owner_sale_id"), "campaigns", ["owner_sale_id"], unique=False)
    op.create_index(op.f("ix_campaigns_combo_group_id"), "campaigns", ["combo_group_id"], unique=True)

    op.add_column("orders", sa.Column("campaign_id", postgresql.UUID(as_uuid=True), nullable=True))
    op.create_index(op.f("ix_orders_campaign_id"), "orders", ["campaign_id"], unique=False)
    op.create_foreign_key(
        "fk_orders_campaign_id_campaigns",
        "orders",
        "campaigns",
        ["campaign_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    op.drop_constraint("fk_orders_campaign_id_campaigns", "orders", type_="foreignkey")
    op.drop_index(op.f("ix_orders_campaign_id"), table_name="orders")
    op.drop_column("orders", "campaign_id")

    op.drop_index(op.f("ix_campaigns_combo_group_id"), table_name="campaigns")
    op.drop_index(op.f("ix_campaigns_owner_sale_id"), table_name="campaigns")
    op.drop_table("campaigns")

    campaign_status_enum.drop(op.get_bind(), checkfirst=True)
