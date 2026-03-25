import asyncio
import sys
import unittest
from datetime import date
from pathlib import Path
from unittest.mock import AsyncMock, Mock, patch


BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.services.fx import (
    HistoricalRatesUnavailable,
    _fetch_pair_history_for_dates,
    get_fx_history_response,
    get_fx_rates,
)


class FXServiceTests(unittest.TestCase):
    def test_get_fx_history_response_formats_stored_history(self) -> None:
        points = [
            {"base": "USD", "quote": "NGN", "rate": 1500.0, "observed_on": date(2026, 3, 22), "source": "exchange_rate_api", "is_synthetic": False},
            {"base": "USD", "quote": "NGN", "rate": 1510.0, "observed_on": date(2026, 3, 23), "source": "exchange_rate_api", "is_synthetic": False},
            {"base": "USD", "quote": "NGN", "rate": 1525.0, "observed_on": date(2026, 3, 24), "source": "seeded_history", "is_synthetic": True},
        ]

        with patch(
            "app.services.fx.ensure_history_window",
            new=AsyncMock(
                return_value={
                    "base": "USD",
                    "quote": "NGN",
                    "points": points,
                    "source": "mixed",
                    "contains_synthetic": True,
                }
            ),
        ):
            payload = asyncio.run(get_fx_history_response(Mock(), base="USD", quote="NGN", period="7d"))

        self.assertEqual(payload["pair"], "USD/NGN")
        self.assertEqual(payload["data_points"], 3)
        self.assertEqual(payload["real_data_points"], 2)
        self.assertEqual(payload["synthetic_data_points"], 1)
        self.assertTrue(payload["contains_synthetic"])
        self.assertAlmostEqual(payload["stats"]["avg"], 1511.67, places=2)

    def test_get_fx_rates_returns_same_currency_without_db_lookup(self) -> None:
        payload = asyncio.run(get_fx_rates(Mock(), base="USD", quotes=["USD"]))

        self.assertEqual(len(payload["data"]), 1)
        self.assertEqual(payload["data"][0]["base"], "USD")
        self.assertEqual(payload["data"][0]["quote"], "USD")
        self.assertEqual(payload["data"][0]["rate"], 1.0)

    def test_fetch_pair_history_stops_after_first_historical_plan_limit(self) -> None:
        payload_mock = AsyncMock(
            side_effect=HistoricalRatesUnavailable(
                "plan-upgrade-required",
                "Historical FX data is unavailable: plan-upgrade-required",
            )
        )

        with patch("app.services.fx._fetch_provider_payload", new=payload_mock):
            with self.assertRaises(HistoricalRatesUnavailable):
                asyncio.run(
                    _fetch_pair_history_for_dates(
                        AsyncMock(),
                        base="USD",
                        quote="NGN",
                        missing_dates=[date(2026, 3, 5), date(2026, 3, 4), date(2026, 3, 6)],
                    )
                )

        self.assertEqual(payload_mock.await_count, 1)


if __name__ == "__main__":
    unittest.main()
