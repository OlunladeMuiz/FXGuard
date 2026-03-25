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


class FXEndpointTests(unittest.TestCase):
    def setUp(self) -> None:
        app.dependency_overrides[get_current_user] = lambda: SimpleNamespace(id="user-123")
        self.client = TestClient(app)

    def tearDown(self) -> None:
        self.client.close()
        app.dependency_overrides.clear()

    def test_read_fx_rates_returns_service_payload(self) -> None:
        payload = {
            "data": [
                {
                    "base": "USD",
                    "quote": "USD",
                    "rate": 1.0,
                    "timestamp": "2026-03-24T00:00:00+00:00",
                    "observed_on": "2026-03-24",
                    "source": "same_currency",
                    "is_synthetic": False,
                },
                {
                    "base": "USD",
                    "quote": "NGN",
                    "rate": 1510.0,
                    "timestamp": "2026-03-24T00:00:00+00:00",
                    "observed_on": "2026-03-24",
                    "source": "exchange_rate_api",
                    "is_synthetic": False,
                },
            ],
            "timestamp": "2026-03-24T10:30:00+00:00",
        }

        with patch(
            "app.api.endpoints.fx.get_fx_rates",
            new=AsyncMock(return_value=payload),
        ) as service_mock:
            response = self.client.get("/api/fx/rates", params={"base": "usd", "quotes": "ngn"})

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["data"][1]["quote"], "NGN")
        service_mock.assert_awaited_once()

    def test_read_fx_history_returns_service_payload(self) -> None:
        payload = {
            "pair": "USD/NGN",
            "base": "USD",
            "quote": "NGN",
            "period": "30d",
            "data": [
                {"date": "2026-03-23", "rate": 1505.0},
                {"date": "2026-03-24", "rate": 1510.0},
            ],
            "stats": {
                "min": 1505.0,
                "max": 1510.0,
                "avg": 1507.5,
                "volatility": 0.02,
                "standard_deviation": 2.5,
            },
            "data_points": 2,
            "real_data_points": 1,
            "synthetic_data_points": 1,
            "contains_synthetic": True,
            "source": "mixed",
        }

        with patch(
            "app.api.endpoints.fx.get_fx_history_response",
            new=AsyncMock(return_value=payload),
        ) as service_mock:
            response = self.client.get("/api/fx/history", params={"base": "usd", "quote": "ngn", "period": "30d"})

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["pair"], "USD/NGN")
        service_mock.assert_awaited_once()

    def test_sync_fx_history_returns_service_payload(self) -> None:
        payload = {
            "pair": "USD/NGN",
            "base": "USD",
            "quote": "NGN",
            "period": "30d",
            "data": [{"date": "2026-03-24", "rate": 1510.0}],
            "stats": {
                "min": 1510.0,
                "max": 1510.0,
                "avg": 1510.0,
                "volatility": 0.0,
                "standard_deviation": 0.0,
            },
            "data_points": 1,
            "real_data_points": 0,
            "synthetic_data_points": 1,
            "contains_synthetic": True,
            "source": "seeded",
        }

        with patch(
            "app.api.endpoints.fx.get_fx_history_response",
            new=AsyncMock(return_value=payload),
        ) as service_mock:
            response = self.client.post("/api/fx/sync/usd/ngn", params={"period": "30d"})

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["quote"], "NGN")
        service_mock.assert_awaited_once()


if __name__ == "__main__":
    unittest.main()
