import logging
import os
from datetime import date, datetime, timezone

import httpx
from sqlalchemy.orm import Session

from app.models.fx_rate_snapshot import FXRateSnapshot

logger = logging.getLogger(__name__)

CBN_RATES_API_URL = "https://www.cbn.gov.ng/api/GetAllExchangeRates"
CBN_SCRAPER_USER_AGENT = os.getenv("CBN_SCRAPER_USER_AGENT", "Mozilla/5.0 FXGuard/1.0")

CURRENCY_MAP = {
    "CFA": "XOF",
    "CFA FRANC": "XOF",
    "YUAN/RENMINBI": "CNY",
    "CHINESE YUAN RENMINBI": "CNY",
    "DANISH KRONA": "DKK",
    "EURO": "EUR",
    "YEN": "JPY",
    "JAPANESE YEN": "JPY",
    "RIYAL": "SAR",
    "SAUDI RIYAL": "SAR",
    "SOUTH AFRICAN RAND": "ZAR",
    "SDR": "XDR",
    "SWISS FRANC": "CHF",
    "POUNDS STERLING": "GBP",
    "US DOLLAR": "USD",
    "WAUA": "XUA",
    "UAE DIRHAM": "AED",
    "CANADIAN DOLLAR": "CAD",
    "AUSTRALIAN DOLLAR": "AUD",
}


def _parse_cbn_rate_date(value: str) -> date | None:
    normalized = (value or "").strip()
    if not normalized:
        return None

    for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%m/%d/%Y"):
        try:
            return datetime.strptime(normalized, fmt).date()
        except ValueError:
            continue

    logger.debug("CBN scraper could not parse rate date: %s", value)
    return None


def _to_float(value: str | None) -> float | None:
    normalized = (value or "").strip().replace(",", "")
    if not normalized:
        return None

    try:
        return float(normalized)
    except ValueError:
        return None


def _build_latest_cbn_rows(records: list[dict]) -> dict[str, dict]:
    latest_by_currency: dict[str, dict] = {}

    for row in records:
        currency_name = str(row.get("currency", "")).strip().upper()
        iso_code = CURRENCY_MAP.get(currency_name)
        if not iso_code:
            continue

        rate_date = _parse_cbn_rate_date(str(row.get("ratedate", "")))
        central_rate = _to_float(row.get("centralrate"))
        if not rate_date or central_rate is None or central_rate <= 0:
            continue

        current = latest_by_currency.get(iso_code)
        if current and current["rate_date"] >= rate_date:
            continue

        latest_by_currency[iso_code] = {
            "iso_code": iso_code,
            "rate_date": rate_date,
            "central_rate": central_rate,
            "buying_rate": _to_float(row.get("buyingrate")),
            "selling_rate": _to_float(row.get("sellingrate")),
        }

    return latest_by_currency


async def scrape_cbn_rates(db: Session) -> int:
    """
    Fetch the latest CBN official rates from the live JSON endpoint.
    Returns the count of rates successfully stored.
    """
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                CBN_RATES_API_URL,
                headers={
                    "Accept": "application/json",
                    "User-Agent": CBN_SCRAPER_USER_AGENT,
                },
            )
            response.raise_for_status()
    except httpx.HTTPError as exc:
        logger.error("CBN scraper HTTP error: %s", exc)
        raise

    stored = 0

    try:
        payload = response.json()
        if not isinstance(payload, list):
            raise ValueError("CBN rates endpoint returned an unexpected payload")

        latest_rows = _build_latest_cbn_rows(payload)
        now = datetime.now(timezone.utc)

        for row in latest_rows.values():
            snapshot = FXRateSnapshot(
                base_currency=row["iso_code"],
                quote_currency="NGN",
                rate=row["central_rate"],
                buying_rate=row["buying_rate"],
                selling_rate=row["selling_rate"],
                source="cbn_official",
                rate_type="official",
                recorded_at=now,
            )
            db.add(snapshot)
            stored += 1

        db.commit()
        logger.info("CBN scraper stored %d rates", stored)
    except Exception as exc:
        db.rollback()
        logger.error("CBN scraper parse error: %s", exc, exc_info=True)
        raise

    return stored
