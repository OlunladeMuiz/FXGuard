import os
import sys
import unittest
from datetime import date, datetime, timezone
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch


BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.services.simulator_service import run_simulator


class FakeQuery:
    def __init__(self, rows):
        self._rows = list(rows)

    def filter(self, *args, **kwargs):
        return self

    def order_by(self, *args, **kwargs):
        return self

    def all(self):
        return list(self._rows)


class FakeSession:
    def __init__(self, query_rows):
        self._query_rows = query_rows

    def query(self, model):
        return FakeQuery(self._query_rows.get(model.__name__, []))


class SimulatorServiceTests(unittest.TestCase):
    def test_run_simulator_excludes_seeded_history_from_market_comparison(self) -> None:
        session = FakeSession(
            {
                "FXRate": [
                    SimpleNamespace(
                        observed_on=date(2026, 4, 2),
                        rate=1380.0,
                        source="exchange_rate_api",
                        is_synthetic=False,
                    ),
                    SimpleNamespace(
                        observed_on=date(2026, 4, 3),
                        rate=1381.0,
                        source="exchange_rate_api",
                        is_synthetic=False,
                    ),
                    SimpleNamespace(
                        observed_on=date(2026, 4, 4),
                        rate=1380.5,
                        source="exchange_rate_api",
                        is_synthetic=False,
                    ),
                    SimpleNamespace(
                        observed_on=date(2026, 3, 25),
                        rate=2000.0,
                        source="seeded_history",
                        is_synthetic=True,
                    ),
                ]
            }
        )

        with patch("app.services.simulator_service.get_current_spread", return_value={"risk_level": "LOW"}), patch(
            "app.services.simulator_service.get_brent_signal",
            return_value={"signal": "NEUTRAL"},
        ), patch(
            "app.services.simulator_service._utc_today",
            return_value=date(2026, 4, 4),
        ):
            result = run_simulator(session, "USD", "NGN", 1000, 30, "market")

        self.assertTrue(result["data_available"])
        self.assertEqual(result["real_data_points"], 3)
        self.assertEqual(result["synthetic_data_points"], 1)
        self.assertEqual(result["comparison_data_points"], 3)
        self.assertEqual(result["best_rate"], 1381.0)
        self.assertEqual(result["recommendation"], "Monitor")
        self.assertIn("1 seeded day(s) were excluded", result["quality_note"])
        self.assertFalse(result["wait_insight"]["available"])

    def test_run_simulator_uses_latest_seeded_row_for_current_scenario(self) -> None:
        session = FakeSession(
            {
                "FXRate": [
                    SimpleNamespace(
                        observed_on=date(2026, 4, 2),
                        rate=1380.0,
                        source="exchange_rate_api",
                        is_synthetic=False,
                    ),
                    SimpleNamespace(
                        observed_on=date(2026, 4, 3),
                        rate=1381.0,
                        source="exchange_rate_api",
                        is_synthetic=False,
                    ),
                    SimpleNamespace(
                        observed_on=date(2026, 4, 4),
                        rate=1400.0,
                        source="seeded_history",
                        is_synthetic=True,
                    ),
                ]
            }
        )

        with patch("app.services.simulator_service.get_current_spread", return_value={"risk_level": "LOW"}), patch(
            "app.services.simulator_service.get_brent_signal",
            return_value={"signal": "NEUTRAL"},
        ), patch(
            "app.services.simulator_service._utc_today",
            return_value=date(2026, 4, 4),
        ):
            result = run_simulator(session, "USD", "NGN", 1000, 30, "market")

        self.assertTrue(result["data_available"])
        self.assertEqual(result["today_rate"], 1400.0)
        self.assertEqual(result["today_converted"], 1400000.0)
        self.assertEqual(result["best_rate"], 1381.0)
        self.assertEqual(result["comparison_data_points"], 2)
        self.assertEqual(result["current_rate_source"], "seeded_history")
        self.assertEqual(result["current_rate_as_of"], "2026-04-04")

    def test_run_simulator_parallel_uses_nairatoday_when_aboki_not_configured(self) -> None:
        lagos_tz = timezone.utc
        session = FakeSession(
            {
                "FXRateSnapshot": [
                    SimpleNamespace(
                        recorded_at=datetime(2026, 4, 3, 10, 0, tzinfo=lagos_tz),
                        rate=2025.0,
                        source="abokifx_parallel",
                    ),
                    SimpleNamespace(
                        recorded_at=datetime(2026, 4, 3, 12, 0, tzinfo=lagos_tz),
                        rate=1410.0,
                        source="nairatoday_parallel",
                    ),
                ]
            }
        )

        original_aboki = os.environ.pop("ABOKIFX_AUTH_TOKEN", None)
        try:
            with patch("app.services.simulator_service.get_current_spread", return_value={"risk_level": "LOW"}), patch(
                "app.services.simulator_service.get_brent_signal",
                return_value={"signal": "NEUTRAL"},
            ), patch(
                "app.services.simulator_service._utc_today",
                return_value=date(2026, 4, 4),
            ):
                result = run_simulator(session, "USD", "NGN", 1000, 30, "parallel")
        finally:
            if original_aboki is not None:
                os.environ["ABOKIFX_AUTH_TOKEN"] = original_aboki

        self.assertTrue(result["data_available"])
        self.assertEqual(result["today_rate"], 1410.0)
        self.assertEqual(result["current_rate_source"], "nairatoday_parallel")
        self.assertIn("AbokiFX is not configured", result["quality_note"])

    def test_run_simulator_snapshot_reuses_latest_stored_days_when_recent_window_is_sparse(self) -> None:
        lagos_tz = timezone.utc
        session = FakeSession(
            {
                "FXRateSnapshot": [
                    SimpleNamespace(
                        recorded_at=datetime(2026, 3, 20, 12, 0, tzinfo=lagos_tz),
                        rate=1490.0,
                        source="nairatoday_parallel",
                    ),
                    SimpleNamespace(
                        recorded_at=datetime(2026, 3, 21, 12, 0, tzinfo=lagos_tz),
                        rate=1495.0, 
                        source="nairatoday_parallel",
                    ),
                    SimpleNamespace(
                        recorded_at=datetime(2026, 3, 22, 12, 0, tzinfo=lagos_tz),
                        rate=1500.0,
                        source="nairatoday_parallel",
                    ),
                    SimpleNamespace(
                        recorded_at=datetime(2026, 3, 23, 12, 0, tzinfo=lagos_tz),
                        rate=1505.0,
                        source="nairatoday_parallel",
                    ),
                    SimpleNamespace(
                        recorded_at=datetime(2026, 3, 24, 12, 0, tzinfo=lagos_tz),
                        rate=1510.0,
                        source="nairatoday_parallel",
                    ),
                    SimpleNamespace(
                        recorded_at=datetime(2026, 3, 25, 12, 0, tzinfo=lagos_tz),
                        rate=1515.0,
                        source="nairatoday_parallel",
                    ),
                    SimpleNamespace(
                        recorded_at=datetime(2026, 4, 3, 12, 0, tzinfo=lagos_tz),
                        rate=1520.0,
                        source="nairatoday_parallel",
                    ),
                ]
            }
        )

        original_aboki = os.environ.pop("ABOKIFX_AUTH_TOKEN", None)
        try:
            with patch("app.services.simulator_service.get_current_spread", return_value={"risk_level": "LOW"}), patch(
                "app.services.simulator_service.get_brent_signal",
                return_value={"signal": "NEUTRAL"},
            ), patch(
                "app.services.simulator_service._utc_today",
                return_value=date(2026, 4, 4),
            ):
                result = run_simulator(session, "USD", "NGN", 1000, 7, "parallel")
        finally:
            if original_aboki is not None:
                os.environ["ABOKIFX_AUTH_TOKEN"] = original_aboki

        self.assertTrue(result["data_available"])
        self.assertEqual(result["comparison_data_points"], 7)
        self.assertEqual(result["best_rate_date"], "2026-04-03")
        self.assertEqual(result["recommendation"], "Convert Now")
        self.assertIn("widened beyond the selected 7-day calendar window", result["quality_note"])
        self.assertIn("Only 1 stored parallel market history day(s) fell inside that span", result["quality_note"])
        self.assertIn("spanning 2026-03-20 to 2026-04-03", result["quality_note"])

    def test_run_simulator_builds_empirical_wait_insight_from_comparable_days(self) -> None:
        session = FakeSession(
            {
                "FXRate": [
                    SimpleNamespace(observed_on=date(2026, 3, 15), rate=100.0, source="exchange_rate_api", is_synthetic=False),
                    SimpleNamespace(observed_on=date(2026, 3, 16), rate=101.0, source="exchange_rate_api", is_synthetic=False),
                    SimpleNamespace(observed_on=date(2026, 3, 17), rate=99.8, source="exchange_rate_api", is_synthetic=False),
                    SimpleNamespace(observed_on=date(2026, 3, 18), rate=97.0, source="exchange_rate_api", is_synthetic=False),
                    SimpleNamespace(observed_on=date(2026, 3, 19), rate=100.2, source="exchange_rate_api", is_synthetic=False),
                    SimpleNamespace(observed_on=date(2026, 3, 20), rate=101.5, source="exchange_rate_api", is_synthetic=False),
                    SimpleNamespace(observed_on=date(2026, 3, 21), rate=99.9, source="exchange_rate_api", is_synthetic=False),
                    SimpleNamespace(observed_on=date(2026, 3, 22), rate=96.0, source="exchange_rate_api", is_synthetic=False),
                    SimpleNamespace(observed_on=date(2026, 3, 23), rate=100.1, source="exchange_rate_api", is_synthetic=False),
                    SimpleNamespace(observed_on=date(2026, 3, 24), rate=102.0, source="exchange_rate_api", is_synthetic=False),
                    SimpleNamespace(observed_on=date(2026, 3, 25), rate=96.5, source="exchange_rate_api", is_synthetic=False),
                    SimpleNamespace(observed_on=date(2026, 3, 26), rate=97.0, source="exchange_rate_api", is_synthetic=False),
                    SimpleNamespace(observed_on=date(2026, 3, 27), rate=98.0, source="exchange_rate_api", is_synthetic=False),
                    SimpleNamespace(observed_on=date(2026, 3, 28), rate=96.0, source="exchange_rate_api", is_synthetic=False),
                    SimpleNamespace(observed_on=date(2026, 3, 29), rate=97.0, source="exchange_rate_api", is_synthetic=False),
                    SimpleNamespace(observed_on=date(2026, 3, 30), rate=100.4, source="exchange_rate_api", is_synthetic=False),
                    SimpleNamespace(observed_on=date(2026, 3, 31), rate=96.0, source="exchange_rate_api", is_synthetic=False),
                    SimpleNamespace(observed_on=date(2026, 4, 1), rate=95.0, source="exchange_rate_api", is_synthetic=False),
                    SimpleNamespace(observed_on=date(2026, 4, 2), rate=94.0, source="exchange_rate_api", is_synthetic=False),
                    SimpleNamespace(observed_on=date(2026, 4, 3), rate=93.0, source="exchange_rate_api", is_synthetic=False),
                    SimpleNamespace(observed_on=date(2026, 4, 4), rate=100.0, source="exchange_rate_api", is_synthetic=False),
                ]
            }
        )

        with patch("app.services.simulator_service.get_current_spread", return_value={"risk_level": "LOW"}), patch(
            "app.services.simulator_service.get_brent_signal",
            return_value={"signal": "NEUTRAL"},
        ), patch(
            "app.services.simulator_service._utc_today",
            return_value=date(2026, 4, 4),
        ):
            result = run_simulator(session, "USD", "EUR", 1000, 30, "market")

        self.assertTrue(result["data_available"])
        self.assertTrue(result["wait_insight"]["available"])
        self.assertEqual(result["wait_insight"]["comparable_sample_size"], 5)
        self.assertEqual(result["wait_insight"]["rate_tolerance_pct"], 0.25)
        self.assertEqual(result["wait_insight"]["avg_days_to_better"], 1.5)
        self.assertEqual(result["wait_insight"]["median_days_to_better"], 1.5)
        self.assertEqual(
            result["wait_insight"]["windows"],
            [
                {"horizon_days": 3, "eligible_samples": 5, "better_rate_probability_pct": 100.0},
                {"horizon_days": 7, "eligible_samples": 5, "better_rate_probability_pct": 100.0},
                {"horizon_days": 14, "eligible_samples": 4, "better_rate_probability_pct": 100.0},
            ],
        )
        self.assertIn("empirical, not a forecast", result["wait_insight"]["note"])

    def test_run_simulator_rejects_snapshot_basis_for_non_ngn_pairs(self) -> None:
        session = FakeSession({"FXRateSnapshot": []})

        with patch("app.services.simulator_service.get_current_spread", return_value={"risk_level": "LOW"}), patch(
            "app.services.simulator_service.get_brent_signal",
            return_value={"signal": "NEUTRAL"},
        ), patch(
            "app.services.simulator_service._utc_today",
            return_value=date(2026, 4, 4),
        ):
            result = run_simulator(session, "USD", "EUR", 1000, 30, "parallel")

        self.assertFalse(result["data_available"])
        self.assertIn("only for USD/NGN snapshot feeds", result["error"])


if __name__ == "__main__":
    unittest.main()
