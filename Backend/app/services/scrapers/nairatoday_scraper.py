import logging
import re
from datetime import datetime, timezone
from html import unescape

import httpx
from sqlalchemy.orm import Session

from app.models.fx_rate_snapshot import FXRateSnapshot

logger = logging.getLogger(__name__)

NAIRATODAY_USD_URL = "https://nairatoday.com/black-market-usd-ngn-2"


def _extract_labeled_rate(text: str, labels: list[str]) -> float | None:
    for label in labels:
        pattern = re.compile(
            rf"{re.escape(label)}[^0-9₦N]{{0,40}}(?:₦|NGN)?\s*([\d,]+(?:\.\d+)?)",
            re.IGNORECASE,
        )
        match = pattern.search(text)
        if not match:
            continue

        try:
            return float(match.group(1).replace(",", ""))
        except ValueError:
            continue

    return None


def _normalize_html_text(html: str) -> str:
    text = unescape(html)
    text = re.sub(r"<script.*?</script>", " ", text, flags=re.IGNORECASE | re.DOTALL)
    text = re.sub(r"<style.*?</style>", " ", text, flags=re.IGNORECASE | re.DOTALL)
    text = re.sub(r"<[^>]+>", " ", text)
    return re.sub(r"\s+", " ", text).strip()


async def scrape_nairatoday_rates(db: Session) -> int:
    """
    Fetch live USD/NGN open-market rates from NairaToday.
    Returns count of rates stored.
    If the page is unavailable, gracefully returns 0 without raising.
    """
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(
                NAIRATODAY_USD_URL,
                headers={"User-Agent": "Mozilla/5.0 FXGuard/1.0"},
            )
            response.raise_for_status()
    except httpx.HTTPError as exc:
        logger.warning("Nairatoday scraper unavailable: %s — skipping", exc)
        return 0
    except Exception as exc:
        logger.warning("Nairatoday scraper error: %s — skipping", exc)
        return 0

    stored = 0
    now = datetime.now(timezone.utc)
    text = _normalize_html_text(response.text)

    buying_rate = _extract_labeled_rate(text, ["Buy (Aboki)", "Buy Rate"])
    selling_rate = _extract_labeled_rate(text, ["Sell (Aboki)", "Sell Rate"])
    cbn_rate = _extract_labeled_rate(text, ["CBN Official", "CBN Rate"])

    if selling_rate or buying_rate:
        parallel_snapshot = FXRateSnapshot(
            base_currency="USD",
            quote_currency="NGN",
            rate=float(selling_rate or buying_rate),
            buying_rate=float(buying_rate) if buying_rate else None,
            selling_rate=float(selling_rate) if selling_rate else None,
            source="nairatoday_parallel",
            rate_type="parallel",
            recorded_at=now,
        )
        db.add(parallel_snapshot)
        stored += 1

        bdc_snapshot = FXRateSnapshot(
            base_currency="USD",
            quote_currency="NGN",
            rate=float(selling_rate or buying_rate),
            buying_rate=float(buying_rate) if buying_rate else None,
            selling_rate=float(selling_rate) if selling_rate else None,
            source="nairatoday_bdc",
            rate_type="bdc",
            recorded_at=now,
        )
        db.add(bdc_snapshot)
        stored += 1

    if cbn_rate:
        logger.info("Nairatoday USD page also reports CBN rate: %.2f", cbn_rate)

    if stored:
        db.commit()

    logger.info("Nairatoday scraper stored %d rates", stored)
    return stored
