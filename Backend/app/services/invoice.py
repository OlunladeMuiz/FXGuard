"""
Invoice service - handles business logic for invoice operations
"""
from sqlalchemy.orm import Session
from datetime import datetime, timezone
import uuid
import logging
from fastapi import HTTPException, status
from app.models.invoice import Invoice, InvoiceItem
from app.models.auth import User
from app.schemas.invoice import (
    InvoiceCreate,
    InvoiceUpdate,
)
from app.utils.email_service import EmailService

# Set up logging
logger = logging.getLogger(__name__)


def parse_payment_details(payment_details: str) -> dict:
    """
    Parse payment details string into components
    Format: "Account Name: XXX, Bank: XXX, Account Number: XXX"
    
    Args:
        payment_details: Raw payment details string
        
    Returns:
        Dict with keys: account_name, bank, account_number
    """
    result = {
        'account_name': '',
        'bank': '',
        'account_number': ''
    }
    
    if not payment_details:
        return result
    
    try:
        # Split by comma
        parts = [part.strip() for part in payment_details.split(',')]
        
        for part in parts:
            if 'Account Name:' in part:
                result['account_name'] = part.split(':', 1)[1].strip()
            elif 'Bank:' in part:
                result['bank'] = part.split(':', 1)[1].strip()
            elif 'Account Number:' in part:
                result['account_number'] = part.split(':', 1)[1].strip()
    except Exception as e:
        logger.warning(f"Error parsing payment details: {str(e)}")
    
    return result


class InvoiceService:
    """Service for handling invoice operations"""
    
    @staticmethod
    def create_invoice(
        db: Session,
        invoice_data: InvoiceCreate,
        user: User
    ) -> Invoice:
        """
        Create a new invoice with multiple line items.
        
        Args:
            db: Database session
            invoice_data: Invoice creation data
            user: Current authenticated user
            
        Returns:
            Created Invoice object
            
        Raises:
            HTTPException: If invoice number already exists
        """
        # Check if invoice number already exists
        existing_invoice = db.query(Invoice).filter(
            Invoice.invoice_number == invoice_data.invoice_number
        ).first()
        
        if existing_invoice:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invoice number already exists"
            )
        
        # Create invoice
        invoice = Invoice(
            id=str(uuid.uuid4()),
            user_id=user.id,
            invoice_number=invoice_data.invoice_number,
            client_name=invoice_data.client_name,
            client_email=invoice_data.client_email,
            client_company=invoice_data.client_company,
            address=invoice_data.address,
            country=invoice_data.country,
            amount=invoice_data.amount,
            currency=invoice_data.currency,
            discount=invoice_data.discount,
            tax_rate=invoice_data.tax_rate,
            issue_date=invoice_data.issue_date,
            due_date=invoice_data.due_date,
            description=invoice_data.description,
            payment_method=invoice_data.payment_method,
            payment_details=invoice_data.payment_details,
            status=invoice_data.status,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )
        
        db.add(invoice)
        db.flush()  # Flush to ensure invoice has ID for relationships
        
        # Create invoice items
        for item_data in invoice_data.items:
            invoice_item = InvoiceItem(
                id=str(uuid.uuid4()),
                invoice_id=invoice.id,
                description=item_data.description,
                quantity=item_data.quantity,
                unit_price=item_data.unit_price,
            )
            db.add(invoice_item)
        
        db.commit()
        db.refresh(invoice)
        
        # Send invoice emails
        try:
            due_date_str = invoice.due_date.strftime("%b %d, %Y") if invoice.due_date else "Not specified"
            
            # Calculate invoice totals
            subtotal = sum(item.quantity * item.unit_price for item in invoice.items)
            discount_amount = invoice.discount or 0
            subtotal_after_discount = subtotal - discount_amount
            tax_amount = subtotal_after_discount * (invoice.tax_rate / 100) if invoice.tax_rate else 0
            final_total = subtotal_after_discount + tax_amount
            
            # Format line items for email
            line_items = []
            for item in invoice.items:
                item_total = item.quantity * item.unit_price
                line_items.append({
                    'description': item.description,
                    'quantity': item.quantity,
                    'unit_price': f"{item.unit_price:.2f}",
                    'total': f"{item_total:.2f}"
                })
            
            # Send invoice creation notification email to the user who created it
            user_email_sent = EmailService.send_invoice_created_notification(
                to_email=user.email,
                user_name=getattr(user, 'first_name', user.email.split('@')[0]),
                invoice_number=invoice.invoice_number,
                client_name=invoice.client_name,
                currency=invoice.currency,
                due_date=due_date_str,
                items_count=len(invoice.items),
                line_items=line_items,
                subtotal=f"{subtotal:.2f}",
                discount=f"{discount_amount:.2f}",
                tax_rate=invoice.tax_rate or 0,
                tax_amount=f"{tax_amount:.2f}",
                total=f"{final_total:.2f}"
            )
            if user_email_sent:
                logger.info(f"Invoice creation email sent successfully to user {user.email}")
            else:
                logger.warning(f"Failed to send invoice creation email to user {user.email}")
            
            # Parse payment details
            payment_details_parsed = parse_payment_details(invoice.payment_details)
            
            # Send invoice notification email to the client
            client_email_sent = EmailService.send_invoice_email(
                to_email=invoice.client_email,
                client_name=invoice.client_name,
                invoice_number=invoice.invoice_number,
                currency=invoice.currency,
                due_date=due_date_str,
                amount=invoice.amount,
                description=invoice.description,
                payment_method=invoice.payment_method,
                account_name=payment_details_parsed['account_name'],
                bank=payment_details_parsed['bank'],
                account_number=payment_details_parsed['account_number'],
                tax_rate=invoice.tax_rate,
                line_items=line_items,
                subtotal=f"{subtotal:.2f}",
                discount=f"{discount_amount:.2f}",
                tax_amount=f"{tax_amount:.2f}",
                total=f"{final_total:.2f}"
            )
            if client_email_sent:
                logger.info(f"Invoice notification email sent successfully to client {invoice.client_email}")
            else:
                logger.warning(f"Failed to send invoice notification email to client {invoice.client_email}")
        
        except Exception as e:
            # Log email error but don't fail the invoice creation
            logger.error(f"Error sending invoice emails: {type(e).__name__}: {str(e)}", exc_info=True)
        
        return invoice
    
    @staticmethod
    def get_invoice(
        db: Session,
        invoice_id: str,
        user: User
    ) -> Invoice:
        """
        Get a specific invoice by ID.
        
        Args:
            db: Database session
            invoice_id: Invoice ID to retrieve
            user: Current authenticated user
            
        Returns:
            Invoice object
            
        Raises:
            HTTPException: If invoice not found
        """
        invoice = db.query(Invoice).filter(
            Invoice.id == invoice_id,
            Invoice.user_id == user.id
        ).first()
        
        if not invoice:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Invoice not found"
            )
        
        return invoice
    
    @staticmethod
    def list_invoices(
        db: Session,
        user: User,
        skip: int = 0,
        limit: int = 10,
        status_filter: str = None
    ) -> list[Invoice]:
        """
        List all invoices for the current user.
        
        Args:
            db: Database session
            user: Current authenticated user
            skip: Number of records to skip for pagination
            limit: Maximum number of records to return
            status_filter: Filter by invoice status (optional)
            
        Returns:
            List of Invoice objects
        """
        query = db.query(Invoice).filter(Invoice.user_id == user.id)
        
        if status_filter:
            query = query.filter(Invoice.status == status_filter)
        
        invoices = query.offset(skip).limit(limit).all()
        
        return invoices
    
    @staticmethod
    def update_invoice(
        db: Session,
        invoice_id: str,
        invoice_data: InvoiceUpdate,
        user: User
    ) -> Invoice:
        """
        Update an existing invoice.
        
        Args:
            db: Database session
            invoice_id: Invoice ID to update
            invoice_data: Updated invoice data
            user: Current authenticated user
            
        Returns:
            Updated Invoice object
            
        Raises:
            HTTPException: If invoice not found
        """
        invoice = db.query(Invoice).filter(
            Invoice.id == invoice_id,
            Invoice.user_id == user.id
        ).first()
        
        if not invoice:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Invoice not found"
            )
        
        # Update invoice fields
        update_data = invoice_data.dict(exclude_unset=True, exclude={"items"})
        for field, value in update_data.items():
            setattr(invoice, field, value)
        
        invoice.updated_at = datetime.now(timezone.utc)
        
        # Update invoice items if provided
        if invoice_data.items is not None:
            # Delete existing items
            db.query(InvoiceItem).filter(InvoiceItem.invoice_id == invoice_id).delete()
            
            # Create new items
            for item_data in invoice_data.items:
                invoice_item = InvoiceItem(
                    id=str(uuid.uuid4()),
                    invoice_id=invoice.id,
                    description=item_data.description,
                    quantity=item_data.quantity,
                    unit_price=item_data.unit_price,
                )
                db.add(invoice_item)
        
        db.commit()
        db.refresh(invoice)
        
        return invoice
    
    @staticmethod
    def delete_invoice(
        db: Session,
        invoice_id: str,
        user: User
    ) -> None:
        """
        Delete an invoice.
        
        Args:
            db: Database session
            invoice_id: Invoice ID to delete
            user: Current authenticated user
            
        Raises:
            HTTPException: If invoice not found
        """
        invoice = db.query(Invoice).filter(
            Invoice.id == invoice_id,
            Invoice.user_id == user.id
        ).first()
        
        if not invoice:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Invoice not found"
            )
        
        db.delete(invoice)
        db.commit()
