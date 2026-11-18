"""fix campaign_status enum labels (lowercase -> uppercase)

Revision ID: 8b5c2d1e3f07
Revises: 7a3e1f9b2c04
Create Date: 2026-03-16 00:00:00.000000

Migration b91d52ea4410 created campaign_status with lowercase labels
('planning', 'running', 'completed', 'cancelled'), but SQLAlchemy's
Enum(CampaignStatus) persists the Python enum .name (uppercase), causing
a DataError on every INSERT/UPDATE.
"""

from typing import Sequence, Union

from alembic import op

revision: str = "8b5c2d1e3f07"
down_revision: Union[str, Sequence[str], None] = "7a3e1f9b2c04"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _rename_if_exists(type_name: str, old_label: str, new_label: str) -> None:
    op.execute(f"""
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1 FROM pg_enum
                JOIN pg_type ON pg_enum.enumtypid = pg_type.oid
                WHERE pg_type.typname = '{type_name}'
                  AND pg_enum.enumlabel = '{old_label}'
            ) THEN
                ALTER TYPE {type_name} RENAME VALUE '{old_label}' TO '{new_label}';
            END IF;
        END$$;
    """)


def upgrade() -> None:
    _rename_if_exists("campaign_status", "planning", "PLANNING")
    _rename_if_exists("campaign_status", "running", "RUNNING")
    _rename_if_exists("campaign_status", "completed", "COMPLETED")
    _rename_if_exists("campaign_status", "cancelled", "CANCELLED")


def downgrade() -> None:
    _rename_if_exists("campaign_status", "PLANNING", "planning")
    _rename_if_exists("campaign_status", "RUNNING", "running")
    _rename_if_exists("campaign_status", "COMPLETED", "completed")
    _rename_if_exists("campaign_status", "CANCELLED", "cancelled")
