import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, DateTime, Float, Index, String
from app.db.database import Base

class BrentCrude(Base):
    __tablename__ = "brent_crude"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    price_usd = Column(Float, nullable=False)
    weekly_change_pct = Column(Float, nullable=True)
    source = Column(String, nullable=False, default="alpha_vantage")
    recorded_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False,
                        default=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        Index("ix_brent_crude_recorded_at", "recorded_at"),
    )
