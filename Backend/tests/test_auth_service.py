import sys
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path
from unittest.mock import Mock

from fastapi import HTTPException


BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.schemas.auth import ProfileUpdateRequest, VerifyOtpRequest
from app.services.auth import update_user_profile, verify_otp


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
        payload = VerifyOtpRequest(email="mariamolunlade2015@gmail.com", otp=123456)

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
        payload = VerifyOtpRequest(email="mariamolunlade2015@gmail.com", otp=123456)

        with self.assertRaises(HTTPException) as context:
            verify_otp(db=db, payload=payload)

        self.assertEqual(context.exception.status_code, 400)
        self.assertEqual(context.exception.detail, "OTP has expired. Please request a new one.")


class UpdateUserProfileTests(unittest.TestCase):
    def test_update_user_profile_persists_trimmed_fields(self) -> None:
        current_user = Mock()
        current_user.id = "user-123"
        current_user.email = "old@example.com"
        current_user.first_name = None
        current_user.last_name = None
        current_user.phone = None
        current_user.time_zone = None

        db = Mock()
        db.query.return_value.filter.return_value.first.return_value = None

        updated = update_user_profile(
            db=db,
            current_user=current_user,
            payload=ProfileUpdateRequest(
                email="new@example.com",
                first_name="  Mariam ",
                last_name=" Olunlade  ",
                phone="  +234 800 000 0000 ",
                time_zone=" Africa/Lagos ",
            ),
        )

        self.assertIs(updated, current_user)
        self.assertEqual(current_user.email, "new@example.com")
        self.assertEqual(current_user.first_name, "Mariam")
        self.assertEqual(current_user.last_name, "Olunlade")
        self.assertEqual(current_user.phone, "+234 800 000 0000")
        self.assertEqual(current_user.time_zone, "Africa/Lagos")
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


if __name__ == "__main__":
    unittest.main()
