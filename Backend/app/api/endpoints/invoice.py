from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models.auth import User
from app.schemas.invoice import (
    InvoiceCreate,
    InvoiceUpdate,
    InvoiceResponse,
)
from app.services.auth import get_current_user
from app.services.invoice import InvoiceService

router = APIRouter(prefix="/invoices", tags=["invoices"])


@router.post("/", response_model=InvoiceResponse, status_code=status.HTTP_201_CREATED)
async def create_invoice(
    invoice_data: InvoiceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create a new invoice with multiple line items.
    
    - **invoice_number**: Unique invoice identifier
    - **client_name**: Name of the client
    - **client_email**: Email of the client
    - **client_company**: Company name (optional)
    - **amount**: Total invoice amount
    - **currency**: Currency code (e.g., USD, EUR, GBP)
    - **issue_date**: Date when invoice is issued
    - **due_date**: Payment due date
    - **description**: General invoice description
    - **payment_method**: Payment method (optional)
    - **payment_details**: Payment details (optional)
    - **status**: Invoice status (draft, sent, paid, overdue, cancelled)
    - **items**: List of invoice line items with description, quantity, and unit_price
    """
    return InvoiceService.create_invoice(db, invoice_data, current_user)


@router.get("/{invoice_id}", response_model=InvoiceResponse)
async def get_invoice(
    invoice_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get a specific invoice by ID.
    """
    return InvoiceService.get_invoice(db, invoice_id, current_user)


@router.get("/", response_model=list[InvoiceResponse])
async def list_invoices(
    skip: int = 0,
    limit: int = 10,
    status_filter: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    List all invoices for the current user.
    
    - **skip**: Number of records to skip for pagination
    - **limit**: Maximum number of records to return
    - **status_filter**: Filter by invoice status (optional)
    """
    return InvoiceService.list_invoices(db, current_user, skip, limit, status_filter)


@router.put("/{invoice_id}", response_model=InvoiceResponse)
async def update_invoice(
    invoice_id: str,
    invoice_data: InvoiceUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update an existing invoice.
    """
    return InvoiceService.update_invoice(db, invoice_id, invoice_data, current_user)


@router.delete("/{invoice_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_invoice(
    invoice_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Delete an invoice.
    """
    InvoiceService.delete_invoice(db, invoice_id, current_user)
    return None