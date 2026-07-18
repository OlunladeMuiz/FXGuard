import uuid
from datetime import datetime, timezone
from sqlalchemy.orm import Session

from app.models.auth import User
from app.models.team import Team, TeamMember


def create_team(db: Session, *, user: User, name: str) -> Team:
    team = Team(
        id=str(uuid.uuid4()),
        name=name.strip(),
        owner_user_id=user.id,
    )
    db.add(team)
    db.flush()

    owner_member = TeamMember(
        id=str(uuid.uuid4()),
        team_id=team.id,
        user_id=user.id,
        email=user.email,
        role="owner",
        status="active",
        invited_at=datetime.now(timezone.utc),
        joined_at=datetime.now(timezone.utc),
    )
    db.add(owner_member)
    db.commit()
    db.refresh(team)
    return team


def list_teams(db: Session, *, user: User) -> list[Team]:
    return (
        db.query(Team)
        .join(TeamMember, TeamMember.team_id == Team.id)
        .filter(TeamMember.user_id == user.id)
        .order_by(Team.created_at.desc())
        .all()
    )


def list_team_members(db: Session, *, team_id: str) -> list[TeamMember]:
    return (
        db.query(TeamMember)
        .filter(TeamMember.team_id == team_id)
        .order_by(TeamMember.invited_at.desc())
        .all()
    )


def add_team_member(
    db: Session,
    *,
    team: Team,
    email: str,
    role: str,
) -> TeamMember:
    existing = (
        db.query(TeamMember)
        .filter(TeamMember.team_id == team.id, TeamMember.email == email)
        .first()
    )
    if existing:
        return existing

    user = db.query(User).filter(User.email == email).first()
    status = "active" if user else "invited"
    joined_at = datetime.now(timezone.utc) if user else None

    member = TeamMember(
        id=str(uuid.uuid4()),
        team_id=team.id,
        user_id=user.id if user else None,
        email=email,
        role=role,
        status=status,
        invited_at=datetime.now(timezone.utc),
        joined_at=joined_at,
    )
    db.add(member)
    db.commit()
    db.refresh(member)
    return member
