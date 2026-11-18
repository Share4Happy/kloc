"""fix_order_status_new_enum_labels

Revision ID: f123456789ac
Revises: f123456789ab
Create Date: 2026-03-22

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "f123456789ac"
down_revision: Union[str, Sequence[str], None] = "f123456789ab"
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
    _rename_enum_value("order_status", "new_request", "NEW_REQUEST")
    _rename_enum_value("order_status", "pending_approval", "PENDING_APPROVAL")


def downgrade() -> None:
    _rename_enum_value("order_status", "NEW_REQUEST", "new_request")
    _rename_enum_value("order_status", "PENDING_APPROVAL", "pending_approval")
