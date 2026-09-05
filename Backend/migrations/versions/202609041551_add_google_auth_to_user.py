"""add google auth to user

Revision ID: 202609041551
Revises: ba320e4aeb02
Create Date: 2026-09-04 15:51:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '202609041551'
down_revision: Union[str, None] = 'ba320e4aeb02'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add google_id column and its index
    op.add_column('users', sa.Column('google_id', sa.String(), nullable=True))
    op.create_index(op.f('ix_users_google_id'), 'users', ['google_id'], unique=True)
    
    # Make password nullable for OAuth users
    op.alter_column('users', 'password',
               existing_type=sa.String(),
               nullable=True)


def downgrade() -> None:
    # CAVEAT: This downgrade alters `password` back to nullable=False.
    # If any users were created without a password (e.g., via Google OAuth) 
    # prior to downgrading, this operation will fail at the database level 
    # due to NOT NULL constraints on existing rows.
    op.alter_column('users', 'password',
               existing_type=sa.String(),
               nullable=False)
               
    op.drop_index(op.f('ix_users_google_id'), table_name='users')
    op.drop_column('users', 'google_id')
