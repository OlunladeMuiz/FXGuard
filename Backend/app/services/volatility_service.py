from __future__ import annotations

from datetime import date, datetime, timedelta, timezone
from math import log, sqrt
from statistics import mean, pstdev
from typing import Iterable

from sqlalchemy.orm import Session

from app.models.fx_rate import FXRate


def _utc_today() -> date:
    return datetime.now(timezone.utc).date()


def _pair_rates(
    db: Session,
    *,
    base: str,
    quote: str,
    days: int,
) -> list[FXRate]:
    end_date = _utc_today()
    start_date = end_date - timedelta(days=max(days - 1, 0))
    return (
        db.query(FXRate)
        .filter(
            FXRate.base_currency == base,
            FXRate.quote_currency == quote,
            FXRate.observed_on >= start_date,
            FXRate.observed_on <= end_date,
        )
        .order_by(FXRate.observed_on.asc())
        .all()
    )


def _log_returns(values: Iterable[float]) -> list[float]:
    values_list = list(values)
    if len(values_list) < 2:
        return []
    returns: list[float] = []
    for prev, current in zip(values_list, values_list[1:]):
        if prev <= 0 or current <= 0:
            continue
        returns.append(log(current / prev))
    return returns


def _garch_volatility(returns: list[float]) -> float:
    """
    Simple GARCH(1,1) volatility estimate.
    Uses fixed parameters that balance stability with responsiveness.
    Returns daily volatility as a percent.
    """
    if len(returns) < 2:
        return 0.0

    alpha = 0.12
    beta = 0.85
    long_run_var = pstdev(returns) ** 2 if len(returns) > 1 else 0.0
    omega = max(long_run_var * (1 - alpha - beta), 1e-8)

    variance = long_run_var or 1e-6
    for r in returns:
        variance = omega + alpha * (r ** 2) + beta * variance

    daily_vol = sqrt(variance)
    return round(daily_vol * 100, 4)


def _risk_level(volatility_pct: float) -> str:
    if volatility_pct <= 0.5:
        return "LOW"
    if volatility_pct <= 1.5:
        return "MEDIUM"
    if volatility_pct <= 3.0:
        return "HIGH"
    return "CRITICAL"


def get_garch_risk_snapshot(
    db: Session,
    *,
    pairs: list[str],
    window_days: int = 60,
) -> list[dict]:
    results: list[dict] = []
    for pair in pairs:
        if "/" in pair:
            base, quote = pair.split("/", 1)
        elif "_" in pair:
            base, quote = pair.split("_", 1)
        else:
            continue

        base = base.strip().upper()
        quote = quote.strip().upper()
        rows = _pair_rates(db, base=base, quote=quote, days=window_days)
        rates = [float(row.rate) for row in rows]
        returns = _log_returns(rates)
        garch_vol = _garch_volatility(returns)
        realized = round(pstdev(rates) / mean(rates) * 100, 3) if len(rates) > 1 else 0.0

        results.append(
            {
                "pair": f"{base}/{quote}",
                "window_days": window_days,
                "garch_volatility_pct": garch_vol,
                "realized_volatility_pct": realized,
                "risk_level": _risk_level(garch_vol),
                "data_points": len(rates),
                "last_observed_at": rows[-1].observed_on.isoformat() if rows else None,
            }
        )

    return results
