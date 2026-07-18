from datetime import datetime
from pydantic import BaseModel, Field


class TeamCreate(BaseModel):
    name: str = Field(min_length=2, max_length=120)


class TeamResponse(BaseModel):
    id: str
    name: str
    owner_user_id: str
    plan: str
    created_at: datetime

    class Config:
        from_attributes = True


class TeamMemberCreate(BaseModel):
    email: str = Field(min_length=5)
    role: str = "member"


class TeamMemberResponse(BaseModel):
    id: str
    team_id: str
    user_id: str | None
    email: str
    role: str
    status: str
    invited_at: datetime
    joined_at: datetime | None

    class Config:
        from_attributes = True
