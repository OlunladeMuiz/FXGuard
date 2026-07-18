import uuid
from datetime import datetime, timezone
from sqlalchemy import Boolean, Column, DateTime, Float, Index, String, Text
from app.db.database import Base

class NewsHeadline(Base):
    __tablename__ = "news_headlines"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    title = Column(String, nullable=False)
    source = Column(String, nullable=False)
    url = Column(String, nullable=True)
    published_at = Column(DateTime(timezone=True), nullable=False)
    is_flagged = Column(Boolean, nullable=False, default=False)
    sentiment_score = Column(Float, nullable=True)  # -1.0 to 1.0
    created_at = Column(DateTime(timezone=True), nullable=False,
                        default=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        Index("ix_news_headlines_published_flagged", "published_at", "is_flagged"),
    )
