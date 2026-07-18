import sys
import unittest
from unittest.mock import Mock
from fastapi import HTTPException
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.services.auth import get_current_admin_user

class AdminAuthTests(unittest.TestCase):
    def test_get_current_admin_user_allows_admin(self):
        user = Mock()
        user.is_admin = True
        
        result = get_current_admin_user(current_user=user)
        self.assertIs(result, user)

    def test_get_current_admin_user_rejects_non_admin(self):
        user = Mock()
        user.is_admin = False
        
        with self.assertRaises(HTTPException) as ctx:
            get_current_admin_user(current_user=user)
            
        self.assertEqual(ctx.exception.status_code, 403)
        self.assertEqual(ctx.exception.detail, "Not enough permissions")
