from datetime import date
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.auth import User
from app.schemas.fx import FXCandlesResponse, FXHistoryResponse, FXRatesResponse
from app.services.auth import get_current_user
from app.services.fx import FXProviderError, get_fx_candles_response, get_fx_history_response, get_fx_rates

router = APIRouter(prefix="/fx", tags=["fx"])


@router.get("/candles", response_model=FXCandlesResponse)
async def read_fx_candles(
    base: str = Query(..., min_length=3, max_length=3),
    quote: str = Query(..., min_length=3, max_length=3),
    range_value: Literal["1d", "7d", "30d", "90d", "1y"] = Query(default="30d", alias="range"),
    interval: Literal["1min", "5min", "15min", "30min", "1h", "4h", "1day", "1week"] = Query(default="1day"),
    db: Session = Depends(get_db),
    _current_user: User = Depends(get_current_user),
):
    try:
        return await get_fx_candles_response(
            db,
            base=base.upper(),
            quote=quote.upper(),
            range_value=range_value,
            interval=interval,
        )
    except FXProviderError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc


@router.get("/rates", response_model=FXRatesResponse)
async def read_fx_rates(
    base: str = Query(..., min_length=3, max_length=3),
    quotes: str | None = Query(default=None),
    date_value: date | None = Query(default=None, alias="date"),
    db: Session = Depends(get_db),
    _current_user: User = Depends(get_current_user),
):
    quote_list = [quote.strip() for quote in quotes.split(",")] if quotes else None
    try:
        return await get_fx_rates(
            db,
            base=base.upper(),
            quotes=quote_list,
            observed_on=date_value,
        )
    except FXProviderError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc


@router.get("/history", response_model=FXHistoryResponse)
async def read_fx_history(
    base: str = Query(..., min_length=3, max_length=3),
    quote: str = Query(..., min_length=3, max_length=3),
    period: Literal["1d", "7d", "30d", "90d", "1y"] = Query(default="30d"),
    db: Session = Depends(get_db),
    _current_user: User = Depends(get_current_user),
):
    try:
        return await get_fx_history_response(
            db,
            base=base.upper(),
            quote=quote.upper(),
            period=period,
        )
    except FXProviderError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc


@router.post("/sync/{base}/{quote}", response_model=FXHistoryResponse)
async def sync_fx_history(
    base: str,
    quote: str,
    period: Literal["1d", "7d", "30d", "90d", "1y"] = Query(default="30d"),
    db: Session = Depends(get_db),
    _current_user: User = Depends(get_current_user),
):
    try:
        return await get_fx_history_response(
            db,
            base=base.upper(),
            quote=quote.upper(),
            period=period,
        )
    except FXProviderError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc
