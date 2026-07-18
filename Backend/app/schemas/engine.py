from datetime import datetime
from typing import Literal
from pydantic import BaseModel, Field


class SpreadResponse(BaseModel):
    official_rate: float | None
    parallel_rate: float | None
    bdc_rate: float | None
    spread_ngn: float | None
    spread_pct: float | None
    spread_direction: str | None
    risk_level: str | None
    risk_message: str
    official_source: str | None = None
    parallel_source: str | None = None
    bdc_source: str | None = None
    recorded_at: str | None = None
    is_synthetic: bool = False


class BrentSignalResponse(BaseModel):
    current_price: float | None
    weekly_change_pct: float | None
    signal: Literal["POSITIVE", "NEGATIVE", "NEUTRAL"]
    risk_flag: bool
    message: str


class SourceHealthItem(BaseModel):
    source: str
    last_recorded_at: str | None
    is_stale: bool
    rate_count_24h: int
    is_configured: bool = True
    note: str | None = None


class SourceHealthResponse(BaseModel):
    sources: list[SourceHealthItem]
    checked_at: str


class SimulatorRequest(BaseModel):
    base_currency: str = Field(min_length=3, max_length=3)
    quote_currency: str = Field(min_length=3, max_length=3)
    amount: float = Field(gt=0)
    lookback_days: int = Field(default=30, ge=7, le=365)
    rate_source: str = "market"


class RateAlertCreate(BaseModel):
    pair: str                                    # e.g. "USD_NGN" or "USD/NGN"
    target_rate: float = Field(gt=0)
    direction: Literal["ABOVE", "BELOW"]
    rate_source: str = "any"
    channels: list[str] = ["email", "in_app"]


class RateAlertResponse(BaseModel):
    id: str
    pair: str
    target_rate: float
    direction: str
    rate_source: str
    channels: str
    is_active: bool
    is_triggered: bool
    triggered_at: datetime | None
    triggered_rate: float | None
    created_at: datetime

    class Config:
        from_attributes = True


class ConversionLogCreate(BaseModel):
    base_currency: str = Field(min_length=3, max_length=3)
    quote_currency: str = Field(min_length=3, max_length=3)
    base_amount: float = Field(gt=0)
    rate_used: float = Field(gt=0)
    quote_amount: float | None = None
    source: str = "manual"
    converted_at: datetime | None = None
    followed_recommendation: bool | None = None
    notes: str | None = None


class NotificationResponse(BaseModel):
    id: str
    type: str
    title: str
    body: str
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True


class GarchRiskItem(BaseModel):
    pair: str
    window_days: int
    garch_volatility_pct: float
    realized_volatility_pct: float
    risk_level: str
    data_points: int
    last_observed_at: str | None


class SeasonalitySignal(BaseModel):
    key: str
    label: str
    level: str
    score: float
    message: str


class SeasonalityResponse(BaseModel):
    as_of: str
    composite_score: float
    composite_level: str
    signals: list[SeasonalitySignal]


class NewsHeadlineItem(BaseModel):
    title: str
    source: str
    url: str | None
    published_at: str
    sentiment: float | None


class NewsSignalResponse(BaseModel):
    as_of: str
    headline_count: int
    avg_sentiment: float
    risk_flag: bool
    top_topics: list[str]
    headlines: list[NewsHeadlineItem]


class ReservesSignalResponse(BaseModel):
    as_of: str
    reserves_usd_bn: float | None
    signal: str
    risk_flag: bool
    message: str


class InterventionSignalResponse(BaseModel):
    as_of: str
    risk_score: float
    risk_level: str
    message: str
    inputs: dict


class MultiCurrencyExposureItem(BaseModel):
    currency: str
    open_amount: float
    rate_to_reporting: float | None
    open_amount_in_reporting: float | None


class MultiCurrencyExposureResponse(BaseModel):
    as_of: str
    reporting_currency: str
    total_open_in_reporting: float
    currencies: list[MultiCurrencyExposureItem]


class MonthlySavingsConversion(BaseModel):
    id: str
    date: str
    pair: str
    base_amount: float
    rate_used: float
    optimal_rate: float | None
    lost_amount: float | None
    source: str


class MonthlySavingsReport(BaseModel):
    user_id: str
    year: int
    month: int
    total_base_converted: float
    total_quote_received: float
    total_optimal_quote: float
    total_lost_to_timing: float
    total_saved_vs_worst: float
    net_position_quote: float
    conversions: list[MonthlySavingsConversion]
    share_token: str


class CbnReservesCreate(BaseModel):
    week_of: datetime
    reserves_usd_bn: float = Field(gt=0)
