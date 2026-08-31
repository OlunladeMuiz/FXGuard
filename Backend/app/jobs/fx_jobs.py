"""
All background job functions. Each must be fully self-contained:
- Create its own DB session
- Handle all exceptions internally (never raise to scheduler)
- Log success and failure with context
"""
import os
import logging
from sqlalchemy.orm import Session
from app.db.database import SessionLocal
from app.services.scrapers.cbn_scraper import scrape_cbn_rates
from app.services.scrapers.abokifx_scraper import scrape_abokifx_rates
from app.services.scrapers.nairatoday_scraper import scrape_nairatoday_rates
from app.services.scrapers.cbn_reserves_scraper import ingest_cbn_reserves
from app.services.spread_service import compute_and_store_spread
from app.services.brent_crude_service import fetch_brent_crude
from app.services.news_service import ingest_news_feeds
from app.services.alert_service import check_and_trigger_alerts

logger = logging.getLogger(__name__)

NGN_PAIRS = [
    ("USD", "NGN"), ("GBP", "NGN"), ("EUR", "NGN"),
    ("CAD", "NGN"), ("AUD", "NGN"), ("GHS", "NGN"),
]


def _read_backfill_days() -> int:
    raw_value = (os.getenv("FX_HISTORY_BACKFILL_DAYS", "30") or "30").strip()
    try:
        return max(int(raw_value), 1)
    except ValueError:
        logger.warning("Invalid FX_HISTORY_BACKFILL_DAYS=%r; falling back to 30 days", raw_value)
        return 30


FX_HISTORY_BACKFILL_DAYS = _read_backfill_days()


async def _sync_exchange_rate_pairs(db: Session) -> list[tuple[str, str, Exception]]:
    from app.services.fx import ensure_history_window
    errors = []
    for base, quote in NGN_PAIRS:
        try:
            await ensure_history_window(
                db,
                base=base,
                quote=quote,
                days=FX_HISTORY_BACKFILL_DAYS,
            )
        except Exception as exc:
            errors.append((base, quote, exc))
    return errors


async def run_sync_exchange_rate_api(db: Session) -> None:
    errors = await _sync_exchange_rate_pairs(db)
    if errors:
        raise RuntimeError(f"Exchange Rate API sync failed for {len(errors)} pairs")


async def job_sync_exchange_rate_api() -> None:
    db = SessionLocal()
    try:
        errors = await _sync_exchange_rate_pairs(db)
        for base, quote, exc in errors:
            logger.warning("Exchange Rate API sync failed for %s/%s: %s", base, quote, exc)
    except Exception as exc:
        logger.error("Exchange Rate API job failed: %s", exc, exc_info=True)
    finally:
        db.close()


async def run_scrape_cbn(db: Session) -> int:
    return await scrape_cbn_rates(db)


async def job_scrape_cbn() -> None:
    db = SessionLocal()
    try:
        count = await run_scrape_cbn(db)
        logger.info("CBN scraper job completed: %d rates stored", count)
    except Exception as exc:
        logger.error("CBN scraper job failed: %s", exc, exc_info=True)
    finally:
        db.close()


async def job_scrape_abokifx() -> None:
    db = SessionLocal()
    try:
        success = await scrape_abokifx_rates(db)
        logger.info("AbokiFX scraper job completed: success=%s", success)
    except Exception as exc:
        logger.error("AbokiFX scraper job failed: %s", exc, exc_info=True)
    finally:
        db.close()


async def run_scrape_nairatoday(db: Session) -> int:
    return await scrape_nairatoday_rates(db)


async def job_scrape_nairatoday() -> None:
    db = SessionLocal()
    try:
        count = await run_scrape_nairatoday(db)
        logger.info("Nairatoday scraper job completed: %d rates stored", count)
    except Exception as exc:
        logger.error("Nairatoday scraper job failed: %s", exc, exc_info=True)
    finally:
        db.close()


def run_compute_spread(db: Session) -> dict | None:
    return compute_and_store_spread(db)


def job_compute_spread() -> None:
    db = SessionLocal()
    try:
        result = run_compute_spread(db)
        if result:
            logger.info("Spread computed: %.2f%% (%s)", result["spread_pct"], result["risk_level"])
        else:
            logger.info("Spread compute skipped: insufficient source data")
    except Exception as exc:
        logger.error("Spread compute job failed: %s", exc, exc_info=True)
    finally:
        db.close()


async def run_fetch_brent_crude(db: Session) -> dict | None:
    return await fetch_brent_crude(db)


async def job_fetch_brent_crude() -> None:
    db = SessionLocal()
    try:
        result = await run_fetch_brent_crude(db)
        if result:
            logger.info("Brent crude job: $%.2f/bbl, signal=%s", result["current_price"], result["signal"])
    except Exception as exc:
        logger.error("Brent crude job failed: %s", exc, exc_info=True)
    finally:
        db.close()


async def run_ingest_news(db: Session) -> int:
    return await ingest_news_feeds(db)


async def job_ingest_news() -> None:
    db = SessionLocal()
    try:
        count = await run_ingest_news(db)
        logger.info("News ingest job completed: %d headlines stored", count)
    except Exception as exc:
        logger.error("News ingest job failed: %s", exc, exc_info=True)
    finally:
        db.close()


def run_check_alerts(db: Session) -> int:
    return check_and_trigger_alerts(db)


def job_check_alerts() -> None:
    db = SessionLocal()
    try:
        triggered = run_check_alerts(db)
        if triggered:
            logger.info("Alert checker job triggered %d alerts", triggered)
    except Exception as exc:
        logger.error("Alert checker job failed: %s", exc, exc_info=True)
    finally:
        db.close()


def run_scrape_reserves(db: Session) -> int:
    return ingest_cbn_reserves(db)


def job_scrape_reserves() -> None:
    db = SessionLocal()
    try:
        count = run_scrape_reserves(db)
        logger.info("CBN reserves scraper ingested %d rows", count)
    except Exception as exc:
        logger.error("CBN reserves scraper job failed: %s", exc, exc_info=True)
    finally:
        db.close()
