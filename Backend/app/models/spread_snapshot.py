import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, DateTime, Float, Index, String
from app.db.database import Base

class SpreadSnapshot(Base):
    __tablename__ = "spread_snapshots"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    base_currency = Column(String(3), nullable=False, default="USD")
    quote_currency = Column(String(3), nullable=False, default="NGN")
    official_rate = Column(Float, nullable=False)    # CBN NAFEM rate
    parallel_rate = Column(Float, nullable=False)    # AbokiFX rate
    bdc_rate = Column(Float, nullable=True)          # Nairatoday BDC rate
    spread_ngn = Column(Float, nullable=False)       # parallel - official
    spread_pct = Column(Float, nullable=False)       # (spread_ngn / official) * 100
    spread_direction = Column(String, nullable=False)  # "widening" | "stable" | "converging"
    risk_level = Column(String, nullable=False)      # "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
    recorded_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False,
                        default=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        Index("ix_spread_snapshots_recorded_at", "recorded_at"),
    )
