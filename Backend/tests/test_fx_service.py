import asyncio
import sys
import tempfile
import unittest
from datetime import date
from pathlib import Path
from unittest.mock import AsyncMock, Mock, patch


BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.db import database
from app.jobs.fx_jobs import FX_HISTORY_BACKFILL_DAYS, NGN_PAIRS, job_sync_exchange_rate_api
from app.models.brent_crude import BrentCrude
from app.models.cbn_reserves import CbnReserves
from app.models.fx_rate import FXRate
from app.services.brent_crude_service import fetch_brent_crude
from app.services.scrapers.cbn_reserves_scraper import ingest_cbn_reserves
from app.services.fx import (
    HistoricalRatesUnavailable,
    _fetch_pair_history_for_dates,
    _upsert_fx_rate,
    get_fx_history_response,
    get_fx_rates,
)


class FXServiceTests(unittest.TestCase):
    def _use_temp_database(self, prefix: str) -> None:
        db_path = Path(__file__).resolve().parent / f"{prefix}_{next(tempfile._get_candidate_names())}.db"
        original_database_url = database.DATABASE_URL
        original_engine = database.engine
        temp_url = f"sqlite:///{db_path}"
        temp_engine = database._create_engine(temp_url)

        database.DATABASE_URL = temp_url
        database.engine = temp_engine
        database.SessionLocal.configure(bind=temp_engine)
        database.initialize_database()

        def cleanup() -> None:
            database.SessionLocal.configure(bind=original_engine)
            database.DATABASE_URL = original_database_url
            database.engine = original_engine
            temp_engine.dispose()
            if db_path.exists():
                db_path.unlink()

        self.addCleanup(cleanup)

    def test_upsert_fx_rate_preserves_real_rows_against_synthetic_fallback(self) -> None:
        self._use_temp_database("fx_upsert")
        session = database.SessionLocal()

        try:
            observed_on = date(2026, 4, 4)

            _upsert_fx_rate(
                session,
                base="USD",
                quote="NGN",
                observed_on=observed_on,
                rate=1500.0,
                source="exchange_rate_api",
                is_synthetic=False,
            )
            session.commit()

            _upsert_fx_rate(
                session,
                base="USD",
                quote="NGN",
                observed_on=observed_on,
                rate=9999.0,
                source="seeded_history",
                is_synthetic=True,
            )
            session.commit()

            row = (
                session.query(FXRate)
                .filter(
                    FXRate.base_currency == "USD",
                    FXRate.quote_currency == "NGN",
                    FXRate.observed_on == observed_on,
                )
                .one()
            )
            self.assertEqual(row.rate, 1500.0)
            self.assertEqual(row.source, "exchange_rate_api")
            self.assertFalse(row.is_synthetic)

            _upsert_fx_rate(
                session,
                base="USD",
                quote="NGN",
                observed_on=observed_on,
                rate=1600.0,
                source="exchange_rate_api",
                is_synthetic=False,
            )
            session.commit()

            row = (
                session.query(FXRate)
                .filter(
                    FXRate.base_currency == "USD",
                    FXRate.quote_currency == "NGN",
                    FXRate.observed_on == observed_on,
                )
                .one()
            )
            self.assertEqual(row.rate, 1600.0)
            self.assertEqual(row.source, "exchange_rate_api")
            self.assertFalse(row.is_synthetic)
        finally:
            session.close()

    def test_job_sync_exchange_rate_api_uses_backfill_window(self) -> None:
        fake_session = Mock()
        fake_session.close = Mock()

        with patch("app.jobs.fx_jobs.SessionLocal", return_value=fake_session), patch(
            "app.services.fx.ensure_history_window",
            new=AsyncMock(return_value={}),
        ) as ensure_mock:
            asyncio.run(job_sync_exchange_rate_api())

        self.assertEqual(ensure_mock.await_count, len(NGN_PAIRS))
        for call in ensure_mock.await_args_list:
            self.assertEqual(call.kwargs["days"], FX_HISTORY_BACKFILL_DAYS)

        fake_session.close.assert_called_once()

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

    def test_fetch_brent_crude_stores_full_series(self) -> None:
        self._use_temp_database("brent_history")
        session = database.SessionLocal()

        class FakeResponse:
            def __init__(self, payload):
                self._payload = payload

            def raise_for_status(self) -> None:
                return None

            def json(self):
                return self._payload

        class FakeClient:
            def __init__(self, *args, **kwargs):
                pass

            async def __aenter__(self):
                return self

            async def __aexit__(self, exc_type, exc, tb):
                return None

            async def get(self, *args, **kwargs):
                return FakeResponse(
                    {
                        "data": [
                            {"date": "2026-04-04", "value": "80.0"},
                            {"date": "2026-04-03", "value": "79.0"},
                            {"date": "2026-04-02", "value": "78.5"},
                            {"date": "2026-04-01", "value": "79.2"},
                            {"date": "2026-03-31", "value": "78.0"},
                            {"date": "2026-03-30", "value": "77.4"},
                            {"date": "2026-03-27", "value": "76.8"},
                            {"date": "2026-03-26", "value": "76.0"},
                            {"date": "2026-03-25", "value": "75.5"},
                        ]
                    }
                )

        with patch("app.services.brent_crude_service.ALPHA_VANTAGE_API_KEY", "test-key"), patch(
            "app.services.brent_crude_service.httpx.AsyncClient",
            new=FakeClient,
        ):
            result = asyncio.run(fetch_brent_crude(session))

        rows = (
            session.query(BrentCrude)
            .order_by(BrentCrude.recorded_at.asc())
            .all()
        )

        self.assertIsNotNone(result)
        self.assertEqual(len(rows), 9)
        self.assertEqual(rows[0].recorded_at.date(), date(2026, 3, 25))
        self.assertEqual(rows[-1].recorded_at.date(), date(2026, 4, 4))
        self.assertIsNotNone(rows[-1].weekly_change_pct)
        session.close()

    def test_ingest_cbn_reserves_stores_full_series(self) -> None:
        self._use_temp_database("cbn_reserves_history")
        session = database.SessionLocal()

        class FakeResponse:
            def __init__(self, text: str):
                self.text = text
                self.headers = {"content-type": "text/csv"}

            def raise_for_status(self) -> None:
                return None

        first_payload = """week_of,reserves_usd_bn\n2026-03-20,40.0\n2026-03-27,40.5\n2026-04-03,41.0\n"""
        second_payload = """week_of,reserves_usd_bn\n2026-03-20,40.0\n2026-03-27,40.5\n2026-04-03,41.2\n"""

        with patch("app.services.scrapers.cbn_reserves_scraper.CBN_RESERVES_SOURCE_URL", "https://example.invalid/reserves.csv"), patch(
            "app.services.scrapers.cbn_reserves_scraper.httpx.get",
            return_value=FakeResponse(first_payload),
        ):
            first_count = ingest_cbn_reserves(session)

        with patch("app.services.scrapers.cbn_reserves_scraper.CBN_RESERVES_SOURCE_URL", "https://example.invalid/reserves.csv"), patch(
            "app.services.scrapers.cbn_reserves_scraper.httpx.get",
            return_value=FakeResponse(second_payload),
        ):
            second_count = ingest_cbn_reserves(session)

        rows = (
            session.query(CbnReserves)
            .order_by(CbnReserves.week_of.asc())
            .all()
        )

        self.assertEqual(first_count, 3)
        self.assertEqual(second_count, 3)
        self.assertEqual(len(rows), 3)
        self.assertEqual(rows[-1].reserves_usd_bn, 41.2)
        session.close()


if __name__ == "__main__":
    unittest.main()
