import logging
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger

logger = logging.getLogger(__name__)
_scheduler: AsyncIOScheduler | None = None


def get_scheduler() -> AsyncIOScheduler:
    global _scheduler
    if _scheduler is None:
        _scheduler = AsyncIOScheduler(timezone="UTC")
    return _scheduler


def setup_jobs(scheduler: AsyncIOScheduler) -> None:
    """Register all background jobs."""
    from app.jobs import fx_jobs

    # Exchange Rate API — every 5 minutes
    scheduler.add_job(
        fx_jobs.job_sync_exchange_rate_api,
        IntervalTrigger(minutes=5),
        id="sync_exchange_rate_api",
        replace_existing=True,
        misfire_grace_time=60,
    )

    # CBN official scraper — daily at 14:00 WAT = 13:00 UTC
    scheduler.add_job(
        fx_jobs.job_scrape_cbn,
        CronTrigger(hour=13, minute=0, timezone="UTC"),
        id="scrape_cbn",
        replace_existing=True,
        misfire_grace_time=3600,
    )

    # AbokiFX parallel rate — every 30 minutes
    scheduler.add_job(
        fx_jobs.job_scrape_abokifx,
        IntervalTrigger(minutes=30),
        id="scrape_abokifx",
        replace_existing=True,
        misfire_grace_time=120,
    )

    # Nairatoday BDC — every 30 minutes
    scheduler.add_job(
        fx_jobs.job_scrape_nairatoday,
        IntervalTrigger(minutes=30),
        id="scrape_nairatoday",
        replace_existing=True,
        misfire_grace_time=120,
    )

    # Spread analyser — every 30 minutes (after scrapers)
    scheduler.add_job(
        fx_jobs.job_compute_spread,
        IntervalTrigger(minutes=30),
        id="compute_spread",
        replace_existing=True,
        misfire_grace_time=120,
    )

    # Brent crude — every 1 hour
    scheduler.add_job(
        fx_jobs.job_fetch_brent_crude,
        IntervalTrigger(hours=1),
        id="fetch_brent_crude",
        replace_existing=True,
        misfire_grace_time=600,
    )

    # News RSS — every 15 minutes
    scheduler.add_job(
        fx_jobs.job_ingest_news,
        IntervalTrigger(minutes=15),
        id="ingest_news",
        replace_existing=True,
        misfire_grace_time=120,
    )

    # Alert checker — every 5 minutes
    scheduler.add_job(
        fx_jobs.job_check_alerts,
        IntervalTrigger(minutes=5),
        id="check_alerts",
        replace_existing=True,
        misfire_grace_time=60,
    )

    # CBN reserves — every Monday at 09:00 WAT = 08:00 UTC
    scheduler.add_job(
        fx_jobs.job_scrape_reserves,
        CronTrigger(day_of_week="mon", hour=8, minute=0, timezone="UTC"),
        id="scrape_cbn_reserves",
        replace_existing=True,
        misfire_grace_time=7200,
    )

    logger.info("All background jobs registered: %d jobs", len(scheduler.get_jobs()))
