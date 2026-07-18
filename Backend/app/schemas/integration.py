from datetime import datetime
from pydantic import BaseModel, Field


class IntegrationConnectRequest(BaseModel):
    provider: str = Field(min_length=2)
    credential: str = Field(min_length=6)


class IntegrationRecord(BaseModel):
    provider: str
    name: str
    description: str
    status: str
    connected_at: datetime | None
    credential_hint: str | None = None

    class Config:
        from_attributes = True
