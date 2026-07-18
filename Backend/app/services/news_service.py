import logging
import re
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
import httpx
from sqlalchemy.orm import Session
from app.models.news_headline import NewsHeadline

logger = logging.getLogger(__name__)

RSS_SOURCES = [
    ("nairametrics", "https://nairametrics.com/feed/"),
    ("businessday", "https://businessday.ng/feed/"),
    ("cbn", "https://www.cbn.gov.ng/rss.asp"),
]

FLAGGING_KEYWORDS = [
    "CBN", "forex", "FX", "devaluation", "depreciation",
    "intervention", "BDC", "NAFEM", "NFEM", "dollar", "exchange rate",
    "OPEC", "crude oil", "monetary policy", "MPC", "foreign exchange",
    "reserves", "inflation",
]

NEGATIVE_KEYWORDS = [
    "fall", "drop", "decline", "depreciate", "weaken", "restrict",
    "ban", "crisis", "shortage", "devaluation", "pressure", "slump",
]

POSITIVE_KEYWORDS = [
    "gain", "rise", "strengthen", "appreciate", "improve", "intervention",
    "inflow", "boost", "stable", "stabilize", "surplus",
]

TOPIC_KEYWORDS = {
    "policy": ["MPC", "policy", "rate hike", "rate cut", "monetary", "guidance"],
    "intervention": ["intervention", "CBN", "defend", "auction", "NAFEM", "NFEM"],
    "reserves": ["reserves", "gross reserves", "fx reserves"],
    "oil": ["brent", "crude", "oil price", "opec"],
    "inflation": ["inflation", "CPI", "price level"],
}

FX_CONTEXT_PATTERNS = [
    r"\bCBN\b",
    r"\bFOREX\b",
    r"\bFX\b",
    r"\bBDC\b",
    r"\bNAFEM\b",
    r"\bNFEM\b",
    r"\bDOLLAR\b",
    r"\bRESERVES?\b",
    r"\bEXCHANGE\s+RATE\b",
    r"\bFOREIGN\s+EXCHANGE\b",
    r"\bDEVALUATION\b",
    r"\bDEPRECIATION\b",
    r"\bMONETARY\s+POLICY\b",
    r"\bMPC\b",
    r"\bCRUDE\s+OIL\b",
    r"\bOPEC\b",
    r"\bINFLATION\b",
]


def _headline_identity(source: str, title: str, url: str | None, published_at: datetime) -> tuple[str, str, str]:
    normalized_source = source.strip().lower()
    normalized_reference = (url or title).strip().lower()
    normalized_timestamp = published_at.astimezone(timezone.utc).isoformat()
    return normalized_source, normalized_reference, normalized_timestamp


def _dedupe_rows(rows: list[NewsHeadline]) -> list[NewsHeadline]:
    deduped: dict[tuple[str, str, str], NewsHeadline] = {}
    for row in rows:
        key = _headline_identity(row.source, row.title, row.url, row.published_at)
        existing = deduped.get(key)
        if existing is None or row.id > existing.id:
            deduped[key] = row

    return sorted(deduped.values(), key=lambda row: row.published_at, reverse=True)


def _is_fx_relevant_title(title: str) -> bool:
    title_upper = title.upper()
    return any(re.search(pattern, title_upper) for pattern in FX_CONTEXT_PATTERNS)


async def ingest_news_feeds(db: Session) -> int:
    """
    Fetch and parse RSS feeds from Nairametrics and BusinessDay.
    Store flagged headlines. Returns count of new headlines stored.
    """
    stored = 0
    for source_name, rss_url in RSS_SOURCES:
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                response = await client.get(rss_url, headers={"User-Agent": "FXGuard/1.0"})
                response.raise_for_status()

            root = ET.fromstring(response.text)
            channel = root.find("channel")
            if channel is None:
                continue

            for item in channel.findall("item"):
                title_el = item.find("title")
                link_el = item.find("link")
                pubdate_el = item.find("pubDate")

                if title_el is None or title_el.text is None:
                    continue

                title = title_el.text.strip()
                url = link_el.text.strip() if link_el is not None and link_el.text else None

                published_at = datetime.now(timezone.utc)
                if pubdate_el is not None and pubdate_el.text:
                    try:
                        published_at = parsedate_to_datetime(pubdate_el.text.strip()).astimezone(timezone.utc)
                    except Exception:
                        pass

                existing = (
                    db.query(NewsHeadline)
                    .filter(
                        NewsHeadline.source == source_name,
                        NewsHeadline.url == url,
                        NewsHeadline.published_at == published_at,
                    )
                    .first()
                )
                if existing is not None:
                    continue

                is_flagged = _is_fx_relevant_title(title)
                sentiment = _simple_sentiment(title) if is_flagged else None

                headline = NewsHeadline(
                    title=title,
                    source=source_name,
                    url=url,
                    published_at=published_at,
                    is_flagged=is_flagged,
                    sentiment_score=sentiment,
                )
                db.add(headline)
                stored += 1

        except Exception as exc:
            logger.warning("News feed error for %s: %s — continuing", source_name, exc)
            continue

    if stored:
        try:
            db.commit()
        except Exception as exc:
            db.rollback()
            logger.error("News headline DB commit error: %s", exc)
            return 0

    logger.info("News feed ingested %d headlines", stored)
    return stored


def get_recent_sentiment(db: Session, hours: int = 24) -> float:
    """
    Return average sentiment score of flagged headlines in the last N hours.
    Returns 0.0 if no flagged headlines.
    """
    from datetime import timedelta
    cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)
    rows = (
        db.query(NewsHeadline)
        .filter(
            NewsHeadline.published_at >= cutoff,
        )
        .all()
    )
    deduped_rows = [
        row
        for row in _dedupe_rows(rows)
        if _is_fx_relevant_title(row.title)
    ]
    if not deduped_rows:
        return 0.0
    scores = [
        row.sentiment_score if row.sentiment_score is not None else _simple_sentiment(row.title)
        for row in deduped_rows
    ]
    return round(sum(scores) / len(scores), 3) if scores else 0.0


def _simple_sentiment(text: str) -> float:
    """
    Naive keyword-based sentiment: returns -1.0 to 1.0
    """
    text_upper = text.upper()
    positive_hits = sum(1 for kw in POSITIVE_KEYWORDS if kw.upper() in text_upper)
    negative_hits = sum(1 for kw in NEGATIVE_KEYWORDS if kw.upper() in text_upper)
    total = positive_hits + negative_hits
    if total == 0:
        return 0.0
    return round((positive_hits - negative_hits) / total, 2)


def _classify_topics(text: str) -> list[str]:
    text_upper = text.upper()
    topics: list[str] = []
    for topic, keywords in TOPIC_KEYWORDS.items():
        if any(keyword.upper() in text_upper for keyword in keywords):
            topics.append(topic)
    return topics


def get_news_signal(db: Session, hours: int = 24) -> dict:
    from datetime import timedelta

    cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)
    rows = (
        db.query(NewsHeadline)
        .filter(
            NewsHeadline.published_at >= cutoff,
        )
        .order_by(NewsHeadline.published_at.desc())
        .all()
    )

    rows = [
        row
        for row in _dedupe_rows(rows)
        if _is_fx_relevant_title(row.title)
    ]

    if not rows:
        return {
            "as_of": datetime.now(timezone.utc).isoformat(),
            "headline_count": 0,
            "avg_sentiment": 0.0,
            "risk_flag": False,
            "top_topics": [],
            "headlines": [],
        }

    scores = [
        row.sentiment_score if row.sentiment_score is not None else _simple_sentiment(row.title)
        for row in rows
    ]
    avg_sentiment = round(sum(scores) / len(scores), 3) if scores else 0.0
    topic_hits: dict[str, int] = {}
    for row in rows:
        for topic in _classify_topics(row.title):
            topic_hits[topic] = topic_hits.get(topic, 0) + 1

    top_topics = sorted(topic_hits.items(), key=lambda item: item[1], reverse=True)
    risk_flag = avg_sentiment < -0.15 or any(topic == "intervention" for topic, _ in top_topics[:2])

    return {
        "as_of": datetime.now(timezone.utc).isoformat(),
        "headline_count": len(rows),
        "avg_sentiment": avg_sentiment,
        "risk_flag": risk_flag,
        "top_topics": [topic for topic, _ in top_topics[:3]],
        "headlines": [
            {
                "title": row.title,
                "source": row.source,
                "url": row.url,
                "published_at": row.published_at.isoformat(),
                "sentiment": row.sentiment_score if row.sentiment_score is not None else _simple_sentiment(row.title),
            }
            for row in rows[:6]
        ],
    }
