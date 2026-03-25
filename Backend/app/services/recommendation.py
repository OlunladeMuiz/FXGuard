"""
FX recommendation engine backed by stored market history.

The service reads the last 30 days of locally stored FX data, calculates
technical indicators, then asks Claude to interpret those indicators in plain
English. If AI or sufficient history is unavailable, deterministic fallback
logic is used instead.
"""

import json
import logging
import os
from datetime import datetime, timezone
from statistics import mean, stdev
from typing import Any, Literal

import httpx
from pydantic import BaseModel, Field, ValidationError
from sqlalchemy.orm import Session

from app.schemas.recommendation import RecommendationFactor
from app.services.fx import FXProviderError, ensure_history_window, get_fx_candles_response

logger = logging.getLogger(__name__)

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
ANTHROPIC_MODEL = os.getenv("ANTHROPIC_MODEL", "claude-3-5-sonnet-latest")
CANDLE_FALLBACK_RANGE = "7d"
CANDLE_FALLBACK_INTERVAL = "4h"

RecommendationStatus = Literal["ready", "limited_data", "insufficient_data", "provisional_data"]
HistoryQuality = Literal["full", "mixed", "seeded", "same_currency", "candle_fallback"]
IndicatorDataSource = Literal["stored_history", "same_currency", "candle_history"]
AnalyticsMode = Literal["insufficient", "limited", "full", "provisional"]


class AIRecommendationPayload(BaseModel):
    action: Literal["convert_now", "wait", "hedge", "split_conversion"]
    confidence: float = Field(ge=0, le=1)
    risk_score: float = Field(ge=0, le=1)
    explanation: str
    factors: list[RecommendationFactor]
    optimal_window: str


def _strip_json_wrapping(raw_content: str) -> str:
    content = raw_content.strip()
    if content.startswith("```"):
        lines = [line for line in content.splitlines() if not line.startswith("```")]
        content = "\n".join(lines).strip()
    return content


async def _load_candle_fallback_points(
    db: Session,
    *,
    base: str,
    quote: str,
) -> list[dict[str, Any]]:
    payload = await get_fx_candles_response(
        db,
        base=base,
        quote=quote,
        range_value=CANDLE_FALLBACK_RANGE,
        interval=CANDLE_FALLBACK_INTERVAL,
    )
    return [
        {
            "base": base,
            "quote": quote,
            "rate": float(candle["close"]),
            "observed_on": candle["timestamp"],
            "source": candle["source"],
            "is_synthetic": False,
        }
        for candle in payload["data"]
    ]


def calculate_indicators(
    points: list[dict[str, Any]],
    *,
    history_quality: HistoryQuality,
) -> dict[str, Any]:
    if not points:
        raise ValueError("At least one FX point is required to calculate indicators")

    rates = [float(point["rate"]) for point in points]
    analytics_mode: AnalyticsMode
    if history_quality == "candle_fallback":
        analytics_mode = "provisional"
    elif len(rates) < 7:
        analytics_mode = "insufficient"
    elif len(rates) < 14:
        analytics_mode = "limited"
    else:
        analytics_mode = "full"

    current = rates[-1]
    avg_30 = mean(rates)
    volatility = (stdev(rates) / avg_30 * 100) if len(rates) > 1 and avg_30 else 0.0

    sma_7 = mean(rates[-7:]) if len(rates) >= 7 else mean(rates)
    sma_20 = mean(rates[-20:]) if len(rates) >= 20 else mean(rates)

    comparison_index = -7 if len(rates) >= 7 else 0
    change_7d = ((rates[-1] - rates[comparison_index]) / rates[comparison_index]) * 100 if rates[comparison_index] else 0.0
    change_30d = ((rates[-1] - rates[0]) / rates[0]) * 100 if rates[0] else 0.0

    if len(rates) >= 14:
        gains: list[float] = []
        losses: list[float] = []
        for index in range(len(rates) - 14, len(rates) - 1):
            diff = rates[index + 1] - rates[index]
            if diff > 0:
                gains.append(diff)
            elif diff < 0:
                losses.append(abs(diff))

        avg_gain = mean(gains) if gains else 0.001
        avg_loss = mean(losses) if losses else 0.001
        rs = avg_gain / avg_loss
        rsi = 100 - (100 / (1 + rs))
    else:
        rsi = 50.0

    period_min = min(rates)
    period_max = max(rates)
    period_range = period_max - period_min
    range_position = ((current - period_min) / period_range) * 100 if period_range else 50.0

    trend: Literal["upward", "downward", "sideways"]
    if sma_7 > sma_20:
        trend = "upward"
    elif sma_7 < sma_20:
        trend = "downward"
    else:
        trend = "sideways"

    data_source: IndicatorDataSource
    if history_quality == "same_currency":
        data_source = "same_currency"
    elif history_quality == "candle_fallback":
        data_source = "candle_history"
    else:
        data_source = "stored_history"

    return {
        "current_rate": round(current, 5),
        "avg_30_day": round(avg_30, 5),
        "sma_7": round(sma_7, 5),
        "sma_20": round(sma_20, 5),
        "volatility_percent": round(volatility, 3),
        "change_7d_percent": round(change_7d, 3),
        "change_30d_percent": round(change_30d, 3),
        "rsi_14": round(rsi, 2),
        "range_position_percent": round(range_position, 1),
        "trend": trend,
        "period_min": round(period_min, 5),
        "period_max": round(period_max, 5),
        "is_near_high": range_position > 70,
        "is_near_low": range_position < 30,
        "is_overbought": rsi > 70,
        "is_oversold": rsi < 30,
        "data_source": data_source,
        "analytics_mode": analytics_mode,
    }


def _rule_based_recommendation(
    indicators: dict[str, Any],
    *,
    status: RecommendationStatus,
    history_quality: HistoryQuality,
    data_points: int,
    real_data_points: int,
    synthetic_data_points: int,
    fallback_candle_points: int = 0,
) -> dict[str, Any]:
    if history_quality == "same_currency":
        return {
            "action": "convert_now",
            "confidence": 1.0,
            "risk_score": 0.0,
            "explanation": "This invoice is already denominated in your settlement currency, so there is no FX exposure to manage.",
            "factors": [
                {
                    "name": "Currency Match",
                    "impact": "positive",
                    "description": "Base and quote currencies are identical, so market timing does not affect settlement value.",
                },
                {
                    "name": "Volatility",
                    "impact": "neutral",
                    "description": "FX volatility is irrelevant because no conversion is required.",
                },
                {
                    "name": "Execution Window",
                    "impact": "positive",
                    "description": "You can settle at any time without taking exchange-rate risk.",
                },
            ],
            "optimal_window": "any time",
        }

    if status == "insufficient_data":
        return {
            "action": "wait",
            "confidence": 0.35,
            "risk_score": min(float(indicators.get("volatility_percent", 0)) / 5.0, 1.0),
            "explanation": (
                f"We only have {data_points} stored daily points for this pair, so the signal is still weak. "
                "Use the live rate for reference today, but wait for more local history before acting on a strong timing recommendation."
            ),
            "factors": [
                {
                    "name": "History Depth",
                    "impact": "negative",
                    "description": f"Only {real_data_points} real daily closes are stored locally so far.",
                },
                {
                    "name": "Seeded History",
                    "impact": "neutral" if synthetic_data_points else "negative",
                    "description": (
                        f"{synthetic_data_points} seeded points are filling gaps while the history store matures."
                        if synthetic_data_points
                        else "No seeded history is available to stabilize the lookback yet."
                    ),
                },
                {
                    "name": "Current Market Range",
                    "impact": "neutral",
                    "description": f"The pair is trading at {indicators['current_rate']:.5f} right now.",
                },
            ],
            "optimal_window": "review after 7 stored market closes",
        }

    rsi = float(indicators.get("rsi_14", 50))
    range_pos = float(indicators.get("range_position_percent", 50))
    change_7d = float(indicators.get("change_7d_percent", 0))
    volatility = float(indicators.get("volatility_percent", 1))

    if indicators.get("is_oversold") or range_pos < 25:
        action = "convert_now"
        confidence = 0.78
        explanation = (
            f"The rate is near the lower end of its recent range and RSI is {rsi:.0f}. "
            "Converting now reduces the chance of missing a favorable level if the pair rebounds."
        )
        optimal_window = "next 24-48 hours"
    elif indicators.get("is_overbought") or range_pos > 75:
        action = "wait"
        confidence = 0.72
        explanation = (
            f"The rate is near the top of its recent range with RSI at {rsi:.0f}. "
            "Waiting may allow the market to pull back toward a better entry point."
        )
        optimal_window = "wait 2-4 days"
    elif volatility > 2.0:
        action = "hedge"
        confidence = 0.65
        explanation = (
            f"Volatility is elevated at {volatility:.1f}%, which raises timing risk. "
            "Hedging or staggering the conversion can protect invoice value while the market settles."
        )
        optimal_window = "hedge over the next 24 hours"
    elif abs(change_7d) < 0.3:
        action = "split_conversion"
        confidence = 0.70
        explanation = (
            f"The pair has moved only {change_7d:+.2f}% over the last week, which suggests a range-bound market. "
            "Splitting the conversion lowers the risk of choosing the wrong day."
        )
        optimal_window = "stagger over 3-5 days"
    else:
        action = "convert_now"
        confidence = 0.60
        explanation = "Market conditions are neutral overall, so converting now removes FX uncertainty from the invoice."
        optimal_window = "next 24-48 hours"

    if status == "limited_data":
        confidence = min(confidence, 0.62)
        explanation = (
            f"{explanation} This view is based on less than 14 stored daily closes, so treat it as an early signal rather than a fully mature trend."
        )
    elif status == "provisional_data":
        confidence = min(confidence, 0.5)
        explanation = (
            f"{explanation} This is a provisional signal built from {fallback_candle_points} stored 4-hour candles "
            f"because only {data_points} stored daily close{'s are' if data_points != 1 else ' is'} available."
        )

    if history_quality == "mixed":
        confidence = min(confidence, 0.68)
    elif history_quality == "seeded":
        confidence = min(confidence, 0.55)
    elif history_quality == "candle_fallback":
        confidence = min(confidence, 0.5)

    trend_impact: Literal["positive", "negative", "neutral"]
    if abs(change_7d) < 0.1:
        trend_impact = "neutral"
    elif change_7d > 0:
        trend_impact = "positive"
    else:
        trend_impact = "negative"

    return {
        "action": action,
        "confidence": round(confidence, 2),
        "risk_score": round(min(volatility / 5.0, 1.0), 2),
        "explanation": explanation,
        "factors": [
            {
                "name": "RSI",
                "impact": "positive" if rsi < 40 else "negative" if rsi > 60 else "neutral",
                "description": f"RSI is {rsi:.0f}, showing whether the pair looks stretched or balanced.",
            },
            {
                "name": "Volatility",
                "impact": "negative" if volatility > 1.5 else "neutral",
                "description": f"30-day coefficient of variation is {volatility:.2f}%.",
            },
            {
                "name": "History Quality",
                "impact": "neutral" if history_quality == "full" else "negative",
                "description": (
                    "The local history is fully real and continuously stored."
                    if history_quality == "full"
                    else (
                        f"Only {data_points} stored daily close{'s are' if data_points != 1 else ' is'} available, so this view is using "
                        f"{fallback_candle_points} intraday candles as a provisional fallback."
                    )
                    if history_quality == "candle_fallback"
                    else "The local history still includes seeded points while more real closes accumulate."
                ),
            },
        ],
        "optimal_window": optimal_window,
    }


async def get_ai_recommendation(
    base: str,
    quote: str,
    invoice_amount: float,
    indicators: dict[str, Any],
    *,
    status: RecommendationStatus,
    history_quality: HistoryQuality,
    data_points: int,
    real_data_points: int,
    synthetic_data_points: int,
    fallback_candle_points: int = 0,
) -> dict[str, Any]:
    if not ANTHROPIC_API_KEY or history_quality == "same_currency" or status == "insufficient_data":
        return _rule_based_recommendation(
            indicators,
            status=status,
            history_quality=history_quality,
            data_points=data_points,
            real_data_points=real_data_points,
            synthetic_data_points=synthetic_data_points,
            fallback_candle_points=fallback_candle_points,
        )

    analysis_basis = (
        f"Provisional signal from {fallback_candle_points} stored 4-hour candles because fewer than 7 stored daily closes are available."
        if history_quality == "candle_fallback"
        else "Primary signal from stored daily FX history."
    )

    prompt = f"""
You are an FX analyst for a cross-border invoicing platform used by African SMEs.

A user has an invoice worth {invoice_amount:.2f} {base} that will be settled in {quote}.

This recommendation must be grounded in the platform's own stored FX history, not generic advice.

Data quality:
- Status: {status}
- History quality: {history_quality}
- Total stored points: {data_points}
- Real points: {real_data_points}
- Seeded points: {synthetic_data_points}
- Analysis basis: {analysis_basis}

Calculated market indicators:
{json.dumps(indicators, indent=2)}

Instructions:
- If the data is limited or seeded, say so plainly and lower confidence.
- If the signal is using intraday candles as a fallback, state that clearly and keep confidence conservative.
- Prefer clear, practical language for a small-business owner.
- Do not overstate certainty.

Return a JSON object with exactly these keys:
- action: one of "convert_now", "wait", "hedge", "split_conversion"
- confidence: number from 0.0 to 1.0
- risk_score: number from 0.0 to 1.0
- explanation: 2 to 3 plain-English sentences
- factors: array of exactly 3 objects, each with name, impact ("positive", "negative", or "neutral"), and description
- optimal_window: short phrase such as "next 24-48 hours"

Do not include markdown or any text outside the JSON object.
""".strip()

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                "https://api.anthropic.com/v1/messages",
                headers={
                    "x-api-key": ANTHROPIC_API_KEY,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json",
                },
                json={
                    "model": ANTHROPIC_MODEL,
                    "max_tokens": 1024,
                    "messages": [{"role": "user", "content": prompt}],
                },
            )
            response.raise_for_status()
            payload = response.json()
    except httpx.HTTPError as exc:
        logger.warning("Claude request failed, using fallback recommendation: %s", exc)
        return _rule_based_recommendation(
            indicators,
            status=status,
            history_quality=history_quality,
            data_points=data_points,
            real_data_points=real_data_points,
            synthetic_data_points=synthetic_data_points,
            fallback_candle_points=fallback_candle_points,
        )

    content = "".join(
        block.get("text", "")
        for block in payload.get("content", [])
        if block.get("type") == "text"
    )

    try:
        parsed = json.loads(_strip_json_wrapping(content))
        validated = AIRecommendationPayload.model_validate(parsed)
        result = validated.model_dump()
        if status == "limited_data":
            result["confidence"] = min(result["confidence"], 0.62)
        elif status == "provisional_data":
            result["confidence"] = min(result["confidence"], 0.5)
        if history_quality == "mixed":
            result["confidence"] = min(result["confidence"], 0.68)
        elif history_quality == "seeded":
            result["confidence"] = min(result["confidence"], 0.55)
        elif history_quality == "candle_fallback":
            result["confidence"] = min(result["confidence"], 0.5)
        return result
    except (json.JSONDecodeError, ValidationError) as exc:
        logger.warning("Claude returned invalid JSON recommendation, using fallback: %s", exc)
        return _rule_based_recommendation(
            indicators,
            status=status,
            history_quality=history_quality,
            data_points=data_points,
            real_data_points=real_data_points,
            synthetic_data_points=synthetic_data_points,
            fallback_candle_points=fallback_candle_points,
        )


async def generate_recommendation(
    db: Session,
    *,
    base: str,
    quote: str,
    invoice_amount: float = 10000.0,
) -> dict[str, Any]:
    normalized_base = base.upper()
    normalized_quote = quote.upper()

    history_window = await ensure_history_window(
        db,
        base=normalized_base,
        quote=normalized_quote,
        days=30,
    )
    points = history_window["points"]
    data_points = len(points)
    real_data_points = sum(1 for point in points if not point["is_synthetic"])
    synthetic_data_points = sum(1 for point in points if point["is_synthetic"])
    history_quality: HistoryQuality = history_window["source"]
    fallback_candle_points = 0

    if data_points < 7 and history_quality != "same_currency":
        try:
            candle_points = await _load_candle_fallback_points(
                db,
                base=normalized_base,
                quote=normalized_quote,
            )
        except FXProviderError as exc:
            logger.warning(
                "FX candle fallback failed for recommendation %s/%s: %s",
                normalized_base,
                normalized_quote,
                exc,
            )
            candle_points = []

        if candle_points:
            fallback_candle_points = len(candle_points)
            status: RecommendationStatus = "provisional_data"
            history_quality = "candle_fallback"
            indicators = calculate_indicators(candle_points, history_quality=history_quality)
        else:
            if not points:
                raise ValueError(f"No stored FX history is available for {normalized_base}/{normalized_quote}")
            status = "insufficient_data"
            indicators = calculate_indicators(points, history_quality=history_window["source"])
    else:
        if not points:
            raise ValueError(f"No stored FX history is available for {normalized_base}/{normalized_quote}")

        if data_points < 14:
            if data_points < 7:
                status = "insufficient_data"
            else:
                status = "limited_data"
        else:
            status = "ready"
        indicators = calculate_indicators(points, history_quality=history_quality)

    recommendation = await get_ai_recommendation(
        normalized_base,
        normalized_quote,
        invoice_amount,
        indicators,
        status=status,
        history_quality=history_quality,
        data_points=data_points,
        real_data_points=real_data_points,
        synthetic_data_points=synthetic_data_points,
        fallback_candle_points=fallback_candle_points,
    )

    return {
        **recommendation,
        "status": status,
        "history_quality": history_quality,
        "indicators": indicators,
        "data_points": data_points,
        "real_data_points": real_data_points,
        "synthetic_data_points": synthetic_data_points,
        "contains_synthetic": synthetic_data_points > 0,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "base": normalized_base,
        "quote": normalized_quote,
        "amount": round(invoice_amount, 2),
    }
