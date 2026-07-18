import csv
import io
import logging
import os
from datetime import datetime, timezone
from html.parser import HTMLParser

import httpx
from sqlalchemy.orm import Session

from app.models.cbn_reserves import CbnReserves

logger = logging.getLogger(__name__)

CBN_RESERVES_SOURCE_URL = os.getenv("CBN_RESERVES_SOURCE_URL", "").strip()


class _TableParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.in_table = False
        self.in_row = False
        self.in_cell = False
        self.tables: list[list[list[str]]] = []
        self._current_table: list[list[str]] = []
        self._current_row: list[str] = []
        self._cell_buffer: list[str] = []

    def handle_starttag(self, tag, attrs):
        if tag == "table":
            self.in_table = True
            self._current_table = []
        elif tag == "tr" and self.in_table:
            self.in_row = True
            self._current_row = []
        elif tag in ("td", "th") and self.in_row:
            self.in_cell = True
            self._cell_buffer = []

    def handle_endtag(self, tag):
        if tag in ("td", "th") and self.in_cell:
            cell_text = "".join(self._cell_buffer).strip()
            self._current_row.append(cell_text)
            self.in_cell = False
        elif tag == "tr" and self.in_row:
            if self._current_row:
                self._current_table.append(self._current_row)
            self.in_row = False
        elif tag == "table" and self.in_table:
            if self._current_table:
                self.tables.append(self._current_table)
            self.in_table = False

    def handle_data(self, data):
        if self.in_cell:
            self._cell_buffer.append(data)


def _parse_date(value: str) -> datetime | None:
    cleaned = value.strip()
    for fmt in ("%Y-%m-%d", "%d-%m-%Y", "%d/%m/%Y", "%b %d, %Y", "%d %b %Y"):
        try:
            return datetime.strptime(cleaned, fmt).replace(tzinfo=timezone.utc)
        except ValueError:
            continue
    return None


def _parse_float(value: str) -> float | None:
    cleaned = value.strip().replace(",", "").replace("$", "")
    if not cleaned:
        return None
    try:
        return float(cleaned)
    except ValueError:
        return None


def _extract_rows_from_csv(text: str) -> list[tuple[datetime, float]]:
    reader = csv.DictReader(io.StringIO(text))
    rows: list[tuple[datetime, float]] = []
    for row in reader:
        date_value = row.get("week_of") or row.get("week") or row.get("date") or row.get("as_of")
        reserves_value = row.get("reserves_usd_bn") or row.get("reserves") or row.get("gross_reserves")
        if not date_value or not reserves_value:
            continue
        parsed_date = _parse_date(date_value)
        parsed_reserves = _parse_float(reserves_value)
        if parsed_date and parsed_reserves is not None:
            rows.append((parsed_date, parsed_reserves))

    rows.sort(key=lambda item: item[0])
    return rows


def _extract_rows_from_json(payload: object) -> list[tuple[datetime, float]]:
    if isinstance(payload, dict):
        items = payload.get("data") if isinstance(payload.get("data"), list) else [payload]
    elif isinstance(payload, list):
        items = payload
    else:
        return []

    rows: list[tuple[datetime, float]] = []
    for item in items:
        if not isinstance(item, dict):
            continue
        date_value = item.get("week_of") or item.get("week") or item.get("date") or item.get("as_of")
        reserves_value = item.get("reserves_usd_bn") or item.get("reserves") or item.get("gross_reserves")
        if not date_value or reserves_value is None:
            continue
        parsed_date = _parse_date(str(date_value))
        parsed_reserves = _parse_float(str(reserves_value))
        if parsed_date and parsed_reserves is not None:
            rows.append((parsed_date, parsed_reserves))

    rows.sort(key=lambda item: item[0])
    return rows


def _extract_rows_from_html(text: str) -> list[tuple[datetime, float]]:
    parser = _TableParser()
    parser.feed(text)
    rows: list[tuple[datetime, float]] = []

    for table in parser.tables:
        if not table:
            continue
        headers = [cell.lower() for cell in table[0]]
        if not any("reserve" in header for header in headers):
            continue
        date_idx = next((i for i, header in enumerate(headers) if "date" in header or "week" in header), None)
        reserve_idx = next((i for i, header in enumerate(headers) if "reserve" in header), None)
        if date_idx is None or reserve_idx is None:
            continue

        for row in table[1:]:
            if len(row) <= max(date_idx, reserve_idx):
                continue
            parsed_date = _parse_date(row[date_idx])
            parsed_reserves = _parse_float(row[reserve_idx])
            if parsed_date and parsed_reserves is not None:
                rows.append((parsed_date, parsed_reserves))

    rows.sort(key=lambda item: item[0])
    return rows


def _upsert_reserves_row(
    db: Session,
    *,
    week_of: datetime,
    reserves_usd_bn: float,
) -> None:
    existing = (
        db.query(CbnReserves)
        .filter(CbnReserves.week_of == week_of)
        .first()
    )
    if existing is None:
        db.add(
            CbnReserves(
                week_of=week_of,
                reserves_usd_bn=reserves_usd_bn,
                source="cbn_reserves_feed",
            )
        )
        return

    existing.reserves_usd_bn = reserves_usd_bn
    existing.source = "cbn_reserves_feed"


def ingest_cbn_reserves(db: Session) -> int:
    if not CBN_RESERVES_SOURCE_URL:
        logger.warning("CBN reserves source URL not configured. Set CBN_RESERVES_SOURCE_URL to enable ingestion.")
        return 0

    try:
        response = httpx.get(CBN_RESERVES_SOURCE_URL, timeout=20.0, headers={"User-Agent": "FXGuard/1.0"})
        response.raise_for_status()
    except Exception as exc:
        logger.warning("CBN reserves fetch failed: %s", exc)
        return 0

    content_type = response.headers.get("content-type", "").lower()
    rows: list[tuple[datetime, float]]

    if "application/json" in content_type:
        rows = _extract_rows_from_json(response.json())
    elif "text/csv" in content_type or response.text.strip().startswith("week"):
        rows = _extract_rows_from_csv(response.text)
    else:
        rows = _extract_rows_from_html(response.text)

    if not rows:
        logger.warning("CBN reserves scraper could not parse a valid data row.")
        return 0

    stored = 0
    for week_of, reserves_usd_bn in rows:
        _upsert_reserves_row(
            db,
            week_of=week_of,
            reserves_usd_bn=reserves_usd_bn,
        )
        stored += 1

    db.commit()
    logger.info("CBN reserves scraper stored %d rows", stored)
    return stored
