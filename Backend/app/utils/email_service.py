"""
Email service for sending transactional emails via SMTP
"""
import html
import smtplib
import socket
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import List
import os
import logging
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

# Set up logging
logger = logging.getLogger(__name__)

DEFAULT_SMTP_SERVER = "smtp.gmail.com"
DEFAULT_SMTP_PORT = 587
DEFAULT_SMTP_TIMEOUT_SECONDS = 10.0

# Template directory
TEMPLATE_DIR = Path(__file__).parent.parent / "templates"


class EmailService:
    """Service for sending emails via SMTP"""
    
    @staticmethod
    def _escape(value) -> str:
        if value is None:
            return ""
        return html.escape(str(value))

    @staticmethod
    def load_template(template_name: str, **kwargs) -> str:
        """
        Load an email template and format it with provided variables
        
        Args:
            template_name: Name of the template file (without .html)
            **kwargs: Variables to substitute in the template
            
        Returns:
            Formatted HTML template
        """
        try:
            template_path = TEMPLATE_DIR / f"{template_name}.html"
            with open(template_path, 'r', encoding='utf-8') as f:
                template = f.read()
            return template.format(**kwargs)
        except FileNotFoundError:
            logger.error(f"Template file not found: {template_path}")
            return ""
        except Exception as e:
            logger.error(f"Error loading template {template_name}: {str(e)}")
            return ""

    @staticmethod
    def _get_smtp_server() -> str:
        configured_server = os.getenv("SMTP_SERVER", "").strip()
        return configured_server or DEFAULT_SMTP_SERVER

    @staticmethod
    def _get_smtp_port() -> int:
        configured_port = os.getenv("SMTP_PORT", "").strip()
        if not configured_port:
            return DEFAULT_SMTP_PORT

        try:
            return int(configured_port)
        except ValueError:
            logger.warning(
                "Invalid SMTP_PORT '%s'. Falling back to default port %s.",
                configured_port,
                DEFAULT_SMTP_PORT,
            )
            return DEFAULT_SMTP_PORT

    @staticmethod
    def _get_smtp_timeout_seconds() -> float:
        configured_timeout = os.getenv("SMTP_TIMEOUT_SECONDS", "").strip()
        if not configured_timeout:
            return DEFAULT_SMTP_TIMEOUT_SECONDS

        try:
            timeout_seconds = float(configured_timeout)
            if timeout_seconds <= 0:
                raise ValueError
            return timeout_seconds
        except ValueError:
            logger.warning(
                "Invalid SMTP_TIMEOUT_SECONDS '%s'. Falling back to default timeout %.1fs.",
                configured_timeout,
                DEFAULT_SMTP_TIMEOUT_SECONDS,
            )
            return DEFAULT_SMTP_TIMEOUT_SECONDS

    @staticmethod
    def _should_use_tls() -> bool:
        return os.getenv("SMTP_USE_TLS", "true").strip().lower() not in {"0", "false", "no"}

    @staticmethod
    def _get_smtp_username() -> str | None:
        return (os.getenv("SMTP_USERNAME") or os.getenv("GMAIL_ADDRESS") or "").strip() or None

    @staticmethod
    def _get_smtp_password() -> str | None:
        return (os.getenv("SMTP_PASSWORD") or os.getenv("GMAIL_PASSWORD") or "").strip() or None

    @staticmethod
    def _get_from_address() -> str | None:
        return (os.getenv("EMAIL_FROM_ADDRESS") or EmailService._get_smtp_username() or "").strip() or None
    
    @staticmethod
    def send_email(
        to_email: str,
        subject: str,
        html_body: str,
        text_body: str = None,
        to_emails: List[str] = None
    ) -> bool:
        """
        Send an email via SMTP
        
        Args:
            to_email: Recipient email address (primary)
            subject: Email subject
            html_body: HTML content of the email
            text_body: Plain text fallback (optional)
            to_emails: Additional recipient emails (optional)
        
        Returns:
            bool: True if email sent successfully, False otherwise
        """
        smtp_username = EmailService._get_smtp_username()
        smtp_password = EmailService._get_smtp_password()
        from_address = EmailService._get_from_address()
        smtp_server = EmailService._get_smtp_server()
        smtp_port = EmailService._get_smtp_port()
        smtp_timeout_seconds = EmailService._get_smtp_timeout_seconds()

        if not smtp_username or not smtp_password or not from_address:
            logger.error(
                "SMTP credentials are not configured. Set SMTP_USERNAME/SMTP_PASSWORD "
                "or GMAIL_ADDRESS/GMAIL_PASSWORD."
            )
            return False
        
        try:
            # Create message
            message = MIMEMultipart("alternative")
            message["Subject"] = subject
            message["From"] = from_address
            message["To"] = to_email
            
            # Attach text and HTML parts
            if text_body:
                message.attach(MIMEText(text_body, "plain"))
            message.attach(MIMEText(html_body, "html"))
            
            # Prepare recipient list
            recipients = [to_email]
            if to_emails:
                recipients.extend(to_emails)
            
            # Send email via SMTP
            with smtplib.SMTP(
                smtp_server,
                smtp_port,
                timeout=smtp_timeout_seconds,
            ) as server:
                server.ehlo()
                if EmailService._should_use_tls():
                    server.starttls()  # Secure connection
                    server.ehlo()
                server.login(smtp_username, smtp_password)
                server.sendmail(from_address, recipients, message.as_string())
            
            logger.info(f"Email sent successfully to {to_email} with subject: {subject}")
            return True
        
        except smtplib.SMTPAuthenticationError:
            logger.error(
                "SMTP authentication failed for %s. Check SMTP credentials.",
                smtp_server,
            )
            return False
        except smtplib.SMTPConnectError as e:
            logger.error(
                "SMTP connection failed to %s:%s: %s",
                smtp_server,
                smtp_port,
                str(e),
            )
            return False
        except (socket.timeout, TimeoutError) as e:
            logger.error(
                "SMTP connection to %s:%s timed out after %.1fs: %s",
                smtp_server,
                smtp_port,
                smtp_timeout_seconds,
                str(e),
            )
            return False
        except OSError as e:
            logger.error(
                "SMTP network error while connecting to %s:%s: %s",
                smtp_server,
                smtp_port,
                str(e),
            )
            return False
        except smtplib.SMTPException as e:
            logger.error(f"SMTP error occurred: {type(e).__name__}: {str(e)}")
            return False
        except Exception as e:
            logger.error(f"Unexpected error sending email: {type(e).__name__}: {str(e)}", exc_info=True)
            return False
    
    @staticmethod
    def send_otp_email(email: str, otp: int, company_name: str = None) -> bool:
        """
        Send OTP verification email
        
        Args:
            email: Recipient email address
            otp: One-time password
            company_name: User's company name (optional)
        
        Returns:
            bool: True if email sent successfully, False otherwise
        """
        subject = "Verify Your Email - FXGuard"
        
        company_greeting = EmailService._escape(f"at {company_name}" if company_name else "")
        
        html_body = EmailService.load_template("otp_email", company_greeting=company_greeting, otp=otp)
        
        text_body = f"""
        Email Verification
        
        Thank you for registering {company_greeting}!
        Please use this code to verify your email: {otp}
        
        This code will expire in 10 minutes.
        If you didn't request this email, please ignore it.
        
        © 2026 FXGuard
        """
        
        return EmailService.send_email(email, subject, html_body, text_body)
    
    @staticmethod
    def send_invoice_email(
        to_email: str,
        client_name: str,
        invoice_number: str,
        currency: str,
        due_date: str,
        amount: float = None,
        description: str = None,
        payment_method: str = None,
        account_name: str = None,
        bank: str = None,
        account_number: str = None,
        tax_rate: float = 0,
        line_items: list = None,
        subtotal: str = "0.00",
        discount: str = "0.00",
        tax_amount: str = "0.00",
        total: str = "0.00"
    ) -> bool:
        """
        Send invoice notification email to client
        
        Args:
            to_email: Client's email address
            client_name: Client's name
            invoice_number: Invoice number
            currency: Currency code
            due_date: Payment due date
            amount: Invoice amount (legacy, use total instead)
            description: Invoice description (optional)
            payment_method: Payment method details (optional)
            tax_rate: Tax rate applied (optional)
            line_items: List of dicts with description, quantity, unit_price, total
            subtotal: Invoice subtotal
            discount: Discount amount
            tax_amount: Calculated tax amount
            total: Final total after discount and tax
        
        Returns:
            bool: True if email sent successfully, False otherwise
        """
        subject = f"Invoice {invoice_number} from FXGuard"
        
        # Format line items HTML
        line_items_html = ""
        if line_items:
            line_items_html = '<div style="margin: 20px 0;"><h3 style="color: #1f2937; font-size: 15px; margin-top: 0;">Line Items:</h3>'
            line_items_html += '<table style="width: 100%; border-collapse: collapse; margin-bottom: 15px;">'
            line_items_html += '<tr style="background-color: #dbeafe; border-bottom: 2px solid #2563eb;">'
            line_items_html += '<th style="padding: 10px; text-align: left; font-weight: 600; color: #1e40af;">Description</th>'
            line_items_html += '<th style="padding: 10px; text-align: center; font-weight: 600; color: #1e40af;">Qty</th>'
            line_items_html += '<th style="padding: 10px; text-align: right; font-weight: 600; color: #1e40af;">Unit Price</th>'
            line_items_html += '<th style="padding: 10px; text-align: right; font-weight: 600; color: #1e40af;">Total</th>'
            line_items_html += '</tr>'
            for item in line_items:
                line_items_html += '<tr style="border-bottom: 1px solid #e5e7eb;">'
                line_items_html += f'<td style="padding: 10px; color: #4b5563;">{EmailService._escape(item["description"])}</td>'
                line_items_html += f'<td style="padding: 10px; text-align: center; color: #4b5563;">{EmailService._escape(str(item["quantity"]))}</td>'
                line_items_html += f'<td style="padding: 10px; text-align: right; color: #4b5563;">{EmailService._escape(str(item["unit_price"]))}</td>'
                line_items_html += f'<td style="padding: 10px; text-align: right; color: #4b5563; font-weight: 600;">{EmailService._escape(str(item["total"]))}</td>'
                line_items_html += '</tr>'
            line_items_html += '</table></div>'
        
        # Format summary HTML
        summary_html = f'''<div style="background: linear-gradient(135deg, #dbeafe 0%, #e0e7ff 100%); padding: 20px; border: 2px solid #2563eb; border-radius: 8px; margin: 20px 0;">
            <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid rgba(37, 99, 235, 0.2); color: #1f2937; font-size: 15px;">
                <span style="font-weight: 600; color: #1e40af;">Subtotal:</span>
                <span style="color: #4b5563;">{subtotal} {currency}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid rgba(37, 99, 235, 0.2); color: #1f2937; font-size: 15px;">
                <span style="font-weight: 600; color: #1e40af;">Discount:</span>
                <span style="color: #4b5563;">-{discount} {currency}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid rgba(37, 99, 235, 0.2); color: #1f2937; font-size: 15px;">
                <span style="font-weight: 600; color: #1e40af;">Tax ({tax_rate}%):</span>
                <span style="color: #4b5563;">+{tax_amount} {currency}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 10px 0; color: #1f2937; font-size: 18px;">
                <span style="font-weight: 700; color: #1e40af;">Total Due:</span>
                <span style="color: #047857; font-weight: 700;">{total} {currency}</span>
            </div>
        </div>'''
        
        html_body = EmailService.load_template(
            "invoice_notification_email",
            client_name=EmailService._escape(client_name),
            invoice_number=EmailService._escape(invoice_number),
            currency=EmailService._escape(currency),
            due_date=EmailService._escape(due_date),
            description=EmailService._escape(description or "Invoice"),
            payment_method=EmailService._escape(payment_method or "To be determined"),
            account_name=EmailService._escape(account_name or "Not provided"),
            bank=EmailService._escape(bank or "Not provided"),
            account_number=EmailService._escape(account_number or "Not provided"),
            tax_rate=EmailService._escape(f"{tax_rate:.2f}" if tax_rate else "0"),
            line_items_html=line_items_html,
            summary_html=summary_html
        )
        
        text_body = f"""
        Invoice Notification
        
        Hi {client_name},
        
        We've created an invoice for you:
        
        Invoice Number: {invoice_number}
        Description: {description or 'Invoice'}
        Due Date: {due_date}
        Payment Method: {payment_method or 'To be determined'}
        
        Subtotal: {subtotal} {currency}
        Discount: -{discount} {currency}
        Tax ({tax_rate}%): +{tax_amount} {currency}
        Total Due: {total} {currency}
        
        Please reach out if you have any questions.
        
        © 2026 FXGuard
        """
        
        return EmailService.send_email(to_email, subject, html_body, text_body)
    
    @staticmethod
    def send_invoice_created_notification(
        to_email: str,
        user_name: str,
        invoice_number: str,
        client_name: str,
        currency: str,
        due_date: str,
        items_count: int = 0,
        line_items: list = None,
        subtotal: str = "0.00",
        discount: str = "0.00",
        tax_rate: float = 0,
        tax_amount: str = "0.00",
        total: str = "0.00"
    ) -> bool:
        """
        Send invoice creation notification to the user who created it
        
        Args:
            to_email: User's email address
            user_name: User's name
            invoice_number: Invoice number
            client_name: Client's name
            currency: Currency code
            due_date: Payment due date
            items_count: Number of line items in the invoice
            line_items: List of dicts with description, quantity, unit_price, total
            subtotal: Invoice subtotal
            discount: Discount amount
            tax_rate: Tax rate percentage
            tax_amount: Calculated tax amount
            total: Final total after discount and tax
        
        Returns:
            bool: True if email sent successfully, False otherwise
        """
        subject = f"Invoice {invoice_number} Created Successfully"
        
        # Format line items HTML
        line_items_html = ""
        if line_items:
            line_items_html = '<div style="margin: 20px 0;"><h3 style="color: #1f2937; font-size: 15px; margin-top: 0;">Line Items:</h3>'
            line_items_html += '<table style="width: 100%; border-collapse: collapse; margin-bottom: 15px;">'
            line_items_html += '<tr style="background-color: #dbeafe; border-bottom: 2px solid #2563eb;">'
            line_items_html += '<th style="padding: 10px; text-align: left; font-weight: 600; color: #1e40af;">Description</th>'
            line_items_html += '<th style="padding: 10px; text-align: center; font-weight: 600; color: #1e40af;">Qty</th>'
            line_items_html += '<th style="padding: 10px; text-align: right; font-weight: 600; color: #1e40af;">Unit Price</th>'
            line_items_html += '<th style="padding: 10px; text-align: right; font-weight: 600; color: #1e40af;">Total</th>'
            line_items_html += '</tr>'
            for item in line_items:
                line_items_html += '<tr style="border-bottom: 1px solid #e5e7eb;">'
                line_items_html += f'<td style="padding: 10px; color: #4b5563;">{EmailService._escape(item["description"])}</td>'
                line_items_html += f'<td style="padding: 10px; text-align: center; color: #4b5563;">{EmailService._escape(str(item["quantity"]))}</td>'
                line_items_html += f'<td style="padding: 10px; text-align: right; color: #4b5563;">{EmailService._escape(str(item["unit_price"]))}</td>'
                line_items_html += f'<td style="padding: 10px; text-align: right; color: #4b5563; font-weight: 600;">{EmailService._escape(str(item["total"]))}</td>'
                line_items_html += '</tr>'
            line_items_html += '</table></div>'
        
        # Format summary HTML
        summary_html = f'''<div style="background: linear-gradient(135deg, #dbeafe 0%, #e0e7ff 100%); padding: 20px; border: 2px solid #2563eb; border-radius: 8px; margin: 20px 0;">
            <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid rgba(37, 99, 235, 0.2); color: #1f2937; font-size: 15px;">
                <span style="font-weight: 600; color: #1e40af;">Subtotal:</span>
                <span style="color: #4b5563;">{subtotal} {currency}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid rgba(37, 99, 235, 0.2); color: #1f2937; font-size: 15px;">
                <span style="font-weight: 600; color: #1e40af;">Discount:</span>
                <span style="color: #4b5563;">-{discount} {currency}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid rgba(37, 99, 235, 0.2); color: #1f2937; font-size: 15px;">
                <span style="font-weight: 600; color: #1e40af;">Tax ({tax_rate}%):</span>
                <span style="color: #4b5563;">+{tax_amount} {currency}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 10px 0; color: #1f2937; font-size: 18px;">
                <span style="font-weight: 700; color: #1e40af;">Total Due:</span>
                <span style="color: #047857; font-weight: 700;">{total} {currency}</span>
            </div>
        </div>'''
        
        html_body = EmailService.load_template(
            "invoice_created_email",
            user_name=EmailService._escape(user_name),
            invoice_number=EmailService._escape(invoice_number),
            client_name=EmailService._escape(client_name),
            currency=EmailService._escape(currency),
            due_date=EmailService._escape(due_date),
            items_count=items_count,
            line_items_html=line_items_html,
            summary_html=summary_html
        )
        
        text_body = f"""
        Invoice Created Successfully
        
        Hi {user_name},
        
        Your invoice has been created successfully.
        
        Invoice Number: {invoice_number}
        Client Name: {client_name}
        Due Date: {due_date}
        Line Items: {items_count}
        
        Subtotal: {subtotal} {currency}
        Discount: -{discount} {currency}
        Tax ({tax_rate}%): +{tax_amount} {currency}
        Total Due: {total} {currency}
        
        You can view more details by logging in to FXGuard.
        
        © 2026 FXGuard
        """
        
        return EmailService.send_email(to_email, subject, html_body, text_body)
    
    @staticmethod
    def send_password_reset_email(email: str, reset_token: str, company_name: str = None) -> bool:
        """
        Send password reset email
        
        Args:
            email: User's email address
            reset_token: Password reset token
            company_name: User's company name (optional)
        
        Returns:
            bool: True if email sent successfully, False otherwise
        """
        subject = "Reset Your Password - FXGuard"
        company_greeting = EmailService._escape(f"at {company_name}" if company_name else "")
        reset_link = EmailService._escape(f"https://fxguard.app/reset-password?token={reset_token}")
        html_body = EmailService.load_template(
            "password_reset_email",
            company_greeting=company_greeting,
            reset_link=reset_link
        )
        
        text_body = f"""
        Password Reset Request
        
        We received a request to reset the password for your account {company_greeting}.
        
        Click this link to reset your password: {reset_link}
        
        If you didn't request this, please ignore this email.
        This link will expire in 1 hour.
        
        © 2026 FXGuard
        """
        
        return EmailService.send_email(email, subject, html_body, text_body)
