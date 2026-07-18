from datetime import datetime, timezone
from sqlalchemy import Column, DateTime, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import relationship

from app.db.database import Base


class Team(Base):
    __tablename__ = "teams"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    owner_user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    plan = Column(String, default="company", nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    owner = relationship("User", backref="owned_teams")
    members = relationship("TeamMember", back_populates="team", cascade="all, delete-orphan")


class TeamMember(Base):
    __tablename__ = "team_members"
    __table_args__ = (
        UniqueConstraint("team_id", "user_id", name="uq_team_member_user"),
        UniqueConstraint("team_id", "email", name="uq_team_member_email"),
    )

    id = Column(String, primary_key=True, index=True)
    team_id = Column(String, ForeignKey("teams.id"), nullable=False, index=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=True, index=True)
    email = Column(String, nullable=False, index=True)
    role = Column(String, default="member", nullable=False)
    status = Column(String, default="invited", nullable=False)  # invited, active
    invited_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    joined_at = Column(DateTime, nullable=True)

    team = relationship("Team", back_populates="members")
    user = relationship("User", backref="team_memberships")
