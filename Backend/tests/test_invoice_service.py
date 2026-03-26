import sys
import tempfile
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path
from unittest import mock

from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker


BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.db.database import Base
from app.models.auth import User
from app.models.invoice import Invoice, InvoiceItem
from app.schemas.invoice import InvoiceCreate, InvoiceItemCreate, InvoiceUpdate
from app.services.invoice import InvoiceService
from app.utils.email_service import EmailService


class InvoiceServiceTests(unittest.TestCase):
    def setUp(self) -> None:
        self.db_path = Path(__file__).resolve().parent / f"invoice_{next(tempfile._get_candidate_names())}.db"
        self.engine = create_engine(
            f"sqlite:///{self.db_path}",
            connect_args={"check_same_thread": False},
        )
        Base.metadata.create_all(bind=self.engine)
        self.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=self.engine)
        self.db = self.SessionLocal()

        self.user = User(
            id="user-123",
            email="owner@example.com",
            password="hashed-password",
            is_verified=True,
        )
        self.db.add(self.user)
        self.db.commit()
        self.db.refresh(self.user)

    def tearDown(self) -> None:
        self.db.close()
        self.engine.dispose()
        if self.db_path.exists():
            self.db_path.unlink()

    def _invoice_create(self, invoice_number: str, status: str) -> InvoiceCreate:
        return InvoiceCreate(
            invoice_number=invoice_number,
            client_name="Acme Corp",
            client_email="client@example.com",
            client_company="Acme",
            address="123 Main Street",
            country="United States",
            amount=1000.0,
            currency="USD",
            discount=50.0,
            tax_rate=10.0,
            issue_date=datetime.now(timezone.utc),
            due_date=datetime.now(timezone.utc) + timedelta(days=30),
            description="Software services",
            payment_method="Net 30",
            payment_details="Account Name: FXGuard, Bank: Demo Bank, Account Number: 1234567890",
            status=status,
            items=[
                InvoiceItemCreate(
                    description="Development",
                    quantity=2,
                    unit_price=500.0,
                )
            ],
        )

    @mock.patch.object(EmailService, "send_invoice_email", return_value=True)
    @mock.patch.object(EmailService, "send_invoice_created_notification", return_value=True)
    def test_create_draft_does_not_send_emails(self, notify_mock: mock.Mock, client_mock: mock.Mock) -> None:
        InvoiceService.create_invoice(
            db=self.db,
            invoice_data=self._invoice_create("INV-DRAFT-001", "draft"),
            user=self.user,
        )

        notify_mock.assert_not_called()
        client_mock.assert_not_called()

    @mock.patch.object(EmailService, "send_invoice_email", return_value=True)
    @mock.patch.object(EmailService, "send_invoice_created_notification", return_value=True)
    def test_create_sent_invoice_sends_emails(self, notify_mock: mock.Mock, client_mock: mock.Mock) -> None:
        InvoiceService.create_invoice(
            db=self.db,
            invoice_data=self._invoice_create("INV-SENT-001", "sent"),
            user=self.user,
        )

        notify_mock.assert_called_once()
        client_mock.assert_called_once()

    @mock.patch.object(EmailService, "send_invoice_email", return_value=True)
    @mock.patch.object(EmailService, "send_invoice_created_notification", return_value=True)
    def test_create_paid_invoice_does_not_send_emails(self, notify_mock: mock.Mock, client_mock: mock.Mock) -> None:
        created = InvoiceService.create_invoice(
            db=self.db,
            invoice_data=self._invoice_create("INV-PAID-CREATE-001", "paid"),
            user=self.user,
        )

        self.assertEqual(created.status, "paid")
        notify_mock.assert_not_called()
        client_mock.assert_not_called()

    @mock.patch.object(EmailService, "send_invoice_email", return_value=True)
    @mock.patch.object(EmailService, "send_invoice_created_notification", return_value=True)
    def test_updating_draft_to_sent_sends_emails_once(self, notify_mock: mock.Mock, client_mock: mock.Mock) -> None:
        created = InvoiceService.create_invoice(
            db=self.db,
            invoice_data=self._invoice_create("INV-UPDATE-001", "draft"),
            user=self.user,
        )

        notify_mock.reset_mock()
        client_mock.reset_mock()

        updated = InvoiceService.update_invoice(
            db=self.db,
            invoice_id=created.id,
            invoice_data=InvoiceUpdate(status="sent"),
            user=self.user,
        )

        self.assertEqual(updated.status, "sent")
        notify_mock.assert_called_once()
        client_mock.assert_called_once()

    @mock.patch.object(EmailService, "send_invoice_email", return_value=False)
    @mock.patch.object(EmailService, "send_invoice_created_notification", return_value=True)
    def test_create_sent_invoice_keeps_saved_draft_when_delivery_fails(
        self,
        notify_mock: mock.Mock,
        client_mock: mock.Mock,
    ) -> None:
        with self.assertRaises(HTTPException) as context:
            InvoiceService.create_invoice(
                db=self.db,
                invoice_data=self._invoice_create("INV-SEND-FAIL-001", "sent"),
                user=self.user,
            )

        self.assertEqual(context.exception.status_code, 502)
        self.assertIn("invoice_id", context.exception.detail)

        saved_invoice = self.db.query(Invoice).filter(Invoice.invoice_number == "INV-SEND-FAIL-001").first()
        self.assertIsNotNone(saved_invoice)
        self.assertEqual(saved_invoice.status, "draft")
        client_mock.assert_called_once()
        notify_mock.assert_not_called()

    @mock.patch.object(EmailService, "send_invoice_email", return_value=False)
    @mock.patch.object(EmailService, "send_invoice_created_notification", return_value=True)
    def test_updating_draft_to_sent_keeps_draft_status_when_delivery_fails(
        self,
        notify_mock: mock.Mock,
        client_mock: mock.Mock,
    ) -> None:
        created = InvoiceService.create_invoice(
            db=self.db,
            invoice_data=self._invoice_create("INV-UPDATE-FAIL-001", "draft"),
            user=self.user,
        )

        notify_mock.reset_mock()
        client_mock.reset_mock()

        with self.assertRaises(HTTPException) as context:
            InvoiceService.update_invoice(
                db=self.db,
                invoice_id=created.id,
                invoice_data=InvoiceUpdate(status="sent"),
                user=self.user,
            )

        self.assertEqual(context.exception.status_code, 502)
        refreshed = self.db.query(Invoice).filter(Invoice.id == created.id).first()
        self.assertIsNotNone(refreshed)
        self.assertEqual(refreshed.status, "draft")
        client_mock.assert_called_once()
        notify_mock.assert_not_called()

    @mock.patch.object(EmailService, "send_invoice_email", return_value=True)
    @mock.patch.object(EmailService, "send_invoice_created_notification", return_value=True)
    def test_updating_draft_to_paid_does_not_send_emails(self, notify_mock: mock.Mock, client_mock: mock.Mock) -> None:
        created = InvoiceService.create_invoice(
            db=self.db,
            invoice_data=self._invoice_create("INV-PAID-001", "draft"),
            user=self.user,
        )

        updated = InvoiceService.update_invoice(
            db=self.db,
            invoice_id=created.id,
            invoice_data=InvoiceUpdate(status="paid"),
            user=self.user,
        )

        self.assertEqual(updated.status, "paid")
        notify_mock.assert_not_called()
        client_mock.assert_not_called()

    @mock.patch("app.services.invoice.InterswitchService.generate_payment_link")
    def test_generate_payment_link_persists_gateway_url_and_reference(self, generate_mock: mock.Mock) -> None:
        created = InvoiceService.create_invoice(
            db=self.db,
            invoice_data=self._invoice_create("INV-PAYMENT-LINK-001", "draft"),
            user=self.user,
        )
        generate_mock.return_value = {
            "paymentUrl": "https://qa.interswitchng.com/payment/link/123",
            "reference": "isw-reference-123",
            "transactionReference": created.id,
        }

        updated = InvoiceService.generate_payment_link(
            db=self.db,
            invoice_id=created.id,
            user=self.user,
        )

        self.assertEqual(updated.payment_link, "https://qa.interswitchng.com/payment/link/123")
        self.assertEqual(updated.payment_reference, "isw-reference-123")
        generate_mock.assert_called_once()


if __name__ == "__main__":
    unittest.main()
