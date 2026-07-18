import sys
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker


BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.db.database import Base
from app.models.news_headline import NewsHeadline
from app.services.news_service import (
    _is_fx_relevant_title,
    get_news_signal,
    get_recent_sentiment,
)


class NewsServiceTests(unittest.TestCase):
    def setUp(self) -> None:
        self.engine = create_engine("sqlite:///:memory:")
        self.Session = sessionmaker(bind=self.engine)
        Base.metadata.create_all(self.engine, tables=[NewsHeadline.__table__])
        self.db = self.Session()

    def tearDown(self) -> None:
        self.db.close()
        Base.metadata.drop_all(self.engine, tables=[NewsHeadline.__table__])
        self.engine.dispose()

    def _add_headline(
        self,
        *,
        title: str,
        source: str = "nairametrics",
        url: str | None = None,
        published_at: datetime | None = None,
        is_flagged: bool = True,
        sentiment_score: float | None = None,
    ) -> None:
        self.db.add(
            NewsHeadline(
                title=title,
                source=source,
                url=url,
                published_at=published_at or datetime.now(timezone.utc),
                is_flagged=is_flagged,
                sentiment_score=sentiment_score,
            )
        )
        self.db.commit()

    def test_is_fx_relevant_title_filters_generic_naira_mentions(self) -> None:
        self.assertFalse(
            _is_fx_relevant_title(
                "Nine months after commissioning, rain wrecks Wike's billion-naira bus terminal"
            )
        )
        self.assertTrue(
            _is_fx_relevant_title(
                "Naira weakens to N1,389/$ as CBN reserves drop by $850 million"
            )
        )

    def test_get_news_signal_dedupes_duplicate_rows_and_filters_irrelevant_titles(self) -> None:
        published_at = datetime.now(timezone.utc) - timedelta(hours=2)
        title = "Naira weakens to N1,389/$ as CBN reserves drop by $850 million"

        self._add_headline(
            title=title,
            url="https://example.com/a",
            published_at=published_at,
            sentiment_score=-1.0,
        )
        self._add_headline(
            title=title,
            url="https://example.com/a",
            published_at=published_at,
            sentiment_score=-1.0,
        )
        self._add_headline(
            title="Nine months after commissioning, rain wrecks Wike's billion-naira bus terminal",
            source="businessday",
            url="https://example.com/b",
            published_at=published_at,
            sentiment_score=0.0,
        )

        signal = get_news_signal(self.db)

        self.assertEqual(signal["headline_count"], 1)
        self.assertEqual(signal["avg_sentiment"], -1.0)
        self.assertEqual(signal["headlines"][0]["title"], title)
        self.assertTrue(signal["risk_flag"])

    def test_get_recent_sentiment_uses_dynamic_sentiment_when_missing(self) -> None:
        self._add_headline(
            title="CBN warns of FX pressure as reserves weaken",
            sentiment_score=None,
        )

        sentiment = get_recent_sentiment(self.db)

        self.assertLess(sentiment, 0.0)


if __name__ == "__main__":
    unittest.main()
