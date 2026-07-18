from __future__ import annotations

from datetime import datetime, timezone
from decimal import Decimal
from sqlalchemy.orm import Session

from app.models.invoice import Invoice
from app.services.fx import get_fx_rates


def _normalize_currency(value: str) -> str:
    return value.strip().upper()


async def _resolve_rates(
    db: Session,
    *,
    base_currency: str,
    quotes: list[str],
) -> dict[str, float]:
    response = await get_fx_rates(db, base=base_currency, quotes=quotes)
    rates: dict[str, float] = {}
    for item in response["data"]:
        quote = item["quote"]
        if quote == base_currency:
            continue
        rate = float(item["rate"])
        rates[quote] = (1 / rate) if rate else 0.0
    return rates


async def get_multi_currency_exposure(
    db: Session,
    *,
    user_id: str,
    reporting_currency: str = "NGN",
) -> dict:
    reporting = _normalize_currency(reporting_currency)
    open_statuses = ("sent", "overdue")
    invoices = (
        db.query(Invoice)
        .filter(Invoice.user_id == user_id, Invoice.status.in_(open_statuses))
        .all()
    )

    if not invoices:
        return {
            "as_of": datetime.now(timezone.utc).isoformat(),
            "reporting_currency": reporting,
            "total_open_in_reporting": 0.0,
            "currencies": [],
        }

    totals: dict[str, Decimal] = {}
    for invoice in invoices:
        currency = _normalize_currency(invoice.currency)
        totals[currency] = totals.get(currency, Decimal("0")) + Decimal(str(invoice.amount))

    needed_quotes = [currency for currency in totals.keys() if currency != reporting]
    rates: dict[str, float] = {}
    if needed_quotes:
        rates = await _resolve_rates(db, base_currency=reporting, quotes=needed_quotes)

    currency_items = []
    total_reporting = Decimal("0")
    for currency, amount in totals.items():
        if currency == reporting:
            converted = amount
            rate_used = 1.0
        else:
            rate_used = rates.get(currency)
            converted = amount if rate_used is None else Decimal(str(rate_used)) * amount

        currency_items.append(
            {
                "currency": currency,
                "open_amount": float(amount),
                "rate_to_reporting": float(rate_used) if rate_used is not None else None,
                "open_amount_in_reporting": float(round(converted, 2)) if rate_used is not None else None,
            }
        )
        if rate_used is not None:
            total_reporting += converted

    return {
        "as_of": datetime.now(timezone.utc).isoformat(),
        "reporting_currency": reporting,
        "total_open_in_reporting": float(round(total_reporting, 2)),
        "currencies": sorted(currency_items, key=lambda item: item["open_amount"], reverse=True),
    }
