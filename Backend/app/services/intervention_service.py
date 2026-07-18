from datetime import datetime, timezone
from sqlalchemy.orm import Session

from app.services.cbn_reserves_service import get_reserves_signal
from app.services.news_service import get_news_signal
from app.services.spread_service import get_current_spread
from app.services.brent_crude_service import get_brent_signal
from app.services.seasonality_service import get_seasonality_snapshot


def get_intervention_warning(db: Session) -> dict:
    spread = get_current_spread(db) or {}
    reserves = get_reserves_signal(db)
    news = get_news_signal(db)
    brent = get_brent_signal(db)
    seasonality = get_seasonality_snapshot()

    score = 0.0
    spread_level = (spread.get("risk_level") or "").upper()
    if spread_level == "CRITICAL":
        score += 0.45
    elif spread_level == "HIGH":
        score += 0.3
    elif spread_level == "MEDIUM":
        score += 0.15

    if reserves.get("risk_flag"):
        score += 0.15

    if news.get("risk_flag"):
        score += 0.15

    if brent.get("risk_flag"):
        score += 0.1

    score += min(float(seasonality.get("composite_score", 0.0)), 0.15)
    score = round(min(score, 1.0), 3)

    if score >= 0.7:
        level = "HIGH"
        message = "Intervention risk is elevated: spread stress + macro signals align."
    elif score >= 0.45:
        level = "MEDIUM"
        message = "Intervention risk is rising. Monitor spread and liquidity signals closely."
    else:
        level = "LOW"
        message = "No immediate intervention signal detected."

    return {
        "as_of": datetime.now(timezone.utc).isoformat(),
        "risk_score": score,
        "risk_level": level,
        "message": message,
        "inputs": {
            "spread_risk": spread.get("risk_level"),
            "reserves_signal": reserves.get("signal"),
            "news_sentiment": news.get("avg_sentiment"),
            "brent_signal": brent.get("signal"),
            "seasonality_level": seasonality.get("composite_level"),
        },
    }
