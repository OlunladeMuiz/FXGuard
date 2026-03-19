import sys
import tempfile
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path
from unittest import mock

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


if __name__ == "__main__":
    unittest.main()
