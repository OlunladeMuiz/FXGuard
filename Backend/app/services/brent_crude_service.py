import logging
import os
from datetime import datetime, time, timezone

import httpx
from sqlalchemy.orm import Session

from app.models.brent_crude import BrentCrude

logger = logging.getLogger(__name__)
ALPHA_VANTAGE_API_KEY = os.getenv("ALPHA_VANTAGE_API_KEY")
ALPHA_VANTAGE_URL = "https://www.alphavantage.co/query"


def _parse_brent_record(record: dict) -> tuple[datetime, float] | None:
    date_value = record.get("date")
    price_value = record.get("value")
    if not isinstance(date_value, str) or not isinstance(price_value, str):
        return None

    try:
        parsed_date = datetime.strptime(date_value.strip(), "%Y-%m-%d").date()
        price_usd = float(price_value)
    except ValueError:
        return None

    recorded_at = datetime.combine(parsed_date, time.min, tzinfo=timezone.utc)
    return recorded_at, price_usd


def _upsert_brent_record(
    db: Session,
    *,
    recorded_at: datetime,
    price_usd: float,
    weekly_change_pct: float | None,
) -> None:
    existing = (
        db.query(BrentCrude)
        .filter(BrentCrude.recorded_at == recorded_at)
        .first()
    )
    if existing is None:
        db.add(
            BrentCrude(
                price_usd=price_usd,
                weekly_change_pct=weekly_change_pct,
                source="alpha_vantage",
                recorded_at=recorded_at,
            )
        )
        return

    existing.price_usd = price_usd
    existing.weekly_change_pct = weekly_change_pct
    existing.source = "alpha_vantage"


async def fetch_brent_crude(db: Session) -> dict | None:
    """
    Fetch Brent crude prices from Alpha Vantage.
    Stores the full returned daily series in brent_crude table.
    Returns signal dict or None on failure.
    """
    if not ALPHA_VANTAGE_API_KEY:
        logger.warning("ALPHA_VANTAGE_API_KEY not configured â€” skipping Brent crude fetch")
        return None

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(
                ALPHA_VANTAGE_URL,
                params={
                    "function": "BRENT",
                    "interval": "daily",
                    "apikey": ALPHA_VANTAGE_API_KEY,
                },
            )
            response.raise_for_status()
            data = response.json()
    except httpx.HTTPError as exc:
        logger.error("Brent crude fetch error: %s", exc)
        return None

    records = data.get("data", [])
    if not records:
        logger.warning("Alpha Vantage returned no Brent crude data")
        return None

    try:
        parsed_records = [
            parsed_record
            for raw_record in records
            if isinstance(raw_record, dict)
            for parsed_record in [_parse_brent_record(raw_record)]
            if parsed_record is not None
        ]
        if not parsed_records:
            logger.warning("Alpha Vantage Brent payload contained no usable rows")
            return None

        parsed_records.sort(key=lambda item: item[0], reverse=True)

        weekly_changes: dict[datetime, float | None] = {}
        for index, (recorded_at, price_usd) in enumerate(parsed_records):
            weekly_change_pct = None
            if index + 7 < len(parsed_records):
                week_ago_price = parsed_records[index + 7][1]
                if week_ago_price:
                    weekly_change_pct = ((price_usd - week_ago_price) / week_ago_price) * 100
            weekly_changes[recorded_at] = weekly_change_pct

        for recorded_at, price_usd in parsed_records:
            _upsert_brent_record(
                db,
                recorded_at=recorded_at,
                price_usd=price_usd,
                weekly_change_pct=weekly_changes.get(recorded_at),
            )

        db.commit()
        current_recorded_at, current_price = parsed_records[0]
        weekly_change_pct = weekly_changes.get(current_recorded_at)
        logger.info("Brent crude stored %d records, latest $%.2f/bbl", len(parsed_records), current_price)
        return _build_signal(current_price, weekly_change_pct)
    except (KeyError, ValueError, TypeError) as exc:
        db.rollback()
        logger.error("Brent crude parse error: %s", exc)
        return None


def get_brent_signal(db: Session) -> dict:
    """
    Return the current Brent crude signal from the latest stored record.
    """
    latest = (
        db.query(BrentCrude)
        .order_by(BrentCrude.recorded_at.desc())
        .first()
    )
    if not latest:
        return {
            "current_price": None,
            "weekly_change_pct": None,
            "signal": "NEUTRAL",
            "risk_flag": False,
            "message": "No Brent crude data available yet",
        }
    return _build_signal(latest.price_usd, latest.weekly_change_pct)


def _build_signal(price: float, weekly_change_pct: float | None) -> dict:
    signal = "NEUTRAL"
    risk_flag = False

    if weekly_change_pct is not None:
        if weekly_change_pct > 3.0:
            signal = "POSITIVE"
        elif weekly_change_pct < -3.0:
            signal = "NEGATIVE"
            if weekly_change_pct < -7.0:
                risk_flag = True

    return {
        "current_price": round(price, 2),
        "weekly_change_pct": round(weekly_change_pct, 3) if weekly_change_pct is not None else None,
        "signal": signal,
        "risk_flag": risk_flag,
        "message": (
            "Falling oil prices put pressure on NGN â€” elevated depreciation risk"
            if signal == "NEGATIVE"
            else "Rising oil prices support NGN â€” favorable for conversion timing"
            if signal == "POSITIVE"
            else "Oil prices stable â€” neutral NGN impact"
        ),
    }
