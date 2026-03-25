from datetime import datetime, timezone
import uuid

from sqlalchemy import Boolean, Column, Date, DateTime, Float, Index, String, UniqueConstraint, desc

from app.db.database import Base


class FXRate(Base):
    __tablename__ = "fx_rates"
    __table_args__ = (
        UniqueConstraint(
            "base_currency",
            "quote_currency",
            "observed_on",
            name="uq_fx_rates_pair_observed_on",
        ),
        Index(
            "ix_fx_rates_pair_observed_on_desc",
            "base_currency",
            "quote_currency",
            desc("observed_on"),
        ),
    )

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    base_currency = Column(String(3), nullable=False)
    quote_currency = Column(String(3), nullable=False)
    rate = Column(Float, nullable=False)
    observed_on = Column(Date, nullable=False)
    source = Column(String, nullable=False)
    is_synthetic = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
