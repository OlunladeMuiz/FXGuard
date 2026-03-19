import sys
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path
from unittest.mock import Mock

from fastapi import HTTPException


BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.schemas.auth import VerifyOtpRequest
from app.services.auth import verify_otp


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


if __name__ == "__main__":
    unittest.main()
