import asyncio
import sys
import unittest
from pathlib import Path
from unittest.mock import AsyncMock, Mock, patch

import httpx


BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.services.recommendation import (
    _rule_based_recommendation,
    calculate_indicators,
    get_ai_recommendation,
    generate_recommendation,
)


def build_points(rates: list[float], *, synthetic: bool = False) -> list[dict[str, object]]:
    start_day = 1
    return [
        {
            "rate": rate,
            "observed_on": f"2026-03-{start_day + index:02d}",
            "is_synthetic": synthetic,
        }
        for index, rate in enumerate(rates)
    ]


class CalculateIndicatorsTests(unittest.TestCase):
    def test_calculate_indicators_marks_upward_trend(self) -> None:
        points = build_points([1.00 + index * 0.01 for index in range(20)])

        indicators = calculate_indicators(points, history_quality="full")

        self.assertEqual(indicators["trend"], "upward")
        self.assertEqual(indicators["data_source"], "stored_history")
        self.assertEqual(indicators["analytics_mode"], "full")
        self.assertGreater(indicators["current_rate"], indicators["avg_30_day"])

    def test_calculate_indicators_uses_limited_mode_below_fourteen_points(self) -> None:
        points = build_points([1.0, 1.01, 1.02, 1.03, 1.01, 1.0, 0.99, 1.0, 1.01])

        indicators = calculate_indicators(points, history_quality="mixed")

        self.assertEqual(indicators["analytics_mode"], "limited")
        self.assertEqual(indicators["rsi_14"], 50.0)

    def test_calculate_indicators_marks_candle_fallback_as_provisional(self) -> None:
        points = build_points([1.0 + index * 0.001 for index in range(24)])

        indicators = calculate_indicators(points, history_quality="candle_fallback")

        self.assertEqual(indicators["analytics_mode"], "provisional")
        self.assertEqual(indicators["data_source"], "candle_history")


class RuleBasedRecommendationTests(unittest.TestCase):
    def test_rule_based_recommendation_handles_same_currency(self) -> None:
        indicators = calculate_indicators(build_points([1.0] * 30), history_quality="same_currency")

        recommendation = _rule_based_recommendation(
            indicators,
            status="ready",
            history_quality="same_currency",
            data_points=30,
            real_data_points=30,
            synthetic_data_points=0,
        )

        self.assertEqual(recommendation["action"], "convert_now")
        self.assertEqual(recommendation["risk_score"], 0.0)
        self.assertEqual(recommendation["optimal_window"], "any time")

    def test_rule_based_recommendation_returns_insufficient_data_message(self) -> None:
        indicators = calculate_indicators(build_points([1.0, 1.01, 1.02, 1.0, 0.99, 1.0]), history_quality="seeded")

        recommendation = _rule_based_recommendation(
            indicators,
            status="insufficient_data",
            history_quality="seeded",
            data_points=6,
            real_data_points=1,
            synthetic_data_points=5,
        )

        self.assertEqual(recommendation["action"], "wait")
        self.assertIn("stored daily points", recommendation["explanation"])


class GenerateRecommendationTests(unittest.TestCase):
    def test_generate_recommendation_assembles_response(self) -> None:
        points = [
            {
                "base": "USD",
                "quote": "NGN",
                "rate": 1500.0 + index * 5,
                "observed_on": f"2026-03-{index + 1:02d}",
                "source": "exchange_rate_api",
                "is_synthetic": False,
            }
            for index in range(20)
        ]
        ai_response = {
            "action": "wait",
            "confidence": 0.67,
            "risk_score": 0.42,
            "explanation": "The pair is extended in the short term, so waiting may improve the outcome.",
            "factors": [
                {"name": "Momentum", "impact": "negative", "description": "Short-term move is stretched."},
                {"name": "Trend", "impact": "positive", "description": "Medium-term trend remains constructive."},
                {"name": "Volatility", "impact": "neutral", "description": "Volatility remains contained."},
            ],
            "optimal_window": "wait 2-4 days",
        }

        with patch(
            "app.services.recommendation.ensure_history_window",
            new=AsyncMock(
                return_value={
                    "base": "USD",
                    "quote": "NGN",
                    "points": points,
                    "source": "full",
                    "contains_synthetic": False,
                }
            ),
        ) as history_mock, patch(
            "app.services.recommendation.get_ai_recommendation",
            new=AsyncMock(return_value=ai_response),
        ) as recommendation_mock:
            result = asyncio.run(
                generate_recommendation(
                    Mock(),
                    base="usd",
                    quote="ngn",
                    invoice_amount=1250,
                )
            )

        history_mock.assert_awaited_once()
        recommendation_mock.assert_awaited_once()
        self.assertEqual(result["base"], "USD")
        self.assertEqual(result["quote"], "NGN")
        self.assertEqual(result["amount"], 1250)
        self.assertEqual(result["data_points"], len(points))
        self.assertEqual(result["status"], "ready")
        self.assertEqual(result["action"], "wait")

    def test_generate_recommendation_uses_candle_fallback_below_seven_daily_points(self) -> None:
        daily_points = [
            {
                "base": "GBP",
                "quote": "USD",
                "rate": 1.25 + index * 0.01,
                "observed_on": f"2026-03-{index + 1:02d}",
                "source": "exchange_rate_api",
                "is_synthetic": False,
            }
            for index in range(3)
        ]
        candle_payload = {
            "pair": "GBP/USD",
            "base": "GBP",
            "quote": "USD",
            "range": "7d",
            "interval": "4h",
            "data": [
                {
                    "timestamp": f"2026-03-2{(index // 6) + 1}T{(index % 6) * 4:02d}:00:00+00:00",
                    "open": 1.30 + index * 0.001,
                    "high": 1.31 + index * 0.001,
                    "low": 1.29 + index * 0.001,
                    "close": 1.305 + index * 0.001,
                    "source": "twelve_data",
                }
                for index in range(18)
            ],
            "stats": {
                "min": 1.29,
                "max": 1.34,
                "avg": 1.315,
                "volatility": 0.18,
                "standard_deviation": 0.01,
                "change_percent": 1.2,
            },
            "data_points": 18,
            "source": "twelve_data",
        }
        ai_response = {
            "action": "split_conversion",
            "confidence": 0.74,
            "risk_score": 0.38,
            "explanation": "Momentum is balanced intraday, so splitting the conversion reduces timing risk while local daily history is still shallow.",
            "factors": [
                {"name": "Intraday Trend", "impact": "neutral", "description": "Short-term candles are range-bound."},
                {"name": "Momentum", "impact": "neutral", "description": "Momentum remains balanced."},
                {"name": "Fallback Mode", "impact": "negative", "description": "The signal is provisional because daily history is still maturing."},
            ],
            "optimal_window": "stagger over 1-2 days",
        }

        with patch(
            "app.services.recommendation.ensure_history_window",
            new=AsyncMock(
                return_value={
                    "base": "GBP",
                    "quote": "USD",
                    "points": daily_points,
                    "source": "full",
                    "contains_synthetic": False,
                }
            ),
        ), patch(
            "app.services.recommendation.get_fx_candles_response",
            new=AsyncMock(return_value=candle_payload),
        ) as candle_mock, patch(
            "app.services.recommendation.get_ai_recommendation",
            new=AsyncMock(return_value=ai_response),
        ) as recommendation_mock:
            result = asyncio.run(
                generate_recommendation(
                    Mock(),
                    base="gbp",
                    quote="usd",
                    invoice_amount=5000,
                )
            )

        candle_mock.assert_awaited_once()
        recommendation_mock.assert_awaited_once()
        self.assertEqual(result["status"], "provisional_data")
        self.assertEqual(result["history_quality"], "candle_fallback")
        self.assertEqual(result["data_points"], len(daily_points))
        self.assertEqual(result["real_data_points"], len(daily_points))
        self.assertEqual(result["indicators"]["data_source"], "candle_history")
        self.assertEqual(result["indicators"]["analytics_mode"], "provisional")


class AIRecommendationFallbackTests(unittest.TestCase):
    def test_get_ai_recommendation_falls_back_when_claude_request_fails(self) -> None:
        indicators = calculate_indicators(
            build_points([1.1 + index * 0.01 for index in range(20)]),
            history_quality="full",
        )
        mock_response = Mock()
        request = httpx.Request("POST", "https://api.anthropic.com/v1/messages")
        response = httpx.Response(401, request=request)
        http_error = httpx.HTTPStatusError("Unauthorized", request=request, response=response)

        mock_client = AsyncMock()
        mock_client.__aenter__.return_value = mock_client
        mock_client.__aexit__.return_value = None
        mock_client.post.side_effect = http_error

        with patch("app.services.recommendation.ANTHROPIC_API_KEY", "test-key"), patch(
            "app.services.recommendation.httpx.AsyncClient",
            return_value=mock_client,
        ):
            result = asyncio.run(
                get_ai_recommendation(
                    "USD",
                    "NGN",
                    10000,
                    indicators,
                    status="ready",
                    history_quality="full",
                    data_points=20,
                    real_data_points=20,
                    synthetic_data_points=0,
                )
            )

        self.assertIn(result["action"], {"convert_now", "wait", "hedge", "split_conversion"})
        self.assertIn("explanation", result)

    def test_get_ai_recommendation_disables_retries_after_hard_400_failure(self) -> None:
        indicators = calculate_indicators(
            build_points([1.1 + index * 0.01 for index in range(20)]),
            history_quality="full",
        )
        request = httpx.Request("POST", "https://api.anthropic.com/v1/messages")
        response = httpx.Response(
            400,
            request=request,
            json={
                "type": "error",
                "error": {
                    "type": "invalid_request_error",
                    "message": "model is not available for this workspace",
                },
            },
        )
        http_error = httpx.HTTPStatusError("Bad Request", request=request, response=response)

        mock_client = AsyncMock()
        mock_client.__aenter__.return_value = mock_client
        mock_client.__aexit__.return_value = None
        mock_client.post.side_effect = http_error

        with patch("app.services.recommendation.ANTHROPIC_API_KEY", "test-key"), patch(
            "app.services.recommendation._ANTHROPIC_DISABLED_REASON",
            None,
        ), patch(
            "app.services.recommendation.httpx.AsyncClient",
            return_value=mock_client,
        ):
            first_result = asyncio.run(
                get_ai_recommendation(
                    "USD",
                    "NGN",
                    10000,
                    indicators,
                    status="ready",
                    history_quality="full",
                    data_points=20,
                    real_data_points=20,
                    synthetic_data_points=0,
                )
            )
            second_result = asyncio.run(
                get_ai_recommendation(
                    "USD",
                    "NGN",
                    10000,
                    indicators,
                    status="ready",
                    history_quality="full",
                    data_points=20,
                    real_data_points=20,
                    synthetic_data_points=0,
                )
            )

        self.assertEqual(mock_client.post.await_count, 1)
        self.assertIn(first_result["action"], {"convert_now", "wait", "hedge", "split_conversion"})
        self.assertIn(second_result["action"], {"convert_now", "wait", "hedge", "split_conversion"})


if __name__ == "__main__":
    unittest.main()
