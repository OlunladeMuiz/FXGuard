import os
import sys
import unittest
from pathlib import Path
from unittest import mock


BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.utils.email_service import EmailService


class EmailServiceTests(unittest.TestCase):
    @mock.patch.dict(
        os.environ,
        {
            "SMTP_USERNAME": "mailer@example.com",
            "SMTP_PASSWORD": "secret-password",
            "EMAIL_FROM_ADDRESS": "noreply@example.com",
            "SMTP_SERVER": "smtp.example.com",
            "SMTP_PORT": "2525",
            "SMTP_TIMEOUT_SECONDS": "7.5",
            "SMTP_USE_SSL": "false",
            "SMTP_USE_TLS": "true",
        },
        clear=False,
    )
    def test_send_email_uses_configured_smtp_settings(self) -> None:
        server = mock.MagicMock()
        smtp_mock = mock.MagicMock()
        smtp_mock.return_value.__enter__.return_value = server

        with mock.patch("app.utils.email_service.smtplib.SMTP", smtp_mock):
            result = EmailService.send_email(
                to_email="finance@example.com",
                subject="Invoice created",
                html_body="<p>Hello</p>",
                text_body="Hello",
            )

        self.assertTrue(result)
        smtp_mock.assert_called_once_with("smtp.example.com", 2525, timeout=7.5)
        server.ehlo.assert_called()
        server.starttls.assert_called_once()
        server.login.assert_called_once_with("mailer@example.com", "secret-password")
        server.sendmail.assert_called_once()

    @mock.patch.dict(
        os.environ,
        {
            "SMTP_USERNAME": "mailer@example.com",
            "SMTP_PASSWORD": "secret-password",
            "EMAIL_FROM_ADDRESS": "noreply@example.com",
            "SMTP_SERVER": "smtp.example.com",
            "SMTP_PORT": "587",
            "SMTP_TIMEOUT_SECONDS": "5",
            "SMTP_USE_SSL": "false",
        },
        clear=False,
    )
    def test_send_email_returns_false_on_timeout(self) -> None:
        with mock.patch(
            "app.utils.email_service.smtplib.SMTP",
            side_effect=TimeoutError("timed out"),
        ):
            result = EmailService.send_email(
                to_email="finance@example.com",
                subject="Invoice created",
                html_body="<p>Hello</p>",
            )

        self.assertFalse(result)

    @mock.patch.dict(
        os.environ,
        {
            "SMTP_USERNAME": "mailer@example.com",
            "SMTP_PASSWORD": "secret-password",
            "EMAIL_FROM_ADDRESS": "noreply@example.com",
            "SMTP_SERVER": "smtp.example.com",
            "SMTP_PORT": "465",
            "SMTP_TIMEOUT_SECONDS": "7.5",
            "SMTP_USE_SSL": "true",
            "SMTP_USE_TLS": "false",
        },
        clear=False,
    )
    def test_send_email_uses_ssl_transport_when_enabled(self) -> None:
        server = mock.MagicMock()
        smtp_ssl_mock = mock.MagicMock()
        smtp_ssl_mock.return_value.__enter__.return_value = server

        with mock.patch("app.utils.email_service.smtplib.SMTP_SSL", smtp_ssl_mock):
            with mock.patch("app.utils.email_service.smtplib.SMTP") as smtp_mock:
                result = EmailService.send_email(
                    to_email="finance@example.com",
                    subject="Invoice created",
                    html_body="<p>Hello</p>",
                    text_body="Hello",
                )

        self.assertTrue(result)
        smtp_ssl_mock.assert_called_once_with("smtp.example.com", 465, timeout=7.5)
        smtp_mock.assert_not_called()
        server.starttls.assert_not_called()
        server.login.assert_called_once_with("mailer@example.com", "secret-password")
        server.sendmail.assert_called_once()


if __name__ == "__main__":
    unittest.main()
