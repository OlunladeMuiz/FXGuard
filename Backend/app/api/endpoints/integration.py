from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.auth import User
from app.schemas.integration import IntegrationConnectRequest, IntegrationRecord
from app.services.auth import get_current_user
from app.services.integration_service import connect_integration, list_integrations

router = APIRouter(prefix="/integrations", tags=["Integrations"])


@router.get("/", response_model=list[IntegrationRecord])
def list_integrations_endpoint(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return list_integrations(db, user_id=current_user.id)


@router.post("/connect", response_model=IntegrationRecord)
def connect_integration_endpoint(
    payload: IntegrationConnectRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return connect_integration(
            db,
            user_id=current_user.id,
            provider=payload.provider,
            credential=payload.credential,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
