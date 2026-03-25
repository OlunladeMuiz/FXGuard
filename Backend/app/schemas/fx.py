from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, Field


class FXRateItem(BaseModel):
    base: str = Field(min_length=3, max_length=3)
    quote: str = Field(min_length=3, max_length=3)
    rate: float = Field(gt=0)
    timestamp: datetime
    observed_on: date
    source: str
    is_synthetic: bool = False


class FXRatesResponse(BaseModel):
    data: list[FXRateItem]
    timestamp: datetime


class FXHistoryPoint(BaseModel):
    date: date
    rate: float = Field(gt=0)


class FXHistoryStats(BaseModel):
    min: float = Field(gt=0)
    max: float = Field(gt=0)
    avg: float = Field(gt=0)
    volatility: float = Field(ge=0, le=1)
    standard_deviation: float = Field(ge=0)


class FXHistoryResponse(BaseModel):
    pair: str
    base: str = Field(min_length=3, max_length=3)
    quote: str = Field(min_length=3, max_length=3)
    period: Literal["1d", "7d", "30d", "90d", "1y"]
    data: list[FXHistoryPoint]
    stats: FXHistoryStats
    data_points: int = Field(ge=1)
    real_data_points: int = Field(ge=0)
    synthetic_data_points: int = Field(ge=0)
    contains_synthetic: bool = False
    source: str


class FXCandleItem(BaseModel):
    timestamp: datetime
    open: float = Field(gt=0)
    high: float = Field(gt=0)
    low: float = Field(gt=0)
    close: float = Field(gt=0)
    source: str


class FXCandlesStats(BaseModel):
    min: float = Field(gt=0)
    max: float = Field(gt=0)
    avg: float = Field(gt=0)
    volatility: float = Field(ge=0, le=1)
    standard_deviation: float = Field(ge=0)
    change_percent: float


class FXCandlesResponse(BaseModel):
    pair: str
    base: str = Field(min_length=3, max_length=3)
    quote: str = Field(min_length=3, max_length=3)
    range: Literal["1d", "7d", "30d", "90d", "1y"]
    interval: Literal["1min", "5min", "15min", "30min", "1h", "4h", "1day", "1week"]
    data: list[FXCandleItem]
    stats: FXCandlesStats
    data_points: int = Field(ge=1)
    source: str
