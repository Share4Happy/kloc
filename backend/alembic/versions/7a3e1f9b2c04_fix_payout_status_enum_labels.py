"""fix payout_status enum labels (lowercase -> uppercase)

Revision ID: 7a3e1f9b2c04
Revises: 6f2d4c8b9a11
Create Date: 2026-03-16 00:00:00.000000

The initial migration for kol_payouts created the payout_status PostgreSQL enum
with lowercase labels ('pending', 'paid', 'cancelled'), but SQLAlchemy's
Enum(PayoutStatus) persists the Python enum .name (uppercase: 'PENDING', 'PAID',
'CANCELLED'), causing a DataError on every INSERT/UPDATE.

This migration renames the three labels to match what SQLAlchemy expects.
"""

from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "7a3e1f9b2c04"
down_revision: Union[str, Sequence[str], None] = "6f2d4c8b9a11"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Rename each label only if the lowercase version still exists, so the
    # migration is safe to re-run or apply against a DB that was already fixed.
    op.execute("""
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1 FROM pg_enum
                JOIN pg_type ON pg_enum.enumtypid = pg_type.oid
                WHERE pg_type.typname = 'payout_status'
                  AND pg_enum.enumlabel = 'pending'
            ) THEN
                ALTER TYPE payout_status RENAME VALUE 'pending' TO 'PENDING';
            END IF;
        END$$;
    """)

    op.execute("""
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1 FROM pg_enum
                JOIN pg_type ON pg_enum.enumtypid = pg_type.oid
                WHERE pg_type.typname = 'payout_status'
                  AND pg_enum.enumlabel = 'paid'
            ) THEN
                ALTER TYPE payout_status RENAME VALUE 'paid' TO 'PAID';
            END IF;
        END$$;
    """)

    op.execute("""
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1 FROM pg_enum
                JOIN pg_type ON pg_enum.enumtypid = pg_type.oid
                WHERE pg_type.typname = 'payout_status'
                  AND pg_enum.enumlabel = 'cancelled'
            ) THEN
                ALTER TYPE payout_status RENAME VALUE 'cancelled' TO 'CANCELLED';
            END IF;
        END$$;
    """)


def downgrade() -> None:
    op.execute("""
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1 FROM pg_enum
                JOIN pg_type ON pg_enum.enumtypid = pg_type.oid
                WHERE pg_type.typname = 'payout_status'
                  AND pg_enum.enumlabel = 'PENDING'
            ) THEN
                ALTER TYPE payout_status RENAME VALUE 'PENDING' TO 'pending';
            END IF;
        END$$;
    """)

    op.execute("""
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1 FROM pg_enum
                JOIN pg_type ON pg_enum.enumtypid = pg_type.oid
                WHERE pg_type.typname = 'payout_status'
                  AND pg_enum.enumlabel = 'PAID'
            ) THEN
                ALTER TYPE payout_status RENAME VALUE 'PAID' TO 'paid';
            END IF;
        END$$;
    """)

    op.execute("""
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1 FROM pg_enum
                JOIN pg_type ON pg_enum.enumtypid = pg_type.oid
                WHERE pg_type.typname = 'payout_status'
                  AND pg_enum.enumlabel = 'CANCELLED'
            ) THEN
                ALTER TYPE payout_status RENAME VALUE 'CANCELLED' TO 'cancelled';
            END IF;
        END$$;
    """)
