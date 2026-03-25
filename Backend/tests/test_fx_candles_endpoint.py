import os
import sys
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

from fastapi.testclient import TestClient


os.environ.setdefault("SECRET_KEY", "test-secret-key")

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.main import app
from app.services.auth import get_current_user


class FXCandlesEndpointTests(unittest.TestCase):
    def setUp(self) -> None:
        app.dependency_overrides[get_current_user] = lambda: SimpleNamespace(id="user-123")
        self.client = TestClient(app)

    def tearDown(self) -> None:
        self.client.close()
        app.dependency_overrides.clear()

    def test_read_fx_candles_returns_service_payload(self) -> None:
        payload = {
            "pair": "GBP/USD",
            "base": "GBP",
            "quote": "USD",
            "range": "7d",
            "interval": "4h",
            "data": [
                {
                    "timestamp": "2026-03-24T00:00:00+00:00",
                    "open": 1.25,
                    "high": 1.26,
                    "low": 1.24,
                    "close": 1.255,
                    "source": "twelve_data",
                }
            ],
            "stats": {
                "min": 1.24,
                "max": 1.26,
                "avg": 1.255,
                "volatility": 0.0,
                "standard_deviation": 0.0,
                "change_percent": 0.0,
            },
            "data_points": 1,
            "source": "twelve_data",
        }

        with patch(
            "app.api.endpoints.fx.get_fx_candles_response",
            new=AsyncMock(return_value=payload),
        ) as service_mock:
            response = self.client.get(
                "/api/fx/candles",
                params={"base": "gbp", "quote": "usd", "range": "7d", "interval": "4h"},
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["pair"], "GBP/USD")
        service_mock.assert_awaited_once()


if __name__ == "__main__":
    unittest.main()
