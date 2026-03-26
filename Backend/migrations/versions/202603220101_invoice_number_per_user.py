"""make invoice number unique per user

Revision ID: 202603220101
Revises: 202603220000
Create Date: 2026-03-22 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "202603220101"
down_revision = "202603220000"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_constraints = {
        constraint["name"]
        for constraint in inspector.get_unique_constraints("invoices")
        if constraint.get("name")
    }

    if "uq_user_invoice_number" in existing_constraints:
        return

    with op.batch_alter_table("invoices") as batch_op:
        if "invoices_invoice_number_key" in existing_constraints:
            batch_op.drop_constraint("invoices_invoice_number_key", type_="unique")

        batch_op.create_unique_constraint(
            "uq_user_invoice_number",
            ["user_id", "invoice_number"],
        )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_constraints = {
        constraint["name"]
        for constraint in inspector.get_unique_constraints("invoices")
        if constraint.get("name")
    }

    with op.batch_alter_table("invoices") as batch_op:
        if "uq_user_invoice_number" in existing_constraints:
            batch_op.drop_constraint("uq_user_invoice_number", type_="unique")

        if "invoices_invoice_number_key" not in existing_constraints:
            batch_op.create_unique_constraint(
                "invoices_invoice_number_key",
                ["invoice_number"],
            )
