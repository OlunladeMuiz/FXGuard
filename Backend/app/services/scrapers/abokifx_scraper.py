import logging
import os
import re
from datetime import datetime, timezone

import httpx
from sqlalchemy.orm import Session

from app.models.fx_rate_snapshot import FXRateSnapshot

logger = logging.getLogger(__name__)

ABOKIFX_API_BASE_URL = (os.getenv("ABOKIFX_API_BASE_URL") or "https://abokifx.com/api/v1").rstrip("/")
ABOKIFX_AUTH_TOKEN = (os.getenv("ABOKIFX_AUTH_TOKEN") or "").strip() or None


def _flatten_rate_entries(payload: dict) -> list[dict]:
    response = payload.get("response")
    if isinstance(response, dict):
        entries: list[dict] = []
        for value in response.values():
            if isinstance(value, list):
                entries.extend([entry for entry in value if isinstance(entry, dict)])
        return entries

    if isinstance(response, list):
        return [entry for entry in response if isinstance(entry, dict)]

    return []


def _parse_currency_rate(raw_value: str | None) -> tuple[float | None, float | None, float | None]:
    rate_text = (raw_value or "").strip()
    numbers = re.findall(r"\d[\d,]*(?:\.\d+)?", rate_text)
    if not numbers:
        return None, None, None

    parsed = [float(value.replace(",", "")) for value in numbers]
    if len(parsed) >= 2:
        buying_rate, selling_rate = parsed[0], parsed[1]
        return selling_rate, buying_rate, selling_rate

    rate = parsed[0]
    return rate, None, None


async def scrape_abokifx_rates(db: Session) -> bool:
    """
    Fetch USD/NGN parallel market data from the supported AbokiFX API.
    Returns True if a rate was stored successfully.
    """
    if not ABOKIFX_AUTH_TOKEN:
        logger.warning("ABOKIFX_AUTH_TOKEN not configured — skipping AbokiFX API ingestion")
        return False

    try:
        async with httpx.AsyncClient(timeout=20.0, follow_redirects=True) as client:
            response = await client.get(
                f"{ABOKIFX_API_BASE_URL}/rates/movement",
                headers={
                    "Accept": "application/json",
                    "Authorization": f"Bearer {ABOKIFX_AUTH_TOKEN}",
                    "User-Agent": "Mozilla/5.0 FXGuard/1.0",
                },
            )
            response.raise_for_status()
    except httpx.HTTPError as exc:
        logger.error("AbokiFX scraper HTTP error: %s", exc)
        return False

    entries = _flatten_rate_entries(response.json())
    usd_entry = next(
        (
            entry for entry in entries
            if str(entry.get("currency_name", "")).strip().upper() == "USD"
            and "parallel" in str(entry.get("currency_type", "")).lower()
        ),
        None,
    )
    if usd_entry is None:
        usd_entry = next(
            (
                entry for entry in entries
                if str(entry.get("currency_name", "")).strip().upper() == "USD"
            ),
            None,
        )

    if usd_entry is None:
        logger.warning("AbokiFX API returned no USD entry")
        return False

    rate, buying_rate, selling_rate = _parse_currency_rate(usd_entry.get("currency_rate"))
    if rate is None or rate <= 0:
        logger.warning("AbokiFX API returned an unparseable USD rate: %s", usd_entry.get("currency_rate"))
        return False

    try:
        snapshot = FXRateSnapshot(
            base_currency="USD",
            quote_currency="NGN",
            rate=rate,
            buying_rate=buying_rate,
            selling_rate=selling_rate,
            source="abokifx_parallel",
            rate_type="parallel",
            recorded_at=datetime.now(timezone.utc),
        )
        db.add(snapshot)
        db.commit()
        logger.info("AbokiFX parallel rate stored: USD/NGN = %.2f", rate)
        return True
    except Exception as exc:
        db.rollback()
        logger.error("AbokiFX scraper DB error: %s", exc, exc_info=True)
        return False
