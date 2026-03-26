import os
import sys
import unittest
from pathlib import Path
from unittest import mock


BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.services.interswitch import InterswitchService


class InterswitchServiceTests(unittest.TestCase):
    @mock.patch.dict(
        os.environ,
        {
            "INTERSWITCH_BASE_URL": "https://qa.interswitchng.com",
            "INTERSWITCH_AUTH_BASE_URL": "https://qa.interswitchng.com",
            "INTERSWITCH_CLIENT_ID": "client-id",
            "INTERSWITCH_CLIENT_SECRET": "client-secret",
            "INTERSWITCH_MERCHANT_CODE": "MX275946",
            "INTERSWITCH_PAYABLE_CODE": "Default_Payable_MX275946",
        },
        clear=False,
    )
    @mock.patch("app.services.interswitch.httpx.post")
    def test_generate_payment_link_uses_paybill_contract(self, post_mock: mock.Mock) -> None:
        token_response = mock.Mock()
        token_response.raise_for_status.return_value = None
        token_response.json.return_value = {"access_token": "token-123"}

        bill_response = mock.Mock()
        bill_response.raise_for_status.return_value = None
        bill_response.json.return_value = {
            "paymentUrl": "https://project-x-merchant.k8.isw.la/paymentgateway/paybill/test-ref",
            "reference": "test-ref",
            "transactionReference": "invoice-123",
        }

        post_mock.side_effect = [token_response, bill_response]

        result = InterswitchService.generate_payment_link(
            invoice_id="invoice-123",
            amount=100.5,
            currency="NGN",
            description="Payment for Invoice INV-001",
            customer_email="client@example.com",
            redirect_url="https://example.com/payment-response",
            customer_id="client-001",
        )

        self.assertEqual(result["reference"], "test-ref")
        self.assertEqual(post_mock.call_count, 2)

        token_call = post_mock.call_args_list[0]
        self.assertEqual(token_call.args[0], "https://qa.interswitchng.com/passport/oauth/token")

        paybill_call = post_mock.call_args_list[1]
        self.assertEqual(paybill_call.args[0], "https://qa.interswitchng.com/paymentgateway/api/v1/paybill")
        self.assertEqual(
            paybill_call.kwargs["headers"],
            {
                "Authorization": "Bearer token-123",
                "Content-Type": "application/json",
            },
        )
        self.assertEqual(
            paybill_call.kwargs["json"],
            {
                "merchantCode": "MX275946",
                "payableCode": "Default_Payable_MX275946",
                "amount": 10050,
                "redirectUrl": "https://example.com/payment-response",
                "customerId": "client-001",
                "currencyCode": "566",
                "customerEmail": "client@example.com",
                "transactionReference": "invoice-123",
            },
        )


if __name__ == "__main__":
    unittest.main()
