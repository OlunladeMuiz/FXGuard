import asyncio
import logging
import os
from datetime import date, datetime, time, timedelta, timezone
from statistics import mean, pstdev
from typing import Any, Literal

import httpx
from sqlalchemy.orm import Session

from sqlalchemy.dialects.postgresql import insert as postgres_insert
from sqlalchemy.dialects.sqlite import insert as sqlite_insert

from app.models.fx_candle import FXCandle
from app.models.fx_rate import FXRate

logger = logging.getLogger(__name__)

EXCHANGE_RATE_API_KEY = os.getenv("EXCHANGE_RATE_API_KEY")
EXCHANGE_RATE_API_BASE_URL = os.getenv(
    "EXCHANGE_RATE_API_BASE_URL",
    "https://v6.exchangerate-api.com/v6",
)
TWELVE_DATA_API_KEY = os.getenv("TWELVE_DATA_API_KEY")
TWELVE_DATA_BASE_URL = os.getenv(
    "TWELVE_DATA_BASE_URL",
    "https://api.twelvedata.com",
)
DEFAULT_SYNTHETIC_SEED_DAYS = max(int(os.getenv("FX_HISTORY_SEED_DAYS", "30")), 30)
SUPPORTED_FX_CURRENCIES = ("USD", "EUR", "GBP", "NGN", "CAD", "AUD", "JPY", "INR")
DEFAULT_HISTORY_PERIOD = "30d"
HISTORICAL_UNAVAILABLE_ERROR_TYPES = {
    "plan-upgrade-required",
    "historical-data-unavailable",
}
HistoryPeriod = Literal["1d", "7d", "30d", "90d", "1y"]
CandleRange = Literal["1d", "7d", "30d", "90d", "1y"]
CandleInterval = Literal["1min", "5min", "15min", "30min", "1h", "4h", "1day", "1week"]


class FXProviderError(RuntimeError):
    def __init__(self, error_type: str, message: str | None = None):
        self.error_type = error_type
        super().__init__(message or error_type)


class HistoricalRatesUnavailable(FXProviderError):
    pass


def normalize_currency_code(value: str) -> str:
    cleaned = value.strip().upper()
    if len(cleaned) != 3:
        raise ValueError("Currency codes must be 3 characters long")
    return cleaned


def period_to_days(period: HistoryPeriod) -> int:
    return {
        "1d": 1,
        "7d": 7,
        "30d": 30,
        "90d": 90,
        "1y": 365,
    }[period]


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _utc_today() -> date:
    return _utc_now().date()


def _combine_date(value: date) -> datetime:
    return datetime.combine(value, time.min, tzinfo=timezone.utc)


def candle_range_to_timedelta(range_value: CandleRange) -> timedelta:
    return timedelta(days=period_to_days(range_value))


def candle_interval_to_timedelta(interval: CandleInterval) -> timedelta:
    return {
        "1min": timedelta(minutes=1),
        "5min": timedelta(minutes=5),
        "15min": timedelta(minutes=15),
        "30min": timedelta(minutes=30),
        "1h": timedelta(hours=1),
        "4h": timedelta(hours=4),
        "1day": timedelta(days=1),
        "1week": timedelta(days=7),
    }[interval]


def _normalize_timestamp(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _parse_provider_timestamp(value: str) -> datetime:
    for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%d"):
        try:
            return datetime.strptime(value, fmt).replace(tzinfo=timezone.utc)
        except ValueError:
            continue
    raise FXProviderError("invalid-timestamp", f"Provider returned an unsupported timestamp: {value}")


def _dedupe_quotes(base: str, quotes: list[str] | tuple[str, ...]) -> list[str]:
    seen: set[str] = set()
    normalized_quotes: list[str] = []
    for quote in quotes:
        normalized_quote = normalize_currency_code(quote)
        if normalized_quote == base or normalized_quote in seen:
            continue
        seen.add(normalized_quote)
        normalized_quotes.append(normalized_quote)
    return normalized_quotes


def _daterange(start_date: date, end_date: date) -> list[date]:
    total_days = (end_date - start_date).days
    return [start_date + timedelta(days=offset) for offset in range(total_days + 1)]


def _build_virtual_points(
    base: str,
    quote: str,
    start_date: date,
    end_date: date,
) -> list[dict[str, Any]]:
    return [
        {
            "base": base,
            "quote": quote,
            "rate": 1.0,
            "observed_on": observed_on,
            "source": "same_currency",
            "is_synthetic": False,
        }
        for observed_on in _daterange(start_date, end_date)
    ]


def _build_virtual_candles(
    *,
    start_time: datetime,
    end_time: datetime,
    interval: CandleInterval,
) -> list[dict[str, Any]]:
    candles: list[dict[str, Any]] = []
    current = start_time
    step = candle_interval_to_timedelta(interval)
    while current <= end_time:
        candles.append(
            {
                "timestamp": current,
                "open": 1.0,
                "high": 1.0,
                "low": 1.0,
                "close": 1.0,
                "source": "same_currency",
            }
        )
        current += step
    return candles


def _calculate_history_stats(points: list[dict[str, Any]]) -> dict[str, float]:
    rates = [float(point["rate"]) for point in points]
    avg_rate = mean(rates)
    std_dev = pstdev(rates) if len(rates) > 1 else 0.0
    normalized_volatility = min((std_dev / avg_rate) * 10, 1.0) if avg_rate else 0.0

    return {
        "min": round(min(rates), 5),
        "max": round(max(rates), 5),
        "avg": round(avg_rate, 5),
        "volatility": round(normalized_volatility, 3),
        "standard_deviation": round(std_dev, 5),
    }


def _calculate_candle_stats(candles: list[dict[str, Any]]) -> dict[str, float]:
    closes = [float(candle["close"]) for candle in candles]
    avg_close = mean(closes)
    std_dev = pstdev(closes) if len(closes) > 1 else 0.0
    normalized_volatility = min((std_dev / avg_close) * 10, 1.0) if avg_close else 0.0
    first_close = closes[0]
    last_close = closes[-1]
    change_percent = ((last_close - first_close) / first_close) * 100 if first_close else 0.0

    return {
        "min": round(min(candle["low"] for candle in candles), 5),
        "max": round(max(candle["high"] for candle in candles), 5),
        "avg": round(avg_close, 5),
        "volatility": round(normalized_volatility, 3),
        "standard_deviation": round(std_dev, 5),
        "change_percent": round(change_percent, 3),
    }


def _count_quality(points: list[dict[str, Any]]) -> tuple[int, int]:
    synthetic_points = sum(1 for point in points if point["is_synthetic"])
    return len(points) - synthetic_points, synthetic_points


def _quality_label(base: str, quote: str, points: list[dict[str, Any]]) -> str:
    if base == quote:
        return "same_currency"

    real_points, synthetic_points = _count_quality(points)
    if synthetic_points == 0:
        return "full"
    if real_points == 0:
        return "seeded"
    return "mixed"


def _upsert_fx_rate(
    db: Session,
    *,
    base: str,
    quote: str,
    observed_on: date,
    rate: float,
    source: str,
    is_synthetic: bool,
) -> None:
    now = _utc_now()
    values = {
        "id": f"{base}-{quote}-{observed_on.isoformat()}",
        "base_currency": base,
        "quote_currency": quote,
        "observed_on": observed_on,
        "rate": round(float(rate), 6),
        "source": source,
        "is_synthetic": is_synthetic,
        "created_at": now,
        "updated_at": now,
    }
    update_values = {
        "rate": values["rate"],
        "source": source,
        "is_synthetic": is_synthetic,
        "updated_at": now,
    }

    dialect_name = db.get_bind().dialect.name
    table = FXRate.__table__

    if dialect_name == "sqlite":
        statement = sqlite_insert(table).values(**values)
        statement = statement.on_conflict_do_update(
            index_elements=["base_currency", "quote_currency", "observed_on"],
            set_=update_values,
        )
        db.execute(statement)
        return

    if dialect_name == "postgresql":
        statement = postgres_insert(table).values(**values)
        statement = statement.on_conflict_do_update(
            index_elements=["base_currency", "quote_currency", "observed_on"],
            set_=update_values,
        )
        db.execute(statement)
        return

    existing = (
        db.query(FXRate)
        .filter(
            FXRate.base_currency == base,
            FXRate.quote_currency == quote,
            FXRate.observed_on == observed_on,
        )
        .first()
    )
    if existing is None:
        db.add(FXRate(**values))
        return

    existing.rate = values["rate"]
    existing.source = source
    existing.is_synthetic = is_synthetic
    existing.updated_at = now


def _upsert_fx_candle(
    db: Session,
    *,
    base: str,
    quote: str,
    interval: CandleInterval,
    timestamp: datetime,
    open_rate: float,
    high_rate: float,
    low_rate: float,
    close_rate: float,
    source: str,
) -> None:
    now = _utc_now()
    normalized_timestamp = _normalize_timestamp(timestamp)
    values = {
        "id": f"{base}-{quote}-{interval}-{normalized_timestamp.isoformat()}",
        "base_currency": base,
        "quote_currency": quote,
        "interval": interval,
        "timestamp": normalized_timestamp,
        "open_rate": round(float(open_rate), 6),
        "high_rate": round(float(high_rate), 6),
        "low_rate": round(float(low_rate), 6),
        "close_rate": round(float(close_rate), 6),
        "source": source,
        "created_at": now,
        "updated_at": now,
    }
    update_values = {
        "open_rate": values["open_rate"],
        "high_rate": values["high_rate"],
        "low_rate": values["low_rate"],
        "close_rate": values["close_rate"],
        "source": source,
        "updated_at": now,
    }

    dialect_name = db.get_bind().dialect.name
    table = FXCandle.__table__

    if dialect_name == "sqlite":
        statement = sqlite_insert(table).values(**values)
        statement = statement.on_conflict_do_update(
            index_elements=["base_currency", "quote_currency", "interval", "timestamp"],
            set_=update_values,
        )
        db.execute(statement)
        return

    if dialect_name == "postgresql":
        statement = postgres_insert(table).values(**values)
        statement = statement.on_conflict_do_update(
            index_elements=["base_currency", "quote_currency", "interval", "timestamp"],
            set_=update_values,
        )
        db.execute(statement)
        return

    existing = (
        db.query(FXCandle)
        .filter(
            FXCandle.base_currency == base,
            FXCandle.quote_currency == quote,
            FXCandle.interval == interval,
            FXCandle.timestamp == normalized_timestamp,
        )
        .first()
    )
    if existing is None:
        db.add(FXCandle(**values))
        return

    existing.open_rate = values["open_rate"]
    existing.high_rate = values["high_rate"]
    existing.low_rate = values["low_rate"]
    existing.close_rate = values["close_rate"]
    existing.source = source
    existing.updated_at = now


def _query_pair_history(
    db: Session,
    *,
    base: str,
    quote: str,
    start_date: date,
    end_date: date,
) -> list[FXRate]:
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


def _query_candles(
    db: Session,
    *,
    base: str,
    quote: str,
    interval: CandleInterval,
    start_time: datetime,
    end_time: datetime,
) -> list[FXCandle]:
    return (
        db.query(FXCandle)
        .filter(
            FXCandle.base_currency == base,
            FXCandle.quote_currency == quote,
            FXCandle.interval == interval,
            FXCandle.timestamp >= _normalize_timestamp(start_time),
            FXCandle.timestamp <= _normalize_timestamp(end_time),
        )
        .order_by(FXCandle.timestamp.asc())
        .all()
    )


def _query_exact_rows(
    db: Session,
    *,
    base: str,
    quotes: list[str],
    observed_on: date,
) -> list[FXRate]:
    if not quotes:
        return []

    return (
        db.query(FXRate)
        .filter(
            FXRate.base_currency == base,
            FXRate.quote_currency.in_(quotes),
            FXRate.observed_on == observed_on,
        )
        .all()
    )


def _query_latest_rows(
    db: Session,
    *,
    base: str,
    quotes: list[str],
) -> list[FXRate]:
    latest_rows: list[FXRate] = []
    for quote in quotes:
        row = (
            db.query(FXRate)
            .filter(
                FXRate.base_currency == base,
                FXRate.quote_currency == quote,
            )
            .order_by(FXRate.observed_on.desc())
            .first()
        )
        if row is not None:
            latest_rows.append(row)
    return latest_rows


def _parse_provider_date(payload: dict[str, Any], fallback: date) -> date:
    last_update_unix = payload.get("time_last_update_unix")
    if isinstance(last_update_unix, int):
        return datetime.fromtimestamp(last_update_unix, tz=timezone.utc).date()
    return fallback


def _is_historical_unavailable_error(*, observed_on: date | None, error_type: str) -> bool:
    if observed_on is None or observed_on >= _utc_today():
        return False
    return error_type in HISTORICAL_UNAVAILABLE_ERROR_TYPES


def _extract_conversion_rates(payload: dict[str, Any]) -> dict[str, float]:
    conversion_rates = payload.get("conversion_rates")
    if not isinstance(conversion_rates, dict):
        raise FXProviderError("invalid-response", "Provider response did not include conversion_rates")
    return {
        str(currency).upper(): float(rate)
        for currency, rate in conversion_rates.items()
        if isinstance(currency, str)
    }


async def _fetch_twelve_data_payload(
    client: httpx.AsyncClient,
    *,
    base: str,
    quote: str,
    interval: CandleInterval,
    start_time: datetime,
    end_time: datetime,
) -> dict[str, Any]:
    if not TWELVE_DATA_API_KEY:
        raise FXProviderError("missing-api-key", "TWELVE_DATA_API_KEY is not configured")

    params = {
        "symbol": f"{base}/{quote}",
        "interval": interval,
        "start_date": _normalize_timestamp(start_time).strftime("%Y-%m-%d %H:%M:%S"),
        "end_date": _normalize_timestamp(end_time).strftime("%Y-%m-%d %H:%M:%S"),
        "order": "ASC",
        "timezone": "UTC",
        "apikey": TWELVE_DATA_API_KEY,
    }

    try:
        response = await client.get(f"{TWELVE_DATA_BASE_URL}/time_series", params=params)
        response.raise_for_status()
    except httpx.HTTPStatusError as exc:
        raise FXProviderError(
            f"http-{exc.response.status_code}",
            f"Twelve Data request failed with status {exc.response.status_code}",
        ) from exc

    payload = response.json()
    if str(payload.get("status", "")).lower() == "error":
        message = str(payload.get("message") or payload.get("code") or "unknown provider error")
        raise FXProviderError("provider-error", f"Twelve Data returned an error: {message}")
    if "values" not in payload:
        raise FXProviderError("invalid-response", "Twelve Data response did not include values")
    return payload


def _extract_twelve_candles(payload: dict[str, Any]) -> list[dict[str, Any]]:
    raw_values = payload.get("values")
    if not isinstance(raw_values, list) or not raw_values:
        raise FXProviderError("missing-candles", "No candle data was returned by Twelve Data")

    candles: list[dict[str, Any]] = []
    for raw_value in raw_values:
        if not isinstance(raw_value, dict):
            continue

        timestamp = raw_value.get("datetime")
        open_rate = raw_value.get("open")
        high_rate = raw_value.get("high")
        low_rate = raw_value.get("low")
        close_rate = raw_value.get("close")

        if not all(isinstance(value, str) for value in (timestamp, open_rate, high_rate, low_rate, close_rate)):
            continue

        candles.append(
            {
                "timestamp": _parse_provider_timestamp(timestamp),
                "open": float(open_rate),
                "high": float(high_rate),
                "low": float(low_rate),
                "close": float(close_rate),
                "source": "twelve_data",
            }
        )

    if not candles:
        raise FXProviderError("missing-candles", "No usable candle data was returned by Twelve Data")

    return candles


async def _fetch_provider_payload(
    client: httpx.AsyncClient,
    *,
    base: str,
    observed_on: date | None = None,
) -> dict[str, Any]:
    if not EXCHANGE_RATE_API_KEY:
        raise FXProviderError("missing-api-key", "EXCHANGE_RATE_API_KEY is not configured")

    if observed_on is None or observed_on >= _utc_today():
        path = f"latest/{base}"
        fallback_date = _utc_today()
        resolve_date_from_payload = True
    else:
        path = f"history/{base}/{observed_on.year}/{observed_on.month}/{observed_on.day}"
        fallback_date = observed_on
        resolve_date_from_payload = False

    try:
        response = await client.get(f"{EXCHANGE_RATE_API_BASE_URL}/{EXCHANGE_RATE_API_KEY}/{path}")
        response.raise_for_status()
    except httpx.HTTPStatusError as exc:
        error_type = f"http-{exc.response.status_code}"
        message = f"ExchangeRate API request failed with status {exc.response.status_code}"

        try:
            payload = exc.response.json()
        except ValueError:
            payload = None

        if isinstance(payload, dict):
            provider_error_type = payload.get("error-type")
            if provider_error_type:
                error_type = str(provider_error_type)
                message = f"ExchangeRate API request failed: {provider_error_type}"

        if _is_historical_unavailable_error(observed_on=observed_on, error_type=error_type):
            raise HistoricalRatesUnavailable(error_type, f"Historical FX data is unavailable: {error_type}") from exc

        raise FXProviderError(error_type, message) from exc

    payload = response.json()

    if payload.get("result") == "error":
        error_type = str(payload.get("error-type", "unknown-provider-error"))
        if observed_on is not None and observed_on < _utc_today():
            raise HistoricalRatesUnavailable(error_type, f"Historical FX data is unavailable: {error_type}")
        raise FXProviderError(error_type, f"ExchangeRate API returned: {error_type}")

    payload["_observed_on"] = _parse_provider_date(payload, fallback_date) if resolve_date_from_payload else fallback_date
    return payload


async def _sync_provider_snapshot(
    db: Session,
    *,
    base: str,
    quotes: list[str],
    observed_on: date | None = None,
    allow_synthetic: bool = True,
) -> None:
    quotes_to_sync = _dedupe_quotes(base, quotes)
    if not quotes_to_sync:
        return

    async with httpx.AsyncClient(timeout=15.0) as client:
        try:
            payload = await _fetch_provider_payload(client, base=base, observed_on=observed_on)
            rates = _extract_conversion_rates(payload)
            snapshot_date = payload["_observed_on"]
            for quote in quotes_to_sync:
                if quote not in rates:
                    raise FXProviderError("missing-rate", f"Provider response omitted {base}/{quote}")
                _upsert_fx_rate(
                    db,
                    base=base,
                    quote=quote,
                    observed_on=snapshot_date,
                    rate=rates[quote],
                    source="exchange_rate_api",
                    is_synthetic=False,
                )
            db.commit()
            return
        except HistoricalRatesUnavailable:
            if not allow_synthetic or observed_on is None:
                raise

            latest_payload = await _fetch_provider_payload(client, base=base)
            latest_rates = _extract_conversion_rates(latest_payload)
            for quote in quotes_to_sync:
                if quote not in latest_rates:
                    raise FXProviderError("missing-rate", f"Provider response omitted {base}/{quote}")
                _upsert_fx_rate(
                    db,
                    base=base,
                    quote=quote,
                    observed_on=observed_on,
                    rate=latest_rates[quote],
                    source="seeded_history",
                    is_synthetic=True,
                )
            db.commit()


async def _fetch_pair_history_for_dates(
    client: httpx.AsyncClient,
    *,
    base: str,
    quote: str,
    missing_dates: list[date],
) -> dict[date, float]:
    if not missing_dates:
        return {}

    ordered_dates = sorted(missing_dates)
    first_date = ordered_dates[0]
    semaphore = asyncio.Semaphore(8)

    async def fetch_one(observed_on: date) -> tuple[date, float]:
        async with semaphore:
            payload = await _fetch_provider_payload(client, base=base, observed_on=observed_on)
            rates = _extract_conversion_rates(payload)
            if quote not in rates:
                raise FXProviderError("missing-rate", f"Provider response omitted {base}/{quote}")
            return observed_on, float(rates[quote])

    first_observed_on, first_rate = await fetch_one(first_date)
    remaining_dates = [observed_on for observed_on in ordered_dates if observed_on != first_date]
    results: list[tuple[date, float]] = [(first_observed_on, first_rate)]

    if remaining_dates:
        results.extend(await asyncio.gather(*[fetch_one(observed_on) for observed_on in remaining_dates]))

    return {observed_on: rate for observed_on, rate in results}


async def ensure_history_window(
    db: Session,
    *,
    base: str,
    quote: str,
    days: int,
) -> dict[str, Any]:
    normalized_base = normalize_currency_code(base)
    normalized_quote = normalize_currency_code(quote)
    end_date = _utc_today()
    start_date = end_date - timedelta(days=max(days - 1, 0))

    if normalized_base == normalized_quote:
        points = _build_virtual_points(normalized_base, normalized_quote, start_date, end_date)
        return {
            "base": normalized_base,
            "quote": normalized_quote,
            "points": points,
            "source": "same_currency",
            "contains_synthetic": False,
        }

    existing_rows = _query_pair_history(
        db,
        base=normalized_base,
        quote=normalized_quote,
        start_date=start_date,
        end_date=end_date,
    )
    existing_dates = {row.observed_on for row in existing_rows}
    missing_dates = [observed_on for observed_on in _daterange(start_date, end_date) if observed_on not in existing_dates]

    if missing_dates:
        latest_needed = end_date in missing_dates
        historical_dates = [observed_on for observed_on in missing_dates if observed_on < end_date]

        try:
            if latest_needed or not existing_rows:
                await _sync_provider_snapshot(
                    db,
                    base=normalized_base,
                    quotes=[normalized_quote],
                )

            if historical_dates:
                async with httpx.AsyncClient(timeout=15.0) as client:
                    try:
                        historical_rates = await _fetch_pair_history_for_dates(
                            client,
                            base=normalized_base,
                            quote=normalized_quote,
                            missing_dates=historical_dates,
                        )
                        for observed_on, rate in historical_rates.items():
                            _upsert_fx_rate(
                                db,
                                base=normalized_base,
                                quote=normalized_quote,
                                observed_on=observed_on,
                                rate=rate,
                                source="exchange_rate_api",
                                is_synthetic=False,
                            )
                        db.commit()
                    except HistoricalRatesUnavailable:
                        anchor_row = (
                            db.query(FXRate)
                            .filter(
                                FXRate.base_currency == normalized_base,
                                FXRate.quote_currency == normalized_quote,
                            )
                            .order_by(FXRate.observed_on.desc())
                            .first()
                        )
                        if anchor_row is None:
                            raise FXProviderError(
                                "insufficient-anchor-rate",
                                f"No stored or live anchor rate is available for {normalized_base}/{normalized_quote}",
                            )

                        seed_window_start = min(
                            start_date,
                            end_date - timedelta(days=DEFAULT_SYNTHETIC_SEED_DAYS - 1),
                        )
                        for observed_on in _daterange(seed_window_start, end_date):
                            if observed_on >= end_date:
                                continue
                            _upsert_fx_rate(
                                db,
                                base=normalized_base,
                                quote=normalized_quote,
                                observed_on=observed_on,
                                rate=anchor_row.rate,
                                source="seeded_history",
                                is_synthetic=True,
                            )
                        db.commit()
        except FXProviderError as exc:
            logger.warning(
                "FX history sync failed for %s/%s: %s",
                normalized_base,
                normalized_quote,
                exc,
            )

    rows = _query_pair_history(
        db,
        base=normalized_base,
        quote=normalized_quote,
        start_date=start_date,
        end_date=end_date,
    )
    points = [
        {
            "base": row.base_currency,
            "quote": row.quote_currency,
            "rate": float(row.rate),
            "observed_on": row.observed_on,
            "source": row.source,
            "is_synthetic": bool(row.is_synthetic),
        }
        for row in rows
    ]

    return {
        "base": normalized_base,
        "quote": normalized_quote,
        "points": points,
        "source": _quality_label(normalized_base, normalized_quote, points),
        "contains_synthetic": any(point["is_synthetic"] for point in points),
    }


def _estimate_min_expected_candles(
    *,
    range_value: CandleRange,
    interval: CandleInterval,
) -> int:
    expected = int(candle_range_to_timedelta(range_value) / candle_interval_to_timedelta(interval))
    return max(2, int(expected * 0.6))


async def _sync_twelve_candles(
    db: Session,
    *,
    base: str,
    quote: str,
    interval: CandleInterval,
    start_time: datetime,
    end_time: datetime,
) -> None:
    async with httpx.AsyncClient(timeout=20.0) as client:
        payload = await _fetch_twelve_data_payload(
            client,
            base=base,
            quote=quote,
            interval=interval,
            start_time=start_time,
            end_time=end_time,
        )
        candles = _extract_twelve_candles(payload)
        for candle in candles:
            _upsert_fx_candle(
                db,
                base=base,
                quote=quote,
                interval=interval,
                timestamp=candle["timestamp"],
                open_rate=candle["open"],
                high_rate=candle["high"],
                low_rate=candle["low"],
                close_rate=candle["close"],
                source=candle["source"],
            )
        db.commit()


async def get_fx_candles_response(
    db: Session,
    *,
    base: str,
    quote: str,
    range_value: CandleRange,
    interval: CandleInterval,
) -> dict[str, Any]:
    normalized_base = normalize_currency_code(base)
    normalized_quote = normalize_currency_code(quote)
    end_time = _utc_now().replace(second=0, microsecond=0)
    start_time = end_time - candle_range_to_timedelta(range_value)

    if normalized_base == normalized_quote:
        candles = _build_virtual_candles(
            start_time=start_time,
            end_time=end_time,
            interval=interval,
        )
        stats = _calculate_candle_stats(candles)
        return {
            "pair": f"{normalized_base}/{normalized_quote}",
            "base": normalized_base,
            "quote": normalized_quote,
            "range": range_value,
            "interval": interval,
            "data": candles,
            "stats": stats,
            "data_points": len(candles),
            "source": "same_currency",
        }

    candles = _query_candles(
        db,
        base=normalized_base,
        quote=normalized_quote,
        interval=interval,
        start_time=start_time,
        end_time=end_time,
    )

    expected_min_points = _estimate_min_expected_candles(range_value=range_value, interval=interval)
    interval_delta = candle_interval_to_timedelta(interval)
    latest_expected = end_time - (interval_delta * 2)
    needs_sync = (
        len(candles) < expected_min_points
        or not candles
        or candles[0].timestamp > start_time + interval_delta
        or candles[-1].timestamp < latest_expected
    )

    if needs_sync:
        try:
            await _sync_twelve_candles(
                db,
                base=normalized_base,
                quote=normalized_quote,
                interval=interval,
                start_time=start_time,
                end_time=end_time,
            )
            candles = _query_candles(
                db,
                base=normalized_base,
                quote=normalized_quote,
                interval=interval,
                start_time=start_time,
                end_time=end_time,
            )
        except FXProviderError as exc:
            logger.warning(
                "FX candle sync failed for %s/%s [%s %s]: %s",
                normalized_base,
                normalized_quote,
                range_value,
                interval,
                exc,
            )
            if not candles:
                raise

    if not candles:
        raise FXProviderError(
            "missing-candles",
            f"No stored candle data is available for {normalized_base}/{normalized_quote}",
        )

    normalized_candles = [
        {
            "timestamp": _normalize_timestamp(candle.timestamp),
            "open": float(candle.open_rate),
            "high": float(candle.high_rate),
            "low": float(candle.low_rate),
            "close": float(candle.close_rate),
            "source": candle.source,
        }
        for candle in candles
    ]
    stats = _calculate_candle_stats(normalized_candles)

    return {
        "pair": f"{normalized_base}/{normalized_quote}",
        "base": normalized_base,
        "quote": normalized_quote,
        "range": range_value,
        "interval": interval,
        "data": normalized_candles,
        "stats": stats,
        "data_points": len(normalized_candles),
        "source": normalized_candles[0]["source"],
    }


async def get_fx_rates(
    db: Session,
    *,
    base: str,
    quotes: list[str] | None = None,
    observed_on: date | None = None,
) -> dict[str, Any]:
    normalized_base = normalize_currency_code(base)
    normalized_quotes = _dedupe_quotes(normalized_base, quotes or list(SUPPORTED_FX_CURRENCIES))
    target_date = observed_on if observed_on is not None else _utc_today()
    sync_error: FXProviderError | None = None

    rate_items: list[dict[str, Any]] = [
        {
            "base": normalized_base,
            "quote": normalized_base,
            "rate": 1.0,
            "timestamp": _combine_date(target_date),
            "observed_on": target_date,
            "source": "same_currency",
            "is_synthetic": False,
        }
    ]

    if observed_on is None:
        stored_rows = _query_latest_rows(db, base=normalized_base, quotes=normalized_quotes)
        stored_by_quote = {row.quote_currency: row for row in stored_rows}
        stale_quotes = [
            quote
            for quote in normalized_quotes
            if quote not in stored_by_quote or stored_by_quote[quote].observed_on < _utc_today()
        ]
        if stale_quotes:
            try:
                await _sync_provider_snapshot(db, base=normalized_base, quotes=stale_quotes)
                stored_rows = _query_latest_rows(db, base=normalized_base, quotes=normalized_quotes)
            except FXProviderError as exc:
                logger.warning("Latest FX sync failed for %s: %s", normalized_base, exc)
                sync_error = exc
    else:
        stored_rows = _query_exact_rows(
            db,
            base=normalized_base,
            quotes=normalized_quotes,
            observed_on=target_date,
        )
        stored_by_quote = {row.quote_currency: row for row in stored_rows}
        missing_quotes = [quote for quote in normalized_quotes if quote not in stored_by_quote]
        if missing_quotes:
            try:
                await _sync_provider_snapshot(
                    db,
                    base=normalized_base,
                    quotes=missing_quotes,
                    observed_on=target_date,
                )
                stored_rows = _query_exact_rows(
                    db,
                    base=normalized_base,
                    quotes=normalized_quotes,
                    observed_on=target_date,
                )
            except FXProviderError as exc:
                logger.warning(
                    "Historical FX sync failed for %s on %s: %s",
                    normalized_base,
                    target_date.isoformat(),
                    exc,
                )
                sync_error = exc

    stored_by_quote = {row.quote_currency: row for row in stored_rows}
    missing_quotes = [quote for quote in normalized_quotes if quote not in stored_by_quote]
    if missing_quotes:
        if sync_error is not None:
            raise sync_error

        missing_pair = f"{normalized_base}/{missing_quotes[0]}"
        if observed_on is None:
            raise FXProviderError("missing-rate", f"Conversion rate unavailable for {missing_pair}")
        raise FXProviderError(
            "missing-rate",
            f"Conversion rate unavailable for {missing_pair} on {target_date.isoformat()}",
        )

    for row in stored_rows:
        rate_items.append(
            {
                "base": row.base_currency,
                "quote": row.quote_currency,
                "rate": float(row.rate),
                "timestamp": _combine_date(row.observed_on),
                "observed_on": row.observed_on,
                "source": row.source,
                "is_synthetic": bool(row.is_synthetic),
            }
        )

    return {
        "data": rate_items,
        "timestamp": _utc_now(),
    }


async def get_fx_history_response(
    db: Session,
    *,
    base: str,
    quote: str,
    period: HistoryPeriod = DEFAULT_HISTORY_PERIOD,
) -> dict[str, Any]:
    days = period_to_days(period)
    history_window = await ensure_history_window(
        db,
        base=base,
        quote=quote,
        days=days,
    )
    points = history_window["points"]
    if not points:
        raise FXProviderError("insufficient-data", f"No stored FX history is available for {base}/{quote}")

    stats = _calculate_history_stats(points)
    real_data_points, synthetic_data_points = _count_quality(points)

    return {
        "pair": f"{history_window['base']}/{history_window['quote']}",
        "base": history_window["base"],
        "quote": history_window["quote"],
        "period": period,
        "data": [
            {
                "date": point["observed_on"],
                "rate": round(float(point["rate"]), 5),
            }
            for point in points
        ],
        "stats": stats,
        "data_points": len(points),
        "real_data_points": real_data_points,
        "synthetic_data_points": synthetic_data_points,
        "contains_synthetic": history_window["contains_synthetic"],
        "source": history_window["source"],
    }
