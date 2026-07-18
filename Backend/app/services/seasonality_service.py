from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone


@dataclass(frozen=True)
class SeasonalitySignal:
    key: str
    label: str
    level: str
    score: float
    message: str


FIXED_NG_HOLIDAYS = (
    ("01-01", "New Year's Day"),
    ("05-01", "Workers' Day"),
    ("06-12", "Democracy Day"),
    ("10-01", "Independence Day"),
    ("12-25", "Christmas Day"),
    ("12-26", "Boxing Day"),
)


def _today() -> date:
    return datetime.now(timezone.utc).date()


def _month_end(date_value: date) -> date:
    next_month = date_value.replace(day=28) + timedelta(days=4)
    return next_month - timedelta(days=next_month.day)


def _days_until(target: date, base: date) -> int:
    return (target - base).days


def _holiday_signals(today: date) -> list[SeasonalitySignal]:
    signals: list[SeasonalitySignal] = []
    for month_day, label in FIXED_NG_HOLIDAYS:
        holiday = date.fromisoformat(f"{today.year}-{month_day}")
        days_until = _days_until(holiday, today)
        if -1 <= days_until <= 3:
            level = "medium" if days_until >= 0 else "low"
            score = 0.25 if days_until >= 0 else 0.15
            signals.append(
                SeasonalitySignal(
                    key="holiday",
                    label=label,
                    level=level,
                    score=score,
                    message=f"Holiday window ({label}) can alter FX liquidity.",
                )
            )
    return signals


def _month_end_signal(today: date) -> SeasonalitySignal | None:
    end_date = _month_end(today)
    days_until = _days_until(end_date, today)
    if 0 <= days_until <= 5:
        score = 0.4 if days_until <= 2 else 0.25
        level = "high" if days_until <= 2 else "medium"
        return SeasonalitySignal(
            key="month_end",
            label="Month-end settlement pressure",
            level=level,
            score=score,
            message="Month-end typically increases USD demand from importers and corporates.",
        )
    return None


def _quarter_end_signal(today: date) -> SeasonalitySignal | None:
    if today.month in (3, 6, 9, 12):
        end_date = _month_end(today)
        days_until = _days_until(end_date, today)
        if 0 <= days_until <= 7:
            return SeasonalitySignal(
                key="quarter_end",
                label="Quarter-end repatriation",
                level="medium",
                score=0.3,
                message="Quarter-end repatriation can improve USD supply temporarily.",
            )
    return None


def _december_signal(today: date) -> SeasonalitySignal | None:
    if today.month == 12:
        return SeasonalitySignal(
            key="december",
            label="Diaspora inflows",
            level="medium",
            score=0.2,
            message="Holiday remittances often increase FX supply in December.",
        )
    return None


def get_seasonality_snapshot(reference_date: date | None = None) -> dict:
    today = reference_date or _today()
    signals: list[SeasonalitySignal] = []

    month_end = _month_end_signal(today)
    if month_end:
        signals.append(month_end)

    quarter_end = _quarter_end_signal(today)
    if quarter_end:
        signals.append(quarter_end)

    december = _december_signal(today)
    if december:
        signals.append(december)

    signals.extend(_holiday_signals(today))

    composite = round(sum(signal.score for signal in signals), 3)
    composite_level = "low"
    if composite >= 0.7:
        composite_level = "high"
    elif composite >= 0.4:
        composite_level = "medium"

    return {
        "as_of": today.isoformat(),
        "composite_score": composite,
        "composite_level": composite_level,
        "signals": [
            {
                "key": signal.key,
                "label": signal.label,
                "level": signal.level,
                "score": signal.score,
                "message": signal.message,
            }
            for signal in signals
        ],
    }
