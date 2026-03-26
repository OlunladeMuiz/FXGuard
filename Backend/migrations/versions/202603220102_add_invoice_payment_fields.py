"""add invoice payment detail columns

Revision ID: 202603220102
Revises: 202603220101
Create Date: 2026-03-22 00:05:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "202603220102"
down_revision = "202603220101"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("invoices", sa.Column("account_name", sa.String(), nullable=True))
    op.add_column("invoices", sa.Column("bank_name", sa.String(), nullable=True))
    op.add_column("invoices", sa.Column("account_number", sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column("invoices", "account_number")
    op.drop_column("invoices", "bank_name")
    op.drop_column("invoices", "account_name")
