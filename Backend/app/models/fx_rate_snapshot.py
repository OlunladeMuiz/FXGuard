import uuid
from datetime import datetime, timezone
from sqlalchemy import Boolean, Column, DateTime, Float, Index, String
from app.db.database import Base

class FXRateSnapshot(Base):
    __tablename__ = "fx_rate_snapshots"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    base_currency = Column(String(3), nullable=False)
    quote_currency = Column(String(3), nullable=False)
    rate = Column(Float, nullable=False)
    buying_rate = Column(Float, nullable=True)
    selling_rate = Column(Float, nullable=True)
    source = Column(String, nullable=False)
    # source values: "exchange_rate_api" | "cbn_official" | "abokifx_parallel"
    #                "nairatoday_parallel" | "nairatoday_bdc" | "nairatoday_bank"
    #                "brent_crude" | "cbn_reserves"
    rate_type = Column(String, nullable=False)
    # rate_type values: "interbank" | "official" | "parallel" | "bdc" | "bank" | "commodity" | "macro"
    recorded_at = Column(DateTime(timezone=True), nullable=False)
    is_stale = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), nullable=False,
                        default=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        Index("ix_fx_rate_snapshots_pair_source_recorded",
              "base_currency", "quote_currency", "source", "recorded_at"),
        Index("ix_fx_rate_snapshots_recorded_at", "recorded_at"),
    )
