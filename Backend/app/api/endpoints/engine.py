import os
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, Query
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.auth import User
from app.models.brent_crude import BrentCrude
from app.models.cbn_reserves import CbnReserves
from app.models.fx_rate import FXRate
from app.models.fx_rate_snapshot import FXRateSnapshot
from app.schemas.engine import (
    SpreadResponse, BrentSignalResponse, SourceHealthResponse,
    SimulatorRequest, RateAlertCreate, RateAlertResponse,
    ConversionLogCreate, NotificationResponse,
    GarchRiskItem, SeasonalityResponse, NewsSignalResponse,
    ReservesSignalResponse, InterventionSignalResponse,
    MultiCurrencyExposureResponse, MonthlySavingsReport,
    CbnReservesCreate,
)
from app.services.auth import get_current_user, get_current_admin_user
from app.services.spread_service import get_current_spread
from app.services.brent_crude_service import get_brent_signal
from app.services.simulator_service import run_simulator
from app.services.alert_service import create_alert
from app.services.analytics_service import (
    log_conversion,
    get_lost_revenue_report,
    get_monthly_savings_report,
    verify_share_token,
)
from app.services.volatility_service import get_garch_risk_snapshot
from app.services.seasonality_service import get_seasonality_snapshot
from app.services.news_service import get_news_signal
from app.services.cbn_reserves_service import get_reserves_signal
from app.services.intervention_service import get_intervention_warning
from app.services.exposure_service import get_multi_currency_exposure
from app.models.rate_alert import RateAlert, InAppNotification
from app.utils.pdf import render_simple_pdf

router = APIRouter(prefix="/engine", tags=["engine"])


@router.get("/spread/current", response_model=SpreadResponse)
def read_current_spread(
    db: Session = Depends(get_db),
    _current_user: User = Depends(get_current_user),
):
    result = get_current_spread(db)
    if not result:
        return SpreadResponse(
            official_rate=None, parallel_rate=None, bdc_rate=None,
            spread_ngn=None, spread_pct=None, spread_direction=None,
            risk_level=None, risk_message="No spread data available yet",
        )
    return SpreadResponse(**result)


@router.get("/signals/brent", response_model=BrentSignalResponse)
def read_brent_signal(
    db: Session = Depends(get_db),
    _current_user: User = Depends(get_current_user),
):
    return BrentSignalResponse(**get_brent_signal(db))


@router.get("/sources/health", response_model=SourceHealthResponse)
def read_sources_health(
    db: Session = Depends(get_db),
    _current_user: User = Depends(get_current_admin_user),
):
    now = datetime.now(timezone.utc)
    cutoff_24h = now - timedelta(hours=24)

    def to_utc(value: datetime | None) -> datetime | None:
        if value is None:
            return None
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc)

    def build_item(
        source: str,
        last_recorded_at: datetime | None,
        count_24h: int,
        *,
        is_configured: bool = True,
        note: str | None = None,
    ) -> dict:
        normalized_recorded_at = to_utc(last_recorded_at)
        is_stale = True
        if normalized_recorded_at is not None:
            age = (now - normalized_recorded_at).total_seconds()
            is_stale = age > 3600 * 2

        return {
            "source": source,
            "last_recorded_at": normalized_recorded_at.isoformat() if normalized_recorded_at else None,
            "is_stale": is_stale,
            "rate_count_24h": count_24h,
            "is_configured": is_configured,
            "note": note,
        }

    def latest_snapshot(source: str) -> FXRateSnapshot | None:
        return (
            db.query(FXRateSnapshot)
            .filter(FXRateSnapshot.source == source)
            .order_by(FXRateSnapshot.recorded_at.desc())
            .first()
        )

    def count_snapshot(source: str) -> int:
        return (
            db.query(FXRateSnapshot)
            .filter(
                FXRateSnapshot.source == source,
                FXRateSnapshot.recorded_at >= cutoff_24h,
            )
            .count()
        )

    latest_fx_provider = (
        db.query(FXRate)
        .filter(FXRate.source == "exchange_rate_api")
        .order_by(FXRate.updated_at.desc())
        .first()
    )
    count_fx_provider = (
        db.query(FXRate)
        .filter(
            FXRate.source == "exchange_rate_api",
            FXRate.updated_at >= cutoff_24h,
        )
        .count()
    )

    latest_brent = (
        db.query(BrentCrude)
        .filter(BrentCrude.source == "alpha_vantage")
        .order_by(BrentCrude.recorded_at.desc())
        .first()
    )
    count_brent = (
        db.query(BrentCrude)
        .filter(
            BrentCrude.source == "alpha_vantage",
            BrentCrude.recorded_at >= cutoff_24h,
        )
        .count()
    )

    latest_cbn = latest_snapshot("cbn_official")
    latest_aboki = latest_snapshot("abokifx_parallel")
    latest_nairatoday_parallel = latest_snapshot("nairatoday_parallel")
    latest_nairatoday_bdc = latest_snapshot("nairatoday_bdc")
    has_aboki_token = bool(os.getenv("ABOKIFX_AUTH_TOKEN"))
    has_alpha_vantage_key = bool(os.getenv("ALPHA_VANTAGE_API_KEY"))

    items = [
        build_item(
            "exchange_rate_api",
            latest_fx_provider.updated_at if latest_fx_provider else None,
            count_fx_provider,
        ),
        build_item(
            "cbn_official",
            latest_cbn.recorded_at if latest_cbn else None,
            count_snapshot("cbn_official"),
            note="Official daily CBN market reference.",
        ),
        build_item(
            "abokifx_parallel",
            latest_aboki.recorded_at if latest_aboki else None,
            count_snapshot("abokifx_parallel"),
            is_configured=has_aboki_token,
            note=(
                None
                if has_aboki_token
                else "Missing ABOKIFX_AUTH_TOKEN. Supported AbokiFX API polling is disabled."
            ),
        ),
        build_item(
            "nairatoday_parallel",
            latest_nairatoday_parallel.recorded_at if latest_nairatoday_parallel else None,
            count_snapshot("nairatoday_parallel"),
            note="Public HTML fallback for open-market pricing.",
        ),
        build_item(
            "nairatoday_bdc",
            latest_nairatoday_bdc.recorded_at if latest_nairatoday_bdc else None,
            count_snapshot("nairatoday_bdc"),
            note="Public HTML fallback for BDC pricing.",
        ),
        build_item(
            "alpha_vantage",
            latest_brent.recorded_at if latest_brent else None,
            count_brent,
            is_configured=has_alpha_vantage_key,
            note=(
                None
                if has_alpha_vantage_key
                else "Missing ALPHA_VANTAGE_API_KEY. Brent oil signal ingestion is disabled."
            ),
        ),
    ]
    return SourceHealthResponse(sources=items, checked_at=now.isoformat())


@router.post("/simulator")
def run_conversion_simulator(
    payload: SimulatorRequest,
    db: Session = Depends(get_db),
    _current_user: User = Depends(get_current_user),
):
    return run_simulator(
        db,
        base_currency=payload.base_currency.upper(),
        quote_currency=payload.quote_currency.upper(),
        amount=payload.amount,
        lookback_days=payload.lookback_days,
        rate_source=payload.rate_source,
    )


@router.post("/alerts", response_model=RateAlertResponse)
def create_rate_alert(
    payload: RateAlertCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    alert = create_alert(db, user_id=current_user.id, payload=payload.model_dump())
    return alert


@router.get("/alerts", response_model=list[RateAlertResponse])
def list_rate_alerts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return (
        db.query(RateAlert)
        .filter(RateAlert.user_id == current_user.id)
        .order_by(RateAlert.created_at.desc())
        .all()
    )


@router.delete("/alerts/{alert_id}", status_code=204)
def delete_rate_alert(
    alert_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from fastapi import HTTPException, status
    alert = db.query(RateAlert).filter(
        RateAlert.id == alert_id,
        RateAlert.user_id == current_user.id,
    ).first()
    if not alert:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alert not found")
    db.delete(alert)
    db.commit()


@router.get("/notifications", response_model=list[NotificationResponse])
def list_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return (
        db.query(InAppNotification)
        .filter(InAppNotification.user_id == current_user.id)
        .order_by(InAppNotification.created_at.desc())
        .limit(50)
        .all()
    )


@router.patch("/notifications/{notification_id}/read", status_code=204)
def mark_notification_read(
    notification_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from fastapi import HTTPException, status
    notif = db.query(InAppNotification).filter(
        InAppNotification.id == notification_id,
        InAppNotification.user_id == current_user.id,
    ).first()
    if not notif:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")
    notif.is_read = True
    db.commit()


@router.post("/conversions")
def log_user_conversion(
    payload: ConversionLogCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return log_conversion(db, user_id=current_user.id, payload=payload.model_dump())


@router.get("/analytics/lost-revenue")
def read_lost_revenue(
    period: str = Query(default="30d", pattern="^(30d|90d|all_time)$"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return get_lost_revenue_report(db, user_id=current_user.id, period=period)


@router.get("/risk/garch", response_model=list[GarchRiskItem])
def read_garch_risk(
    pairs: str = Query(default="USD/NGN,EUR/NGN,GBP/NGN"),
    window_days: int = Query(default=60, ge=14, le=365),
    db: Session = Depends(get_db),
    _current_user: User = Depends(get_current_user),
):
    pair_list = [pair.strip() for pair in pairs.split(",") if pair.strip()]
    return get_garch_risk_snapshot(db, pairs=pair_list, window_days=window_days)


@router.get("/signals/seasonality", response_model=SeasonalityResponse)
def read_seasonality_signal(
    _current_user: User = Depends(get_current_user),
):
    return get_seasonality_snapshot()


@router.get("/signals/news", response_model=NewsSignalResponse)
def read_news_signal(
    db: Session = Depends(get_db),
    _current_user: User = Depends(get_current_user),
):
    return get_news_signal(db)


@router.get("/signals/cbn-reserves", response_model=ReservesSignalResponse)
def read_reserves_signal(
    db: Session = Depends(get_db),
    _current_user: User = Depends(get_current_user),
):
    return get_reserves_signal(db)


@router.get("/signals/intervention", response_model=InterventionSignalResponse)
def read_intervention_signal(
    db: Session = Depends(get_db),
    _current_user: User = Depends(get_current_user),
):
    return get_intervention_warning(db)


@router.post("/reserves", status_code=201)
def ingest_reserves(
    payload: CbnReservesCreate,
    db: Session = Depends(get_db),
    _current_user: User = Depends(get_current_user),
):
    entry = CbnReserves(
        week_of=payload.week_of,
        reserves_usd_bn=payload.reserves_usd_bn,
        source="manual",
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return {
        "id": entry.id,
        "week_of": entry.week_of.isoformat(),
        "reserves_usd_bn": entry.reserves_usd_bn,
    }


@router.get("/exposures/multi-currency", response_model=MultiCurrencyExposureResponse)
async def read_multi_currency_exposure(
    reporting_currency: str = Query(default="NGN"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await get_multi_currency_exposure(
        db,
        user_id=current_user.id,
        reporting_currency=reporting_currency,
    )


@router.get("/reports/monthly-savings", response_model=MonthlySavingsReport)
def read_monthly_savings_report(
    year: int | None = Query(default=None),
    month: int | None = Query(default=None, ge=1, le=12),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return get_monthly_savings_report(db, user_id=current_user.id, year=year, month=month)


@router.get("/reports/monthly-savings/pdf")
def download_monthly_savings_pdf(
    year: int | None = Query(default=None),
    month: int | None = Query(default=None, ge=1, le=12),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    report = get_monthly_savings_report(db, user_id=current_user.id, year=year, month=month)
    title = f"FXGuard Monthly Savings Report - {report['month']:02d}/{report['year']}"
    lines = [
        f"Total base converted: {report['total_base_converted']}",
        f"Total quote received: {report['total_quote_received']}",
        f"Total optimal quote: {report['total_optimal_quote']}",
        f"Total lost to timing: {report['total_lost_to_timing']}",
        f"Total saved vs worst: {report['total_saved_vs_worst']}",
        f"Net position: {report['net_position_quote']}",
    ]
    pdf_bytes = render_simple_pdf(title, lines)
    filename = f"fxguard_savings_{report['year']}_{report['month']:02d}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.get("/reports/monthly-savings/share/{token}")
def download_shared_monthly_savings_pdf(
    token: str,
    db: Session = Depends(get_db),
):
    verified = verify_share_token(token=token)
    if not verified:
        from fastapi import HTTPException, status
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invalid share token")

    report = get_monthly_savings_report(
        db,
        user_id=verified["user_id"],
        year=verified["year"],
        month=verified["month"],
    )
    title = f"FXGuard Monthly Savings Report - {report['month']:02d}/{report['year']}"
    lines = [
        f"Total base converted: {report['total_base_converted']}",
        f"Total quote received: {report['total_quote_received']}",
        f"Total optimal quote: {report['total_optimal_quote']}",
        f"Total lost to timing: {report['total_lost_to_timing']}",
        f"Total saved vs worst: {report['total_saved_vs_worst']}",
        f"Net position: {report['net_position_quote']}",
    ]
    pdf_bytes = render_simple_pdf(title, lines)
    filename = f"fxguard_savings_{report['year']}_{report['month']:02d}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"inline; filename={filename}"},
    )
