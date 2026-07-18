import uuid
from datetime import datetime, timezone
from sqlalchemy.orm import Session

from app.models.integration_connection import IntegrationConnection

PROVIDER_CATALOG = {
    "paystack": {
        "name": "Paystack",
        "description": "Accept card and bank payments across Africa and settle into your payout account.",
    },
    "stripe": {
        "name": "Stripe",
        "description": "Collect international payments and auto-convert proceeds into your settlement currency.",
    },
    "paypal": {
        "name": "PayPal",
        "description": "Send invoices worldwide and receive multi-currency balances with FX-ready payouts.",
    },
    "interswitch": {
        "name": "Interswitch",
        "description": "Generate enterprise-grade payment links and local payout rails for African SMEs.",
    },
}


def _mask_credential(credential: str) -> str:
    trimmed = credential.strip()
    if len(trimmed) <= 6:
        return "***"
    return f"{trimmed[:2]}***{trimmed[-2:]}"


def list_integrations(db: Session, *, user_id: str) -> list[dict]:
    records = (
        db.query(IntegrationConnection)
        .filter(IntegrationConnection.user_id == user_id)
        .all()
    )
    record_by_provider = {record.provider: record for record in records}
    response: list[dict] = []

    for provider, meta in PROVIDER_CATALOG.items():
        record = record_by_provider.get(provider)
        response.append(
            {
                "provider": provider,
                "name": meta["name"],
                "description": meta["description"],
                "status": record.status if record else "not_connected",
                "connected_at": record.connected_at if record else None,
                "credential_hint": record.credential_hint if record else None,
            }
        )

    return response


def connect_integration(
    db: Session,
    *,
    user_id: str,
    provider: str,
    credential: str,
) -> dict:
    provider_key = provider.strip().lower()
    if provider_key not in PROVIDER_CATALOG:
        raise ValueError("Unsupported provider")

    record = (
        db.query(IntegrationConnection)
        .filter(
            IntegrationConnection.user_id == user_id,
            IntegrationConnection.provider == provider_key,
        )
        .first()
    )

    credential_hint = _mask_credential(credential)
    if record is None:
        record = IntegrationConnection(
            id=str(uuid.uuid4()),
            user_id=user_id,
            provider=provider_key,
            status="connected",
            credential_hint=credential_hint,
            connected_at=datetime.now(timezone.utc),
        )
        db.add(record)
    else:
        record.status = "connected"
        record.credential_hint = credential_hint
        record.updated_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(record)

    meta = PROVIDER_CATALOG[provider_key]
    return {
        "provider": provider_key,
        "name": meta["name"],
        "description": meta["description"],
        "status": record.status,
        "connected_at": record.connected_at,
        "credential_hint": record.credential_hint,
    }
