import logging
import os
from datetime import date, datetime, time, timedelta, timezone
from statistics import median

from sqlalchemy.orm import Session

from app.models.fx_rate import FXRate
from app.models.fx_rate_snapshot import FXRateSnapshot
from app.services.brent_crude_service import get_brent_signal
from app.services.spread_service import get_current_spread

logger = logging.getLogger(__name__)

SNAPSHOT_SOURCE_REQUIRED_ENV_VARS = {
    "abokifx_parallel": "ABOKIFX_AUTH_TOKEN",
}

SNAPSHOT_SOURCE_GROUPS = {
    "official": ["cbn_official"],
    "parallel": ["abokifx_parallel", "nairatoday_parallel", "nairatoday_bdc"],
    "bdc": ["nairatoday_bdc"],
}

RATE_SOURCE_LABELS = {
    "market": "market FX history",
    "official": "official CBN history",
    "parallel": "parallel market history",
    "bdc": "BDC history",
    "exchange_rate_api": "ExchangeRate API market history",
    "cbn_official": "CBN official history",
    "abokifx_parallel": "AbokiFX parallel history",
    "nairatoday_parallel": "NairaToday parallel history",
    "nairatoday_bdc": "NairaToday BDC history",
}

SNAPSHOT_RATE_SUPPORTED_PAIRS = {
    ("USD", "NGN"),
}

WAIT_INSIGHT_HORIZONS = (3, 7, 14)
WAIT_INSIGHT_MIN_SAMPLE_SIZE = 3
WAIT_INSIGHT_TARGET_SAMPLE_SIZE = 5
WAIT_INSIGHT_TOLERANCE_STEPS_PCT = (0.25, 0.5, 1.0, 2.0, 3.0)
SIMULATOR_MIN_SIGNAL_DAYS = 7


def _utc_today() -> date:
    return datetime.now(timezone.utc).date()


def _is_snapshot_source_configured(source: str) -> bool:
    required_env_var = SNAPSHOT_SOURCE_REQUIRED_ENV_VARS.get(source)
    if not required_env_var:
        return True
    return bool((os.getenv(required_env_var) or "").strip())


def _resolve_snapshot_sources(source_key: str | None) -> tuple[list[str] | None, str]:
    normalized = (source_key or "market").strip().lower()

    if normalized in ("market", "interbank", "exchange_rate_api"):
        return None, "market"
    if normalized in ("official", "cbn"):
        normalized = "official"
    elif normalized in ("parallel", "black"):
        normalized = "parallel"
    elif normalized in ("bdc", "bureau"):
        normalized = "bdc"

    source_group = SNAPSHOT_SOURCE_GROUPS.get(normalized)
    if source_group is not None:
        enabled_sources = [source for source in source_group if _is_snapshot_source_configured(source)]
        return enabled_sources, normalized

    if normalized in RATE_SOURCE_LABELS:
        enabled_sources = [normalized] if _is_snapshot_source_configured(normalized) else []
        return enabled_sources, normalized

    return None, "market"


def _pair_supports_snapshot_history(base_currency: str, quote_currency: str) -> bool:
    return (
        base_currency.upper(),
        quote_currency.upper(),
    ) in SNAPSHOT_RATE_SUPPORTED_PAIRS


def _first_better_rate_wait_days(
    rows: list[tuple[date, float, str]],
    start_index: int,
) -> int | None:
    anchor_date, anchor_rate, _ = rows[start_index]
    for later_date, later_rate, _ in rows[start_index + 1:]:
        if later_rate > anchor_rate:
            return (later_date - anchor_date).days
    return None


def _select_wait_comparable_indexes(
    rows: list[tuple[date, float, str]],
    today_rate: float,
) -> tuple[list[int], float | None]:
    if today_rate <= 0:
        return [], None

    history_rows = rows[:-1]
    fallback_indexes: list[int] = []
    fallback_tolerance_pct: float | None = None

    for tolerance_pct in WAIT_INSIGHT_TOLERANCE_STEPS_PCT:
        comparable_indexes = [
            index
            for index, (_observed_on, rate, _source) in enumerate(history_rows)
            if abs(rate - today_rate) / today_rate * 100 <= tolerance_pct
        ]

        if len(comparable_indexes) >= WAIT_INSIGHT_TARGET_SAMPLE_SIZE:
            return comparable_indexes, tolerance_pct

        if len(comparable_indexes) >= WAIT_INSIGHT_MIN_SAMPLE_SIZE:
            fallback_indexes = comparable_indexes
            fallback_tolerance_pct = tolerance_pct
            break

    return fallback_indexes, fallback_tolerance_pct


def _build_wait_insight(
    rows: list[tuple[date, float, str]],
    *,
    today_rate: float,
) -> dict:
    windows = [
        {
            "horizon_days": horizon_days,
            "eligible_samples": 0,
            "better_rate_probability_pct": None,
        }
        for horizon_days in WAIT_INSIGHT_HORIZONS
    ]

    if len(rows) < WAIT_INSIGHT_MIN_SAMPLE_SIZE + 1:
        return {
            "available": False,
            "comparable_sample_size": 0,
            "rate_tolerance_pct": None,
            "avg_days_to_better": None,
            "median_days_to_better": None,
            "windows": windows,
            "note": (
                "Not enough real historical depth is stored yet to estimate a genuine wait window "
                "from similar past days."
            ),
        }

    comparable_indexes, tolerance_pct = _select_wait_comparable_indexes(rows, today_rate)
    if not comparable_indexes or tolerance_pct is None:
        return {
            "available": False,
            "comparable_sample_size": 0,
            "rate_tolerance_pct": None,
            "avg_days_to_better": None,
            "median_days_to_better": None,
            "windows": windows,
            "note": (
                "There are not enough past days near today's rate to estimate a genuine wait window "
                "for this pair and rate basis yet."
            ),
        }

    last_observed_on = rows[-1][0]
    wait_days_within_max_horizon: list[int] = []
    max_horizon = WAIT_INSIGHT_HORIZONS[-1]

    for window in windows:
        horizon_days = window["horizon_days"]
        eligible_indexes = [
            index
            for index in comparable_indexes
            if (last_observed_on - rows[index][0]).days >= horizon_days
        ]
        window["eligible_samples"] = len(eligible_indexes)

        if not eligible_indexes:
            continue

        successful_waits: list[int] = []
        for index in eligible_indexes:
            wait_days = _first_better_rate_wait_days(rows, index)
            if wait_days is not None and wait_days <= horizon_days:
                successful_waits.append(wait_days)

        window["better_rate_probability_pct"] = round(
            (len(successful_waits) / len(eligible_indexes)) * 100,
            1,
        )

        if horizon_days == max_horizon:
            wait_days_within_max_horizon = successful_waits

    available = any(
        window["eligible_samples"] >= WAIT_INSIGHT_MIN_SAMPLE_SIZE
        for window in windows
    )

    if not available:
        return {
            "available": False,
            "comparable_sample_size": len(comparable_indexes),
            "rate_tolerance_pct": tolerance_pct,
            "avg_days_to_better": None,
            "median_days_to_better": None,
            "windows": windows,
            "note": (
                f"Found {len(comparable_indexes)} past day(s) within {tolerance_pct:.2f}% of today's rate, "
                "but not enough of them have full forward history to estimate a genuine wait window yet."
            ),
        }

    avg_days_to_better = (
        round(sum(wait_days_within_max_horizon) / len(wait_days_within_max_horizon), 1)
        if wait_days_within_max_horizon
        else None
    )
    median_days_to_better = (
        round(float(median(wait_days_within_max_horizon)), 1)
        if wait_days_within_max_horizon
        else None
    )
    window_sample_note = ", ".join(
        f"{window['horizon_days']}d n={window['eligible_samples']}"
        for window in windows
        if window["eligible_samples"] > 0
    )
    note = (
        f"Based on {len(comparable_indexes)} past day(s) within {tolerance_pct:.2f}% of today's rate. "
        f"These odds are empirical, not a forecast. Each horizon only counts comparable days with full "
        f"forward coverage ({window_sample_note})."
    )
    if avg_days_to_better is None:
        note += " None of those comparable days saw a better rate within 14 days."

    return {
        "available": True,
        "comparable_sample_size": len(comparable_indexes),
        "rate_tolerance_pct": tolerance_pct,
        "avg_days_to_better": avg_days_to_better,
        "median_days_to_better": median_days_to_better,
        "windows": windows,
        "note": note,
    }


def _select_snapshot_history_rows(
    snapshot_rows: list[FXRateSnapshot],
    *,
    source_priority: list[str],
) -> list[FXRateSnapshot]:
    day_source_latest: dict[date, dict[str, FXRateSnapshot]] = {}
    for row in snapshot_rows:
        day = row.recorded_at.date()
        day_bucket = day_source_latest.setdefault(day, {})
        existing = day_bucket.get(row.source)
        if existing is None or row.recorded_at > existing.recorded_at:
            day_bucket[row.source] = row

    selected_rows: list[FXRateSnapshot] = []
    for day in sorted(day_source_latest.keys()):
        day_bucket = day_source_latest[day]
        for source in source_priority:
            selected = day_bucket.get(source)
            if selected is not None:
                selected_rows.append(selected)
                break

    return selected_rows


def _filter_snapshot_history_rows(
    snapshot_rows: list[FXRateSnapshot],
    *,
    base_currency: str,
    quote_currency: str,
    snapshot_sources: list[str],
    end_time: datetime,
) -> list[FXRateSnapshot]:
    allowed_sources = set(snapshot_sources)
    filtered_rows: list[FXRateSnapshot] = []

    for row in snapshot_rows:
        recorded_at = getattr(row, "recorded_at", None)
        if recorded_at is None or recorded_at >= end_time:
            continue
        if getattr(row, "source", None) not in allowed_sources:
            continue
        if getattr(row, "base_currency", base_currency) != base_currency:
            continue
        if getattr(row, "quote_currency", quote_currency) != quote_currency:
            continue
        filtered_rows.append(row)

    filtered_rows.sort(key=lambda row: row.recorded_at)
    return filtered_rows


def _select_snapshot_comparison_rows(
    snapshot_rows: list[FXRateSnapshot],
    *,
    start_date: date,
    lookback_days: int,
) -> tuple[list[FXRateSnapshot], dict | None]:
    calendar_window_rows = [
        row for row in snapshot_rows if row.recorded_at.date() >= start_date
    ]

    fallback_target = min(max(lookback_days, 1), len(snapshot_rows))
    if (
        len(calendar_window_rows) >= fallback_target
        or len(calendar_window_rows) == len(snapshot_rows)
    ):
        return calendar_window_rows, None

    extended_rows = snapshot_rows[-fallback_target:]
    if not extended_rows or extended_rows[0].recorded_at.date() >= start_date:
        return calendar_window_rows, None

    return extended_rows, {
        "requested_lookback_days": lookback_days,
        "calendar_window_days": len(calendar_window_rows),
        "effective_start_date": extended_rows[0].recorded_at.date(),
        "effective_end_date": extended_rows[-1].recorded_at.date(),
    }


def _build_market_quality_note(
    *,
    base_currency: str,
    quote_currency: str,
    current_row: FXRate,
    lookback_days: int,
    real_data_points: int,
    synthetic_data_points: int,
    comparison_data_points: int,
) -> str | None:
    notes: list[str] = []

    if current_row.is_synthetic:
        notes.append(
            f"The latest market rate is seeded fallback data from {current_row.observed_on.isoformat()}, not a fresh live market close."
        )

    if synthetic_data_points > 0 and real_data_points > 0:
        notes.append(
            f"{synthetic_data_points} seeded day(s) were excluded from best/worst and percentile math, leaving {comparison_data_points} real day(s) in the comparison."
        )
    elif synthetic_data_points > 0:
        notes.append(
            f"No real market closes are stored in the selected {lookback_days}-day window, so the simulator is relying on seeded fallback history."
        )

    if comparison_data_points < 7:
        notes.append(
            f"Only {comparison_data_points} comparable real market day(s) are available, so the timing signal is limited."
        )

    if {base_currency, quote_currency} == {"USD", "NGN"}:
        notes.append(
            "This market basis uses ExchangeRate API daily closes. The NGN dashboard stack uses CBN and NairaToday snapshot feeds, so small differences are expected."
        )

    return " ".join(notes) if notes else None


def _build_snapshot_quality_note(
    *,
    effective_rate_source: str,
    resolved_snapshot_sources: list[str],
    selected_rows: list[FXRateSnapshot],
    lookback_days: int,
    coverage_extension: dict | None,
) -> str | None:
    if not selected_rows:
        return None

    notes: list[str] = []
    latest_row = selected_rows[-1]
    source_label = RATE_SOURCE_LABELS.get(
        effective_rate_source,
        effective_rate_source.replace("_", " "),
    )
    latest_day = latest_row.recorded_at.date().isoformat()

    if effective_rate_source == "parallel" and "abokifx_parallel" not in resolved_snapshot_sources:
        notes.append("AbokiFX is not configured here, so the simulator is using NairaToday for the parallel lane.")

    if latest_row.source == "nairatoday_bdc" and effective_rate_source == "parallel":
        notes.append("The parallel lane is currently falling back to the NairaToday BDC snapshot as a proxy.")

    if coverage_extension is not None:
        notes.append(
            f"FXGuard was inactive for some calendar day(s), so the simulator widened beyond the selected "
            f"{lookback_days}-day calendar window. Only {coverage_extension['calendar_window_days']} stored "
            f"{source_label} day(s) fell inside that span, so the simulator used the latest {len(selected_rows)} "
            f"stored {source_label} "
            f"day(s), spanning {coverage_extension['effective_start_date'].isoformat()} to "
            f"{coverage_extension['effective_end_date'].isoformat()}."
        )

    if latest_day != _utc_today().isoformat():
        notes.append(f"The current {source_label} rate is the latest stored snapshot, observed on {latest_day}.")

    if len(selected_rows) < SIMULATOR_MIN_SIGNAL_DAYS:
        notes.append(
            f"Only {len(selected_rows)} comparable day(s) are stored for this {source_label} in the selected {lookback_days}-day window, so the timing signal is limited."
        )

    return " ".join(notes) if notes else None


def run_simulator(
    db: Session,
    base_currency: str,
    quote_currency: str,
    amount: float,
    lookback_days: int = 30,
    rate_source: str = "market",
) -> dict:
    """
    Compute conversion simulator output for any pair and amount.
    Uses stored FXRate history (existing fx_rates table).
    """
    today = _utc_today()
    start_date = today - timedelta(days=lookback_days)
    snapshot_sources, effective_rate_source = _resolve_snapshot_sources(rate_source)

    rows: list[tuple[date, float, str]] = []
    quality_note: str | None = None
    history_quality = "snapshot" if snapshot_sources else "full"
    real_data_points: int | None = None
    synthetic_data_points: int | None = None
    comparison_data_points: int | None = None
    current_rate: float | None = None
    current_rate_source: str | None = None
    current_rate_as_of: str | None = None

    if snapshot_sources:
        if not _pair_supports_snapshot_history(base_currency, quote_currency):
            source_label = RATE_SOURCE_LABELS.get(
                effective_rate_source,
                effective_rate_source.replace("_", " "),
            )
            return {
                "error": (
                    f"{source_label.capitalize()} is currently available only for USD/NGN snapshot feeds. "
                    f"Use market FX history for {base_currency}/{quote_currency}."
                ),
                "data_available": False,
            }

        end_time = datetime.combine(today + timedelta(days=1), time.min, tzinfo=timezone.utc)
        snapshot_rows = (
            db.query(FXRateSnapshot)
            .filter(
                FXRateSnapshot.base_currency == base_currency,
                FXRateSnapshot.quote_currency == quote_currency,
                FXRateSnapshot.source.in_(snapshot_sources),
                FXRateSnapshot.recorded_at < end_time,
            )
            .order_by(FXRateSnapshot.recorded_at.asc())
            .all()
        )

        if snapshot_rows:
            filtered_snapshot_rows = _filter_snapshot_history_rows(
                snapshot_rows,
                base_currency=base_currency,
                quote_currency=quote_currency,
                snapshot_sources=snapshot_sources,
                end_time=end_time,
            )
            selected_history_rows = _select_snapshot_history_rows(
                filtered_snapshot_rows,
                source_priority=snapshot_sources,
            )
            selected_rows, coverage_extension = _select_snapshot_comparison_rows(
                selected_history_rows,
                start_date=start_date,
                lookback_days=lookback_days,
            )
            rows = [
                (row.recorded_at.date(), float(row.rate), row.source)
                for row in selected_rows
            ]
            if selected_rows:
                latest_row = selected_rows[-1]
                comparison_data_points = len(selected_rows)
                current_rate = float(latest_row.rate)
                current_rate_source = latest_row.source
                current_rate_as_of = latest_row.recorded_at.date().isoformat()
                quality_note = _build_snapshot_quality_note(
                    effective_rate_source=effective_rate_source,
                    resolved_snapshot_sources=snapshot_sources,
                    selected_rows=selected_rows,
                    lookback_days=lookback_days,
                    coverage_extension=coverage_extension,
                )

        if not rows:
            return {
                "error": f"No {effective_rate_source} snapshot history available for {base_currency}/{quote_currency}",
                "data_available": False,
            }

    if not rows:
        fx_rows = (
            db.query(FXRate)
            .filter(
                FXRate.base_currency == base_currency,
                FXRate.quote_currency == quote_currency,
                FXRate.observed_on >= start_date,
                FXRate.observed_on <= today,
            )
            .order_by(FXRate.observed_on.asc())
            .all()
        )

        if fx_rows:
            current_row = fx_rows[-1]
            real_rows = [row for row in fx_rows if not bool(row.is_synthetic)]
            comparison_rows = real_rows or fx_rows
            real_data_points = len(real_rows)
            synthetic_data_points = len(fx_rows) - real_data_points
            comparison_data_points = len(comparison_rows)
            history_quality = (
                "mixed"
                if real_data_points and synthetic_data_points
                else "seeded"
                if synthetic_data_points
                else "full"
            )
            current_rate = float(current_row.rate)
            current_rate_source = current_row.source
            current_rate_as_of = current_row.observed_on.isoformat()
            quality_note = _build_market_quality_note(
                base_currency=base_currency,
                quote_currency=quote_currency,
                current_row=current_row,
                lookback_days=lookback_days,
                real_data_points=real_data_points,
                synthetic_data_points=synthetic_data_points,
                comparison_data_points=comparison_data_points,
            )
            rows = [
                (row.observed_on, float(row.rate), row.source)
                for row in comparison_rows
            ]

    if not rows:
        return {
            "error": f"No rate history available for {base_currency}/{quote_currency}",
            "data_available": False,
        }

    if current_rate is None:
        return {
            "error": f"No current rate available for {base_currency}/{quote_currency}",
            "data_available": False,
        }

    today_rate = current_rate
    best_date, best_rate, _best_source = max(rows, key=lambda item: item[1])
    worst_date, worst_rate, _worst_source = min(rows, key=lambda item: item[1])
    avg_rate = sum(rate for _, rate, _ in rows) / len(rows)

    today_converted = round(amount * today_rate, 2)
    best_converted = round(amount * best_rate, 2)
    worst_converted = round(amount * worst_rate, 2)
    avg_converted = round(amount * avg_rate, 2)

    opportunity_cost_vs_best = round(best_converted - today_converted, 2)
    opportunity_saved_vs_worst = round(today_converted - worst_converted, 2)
    opportunity_cost_pct = round((opportunity_cost_vs_best / best_converted) * 100, 2) if best_converted else 0.0

    rates_below_today = sum(1 for _, rate, _ in rows if today_rate >= rate)
    current_rate_percentile = round((rates_below_today / len(rows)) * 100, 1)
    wait_insight = _build_wait_insight(rows, today_rate=today_rate)

    spread = get_current_spread(db)
    brent = get_brent_signal(db)

    if len(rows) < SIMULATOR_MIN_SIGNAL_DAYS:
        recommendation = "Monitor"
        recommendation_reason = (
            f"Only {len(rows)} comparable day(s) are available for this {RATE_SOURCE_LABELS.get(effective_rate_source, effective_rate_source)}, so the timing signal is still limited."
        )
    elif current_rate_percentile >= 70:
        recommendation = "Convert Now"
        recommendation_reason = f"Today's rate is better than {current_rate_percentile:.0f}% of rates in the last {lookback_days} days"
    elif current_rate_percentile <= 30:
        recommendation = "Wait"
        recommendation_reason = f"Today's rate is in the bottom {100 - current_rate_percentile:.0f}% - better rates are likely available"
    else:
        recommendation = "Monitor"
        recommendation_reason = "Rate is near the period average - no strong signal either way"

    if spread and spread["risk_level"] in ("HIGH", "CRITICAL"):
        recommendation = "Wait"
        recommendation_reason = f"Spread risk is {spread['risk_level']} - market conditions are unfavorable"

    return {
        "data_available": True,
        "base_currency": base_currency,
        "quote_currency": quote_currency,
        "amount": amount,
        "lookback_days": lookback_days,
        "data_points": len(rows),
        "real_data_points": real_data_points if real_data_points is not None else len(rows),
        "synthetic_data_points": synthetic_data_points if synthetic_data_points is not None else 0,
        "comparison_data_points": comparison_data_points if comparison_data_points is not None else len(rows),
        "history_quality": history_quality,
        "current_rate_source": current_rate_source,
        "current_rate_as_of": current_rate_as_of,
        "today_rate": round(today_rate, 5),
        "today_converted": today_converted,
        "best_rate": round(best_rate, 5),
        "best_rate_date": best_date.isoformat(),
        "best_converted": best_converted,
        "worst_rate": round(worst_rate, 5),
        "worst_rate_date": worst_date.isoformat(),
        "worst_converted": worst_converted,
        "avg_rate": round(avg_rate, 5),
        "avg_converted": avg_converted,
        "opportunity_cost_vs_best": opportunity_cost_vs_best,
        "opportunity_saved_vs_worst": opportunity_saved_vs_worst,
        "opportunity_cost_pct": opportunity_cost_pct,
        "current_rate_percentile": current_rate_percentile,
        "recommendation": recommendation,
        "recommendation_reason": recommendation_reason,
        "spread_risk": spread["risk_level"] if spread else "UNKNOWN",
        "brent_signal": brent["signal"] if brent else "NEUTRAL",
        "quality_note": quality_note,
        "wait_insight": wait_insight,
    }
