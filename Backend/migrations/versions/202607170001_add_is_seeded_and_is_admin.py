"""add is_seeded and is_admin

Revision ID: 202607170001
Revises: 202604030001
Create Date: 2026-07-17 00:15:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '202607170001'
down_revision = '202604030001'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add is_admin to users
    op.add_column('users', sa.Column('is_admin', sa.Boolean(), server_default='false', nullable=False))
    
    # Add is_seeded to invoices
    op.add_column('invoices', sa.Column('is_seeded', sa.Boolean(), server_default='false', nullable=False))


def downgrade() -> None:
    op.drop_column('invoices', 'is_seeded')
    op.drop_column('users', 'is_admin')
