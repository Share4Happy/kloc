"""add notifications table

Revision ID: add_notifications
Revises: change_amount_to_bigint
Create Date: 2026-04-11

"""
from alembic import op
import sqlalchemy as sa


revision = 'add_notifications'
down_revision = 'change_amount_to_bigint'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'notifications',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('user_id', sa.Uuid(), nullable=False),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('message', sa.Text(), nullable=False),
        sa.Column('type', sa.String(50), nullable=False, server_default='info',
                  comment='info, success, warning, action_required'),
        sa.Column('ref_type', sa.String(50), nullable=True,
                  comment='order, kol_profile, payout, lead, etc.'),
        sa.Column('ref_id', sa.Uuid(), nullable=True),
        sa.Column('metadata', sa.dialects.postgresql.JSONB(), nullable=True),
        sa.Column('is_read', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_notifications_user_id'), 'notifications', ['user_id'], unique=False)
    op.create_index(op.f('ix_notifications_is_read'), 'notifications', ['is_read'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_notifications_is_read'), table_name='notifications')
    op.drop_index(op.f('ix_notifications_user_id'), table_name='notifications')
    op.drop_table('notifications')
