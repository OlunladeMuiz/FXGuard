"""add invoice interswitch payment columns

Revision ID: 202603220103
Revises: 202603220102
Create Date: 2026-03-22 16:00:00.000000
"""

import sqlalchemy as sa
from alembic import op


revision = "202603220103"
down_revision = "202603220102"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("invoices", sa.Column("payment_link", sa.String(), nullable=True))
    op.add_column("invoices", sa.Column("payment_reference", sa.String(), nullable=True))
    op.add_column("invoices", sa.Column("payment_completed_at", sa.DateTime(), nullable=True))
    op.create_index(
        "ix_invoices_payment_reference",
        "invoices",
        ["payment_reference"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_invoices_payment_reference", table_name="invoices")
    op.drop_column("invoices", "payment_completed_at")
    op.drop_column("invoices", "payment_reference")
    op.drop_column("invoices", "payment_link")
