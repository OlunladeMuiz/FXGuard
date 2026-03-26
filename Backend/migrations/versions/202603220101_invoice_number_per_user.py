"""make invoice number unique per user

Revision ID: 202603220101
Revises:
Create Date: 2026-03-22 00:00:00.000000
"""

from alembic import op


revision = "202603220101"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_constraint("invoices_invoice_number_key", "invoices", type_="unique")
    op.create_unique_constraint(
        "uq_user_invoice_number",
        "invoices",
        ["user_id", "invoice_number"]
    )


def downgrade() -> None:
    op.drop_constraint("uq_user_invoice_number", "invoices", type_="unique")
    op.create_unique_constraint(
        "invoices_invoice_number_key",
        "invoices",
        ["invoice_number"]
    )
