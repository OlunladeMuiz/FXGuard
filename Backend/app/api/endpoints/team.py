from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.auth import User
from app.models.team import Team, TeamMember
from app.schemas.team import (
    TeamCreate,
    TeamResponse,
    TeamMemberCreate,
    TeamMemberResponse,
)
from app.services.auth import get_current_user
from app.services.team_service import create_team, list_teams, list_team_members, add_team_member

router = APIRouter(prefix="/teams", tags=["Teams"])


@router.post("/", response_model=TeamResponse, status_code=status.HTTP_201_CREATED)
def create_team_endpoint(
    payload: TeamCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return create_team(db, user=current_user, name=payload.name)


@router.get("/", response_model=list[TeamResponse])
def list_teams_endpoint(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return list_teams(db, user=current_user)


@router.get("/{team_id}/members", response_model=list[TeamMemberResponse])
def list_team_members_endpoint(
    team_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    team = (
        db.query(Team)
        .filter(Team.id == team_id)
        .first()
    )
    if not team:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team not found")

    membership = (
        db.query(TeamMember)
        .filter(TeamMember.team_id == team_id, TeamMember.user_id == current_user.id)
        .first()
    )
    if not membership:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized for this team")

    return list_team_members(db, team_id=team_id)


@router.post("/{team_id}/members", response_model=TeamMemberResponse, status_code=status.HTTP_201_CREATED)
def add_team_member_endpoint(
    team_id: str,
    payload: TeamMemberCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team not found")

    if team.owner_user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only team owners can add members")

    return add_team_member(db, team=team, email=payload.email.strip().lower(), role=payload.role)
