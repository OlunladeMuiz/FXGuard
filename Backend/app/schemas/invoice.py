from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional, List


class InvoiceItemCreate(BaseModel):
    description: str
    quantity: float
    unit_price: float


class InvoiceItemResponse(BaseModel):
    id: str
    invoice_id: str
    description: str
    quantity: float
    unit_price: float
    created_at: datetime

    class Config:
        from_attributes = True


class InvoiceCreate(BaseModel):
    invoice_number: str
    client_name: str
    client_email: EmailStr
    client_company: Optional[str] = None
    address: Optional[str] = None
    country: Optional[str] = None
    amount: float
    currency: str = "USD"
    discount: float = 0
    tax_rate: float = 0
    issue_date: datetime
    due_date: datetime
    description: Optional[str] = None
    payment_method: Optional[str] = None
    payment_details: Optional[str] = None
    account_name: Optional[str] = None
    bank_name: Optional[str] = None
    account_number: Optional[str] = None
    status: str = "draft"
    items: List[InvoiceItemCreate]


class InvoiceUpdate(BaseModel):
    invoice_number: Optional[str] = None
    client_name: Optional[str] = None
    client_email: Optional[EmailStr] = None
    client_company: Optional[str] = None
    address: Optional[str] = None
    country: Optional[str] = None
    amount: Optional[float] = None
    currency: Optional[str] = None
    discount: Optional[float] = None
    tax_rate: Optional[float] = None
    issue_date: Optional[datetime] = None
    due_date: Optional[datetime] = None
    description: Optional[str] = None
    payment_method: Optional[str] = None
    payment_details: Optional[str] = None
    account_name: Optional[str] = None
    bank_name: Optional[str] = None
    account_number: Optional[str] = None
    status: Optional[str] = None
    items: Optional[List[InvoiceItemCreate]] = None


class InvoiceResponse(BaseModel):
    id: str
    user_id: str
    invoice_number: str
    client_name: str
    client_email: str
    client_company: Optional[str]
    address: Optional[str]
    country: Optional[str]
    amount: float
    currency: str
    discount: float
    tax_rate: float
    issue_date: datetime
    due_date: datetime
    description: Optional[str]
    payment_method: Optional[str]
    payment_details: Optional[str]
    account_name: Optional[str]
    bank_name: Optional[str]
    account_number: Optional[str]
    status: str
    payment_link: Optional[str]
    payment_reference: Optional[str]
    payment_completed_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime
    items: List[InvoiceItemResponse]

    class Config:
        from_attributes = True


class PaymentLinkResponse(BaseModel):
    payment_link: str
    payment_reference: str

    class Config:
        from_attributes = True
