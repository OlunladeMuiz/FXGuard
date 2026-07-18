"""Phase 2 integration connections

Revision ID: 202604030001
Revises: 202604020001
Create Date: 2026-04-03 08:10:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "202604030001"
down_revision = "202604020001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "integration_connections",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("user_id", sa.String(), nullable=False),
        sa.Column("provider", sa.String(), nullable=False),
        sa.Column("status", sa.String(), nullable=False, server_default="connected"),
        sa.Column("credential_hint", sa.String(), nullable=True),
        sa.Column("connected_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "provider", name="uq_integration_user_provider"),
    )
    op.create_index(op.f("ix_integration_connections_id"), "integration_connections", ["id"], unique=False)
    op.create_index(op.f("ix_integration_connections_user_id"), "integration_connections", ["user_id"], unique=False)
    op.create_index(op.f("ix_integration_connections_provider"), "integration_connections", ["provider"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_integration_connections_provider"), table_name="integration_connections")
    op.drop_index(op.f("ix_integration_connections_user_id"), table_name="integration_connections")
    op.drop_index(op.f("ix_integration_connections_id"), table_name="integration_connections")
    op.drop_table("integration_connections")
