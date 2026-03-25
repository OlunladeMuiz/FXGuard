import asyncio
import sys
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path
from unittest.mock import AsyncMock, Mock, patch


BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.services.fx import get_fx_candles_response


class FXCandleServiceTests(unittest.TestCase):
    def test_get_fx_candles_response_formats_stored_candles(self) -> None:
        end = datetime.now(timezone.utc).replace(second=0, microsecond=0)
        start = end - timedelta(days=7)
        rows = [
            Mock(
                timestamp=start,
                open_rate=1.25,
                high_rate=1.26,
                low_rate=1.24,
                close_rate=1.255,
                source="twelve_data",
            ),
            Mock(
                timestamp=start + timedelta(hours=4),
                open_rate=1.255,
                high_rate=1.27,
                low_rate=1.25,
                close_rate=1.265,
                source="twelve_data",
            ),
            Mock(
                timestamp=end,
                open_rate=1.26,
                high_rate=1.27,
                low_rate=1.255,
                close_rate=1.265,
                source="twelve_data",
            ),
        ]

        with patch("app.services.fx._query_candles", side_effect=[rows]), patch(
            "app.services.fx._estimate_min_expected_candles",
            return_value=1,
        ):
            payload = asyncio.run(
                get_fx_candles_response(
                    Mock(),
                    base="GBP",
                    quote="USD",
                    range_value="7d",
                    interval="4h",
                )
            )

        self.assertEqual(payload["pair"], "GBP/USD")
        self.assertEqual(payload["interval"], "4h")
        self.assertEqual(payload["data_points"], 3)
        self.assertAlmostEqual(payload["stats"]["change_percent"], 1.2, places=1)


if __name__ == "__main__":
    unittest.main()
