import logging
import uuid
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.models.rate_alert import RateAlert, InAppNotification
from app.models.fx_rate_snapshot import FXRateSnapshot
from app.models.fx_rate import FXRate
from app.utils.email_service import EmailService

logger = logging.getLogger(__name__)


def create_alert(db: Session, user_id: str, payload: dict) -> RateAlert:
    alert = RateAlert(
        id=str(uuid.uuid4()),
        user_id=user_id,
        pair=payload["pair"].upper().replace("/", "_"),
        target_rate=float(payload["target_rate"]),
        direction=payload["direction"].upper(),  # "ABOVE" | "BELOW"
        rate_source=payload.get("rate_source", "any"),
        channels=",".join(payload.get("channels", ["email", "in_app"])),
    )
    db.add(alert)
    db.commit()
    db.refresh(alert)
    return alert


def check_and_trigger_alerts(db: Session) -> int:
    """
    Check all active alerts against latest rates.
    Trigger and notify when target is met.
    Returns count of alerts triggered.
    """
    active_alerts = (
        db.query(RateAlert)
        .filter(RateAlert.is_active == True, RateAlert.is_triggered == False)
        .all()
    )

    triggered = 0
    for alert in active_alerts:
        # Parse pair: "USD_NGN" -> base="USD", quote="NGN"
        parts = alert.pair.split("_")
        if len(parts) != 2:
            continue
        base, quote = parts[0], parts[1]

        # Get the current rate based on preferred source
        current_rate = _get_rate_for_source(db, base, quote, alert.rate_source)
        if current_rate is None:
            continue

        # Check if alert condition is met
        condition_met = (
            (alert.direction == "ABOVE" and current_rate >= alert.target_rate) or
            (alert.direction == "BELOW" and current_rate <= alert.target_rate)
        )

        if not condition_met:
            continue

        # Mark alert as triggered
        alert.is_triggered = True
        alert.triggered_at = datetime.now(timezone.utc)
        alert.triggered_rate = current_rate
        alert.is_active = False
        db.commit()
        triggered += 1

        # Fire notifications
        channels = [c.strip() for c in alert.channels.split(",")]
        _notify_user(db, alert, current_rate, channels)

    return triggered


def _get_rate_for_source(db: Session, base: str, quote: str, source_pref: str) -> float | None:
    if source_pref in ("parallel", "any"):
        row = (
            db.query(FXRateSnapshot)
            .filter(
                FXRateSnapshot.base_currency == base,
                FXRateSnapshot.quote_currency == quote,
                FXRateSnapshot.source == "abokifx_parallel",
            )
            .order_by(FXRateSnapshot.recorded_at.desc())
            .first()
        )
        if row:
            return float(row.rate)

    if source_pref in ("official", "any"):
        row = (
            db.query(FXRateSnapshot)
            .filter(
                FXRateSnapshot.base_currency == base,
                FXRateSnapshot.quote_currency == quote,
                FXRateSnapshot.source == "cbn_official",
            )
            .order_by(FXRateSnapshot.recorded_at.desc())
            .first()
        )
        if row:
            return float(row.rate)

    if source_pref in ("bdc",):
        row = (
            db.query(FXRateSnapshot)
            .filter(
                FXRateSnapshot.base_currency == base,
                FXRateSnapshot.quote_currency == quote,
                FXRateSnapshot.source == "nairatoday_bdc",
            )
            .order_by(FXRateSnapshot.recorded_at.desc())
            .first()
        )
        if row:
            return float(row.rate)

    # Fallback to stored fx_rates (Exchange Rate API)
    from datetime import date
    row = (
        db.query(FXRate)
        .filter(FXRate.base_currency == base, FXRate.quote_currency == quote)
        .order_by(FXRate.observed_on.desc())
        .first()
    )
    return float(row.rate) if row else None


def _notify_user(db: Session, alert: RateAlert, triggered_rate: float, channels: list[str]) -> None:
    direction_word = "reached or exceeded" if alert.direction == "ABOVE" else "dropped to or below"
    title = f"Rate Alert: {alert.pair.replace('_', '/')} has {direction_word} your target"
    body = (
        f"Your alert for {alert.pair.replace('_', '/')} triggered. "
        f"Target: {alert.target_rate:,.2f} | Current: {triggered_rate:,.2f}"
    )

    if "in_app" in channels:
        notification = InAppNotification(
            id=str(uuid.uuid4()),
            user_id=alert.user_id,
            type="RATE_ALERT",
            title=title,
            body=body,
        )
        db.add(notification)
        db.commit()

    if "email" in channels:
        user = alert.user
        if user and user.email:
            # Use existing EmailService — send a plain text-equivalent via HTML
            html_body = f"""
            <div style="font-family: sans-serif; padding: 24px;">
                <h2 style="color: #1e40af;">FX Rate Alert Triggered</h2>
                <p>{body}</p>
                <p>Log in to FXGuard to act on this rate now.</p>
                <p style="color: #9ca3af; font-size: 12px;">© 2026 FXGuard</p>
            </div>
            """
            EmailService.send_email(
                to_email=user.email,
                subject=title,
                html_body=html_body,
                text_body=body,
            )

    # WhatsApp: STUBBED — log only
    if "whatsapp" in channels:
        logger.info(
            "WhatsApp alert STUBBED for user %s: %s",
            alert.user_id, body
        )
