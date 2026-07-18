import logging
import os
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.models.fx_rate_snapshot import FXRateSnapshot
from app.models.spread_snapshot import SpreadSnapshot

logger = logging.getLogger(__name__)

# Historical CBN intervention spread thresholds (derived from 2021-2025 data)
RISK_THRESHOLDS = {
    "LOW": 3.0,      # < 3% spread: healthy, convertible
    "MEDIUM": 6.0,   # 3-6%: watch closely
    "HIGH": 10.0,    # 6-10%: elevated risk
    # > 10%: CRITICAL - CBN intervention historically likely
}
ALLOW_SYNTHETIC_DATA = os.getenv("ALLOW_SYNTHETIC_DATA", "false").strip().lower() == "true"

OFFICIAL_SOURCES = ["cbn_official"]
if ALLOW_SYNTHETIC_DATA:
    OFFICIAL_SOURCES.append("synthetic_official")

PARALLEL_SOURCES = ["abokifx_parallel", "nairatoday_parallel", "nairatoday_bdc"]
if ALLOW_SYNTHETIC_DATA:
    PARALLEL_SOURCES.append("synthetic_parallel")

BDC_SOURCES = ["nairatoday_bdc"]
if ALLOW_SYNTHETIC_DATA:
    BDC_SOURCES.append("synthetic_bdc")

SOURCE_FRESHNESS_WINDOWS = {
    "cbn_official": timedelta(hours=36),
    "abokifx_parallel": timedelta(hours=8),
    "nairatoday_parallel": timedelta(hours=8),
    "nairatoday_bdc": timedelta(hours=8),
}
SPREAD_REFRESH_WINDOW = timedelta(hours=2)
SOURCE_REQUIRED_ENV_VARS = {
    "abokifx_parallel": "ABOKIFX_AUTH_TOKEN",
}


def _to_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _latest_snapshot_for_source(
    db: Session,
    *,
    base_currency: str,
    quote_currency: str,
    source: str,
) -> FXRateSnapshot | None:
    return (
        db.query(FXRateSnapshot)
        .filter(
            FXRateSnapshot.base_currency == base_currency,
            FXRateSnapshot.quote_currency == quote_currency,
            FXRateSnapshot.source == source,
        )
        .order_by(FXRateSnapshot.recorded_at.desc())
        .first()
    )


def _source_is_configured(source: str) -> bool:
    required_env_var = SOURCE_REQUIRED_ENV_VARS.get(source)
    if not required_env_var:
        return True
    return bool((os.getenv(required_env_var) or "").strip())


def _select_snapshot(
    db: Session,
    *,
    base_currency: str,
    quote_currency: str,
    sources: list[str],
    now: datetime,
    allow_stale_fallback: bool = True,
) -> FXRateSnapshot | None:
    fresh_candidates: list[tuple[int, float, FXRateSnapshot]] = []
    stale_candidates: list[tuple[int, float, FXRateSnapshot]] = []

    for priority, source in enumerate(sources):
        if not _source_is_configured(source):
            continue

        row = _latest_snapshot_for_source(
            db,
            base_currency=base_currency,
            quote_currency=quote_currency,
            source=source,
        )
        if not row:
            continue

        age_seconds = (now - _to_utc(row.recorded_at)).total_seconds()
        freshness_window = SOURCE_FRESHNESS_WINDOWS.get(source, timedelta(hours=12))
        candidate = (priority, age_seconds, row)

        if age_seconds <= freshness_window.total_seconds():
            fresh_candidates.append(candidate)
        else:
            stale_candidates.append(candidate)

    if fresh_candidates:
        fresh_candidates.sort(key=lambda item: (item[0], item[1]))
        return fresh_candidates[0][2]

    if allow_stale_fallback and stale_candidates:
        stale_candidates.sort(key=lambda item: (item[0], item[1]))
        return stale_candidates[0][2]

    return None


def compute_and_store_spread(db: Session, *, now: datetime | None = None) -> dict | None:
    """
    Read the latest official and parallel rates from fx_rate_snapshots,
    compute the spread, classify risk level, store a SpreadSnapshot,
    and return the spread dict.
    """
    as_of = now or datetime.now(timezone.utc)

    official_row = _select_snapshot(
        db,
        base_currency="USD",
        quote_currency="NGN",
        sources=OFFICIAL_SOURCES,
        now=as_of,
    )

    # Prefer the supported AbokiFX API only when it is fresh. Fall back to
    # NairaToday when the supported API is unavailable or stale.
    parallel_row = _select_snapshot(
        db,
        base_currency="USD",
        quote_currency="NGN",
        sources=PARALLEL_SOURCES,
        now=as_of,
    )

    bdc_row = _select_snapshot(
        db,
        base_currency="USD",
        quote_currency="NGN",
        sources=BDC_SOURCES,
        now=as_of,
        # Keep the latest known BDC value visible even when the public feed
        # goes stale. The dashboard can surface freshness separately.
        allow_stale_fallback=True,
    )

    if not official_row or not parallel_row:
        logger.warning("Spread compute skipped: missing official or parallel rate")
        return None

    official_rate = official_row.rate
    parallel_rate = parallel_row.rate
    bdc_rate = bdc_row.rate if bdc_row else None

    spread_ngn = parallel_rate - official_rate
    spread_pct = (spread_ngn / official_rate) * 100 if official_rate else 0.0

    if spread_pct < RISK_THRESHOLDS["LOW"]:
        risk_level = "LOW"
    elif spread_pct < RISK_THRESHOLDS["MEDIUM"]:
        risk_level = "MEDIUM"
    elif spread_pct < RISK_THRESHOLDS["HIGH"]:
        risk_level = "HIGH"
    else:
        risk_level = "CRITICAL"

    week_ago = as_of - timedelta(days=7)
    old_snapshot = (
        db.query(SpreadSnapshot)
        .filter(SpreadSnapshot.recorded_at <= week_ago)
        .order_by(SpreadSnapshot.recorded_at.desc())
        .first()
    )
    if old_snapshot:
        if spread_pct > old_snapshot.spread_pct + 0.5:
            direction = "widening"
        elif spread_pct < old_snapshot.spread_pct - 0.5:
            direction = "converging"
        else:
            direction = "stable"
    else:
        direction = "stable"

    snapshot = SpreadSnapshot(
        base_currency="USD",
        quote_currency="NGN",
        official_rate=official_rate,
        parallel_rate=parallel_rate,
        bdc_rate=bdc_rate,
        spread_ngn=round(spread_ngn, 2),
        spread_pct=round(spread_pct, 3),
        spread_direction=direction,
        risk_level=risk_level,
        recorded_at=as_of,
    )
    db.add(snapshot)
    db.commit()

    official_src = official_row.source if official_row else None
    parallel_src = parallel_row.source if parallel_row else None
    bdc_src = bdc_row.source if bdc_row else None

    is_synthetic = False
    for src in [official_src, parallel_src, bdc_src]:
        if src and "synthetic" in src:
            is_synthetic = True

    return {
        "official_rate": official_rate,
        "parallel_rate": parallel_rate,
        "bdc_rate": bdc_rate,
        "spread_ngn": round(spread_ngn, 2),
        "spread_pct": round(spread_pct, 3),
        "spread_direction": direction,
        "risk_level": risk_level,
        "risk_message": _risk_message(risk_level, spread_pct, parallel_src),
        "official_source": official_src,
        "parallel_source": parallel_src,
        "bdc_source": bdc_src,
        "recorded_at": as_of.isoformat(),
        "is_synthetic": is_synthetic,
    }


def get_current_spread(db: Session) -> dict | None:
    now = datetime.now(timezone.utc)
    snapshot = (
        db.query(SpreadSnapshot)
        .order_by(SpreadSnapshot.recorded_at.desc())
        .first()
    )

    latest_official = _select_snapshot(
        db,
        base_currency="USD",
        quote_currency="NGN",
        sources=OFFICIAL_SOURCES,
        now=now,
        allow_stale_fallback=True,
    )
    latest_parallel = _select_snapshot(
        db,
        base_currency="USD",
        quote_currency="NGN",
        sources=PARALLEL_SOURCES,
        now=now,
        allow_stale_fallback=True,
    )
    latest_bdc = _select_snapshot(
        db,
        base_currency="USD",
        quote_currency="NGN",
        sources=BDC_SOURCES,
        now=now,
        allow_stale_fallback=True,
    )

    should_refresh = False
    if latest_official and latest_parallel:
        latest_required_input = max(
            _to_utc(latest_official.recorded_at),
            _to_utc(latest_parallel.recorded_at),
        )
        if snapshot is None:
            should_refresh = True
        else:
            spread_recorded_at = _to_utc(snapshot.recorded_at)
            should_refresh = (
                spread_recorded_at < latest_required_input
                or now - spread_recorded_at > SPREAD_REFRESH_WINDOW
            )
            if not should_refresh:
                expected_bdc_rate = latest_bdc.rate if latest_bdc else None
                should_refresh = (
                    abs(snapshot.official_rate - latest_official.rate) > 0.0001
                    or abs(snapshot.parallel_rate - latest_parallel.rate) > 0.0001
                    or snapshot.bdc_rate != expected_bdc_rate
                )

    if should_refresh:
        refreshed = compute_and_store_spread(db, now=now)
        if refreshed:
            return refreshed

    if not snapshot:
        return None

    official_src = latest_official.source if latest_official else OFFICIAL_SOURCES[0]
    parallel_src = latest_parallel.source if latest_parallel else None
    bdc_src = latest_bdc.source if latest_bdc else None

    is_synthetic = False
    for src in [official_src, parallel_src, bdc_src]:
        if src and "synthetic" in src:
            is_synthetic = True

    return {
        "official_rate": snapshot.official_rate,
        "parallel_rate": snapshot.parallel_rate,
        "bdc_rate": snapshot.bdc_rate,
        "spread_ngn": snapshot.spread_ngn,
        "spread_pct": snapshot.spread_pct,
        "spread_direction": snapshot.spread_direction,
        "risk_level": snapshot.risk_level,
        "risk_message": _risk_message(
            snapshot.risk_level,
            snapshot.spread_pct,
            parallel_src,
        ),
        "official_source": official_src,
        "parallel_source": parallel_src,
        "bdc_source": bdc_src,
        "recorded_at": snapshot.recorded_at.isoformat(),
        "is_synthetic": is_synthetic,
    }


def _risk_message(risk_level: str, spread_pct: float, parallel_source: str | None) -> str:
    messages = {
        "LOW": f"Spread is {spread_pct:.1f}% - market is healthy, good time to convert",
        "MEDIUM": f"Spread is {spread_pct:.1f}% - monitor closely before converting",
        "HIGH": f"Spread is {spread_pct:.1f}% - elevated risk, consider waiting",
        "CRITICAL": f"Spread is {spread_pct:.1f}% - CBN intervention historically likely at this level",
    }
    message = messages.get(risk_level, "Unknown risk level")

    if parallel_source == "nairatoday_parallel":
        return f"{message} Using NairaToday open-market data as the parallel source."
    if parallel_source == "nairatoday_bdc":
        return f"{message} Using NairaToday BDC data as the available parallel proxy."

    return message
