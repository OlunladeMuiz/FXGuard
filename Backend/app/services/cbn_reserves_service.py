from datetime import datetime, timezone
from sqlalchemy.orm import Session

from app.models.cbn_reserves import CbnReserves


def get_reserves_signal(db: Session) -> dict:
    latest = (
        db.query(CbnReserves)
        .order_by(CbnReserves.week_of.desc())
        .first()
    )

    if not latest:
        return {
            "as_of": datetime.now(timezone.utc).isoformat(),
            "reserves_usd_bn": None,
            "signal": "UNKNOWN",
            "risk_flag": False,
            "message": "No CBN reserves data available yet.",
        }

    reserves = float(latest.reserves_usd_bn)
    if reserves < 30:
        signal = "WEAK"
        risk = True
        message = "Reserves are below $30B, historically limiting CBN intervention capacity."
    elif reserves < 35:
        signal = "SOFT"
        risk = True
        message = "Reserves are trending soft; intervention capacity may be constrained."
    else:
        signal = "STABLE"
        risk = False
        message = "Reserves are within a stable range."

    return {
        "as_of": latest.week_of.isoformat(),
        "reserves_usd_bn": reserves,
        "signal": signal,
        "risk_flag": risk,
        "message": message,
    }
