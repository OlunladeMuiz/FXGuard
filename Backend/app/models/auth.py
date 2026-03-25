from sqlalchemy import Boolean, Column, Integer, String, DateTime
from datetime import datetime, timezone
from app.db.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    password = Column(String, nullable=False)
    is_verified = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc)) 
    verification_code = Column(Integer, nullable=True)
    verification_code_expires_at = Column(DateTime, nullable=True)
    company_name = Column(String)
    first_name = Column(String, nullable=True)
    last_name = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    time_zone = Column(String, nullable=True)
    preferred_currency = Column(String, nullable=True, default="NGN")
