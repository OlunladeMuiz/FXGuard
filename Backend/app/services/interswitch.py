"""
Interswitch API service - handles all communication with Interswitch APIs.
Sandbox base URL: https://qa.interswitchng.com
Production base URL: https://webpay.interswitchng.com
"""
import base64
import logging
import os

import httpx

logger = logging.getLogger(__name__)

PLACEHOLDER_VALUES = {
    "your-interswitch-client-id",
    "your-interswitch-client-secret",
    "your-merchant-code",
    "your-payable-code",
}

CURRENCY_NUMERIC_CODES = {
    "NGN": "566",
    "USD": "840",
    "EUR": "978",
    "GBP": "826",
    "CAD": "124",
}
SANDBOX_BASE_URL = "https://sandbox.interswitchng.com"
QA_BASE_URL = "https://qa.interswitchng.com"


def _normalise_base_url(value: str) -> str:
    return value.rstrip("/")


def _canonicalise_sandbox_base_url(value: str) -> str:
    normalized = _normalise_base_url(value)
    if normalized == SANDBOX_BASE_URL:
        return QA_BASE_URL
    return normalized


def _get_base_url() -> str:
    configured_value = (os.getenv("INTERSWITCH_BASE_URL") or "").strip()
    return _canonicalise_sandbox_base_url(configured_value or QA_BASE_URL)


def _get_auth_base_url() -> str:
    configured_value = (os.getenv("INTERSWITCH_AUTH_BASE_URL") or "").strip()
    return _canonicalise_sandbox_base_url(configured_value or _get_base_url())


def _get_client_id() -> str | None:
    return (os.getenv("INTERSWITCH_CLIENT_ID") or "").strip() or None


def _get_client_secret() -> str | None:
    return (os.getenv("INTERSWITCH_CLIENT_SECRET") or "").strip() or None


def _get_merchant_code() -> str | None:
    return (os.getenv("INTERSWITCH_MERCHANT_CODE") or "").strip() or None


def _get_payable_code() -> str | None:
    return (os.getenv("INTERSWITCH_PAYABLE_CODE") or "").strip() or None


def _require_config(name: str, value: str | None) -> str:
    if not value or value.strip() in PLACEHOLDER_VALUES:
        raise RuntimeError(
            f"{name} is not configured. Replace the placeholder value in Backend/.env "
            "with your real Interswitch sandbox credential and restart the backend."
        )
    return value.strip()


def _get_access_token() -> str:
    """
    Fetch a short-lived OAuth2 access token from Interswitch Passport.
    Raises RuntimeError if credentials are not configured.
    """
    client_id = _require_config("INTERSWITCH_CLIENT_ID", _get_client_id())
    client_secret = _require_config(
        "INTERSWITCH_CLIENT_SECRET", _get_client_secret()
    )

    credentials = base64.b64encode(
        f"{client_id}:{client_secret}".encode()
    ).decode()

    response = httpx.post(
        f"{_get_auth_base_url()}/passport/oauth/token",
        headers={
            "Authorization": f"Basic {credentials}",
            "Content-Type": "application/x-www-form-urlencoded",
        },
        data={"grant_type": "client_credentials", "scope": "profile"},
        timeout=15.0,
    )
    response.raise_for_status()
    token = response.json().get("access_token")
    if not token:
        raise RuntimeError("Interswitch did not return an access token.")
    return token


class InterswitchService:
    """Stateless service for Interswitch API operations."""

    @staticmethod
    def generate_payment_link(
        invoice_id: str,
        amount: float,
        currency: str,
        description: str,
        customer_email: str,
        redirect_url: str,
        customer_id: str | None = None,
    ) -> dict:
        """
        Generate an Interswitch bill payment link for an invoice.

        Args:
            invoice_id: Used as the unique merchant transaction reference.
            amount: Invoice total in the major currency unit (e.g. 100.00 for NGN 100).
            currency: ISO 4217 alphabetic currency code (e.g. NGN, USD).
            description: Short description shown to the payer.
            customer_email: Email address of the payer.
            redirect_url: URL that Interswitch redirects back to after payment.
            customer_id: Merchant-side identifier for the customer.

        Returns:
            dict containing the created payment link details, including `paymentUrl`.

        Raises:
            httpx.HTTPStatusError: If the Interswitch API returns a non-2xx status.
            RuntimeError: If credentials are missing or the currency is unsupported.
        """
        del description  # The pay-bill API does not accept a description field.

        token = _get_access_token()
        merchant_code = _require_config(
            "INTERSWITCH_MERCHANT_CODE", _get_merchant_code()
        )
        payable_code = _require_config(
            "INTERSWITCH_PAYABLE_CODE", _get_payable_code()
        )

        currency_code = CURRENCY_NUMERIC_CODES.get((currency or "").strip().upper())
        if not currency_code:
            raise RuntimeError(
                f"Interswitch payment links do not support currency '{currency}'. "
                f"Supported mappings: {', '.join(sorted(CURRENCY_NUMERIC_CODES))}."
            )

        payload = {
            "merchantCode": merchant_code,
            "payableCode": payable_code,
            "amount": int(round(amount * 100)),
            "redirectUrl": redirect_url,
            "customerId": customer_id or customer_email,
            "currencyCode": currency_code,
            "customerEmail": customer_email,
            "transactionReference": invoice_id,
        }

        response = httpx.post(
            f"{_get_base_url()}/paymentgateway/api/v1/paybill",
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            },
            json=payload,
            timeout=15.0,
        )
        response.raise_for_status()
        logger.info(
            "Payment link generated for invoice %s via Interswitch.", invoice_id
        )
        return response.json()

    @staticmethod
    def verify_transaction(reference: str, amount_minor: int) -> dict:
        """
        Query Interswitch for the current status of a transaction.

        Args:
            reference: The Interswitch reference returned when the payment link was created.
            amount_minor: The expected amount in the minor currency unit.

        Returns:
            dict containing transaction details including responseCode.
            A responseCode of '00' means successful payment.

        Raises:
            httpx.HTTPStatusError: If the Interswitch API returns a non-2xx status.
            RuntimeError: If merchant credentials are missing.
        """
        merchant_code = _require_config(
            "INTERSWITCH_MERCHANT_CODE", _get_merchant_code()
        )

        response = httpx.get(
            f"{_get_base_url()}/collections/api/v1/gettransaction.json",
            headers={"Content-Type": "application/json"},
            params={
                "merchantcode": merchant_code,
                "transactionreference": reference,
                "amount": amount_minor,
            },
            timeout=15.0,
        )
        response.raise_for_status()
        return response.json()

    @staticmethod
    def verify_bvn(bvn: str) -> dict:
        """
        Verify a Nigerian Bank Verification Number (BVN) via Interswitch
        Identity Verification API.

        Args:
            bvn: The 11-digit BVN to verify.

        Returns:
            dict containing verification result from Interswitch.

        Raises:
            httpx.HTTPStatusError: If the Interswitch API returns a non-2xx status.
        """
        token = _get_access_token()

        response = httpx.get(
            f"{_get_base_url()}/api/v1/identity/bvn/{bvn}",
            headers={"Authorization": f"Bearer {token}"},
            timeout=15.0,
        )
        response.raise_for_status()
        logger.info("BVN verification completed for BVN ending ...%s.", bvn[-4:])
        return response.json()
