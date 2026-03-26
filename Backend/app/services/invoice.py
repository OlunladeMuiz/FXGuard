"""
Invoice service - handles business logic for invoice operations
"""
from datetime import datetime, timezone
import logging
import os
import uuid

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.invoice import Invoice, InvoiceItem
from app.models.auth import User
from app.schemas.invoice import (
    InvoiceCreate,
    InvoiceUpdate,
)
from app.services.interswitch import InterswitchService
from app.utils.email_service import EmailService

# Set up logging
logger = logging.getLogger(__name__)


class InvoiceService:
    """Service for handling invoice operations"""

    @staticmethod
    def _build_payment_redirect_url(invoice_id: str) -> str:
        frontend_base_url = (
            os.getenv("FRONTEND_URL")
            or os.getenv("FRONTEND_BASE_URL")
            or os.getenv("NEXT_PUBLIC_APP_URL")
            or "http://localhost:3000"
        ).rstrip("/")
        return f"{frontend_base_url}/invoice-generator/review?id={invoice_id}"

    @staticmethod
    def _send_invoice_emails(invoice: Invoice, user: User) -> None:
        due_date_str = invoice.due_date.strftime("%b %d, %Y") if invoice.due_date else "Not specified"

        subtotal = sum(item.quantity * item.unit_price for item in invoice.items)
        discount_amount = invoice.discount or 0
        subtotal_after_discount = subtotal - discount_amount
        tax_amount = subtotal_after_discount * (invoice.tax_rate / 100) if invoice.tax_rate else 0
        final_total = subtotal_after_discount + tax_amount

        line_items = []
        for item in invoice.items:
            item_total = item.quantity * item.unit_price
            line_items.append({
                'description': item.description,
                'quantity': item.quantity,
                'unit_price': f"{item.unit_price:.2f}",
                'total': f"{item_total:.2f}"
            })

        try:
            client_email_sent = EmailService.send_invoice_email(
                to_email=invoice.client_email,
                client_name=invoice.client_name,
                invoice_number=invoice.invoice_number,
                currency=invoice.currency,
                due_date=due_date_str,
                amount=invoice.amount,
                description=invoice.description,
                payment_method=invoice.payment_method,
                account_name=invoice.account_name or "",
                bank=invoice.bank_name or "",
                account_number=invoice.account_number or "",
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
        except Exception as exc:
            logger.warning(
                "Email sending failed for %s - continuing without email: %s",
                invoice.client_email,
                str(exc),
            )

        try:
            user_email_sent = EmailService.send_invoice_created_notification(
                to_email=user.email,
                user_name=getattr(user, 'first_name', None) or user.email.split('@')[0],
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
        except Exception as exc:
            logger.warning(
                "Email sending failed for %s - continuing without email: %s",
                user.email,
                str(exc),
            )

    @staticmethod
    def _mark_invoice_as_sent(
        db: Session,
        invoice: Invoice,
        user: User,
    ) -> Invoice:
        InvoiceService._send_invoice_emails(invoice, user)
        invoice.status = "sent"
        invoice.updated_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(invoice)
        return invoice
    
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
            Invoice.invoice_number == invoice_data.invoice_number,
            Invoice.user_id == user.id
        ).first()

        if existing_invoice:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="You already have an invoice with this number"
            )
        
        requested_status = invoice_data.status
        persisted_status = "draft" if requested_status == "sent" else requested_status

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
            account_name=invoice_data.account_name,
            bank_name=invoice_data.bank_name,
            account_number=invoice_data.account_number,
            status=persisted_status,
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

        if requested_status == "sent":
            return InvoiceService._mark_invoice_as_sent(db, invoice, user)

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

        original_status = invoice.status
        requested_status = invoice_data.status if invoice_data.status is not None else invoice.status
        should_send_invoice = original_status == "draft" and requested_status == "sent"

        # Update invoice fields
        update_data = invoice_data.model_dump(exclude_unset=True, exclude={"items"})
        if should_send_invoice:
            update_data["status"] = original_status
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

        if should_send_invoice:
            return InvoiceService._mark_invoice_as_sent(db, invoice, user)

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

    @staticmethod
    def generate_payment_link(
        db: Session,
        invoice_id: str,
        user: User,
    ) -> Invoice:
        """
        Generate an Interswitch payment link for an invoice and persist the
        link and reference back to the invoice record.

        If the invoice already has a payment_link the existing record is
        returned immediately without calling Interswitch again.

        Args:
            db: Database session.
            invoice_id: ID of the invoice to generate a payment link for.
            user: The authenticated user making the request.

        Returns:
            The updated Invoice object containing the payment_link and
            payment_reference fields.

        Raises:
            HTTPException 404: If the invoice does not belong to the user.
            HTTPException 400: If the invoice is already paid or cancelled.
            HTTPException 502: If the Interswitch API call fails.
        """
        invoice = db.query(Invoice).filter(
            Invoice.id == invoice_id,
            Invoice.user_id == user.id,
        ).first()

        if not invoice:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Invoice not found",
            )

        if invoice.status in ("paid", "cancelled"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot generate a payment link for an invoice with status '{invoice.status}'",
            )

        if invoice.payment_link:
            return invoice

        try:
            result = InterswitchService.generate_payment_link(
                invoice_id=invoice.id,
                amount=invoice.amount,
                currency=invoice.currency,
                description=f"Payment for Invoice {invoice.invoice_number}",
                customer_email=invoice.client_email,
                redirect_url=InvoiceService._build_payment_redirect_url(invoice.id),
                customer_id=invoice.client_email,
            )
        except RuntimeError as exc:
            logger.error(
                "Interswitch payment link generation is not configured correctly: %s",
                str(exc),
            )
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=str(exc),
            ) from exc
        except Exception as exc:
            logger.error(
                "Interswitch payment link generation failed for invoice %s: %s",
                invoice_id,
                str(exc),
                exc_info=True,
            )
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Failed to generate payment link. Please try again later.",
            ) from exc

        invoice.payment_link = (
            result.get("paymentUrl")
            or result.get("checkoutUrl")
            or result.get("url")
        )
        invoice.payment_reference = (
            result.get("reference")
            or result.get("transactionReference")
            or invoice.id
        )
        invoice.updated_at = datetime.now(timezone.utc)

        db.commit()
        db.refresh(invoice)
        return invoice

    @staticmethod
    def handle_payment_webhook(db: Session, payload: dict) -> dict:
        """
        Process an incoming Interswitch payment webhook notification.

        Looks up the invoice by payment_reference. If the Interswitch
        responseCode is '00' (success) the invoice status is updated to
        'paid' and the payment_completed_at timestamp is recorded.

        Args:
            db: Database session.
            payload: Raw webhook payload dict from Interswitch.

        Returns:
            dict with a 'status' key of either 'processed' or 'ignored'.
        """
        reference = next(
            (
                candidate
                for candidate in (
                    payload.get("reference"),
                    payload.get("transactionReference"),
                    payload.get("merchantReference"),
                    payload.get("paymentReference"),
                    payload.get("PaymentReference"),
                    payload.get("MerchantReference"),
                )
                if candidate
            ),
            None,
        )

        if not reference:
            logger.warning("Interswitch webhook received with no transaction reference.")
            return {"status": "ignored", "reason": "no_reference"}

        invoice = db.query(Invoice).filter(
            Invoice.payment_reference == reference
        ).first()

        if not invoice:
            logger.warning(
                "Interswitch webhook: no invoice found for reference %s.", reference
            )
            return {"status": "ignored", "reason": "invoice_not_found"}

        response_code = payload.get("responseCode") or payload.get("ResponseCode")

        if response_code == "00":
            invoice.status = "paid"
            invoice.payment_completed_at = datetime.now(timezone.utc)
            invoice.updated_at = datetime.now(timezone.utc)
            db.commit()
            logger.info(
                "Invoice %s marked as paid via Interswitch webhook (ref: %s).",
                invoice.id,
                reference,
            )
            return {"status": "processed"}

        logger.info(
            "Interswitch webhook for invoice %s had non-success responseCode: %s.",
            invoice.id,
            response_code,
        )
        return {"status": "ignored", "reason": f"response_code_{response_code}"}
