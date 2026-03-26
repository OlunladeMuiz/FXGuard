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
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_columns = {column["name"] for column in inspector.get_columns("invoices")}
    existing_indexes = {index["name"] for index in inspector.get_indexes("invoices")}

    if "payment_link" not in existing_columns:
        op.add_column("invoices", sa.Column("payment_link", sa.String(), nullable=True))
    if "payment_reference" not in existing_columns:
        op.add_column("invoices", sa.Column("payment_reference", sa.String(), nullable=True))
    if "payment_completed_at" not in existing_columns:
        op.add_column("invoices", sa.Column("payment_completed_at", sa.DateTime(), nullable=True))

    if "ix_invoices_payment_reference" not in existing_indexes:
        op.create_index(
            "ix_invoices_payment_reference",
            "invoices",
            ["payment_reference"],
            unique=False,
        )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_columns = {column["name"] for column in inspector.get_columns("invoices")}
    existing_indexes = {index["name"] for index in inspector.get_indexes("invoices")}

    if "ix_invoices_payment_reference" in existing_indexes:
        op.drop_index("ix_invoices_payment_reference", table_name="invoices")
    if "payment_completed_at" in existing_columns:
        op.drop_column("invoices", "payment_completed_at")
    if "payment_reference" in existing_columns:
        op.drop_column("invoices", "payment_reference")
    if "payment_link" in existing_columns:
        op.drop_column("invoices", "payment_link")
