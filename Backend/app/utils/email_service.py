"""
Email service for sending transactional emails via Gmail
"""
import smtplib
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

# Gmail SMTP Configuration
GMAIL_ADDRESS = os.getenv("GMAIL_ADDRESS")
GMAIL_PASSWORD = os.getenv("GMAIL_PASSWORD")
SMTP_SERVER = "smtp.gmail.com"
SMTP_PORT = 587

# Template directory
TEMPLATE_DIR = Path(__file__).parent.parent / "templates"


class EmailService:
    """Service for sending emails via Gmail"""
    
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
    def send_email(
        to_email: str,
        subject: str,
        html_body: str,
        text_body: str = None,
        to_emails: List[str] = None
    ) -> bool:
        """
        Send an email via Gmail SMTP
        
        Args:
            to_email: Recipient email address (primary)
            subject: Email subject
            html_body: HTML content of the email
            text_body: Plain text fallback (optional)
            to_emails: Additional recipient emails (optional)
        
        Returns:
            bool: True if email sent successfully, False otherwise
        """
        if not GMAIL_ADDRESS or not GMAIL_PASSWORD:
            logger.error("GMAIL_ADDRESS and GMAIL_PASSWORD environment variables not set")
            return False
        
        try:
            # Create message
            message = MIMEMultipart("alternative")
            message["Subject"] = subject
            message["From"] = GMAIL_ADDRESS
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
            with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
                server.starttls()  # Secure connection
                server.login(GMAIL_ADDRESS, GMAIL_PASSWORD)
                server.sendmail(GMAIL_ADDRESS, recipients, message.as_string())
            
            logger.info(f"Email sent successfully to {to_email} with subject: {subject}")
            return True
        
        except smtplib.SMTPAuthenticationError:
            logger.error("Gmail authentication failed. Check GMAIL_ADDRESS and GMAIL_PASSWORD")
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
        
        company_greeting = f"at {company_name}" if company_name else ""
        
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
        amount: float,
        currency: str,
        due_date: str
    ) -> bool:
        """
        Send invoice notification email
        
        Args:
            to_email: Client's email address
            client_name: Client's name
            invoice_number: Invoice number
            amount: Invoice amount
            currency: Currency code
            due_date: Payment due date
        
        Returns:
            bool: True if email sent successfully, False otherwise
        """
        subject = f"Invoice {invoice_number} from FXGuard"
        
        html_body = EmailService.load_template(
            "invoice_notification_email",
            client_name=client_name,
            invoice_number=invoice_number,
            amount=amount,
            currency=currency,
            due_date=due_date
        )
        
        text_body = f"""
        Invoice Notification
        
        Hi {client_name},
        
        We've created an invoice for you:
        
        Invoice Number: {invoice_number}
        Amount: {amount} {currency}
        Due Date: {due_date}
        
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
        amount: float,
        currency: str,
        due_date: str,
        items_count: int = 0
    ) -> bool:
        """
        Send invoice creation notification to the user who created it
        
        Args:
            to_email: User's email address
            user_name: User's name
            invoice_number: Invoice number
            client_name: Client's name
            amount: Invoice amount
            currency: Currency code
            due_date: Payment due date
            items_count: Number of line items in the invoice
        
        Returns:
            bool: True if email sent successfully, False otherwise
        """
        subject = f"Invoice {invoice_number} Created Successfully"
        
        html_body = EmailService.load_template(
            "invoice_created_email",
            user_name=user_name,
            invoice_number=invoice_number,
            client_name=client_name,
            amount=amount,
            currency=currency,
            due_date=due_date,
            items_count=items_count
        )
        
        text_body = f"""
        Invoice Created Successfully
        
        Hi {user_name},
        
        Your invoice has been created successfully.
        
        Invoice Number: {invoice_number}
        Client Name: {client_name}
        Amount: {amount} {currency}
        Due Date: {due_date}
        Line Items: {items_count}
        
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
        
        company_greeting = f"at {company_name}" if company_name else ""
        reset_link = f"https://fxguard.app/reset-password?token={reset_token}"
        
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
