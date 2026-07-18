import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, DateTime, Float, Index, String
from app.db.database import Base

class CbnReserves(Base):
    __tablename__ = "cbn_reserves"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    reserves_usd_bn = Column(Float, nullable=False)
    week_of = Column(DateTime(timezone=True), nullable=False)
    source = Column(String, nullable=False, default="cbn_website")
    created_at = Column(DateTime(timezone=True), nullable=False,
                        default=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        Index("ix_cbn_reserves_week_of", "week_of"),
    )
