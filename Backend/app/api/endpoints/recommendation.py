from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.auth import User
from app.schemas.recommendation import RecommendationResponse
from app.services.auth import get_current_user
from app.services.recommendation import generate_recommendation

router = APIRouter(prefix="/recommendation", tags=["recommendation"])


@router.get("/{base}/{quote}", response_model=RecommendationResponse)
async def get_fx_recommendation(
    base: str,
    quote: str,
    amount: float = Query(default=10000.0, gt=0),
    db: Session = Depends(get_db),
    _current_user: User = Depends(get_current_user),
):
    """
    Return a market-data-backed FX recommendation for the requested currency
    pair and invoice amount.
    """
    return await generate_recommendation(
        db,
        base=base.upper(),
        quote=quote.upper(),
        invoice_amount=amount,
    )
