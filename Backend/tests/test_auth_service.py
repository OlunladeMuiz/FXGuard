import sys
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path
from unittest.mock import Mock, patch

from fastapi import HTTPException


BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.schemas.auth import ProfileUpdateRequest, RegisterRequest, VerifyOtpRequest
from app.services.auth import register_user, update_user_profile, verify_otp


class VerifyOtpTests(unittest.TestCase):
    def _build_db(self, user: Mock) -> Mock:
        db = Mock()
        db.query.return_value.filter.return_value.first.return_value = user
        return db

    def _naive_utc_now(self) -> datetime:
        return datetime.now(timezone.utc).replace(tzinfo=None)

    def test_verify_otp_accepts_naive_future_expiry(self) -> None:
        user = Mock()
        user.is_verified = False
        user.verification_code = 123456
        user.verification_code_expires_at = self._naive_utc_now() + timedelta(minutes=5)

        db = self._build_db(user)
        payload = VerifyOtpRequest(email="test@example.com", otp=123456)

        result = verify_otp(db=db, payload=payload)

        self.assertIs(result, user)
        self.assertTrue(user.is_verified)
        self.assertIsNone(user.verification_code)
        self.assertIsNone(user.verification_code_expires_at)
        db.commit.assert_called_once()
        db.refresh.assert_called_once_with(user)

    def test_verify_otp_rejects_naive_expired_code(self) -> None:
        user = Mock()
        user.is_verified = False
        user.verification_code = 123456
        user.verification_code_expires_at = self._naive_utc_now() - timedelta(minutes=1)

        db = self._build_db(user)
        payload = VerifyOtpRequest(email="test@example.com", otp=123456)

        with self.assertRaises(HTTPException) as context:
            verify_otp(db=db, payload=payload)

        self.assertEqual(context.exception.status_code, 400)
        self.assertEqual(context.exception.detail, "OTP has expired. Please request a new one.")


class RegisterUserTests(unittest.TestCase):
    @patch("app.services.auth.EmailService.send_otp_email", side_effect=RuntimeError("smtp unavailable"))
    def test_register_user_auto_verifies_when_email_delivery_fails(self, send_otp_mock: Mock) -> None:
        db = Mock()
        db.query.return_value.filter.return_value.first.return_value = None

        created = register_user(
            db=db,
            payload=RegisterRequest(
                email="new@example.com",
                company_name="FXGuard",
                password="Test1234!",
                password_confirmation="Test1234!",
            ),
        )

        self.assertEqual(created.email, "new@example.com")
        self.assertTrue(created.is_verified)
        db.add.assert_called_once_with(created)
        db.commit.assert_called_once()
        db.refresh.assert_called_once_with(created)
        send_otp_mock.assert_called_once()


class UpdateUserProfileTests(unittest.TestCase):
    def test_update_user_profile_persists_trimmed_fields(self) -> None:
        current_user = Mock()
        current_user.id = "user-123"
        current_user.email = "old@example.com"
        current_user.company_name = None
        current_user.first_name = None
        current_user.last_name = None
        current_user.phone = None
        current_user.country = None
        current_user.business_type = None
        current_user.time_zone = None
        current_user.preferred_currency = None

        db = Mock()
        db.query.return_value.filter.return_value.first.return_value = None

        updated = update_user_profile(
            db=db,
            current_user=current_user,
            payload=ProfileUpdateRequest(
                email="new@example.com",
                company_name="  FXGuard Traders Ltd ",
                first_name="  Mariam ",
                last_name=" Olunlade  ",
                phone="  +234 800 000 0000 ",
                country=" Nigeria ",
                business_type=" Import & Export ",
                time_zone=" Africa/Lagos ",
                preferred_currency=" ngn ",
            ),
        )

        self.assertIs(updated, current_user)
        self.assertEqual(current_user.email, "new@example.com")
        self.assertEqual(current_user.company_name, "FXGuard Traders Ltd")
        self.assertEqual(current_user.first_name, "Mariam")
        self.assertEqual(current_user.last_name, "Olunlade")
        self.assertEqual(current_user.phone, "+234 800 000 0000")
        self.assertEqual(current_user.country, "Nigeria")
        self.assertEqual(current_user.business_type, "Import & Export")
        self.assertEqual(current_user.time_zone, "Africa/Lagos")
        self.assertEqual(current_user.preferred_currency, "NGN")
        db.commit.assert_called_once()
        db.refresh.assert_called_once_with(current_user)

    def test_update_user_profile_rejects_duplicate_email(self) -> None:
        current_user = Mock()
        current_user.id = "user-123"
        current_user.email = "owner@example.com"

        existing_user = Mock()
        existing_user.id = "user-456"

        db = Mock()
        db.query.return_value.filter.return_value.first.return_value = existing_user

        with self.assertRaises(HTTPException) as context:
            update_user_profile(
                db=db,
                current_user=current_user,
                payload=ProfileUpdateRequest(email="taken@example.com"),
            )

        self.assertEqual(context.exception.status_code, 400)
        self.assertEqual(context.exception.detail, "Email already registered")

    def test_update_user_profile_preserves_unsent_business_fields(self) -> None:
        current_user = Mock()
        current_user.id = "user-123"
        current_user.email = "owner@example.com"
        current_user.company_name = "FXGuard Traders Ltd"
        current_user.first_name = "Mariam"
        current_user.last_name = "Olunlade"
        current_user.phone = "+2348000000000"
        current_user.country = "Nigeria"
        current_user.business_type = "Import & Export"
        current_user.time_zone = "Africa/Lagos"
        current_user.preferred_currency = "NGN"

        db = Mock()

        update_user_profile(
            db=db,
            current_user=current_user,
            payload=ProfileUpdateRequest(
                email="owner@example.com",
                first_name="Amina",
                last_name="Olunlade",
                phone="+2348111111111",
                time_zone="Europe/London",
                preferred_currency="usd",
            ),
        )

        self.assertEqual(current_user.company_name, "FXGuard Traders Ltd")
        self.assertEqual(current_user.country, "Nigeria")
        self.assertEqual(current_user.business_type, "Import & Export")
        self.assertEqual(current_user.first_name, "Amina")
        self.assertEqual(current_user.phone, "+2348111111111")
        self.assertEqual(current_user.time_zone, "Europe/London")
        self.assertEqual(current_user.preferred_currency, "USD")


if __name__ == "__main__":
    unittest.main()
