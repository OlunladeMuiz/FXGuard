from datetime import datetime, timezone
from sqlalchemy import Column, DateTime, String, UniqueConstraint
from app.db.database import Base


class IntegrationConnection(Base):
    __tablename__ = "integration_connections"
    __table_args__ = (
        UniqueConstraint("user_id", "provider", name="uq_integration_user_provider"),
    )

    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, nullable=False, index=True)
    provider = Column(String, nullable=False, index=True)  # paystack | stripe | paypal
    status = Column(String, nullable=False, default="connected")
    credential_hint = Column(String, nullable=True)
    connected_at = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
