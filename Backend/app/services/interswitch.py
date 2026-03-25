"""
Interswitch API service — handles all communication with Interswitch APIs.
Sandbox base URL: https://sandbox.interswitchng.com
Production base URL: https://api.interswitchng.com
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

INTERSWITCH_BASE_URL = os.getenv(
    "INTERSWITCH_BASE_URL", "https://sandbox.interswitchng.com"
)
INTERSWITCH_CLIENT_ID = os.getenv("INTERSWITCH_CLIENT_ID")
INTERSWITCH_CLIENT_SECRET = os.getenv("INTERSWITCH_CLIENT_SECRET")
INTERSWITCH_MERCHANT_CODE = os.getenv("INTERSWITCH_MERCHANT_CODE")
INTERSWITCH_PAYABLE_CODE = os.getenv("INTERSWITCH_PAYABLE_CODE")


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
    client_id = _require_config("INTERSWITCH_CLIENT_ID", INTERSWITCH_CLIENT_ID)
    client_secret = _require_config(
        "INTERSWITCH_CLIENT_SECRET", INTERSWITCH_CLIENT_SECRET
    )

    credentials = base64.b64encode(
        f"{client_id}:{client_secret}".encode()
    ).decode()

    response = httpx.post(
        f"{INTERSWITCH_BASE_URL}/passport/oauth/token",
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
    ) -> dict:
        """
        Generate an Interswitch Web Checkout payment link for an invoice.

        Args:
            invoice_id: Used as the unique transaction reference.
            amount: Invoice total in the major currency unit (e.g. 100.00 for NGN 100).
            currency: ISO 4217 currency code (e.g. NGN, USD).
            description: Short description shown to the payer.
            customer_email: Email address of the payer.

        Returns:
            dict containing at minimum a payment URL under the key
            'paymentUrl' or 'checkoutUrl' depending on the Interswitch
            sandbox response shape.

        Raises:
            httpx.HTTPStatusError: If the Interswitch API returns a non-2xx status.
            RuntimeError: If credentials are missing.
        """
        token = _get_access_token()
        merchant_code = _require_config(
            "INTERSWITCH_MERCHANT_CODE", INTERSWITCH_MERCHANT_CODE
        )
        payable_code = _require_config(
            "INTERSWITCH_PAYABLE_CODE", INTERSWITCH_PAYABLE_CODE
        )

        payload = {
            "merchantCode": merchant_code,
            "payableCode": payable_code,
            "amount": int(amount * 100),  # Convert to kobo / lowest denomination
            "transactionReference": invoice_id,
            "customerEmail": customer_email,
            "currency": currency,
            "description": description,
        }

        response = httpx.post(
            f"{INTERSWITCH_BASE_URL}/collections/api/v1/pay",
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
    def verify_transaction(reference: str) -> dict:
        """
        Query Interswitch for the current status of a transaction.

        Args:
            reference: The transaction reference used when the payment link
                       was created (matches invoice.payment_reference).

        Returns:
            dict containing transaction details including responseCode.
            A responseCode of '00' means successful payment.

        Raises:
            httpx.HTTPStatusError: If the Interswitch API returns a non-2xx status.
        """
        token = _get_access_token()

        response = httpx.get(
            f"{INTERSWITCH_BASE_URL}/collections/api/v1/gettransaction/reference",
            headers={"Authorization": f"Bearer {token}"},
            params={"reference": reference},
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
            f"{INTERSWITCH_BASE_URL}/api/v1/identity/bvn/{bvn}",
            headers={"Authorization": f"Bearer {token}"},
            timeout=15.0,
        )
        response.raise_for_status()
        logger.info("BVN verification completed for BVN ending ...%s.", bvn[-4:])
        return response.json()
