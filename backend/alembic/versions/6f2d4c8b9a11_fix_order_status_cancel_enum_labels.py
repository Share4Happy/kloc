"""fix_order_status_cancel_enum_labels

Revision ID: 6f2d4c8b9a11
Revises: b91d52ea4410
Create Date: 2026-03-16

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "6f2d4c8b9a11"
down_revision: Union[str, Sequence[str], None] = "b91d52ea4410"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _rename_enum_value(enum_name: str, old_value: str, new_value: str) -> None:
    op.execute(
        f"""
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1
                FROM pg_enum enum
                JOIN pg_type type ON type.oid = enum.enumtypid
                WHERE type.typname = '{enum_name}' AND enum.enumlabel = '{old_value}'
            ) AND NOT EXISTS (
                SELECT 1
                FROM pg_enum enum
                JOIN pg_type type ON type.oid = enum.enumtypid
                WHERE type.typname = '{enum_name}' AND enum.enumlabel = '{new_value}'
            ) THEN
                ALTER TYPE {enum_name} RENAME VALUE '{old_value}' TO '{new_value}';
            END IF;
        END
        $$;
        """
    )


def upgrade() -> None:
    _rename_enum_value("order_status", "cancel_requested", "CANCEL_REQUESTED")
    _rename_enum_value("order_status", "cancelled", "CANCELLED")
    _rename_enum_value("order_status", "refund_requested", "REFUND_REQUESTED")
    _rename_enum_value("order_status", "refunded", "REFUNDED")


def downgrade() -> None:
    _rename_enum_value("order_status", "CANCEL_REQUESTED", "cancel_requested")
    _rename_enum_value("order_status", "CANCELLED", "cancelled")
    _rename_enum_value("order_status", "REFUND_REQUESTED", "refund_requested")
    _rename_enum_value("order_status", "REFUNDED", "refunded")