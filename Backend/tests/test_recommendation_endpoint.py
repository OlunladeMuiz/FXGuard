import os
import sys
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import ANY, AsyncMock, patch

from fastapi.testclient import TestClient


os.environ.setdefault("SECRET_KEY", "test-secret-key")

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.main import app
from app.services.auth import get_current_user


class RecommendationEndpointTests(unittest.TestCase):
    def setUp(self) -> None:
        app.dependency_overrides[get_current_user] = lambda: SimpleNamespace(id="user-123")
        self.client = TestClient(app)

    def tearDown(self) -> None:
        self.client.close()
        app.dependency_overrides.clear()

    def test_get_fx_recommendation_returns_service_payload(self) -> None:
        payload = {
            "status": "ready",
            "history_quality": "full",
            "action": "convert_now",
            "confidence": 0.81,
            "risk_score": 0.24,
            "explanation": "Momentum is favorable, so converting now reduces the chance of a pullback.",
            "factors": [
                {"name": "Trend", "impact": "positive", "description": "Trend is upward."},
                {"name": "RSI", "impact": "neutral", "description": "RSI is balanced."},
                {"name": "Volatility", "impact": "neutral", "description": "Volatility is contained."},
            ],
            "optimal_window": "next 24-48 hours",
            "indicators": {
                "current_rate": 1510.0,
                "avg_30_day": 1502.0,
                "sma_7": 1508.0,
                "sma_20": 1500.0,
                "volatility_percent": 0.7,
                "change_7d_percent": 0.8,
                "change_30d_percent": 1.2,
                "rsi_14": 56.4,
                "range_position_percent": 62.5,
                "trend": "upward",
                "period_min": 1480.0,
                "period_max": 1520.0,
                "is_near_high": False,
                "is_near_low": False,
                "is_overbought": False,
                "is_oversold": False,
                "data_source": "stored_history",
                "analytics_mode": "full",
            },
            "data_points": 21,
            "real_data_points": 21,
            "synthetic_data_points": 0,
            "contains_synthetic": False,
            "generated_at": "2026-03-24T12:00:00+00:00",
            "base": "USD",
            "quote": "NGN",
            "amount": 5000.0,
        }

        with patch(
            "app.api.endpoints.recommendation.generate_recommendation",
            new=AsyncMock(return_value=payload),
        ) as recommendation_mock:
            response = self.client.get("/api/recommendation/usd/ngn", params={"amount": 5000})

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["base"], "USD")
        self.assertEqual(response.json()["quote"], "NGN")
        recommendation_mock.assert_awaited_once_with(
            ANY,
            base="USD",
            quote="NGN",
            invoice_amount=5000.0,
        )


if __name__ == "__main__":
    unittest.main()
