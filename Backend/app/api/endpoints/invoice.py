import jwt
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from slowapi.util import get_remote_address

from app.api.router import limiter
from app.db.database import get_db
from app.models.auth import User
from app.schemas.auth import BVNVerifyRequest
from app.schemas.invoice import (
    InvoiceCreate,
    InvoiceResponse,
    InvoiceUpdate,
    PaymentLinkResponse,
)
from app.services.auth import get_current_user
from app.services.auth import ALGORITHM, SECRET_KEY
from app.services.invoice import InvoiceService
from app.services.interswitch import InterswitchService

router = APIRouter(prefix="/invoices", tags=["invoices"])


def payment_link_rate_limit_key(request: Request) -> str:
    authorization = request.headers.get("Authorization", "")
    if authorization.startswith("Bearer "):
        token = authorization.removeprefix("Bearer ").strip()
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            user_id = payload.get("sub")
            if user_id:
                return f"user:{user_id}"
        except jwt.InvalidTokenError:
            pass
    return f"ip:{get_remote_address(request)}"


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


@router.post("/{invoice_id}/payment-link", response_model=InvoiceResponse)
@limiter.limit("20/minute", key_func=payment_link_rate_limit_key)
async def generate_payment_link(
    request: Request,
    invoice_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Generate an Interswitch payment link for an existing invoice.
    If the invoice already has a payment link it is returned immediately
    without creating a new one.
    """
    return InvoiceService.generate_payment_link(db, invoice_id, current_user)


@router.post("/webhooks/payment", include_in_schema=False)
async def payment_webhook(request: Request, db: Session = Depends(get_db)):
    """
    Interswitch payment webhook receiver.
    Called by Interswitch when a payment is completed.
    This endpoint is intentionally excluded from the public API schema.
    """
    payload = await request.json()
    result = InvoiceService.handle_payment_webhook(db, payload)
    return result


@router.post("/verify-bvn")
async def verify_bvn(
    payload: BVNVerifyRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Verify a Nigerian Bank Verification Number via Interswitch Identity API.
    Requires an authenticated user.
    """
    return InterswitchService.verify_bvn(payload.bvn)
