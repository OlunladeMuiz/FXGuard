import uuid
from datetime import datetime, timezone
from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Index, String
from sqlalchemy.orm import relationship
from app.db.database import Base

class RateAlert(Base):
    __tablename__ = "rate_alerts"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    pair = Column(String, nullable=False)             # e.g. "USD_NGN"
    target_rate = Column(Float, nullable=False)
    direction = Column(String, nullable=False)         # "ABOVE" | "BELOW"
    rate_source = Column(String, nullable=False, default="any")
    # rate_source: "official" | "parallel" | "bdc" | "any"
    channels = Column(String, nullable=False, default="email")
    # comma-separated: "email,in_app" — WhatsApp stubbed for now
    is_active = Column(Boolean, nullable=False, default=True)
    is_triggered = Column(Boolean, nullable=False, default=False)
    triggered_at = Column(DateTime(timezone=True), nullable=True)
    triggered_rate = Column(Float, nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False,
                        default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), nullable=False,
                        default=lambda: datetime.now(timezone.utc),
                        onupdate=lambda: datetime.now(timezone.utc))

    user = relationship("User", backref="rate_alerts")

    __table_args__ = (
        Index("ix_rate_alerts_user_active", "user_id", "is_active"),
        Index("ix_rate_alerts_pair_active", "pair", "is_active"),
    )


class InAppNotification(Base):
    __tablename__ = "in_app_notifications"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    type = Column(String, nullable=False)   # "RATE_ALERT" | "RECOMMENDATION_CHANGE" | "SYSTEM"
    title = Column(String, nullable=False)
    body = Column(String, nullable=False)
    is_read = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), nullable=False,
                        default=lambda: datetime.now(timezone.utc))

    user = relationship("User", backref="notifications")

    __table_args__ = (
        Index("ix_in_app_notifications_user_unread", "user_id", "is_read"),
    )
