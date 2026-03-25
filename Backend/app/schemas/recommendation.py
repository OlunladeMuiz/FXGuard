from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class RecommendationFactor(BaseModel):
    name: str
    impact: Literal["positive", "negative", "neutral"]
    description: str


class RecommendationIndicators(BaseModel):
    current_rate: float = Field(gt=0)
    avg_30_day: float = Field(gt=0)
    sma_7: float = Field(gt=0)
    sma_20: float = Field(gt=0)
    volatility_percent: float = Field(ge=0)
    change_7d_percent: float
    change_30d_percent: float
    rsi_14: float = Field(ge=0, le=100)
    range_position_percent: float = Field(ge=0, le=100)
    trend: Literal["upward", "downward", "sideways"]
    period_min: float = Field(gt=0)
    period_max: float = Field(gt=0)
    is_near_high: bool
    is_near_low: bool
    is_overbought: bool
    is_oversold: bool
    data_source: Literal["stored_history", "same_currency", "candle_history"]
    analytics_mode: Literal["insufficient", "limited", "full", "provisional"]


class RecommendationResponse(BaseModel):
    status: Literal["ready", "limited_data", "insufficient_data", "provisional_data"]
    history_quality: Literal["full", "mixed", "seeded", "same_currency", "candle_fallback"]
    action: Literal["convert_now", "wait", "hedge", "split_conversion"]
    confidence: float = Field(ge=0, le=1)
    risk_score: float = Field(ge=0, le=1)
    explanation: str
    factors: list[RecommendationFactor]
    optimal_window: str
    indicators: RecommendationIndicators
    data_points: int = Field(ge=1)
    real_data_points: int = Field(ge=0)
    synthetic_data_points: int = Field(ge=0)
    contains_synthetic: bool = False
    generated_at: datetime
    base: str = Field(min_length=3, max_length=3)
    quote: str = Field(min_length=3, max_length=3)
    amount: float = Field(gt=0)
