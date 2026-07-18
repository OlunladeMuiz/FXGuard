import uuid
from datetime import datetime, timezone
from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Index, String, Text
from sqlalchemy.orm import relationship
from app.db.database import Base

class ConversionLog(Base):
    __tablename__ = "conversion_logs"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    pair = Column(String, nullable=False)              # "USD_NGN"
    base_currency = Column(String(3), nullable=False)
    quote_currency = Column(String(3), nullable=False)
    base_amount = Column(Float, nullable=False)        # amount in base currency
    quote_amount = Column(Float, nullable=False)       # amount received in quote
    rate_used = Column(Float, nullable=False)          # actual conversion rate
    source = Column(String, nullable=False, default="manual")
    # source: "stripe" | "paypal" | "bank" | "manual" | "estimated"
    converted_at = Column(DateTime(timezone=True), nullable=False)
    followed_recommendation = Column(Boolean, nullable=True)
    optimal_rate_7d = Column(Float, nullable=True)     # best rate ±7 days
    optimal_amount_7d = Column(Float, nullable=True)   # what they would have received
    lost_amount_7d = Column(Float, nullable=True)      # positive = lost vs optimal
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False,
                        default=lambda: datetime.now(timezone.utc))

    user = relationship("User", backref="conversion_logs")

    __table_args__ = (
        Index("ix_conversion_logs_user_converted", "user_id", "converted_at"),
    )
