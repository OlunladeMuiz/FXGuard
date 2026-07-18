import sys
import unittest
from datetime import datetime, timezone
from pathlib import Path
from unittest.mock import Mock, patch
import os

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

# We must set the environment variable BEFORE importing spread_service
# to ensure ALLOW_SYNTHETIC_DATA is evaluated to True
os.environ["ALLOW_SYNTHETIC_DATA"] = "true"

from app.services.spread_service import compute_and_store_spread, get_current_spread

class SpreadServiceTests(unittest.TestCase):
    @patch("app.services.spread_service._select_snapshot")
    def test_compute_and_store_spread_is_synthetic(self, mock_select_snapshot):
        mock_db = Mock()
        
        # Mocking official_row, parallel_row, bdc_row
        mock_official = Mock()
        mock_official.source = "synthetic_official"
        mock_official.rate = 1000.0
        
        mock_parallel = Mock()
        mock_parallel.source = "abokifx_parallel" # Mixing synthetic and non-synthetic
        mock_parallel.rate = 1200.0
        
        mock_select_snapshot.side_effect = [mock_official, mock_parallel, None]
        
        # Mock old_snapshot for direction
        mock_db.query.return_value.filter.return_value.order_by.return_value.first.return_value = None
        
        result = compute_and_store_spread(mock_db)
        
        self.assertIsNotNone(result)
        self.assertEqual(result["official_source"], "synthetic_official")
        self.assertEqual(result["parallel_source"], "abokifx_parallel")
        # Since one of them is synthetic, is_synthetic must be True
        self.assertTrue(result["is_synthetic"])

    @patch("app.services.spread_service._select_snapshot")
    def test_get_current_spread_is_synthetic_from_cache(self, mock_select_snapshot):
        mock_db = Mock()
        
        # Mocking the database returning a recent snapshot (so should_refresh=False)
        mock_snapshot = Mock()
        mock_snapshot.recorded_at = datetime.now(timezone.utc)
        mock_snapshot.official_rate = 1000.0
        mock_snapshot.parallel_rate = 1200.0
        mock_snapshot.bdc_rate = None
        mock_snapshot.spread_ngn = 200.0
        mock_snapshot.spread_pct = 20.0
        mock_snapshot.spread_direction = "stable"
        mock_snapshot.risk_level = "CRITICAL"
        
        mock_db.query.return_value.order_by.return_value.first.return_value = mock_snapshot
        
        mock_official = Mock()
        mock_official.source = "synthetic_official"
        mock_official.recorded_at = mock_snapshot.recorded_at
        mock_official.rate = 1000.0
        
        mock_parallel = Mock()
        mock_parallel.source = "abokifx_parallel"
        mock_parallel.recorded_at = mock_snapshot.recorded_at
        mock_parallel.rate = 1200.0
        
        mock_select_snapshot.side_effect = [mock_official, mock_parallel, None]
        
        result = get_current_spread(mock_db)
        
        self.assertIsNotNone(result)
        self.assertEqual(result["official_source"], "synthetic_official")
        self.assertEqual(result["parallel_source"], "abokifx_parallel")
        self.assertTrue(result["is_synthetic"])

if __name__ == "__main__":
    unittest.main()
