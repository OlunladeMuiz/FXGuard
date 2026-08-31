from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.api.scheduler_auth import verify_scheduler_token
from app.jobs.fx_jobs import (
    run_compute_spread,
    run_check_alerts,
    run_scrape_reserves,
    run_sync_exchange_rate_api,
    run_scrape_cbn,
    run_scrape_nairatoday,
    run_fetch_brent_crude,
    run_ingest_news,
)

router = APIRouter(
    prefix="/internal",
    tags=["Internal Actions"],
    dependencies=[Depends(verify_scheduler_token)]
)

@router.post("/compute-spread")
def compute_spread_endpoint(db: Session = Depends(get_db)):
    return run_compute_spread(db)

@router.post("/check-alerts")
def check_alerts_endpoint(db: Session = Depends(get_db)):
    return run_check_alerts(db)

@router.post("/scrape-reserves")
def scrape_reserves_endpoint(db: Session = Depends(get_db)):
    return run_scrape_reserves(db)

@router.post("/sync-exchange-rate")
async def sync_exchange_rate_endpoint(db: Session = Depends(get_db)):
    return await run_sync_exchange_rate_api(db)

@router.post("/scrape-cbn")
async def scrape_cbn_endpoint(db: Session = Depends(get_db)):
    return await run_scrape_cbn(db)

@router.post("/scrape-nairatoday")
async def scrape_nairatoday_endpoint(db: Session = Depends(get_db)):
    return await run_scrape_nairatoday(db)

@router.post("/fetch-brent-crude")
async def fetch_brent_crude_endpoint(db: Session = Depends(get_db)):
    return await run_fetch_brent_crude(db)

@router.post("/ingest-news")
async def ingest_news_endpoint(db: Session = Depends(get_db)):
    return await run_ingest_news(db)
