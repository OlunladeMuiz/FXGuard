import logging
import uuid
import hmac
import hashlib
from datetime import date, datetime, timedelta, timezone
from sqlalchemy.orm import Session
from app.models.conversion_log import ConversionLog
from app.models.fx_rate import FXRate
from app.services.auth import SECRET_KEY

logger = logging.getLogger(__name__)


def log_conversion(db: Session, user_id: str, payload: dict) -> ConversionLog:
    """
    Manually log a currency conversion and compute optimal rate comparison.
    """
    base = payload["base_currency"].upper()
    quote = payload["quote_currency"].upper()
    converted_at = payload.get("converted_at", datetime.now(timezone.utc))
    if isinstance(converted_at, str):
        converted_at = datetime.fromisoformat(converted_at)

    rate_used = float(payload["rate_used"])
    base_amount = float(payload["base_amount"])
    quote_amount = float(payload.get("quote_amount", base_amount * rate_used))

    # Compute optimal rate: best rate in ±7 days window
    window_start = (converted_at - timedelta(days=7)).date()
    window_end = (converted_at + timedelta(days=7)).date()

    best_row = (
        db.query(FXRate)
        .filter(
            FXRate.base_currency == base,
            FXRate.quote_currency == quote,
            FXRate.observed_on >= window_start,
            FXRate.observed_on <= window_end,
        )
        .order_by(FXRate.rate.desc())
        .first()
    )

    optimal_rate_7d = float(best_row.rate) if best_row else None
    optimal_amount_7d = round(base_amount * optimal_rate_7d, 2) if optimal_rate_7d else None
    lost_amount_7d = round(optimal_amount_7d - quote_amount, 2) if optimal_amount_7d else None

    entry = ConversionLog(
        id=str(uuid.uuid4()),
        user_id=user_id,
        pair=f"{base}_{quote}",
        base_currency=base,
        quote_currency=quote,
        base_amount=base_amount,
        quote_amount=quote_amount,
        rate_used=rate_used,
        source=payload.get("source", "manual"),
        converted_at=converted_at,
        followed_recommendation=payload.get("followed_recommendation"),
        optimal_rate_7d=optimal_rate_7d,
        optimal_amount_7d=optimal_amount_7d,
        lost_amount_7d=lost_amount_7d,
        notes=payload.get("notes"),
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


def get_lost_revenue_report(db: Session, user_id: str, period: str = "30d") -> dict:
    """
    Compute the lost revenue report for a user over a period.
    period: "30d" | "90d" | "all_time"
    """
    days_map = {"30d": 30, "90d": 90, "all_time": 36500}
    days = days_map.get(period, 30)
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)

    query = db.query(ConversionLog).filter(ConversionLog.user_id == user_id)
    if period != "all_time":
        query = query.filter(ConversionLog.converted_at >= cutoff)

    logs = query.order_by(ConversionLog.converted_at.asc()).all()

    if not logs:
        return {
            "user_id": user_id,
            "period": period,
            "total_base_converted": 0,
            "total_quote_received": 0,
            "total_optimal_quote": 0,
            "net_position_quote": 0,
            "net_outcome": "no_data",
            "conversions": [],
            "recommendations_followed": 0,
            "recommendations_ignored": 0,
        }

    total_base = sum(log.base_amount for log in logs)
    total_quote = sum(log.quote_amount for log in logs)
    total_optimal = sum(log.optimal_amount_7d for log in logs if log.optimal_amount_7d)
    total_lost = sum(log.lost_amount_7d for log in logs if log.lost_amount_7d is not None)
    avg_rate = total_quote / total_base if total_base else 0
    avg_optimal = total_optimal / len([l for l in logs if l.optimal_rate_7d]) if any(l.optimal_rate_7d for l in logs) else avg_rate

    recs_followed = sum(1 for log in logs if log.followed_recommendation is True)
    recs_ignored = sum(1 for log in logs if log.followed_recommendation is False)

    conversions_out = []
    for log in logs:
        if log.optimal_rate_7d:
            diff = (log.rate_used - log.optimal_rate_7d)
            outcome = "SAVED" if diff >= 0 else "LOST"
        else:
            diff = 0.0
            outcome = "UNKNOWN"

        conversions_out.append({
            "id": log.id,
            "date": log.converted_at.date().isoformat(),
            "base_amount": log.base_amount,
            "rate_used": round(log.rate_used, 5),
            "optimal_rate": round(log.optimal_rate_7d, 5) if log.optimal_rate_7d else None,
            "difference": round(diff, 5),
            "lost_amount": round(log.lost_amount_7d, 2) if log.lost_amount_7d else None,
            "outcome": outcome,
            "source": log.source,
        })

    return {
        "user_id": user_id,
        "period": period,
        "total_base_converted": round(total_base, 2),
        "total_quote_received": round(total_quote, 2),
        "total_optimal_quote": round(total_optimal, 2),
        "net_position_quote": round(total_quote - total_optimal, 2),
        "avg_rate_used": round(avg_rate, 5),
        "avg_optimal_rate": round(avg_optimal, 5),
        "total_lost_to_timing": round(total_lost, 2),
        "recommendations_followed": recs_followed,
        "recommendations_ignored": recs_ignored,
        "conversions": conversions_out,
    }


def _month_window(year: int, month: int) -> tuple[datetime, datetime]:
    start = datetime(year, month, 1, tzinfo=timezone.utc)
    if month == 12:
        end = datetime(year + 1, 1, 1, tzinfo=timezone.utc)
    else:
        end = datetime(year, month + 1, 1, tzinfo=timezone.utc)
    return start, end


def get_monthly_savings_report(
    db: Session,
    *,
    user_id: str,
    year: int | None = None,
    month: int | None = None,
) -> dict:
    today = datetime.now(timezone.utc)
    report_year = year or today.year
    report_month = month or today.month
    start, end = _month_window(report_year, report_month)

    logs = (
        db.query(ConversionLog)
        .filter(
            ConversionLog.user_id == user_id,
            ConversionLog.converted_at >= start,
            ConversionLog.converted_at < end,
        )
        .order_by(ConversionLog.converted_at.asc())
        .all()
    )

    if not logs:
        return {
            "user_id": user_id,
            "year": report_year,
            "month": report_month,
            "total_base_converted": 0,
            "total_quote_received": 0,
            "total_optimal_quote": 0,
            "total_lost_to_timing": 0,
            "total_saved_vs_worst": 0,
            "net_position_quote": 0,
            "conversions": [],
            "share_token": create_share_token(user_id=user_id, year=report_year, month=report_month),
        }

    total_base = sum(log.base_amount for log in logs)
    total_quote = sum(log.quote_amount for log in logs)
    total_optimal = sum(log.optimal_amount_7d for log in logs if log.optimal_amount_7d)
    total_lost = sum(log.lost_amount_7d for log in logs if log.lost_amount_7d is not None)
    total_saved = sum(abs(log.lost_amount_7d) for log in logs if log.lost_amount_7d and log.lost_amount_7d < 0)

    conversions_out = []
    for log in logs:
        conversions_out.append(
            {
                "id": log.id,
                "date": log.converted_at.date().isoformat(),
                "pair": log.pair,
                "base_amount": log.base_amount,
                "rate_used": round(log.rate_used, 5),
                "optimal_rate": round(log.optimal_rate_7d, 5) if log.optimal_rate_7d else None,
                "lost_amount": round(log.lost_amount_7d, 2) if log.lost_amount_7d is not None else None,
                "source": log.source,
            }
        )

    return {
        "user_id": user_id,
        "year": report_year,
        "month": report_month,
        "total_base_converted": round(total_base, 2),
        "total_quote_received": round(total_quote, 2),
        "total_optimal_quote": round(total_optimal, 2),
        "total_lost_to_timing": round(total_lost, 2),
        "total_saved_vs_worst": round(total_saved, 2),
        "net_position_quote": round(total_quote - total_optimal, 2),
        "conversions": conversions_out,
        "share_token": create_share_token(user_id=user_id, year=report_year, month=report_month),
    }


def create_share_token(*, user_id: str, year: int, month: int) -> str:
    payload = f"{user_id}:{year}:{month}"
    digest = hmac.new(SECRET_KEY.encode("utf-8"), payload.encode("utf-8"), hashlib.sha256).hexdigest()
    return f"{payload}:{digest[:16]}"


def verify_share_token(*, token: str) -> dict | None:
    parts = token.split(":")
    if len(parts) != 4:
        return None
    user_id, year, month, signature = parts
    expected = create_share_token(user_id=user_id, year=int(year), month=int(month)).split(":")[-1]
    if not hmac.compare_digest(signature, expected):
        return None
    return {"user_id": user_id, "year": int(year), "month": int(month)}
