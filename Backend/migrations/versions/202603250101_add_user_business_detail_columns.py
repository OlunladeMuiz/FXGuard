"""add user business detail columns

Revision ID: 202603250101
Revises: 202603220103
Create Date: 2026-03-25 18:15:00.000000
"""

import sqlalchemy as sa
from alembic import op


revision = "202603250101"
down_revision = "202603220103"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_columns = {column["name"] for column in inspector.get_columns("users")}

    if "country" not in existing_columns:
        op.add_column("users", sa.Column("country", sa.String(), nullable=True))
    if "business_type" not in existing_columns:
        op.add_column("users", sa.Column("business_type", sa.String(), nullable=True))


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_columns = {column["name"] for column in inspector.get_columns("users")}

    if "business_type" in existing_columns:
        op.drop_column("users", "business_type")
    if "country" in existing_columns:
        op.drop_column("users", "country")
