from datetime import datetime, timezone
import uuid

from sqlalchemy import Column, DateTime, Float, Index, String, UniqueConstraint, desc

from app.db.database import Base


class FXCandle(Base):
    __tablename__ = "fx_candles"
    __table_args__ = (
        UniqueConstraint(
            "base_currency",
            "quote_currency",
            "interval",
            "timestamp",
            name="uq_fx_candles_pair_interval_timestamp",
        ),
        Index(
            "ix_fx_candles_pair_interval_timestamp_desc",
            "base_currency",
            "quote_currency",
            "interval",
            desc("timestamp"),
        ),
    )

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    base_currency = Column(String(3), nullable=False)
    quote_currency = Column(String(3), nullable=False)
    interval = Column(String(10), nullable=False)
    timestamp = Column(DateTime(timezone=True), nullable=False)
    open_rate = Column(Float, nullable=False)
    high_rate = Column(Float, nullable=False)
    low_rate = Column(Float, nullable=False)
    close_rate = Column(Float, nullable=False)
    source = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
