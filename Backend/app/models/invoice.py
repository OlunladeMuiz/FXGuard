from sqlalchemy import Boolean, Column, Integer, String, DateTime, Float, ForeignKey, Text, UniqueConstraint
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.db.database import Base


class Invoice(Base):
    __tablename__ = "invoices"
    __table_args__ = (
        UniqueConstraint("user_id", "invoice_number", name="uq_user_invoice_number"),
    )

    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    invoice_number = Column(String, nullable=False, index=True)
    client_name = Column(String, nullable=False)
    client_email = Column(String, nullable=False)
    client_company = Column(String, nullable=True)
    address = Column(Text, nullable=True)
    country = Column(String, nullable=True)
    amount = Column(Float, nullable=False)
    currency = Column(String, default="USD", nullable=False)
    discount = Column(Float, default=0, nullable=False)  # Discount amount or percentage
    tax_rate = Column(Float, default=0, nullable=False)  # Tax rate as percentage
    issue_date = Column(DateTime, nullable=False)
    due_date = Column(DateTime, nullable=False)
    description = Column(Text, nullable=True)
    payment_method = Column(String, nullable=True)
    payment_details = Column(Text, nullable=True)
    account_name = Column(String, nullable=True)
    bank_name = Column(String, nullable=True)
    account_number = Column(String, nullable=True)
    status = Column(String, default="draft", nullable=False)  # draft, sent, paid, overdue, cancelled
    payment_link = Column(String, nullable=True)
    payment_reference = Column(String, nullable=True, index=True)
    payment_completed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    items = relationship("InvoiceItem", back_populates="invoice", cascade="all, delete-orphan")
    user = relationship("User", backref="invoices")


class InvoiceItem(Base):
    __tablename__ = "invoice_items"

    id = Column(String, primary_key=True, index=True)
    invoice_id = Column(String, ForeignKey("invoices.id"), nullable=False, index=True)
    description = Column(String, nullable=False)
    quantity = Column(Float, nullable=False)
    unit_price = Column(Float, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    invoice = relationship("Invoice", back_populates="items")
