"""Phase 2 teams tables

Revision ID: 202604020001
Revises: 202604010001
Create Date: 2026-04-02 21:40:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "202604020001"
down_revision = "202604010001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "teams",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("owner_user_id", sa.String(), nullable=False),
        sa.Column("plan", sa.String(), nullable=False, server_default="company"),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["owner_user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_teams_id"), "teams", ["id"], unique=False)
    op.create_index(op.f("ix_teams_owner_user_id"), "teams", ["owner_user_id"], unique=False)

    op.create_table(
        "team_members",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("team_id", sa.String(), nullable=False),
        sa.Column("user_id", sa.String(), nullable=True),
        sa.Column("email", sa.String(), nullable=False),
        sa.Column("role", sa.String(), nullable=False, server_default="member"),
        sa.Column("status", sa.String(), nullable=False, server_default="invited"),
        sa.Column("invited_at", sa.DateTime(), nullable=False),
        sa.Column("joined_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["team_id"], ["teams.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("team_id", "user_id", name="uq_team_member_user"),
        sa.UniqueConstraint("team_id", "email", name="uq_team_member_email"),
    )
    op.create_index(op.f("ix_team_members_id"), "team_members", ["id"], unique=False)
    op.create_index(op.f("ix_team_members_team_id"), "team_members", ["team_id"], unique=False)
    op.create_index(op.f("ix_team_members_user_id"), "team_members", ["user_id"], unique=False)
    op.create_index(op.f("ix_team_members_email"), "team_members", ["email"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_team_members_email"), table_name="team_members")
    op.drop_index(op.f("ix_team_members_user_id"), table_name="team_members")
    op.drop_index(op.f("ix_team_members_team_id"), table_name="team_members")
    op.drop_index(op.f("ix_team_members_id"), table_name="team_members")
    op.drop_table("team_members")

    op.drop_index(op.f("ix_teams_owner_user_id"), table_name="teams")
    op.drop_index(op.f("ix_teams_id"), table_name="teams")
    op.drop_table("teams")
