import bcrypt
import jwt
import logging
import os
import random
import uuid
from datetime import datetime, timedelta, timezone
from fastapi import HTTPException, status, Depends
from fastapi.security import HTTPBearer
from sqlalchemy.orm import Session

from app.models.auth import User
from app.schemas.auth import (
    RegisterRequest,
    VerifyOtpRequest,
    ResendOtpRequest,
    LoginRequest,
    ProfileUpdateRequest,
)
from app.db.database import get_db
from app.utils.email_service import EmailService

logger = logging.getLogger(__name__)

SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY:
    raise RuntimeError(
        "SECRET_KEY environment variable is not set. "
        "Generate one with: python -c \"import secrets; print(secrets.token_hex(32))\""
    )
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60
REFRESH_TOKEN_EXPIRE_DAYS = 7


def hash_password(password: str) -> str:
    pw = password.encode("utf-8")[:72]
    return bcrypt.hashpw(pw, bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8")[:72], hashed.encode("utf-8"))


def generate_otp() -> int:
    return random.randint(100000, 999999)


def _normalize_utc_datetime(value: datetime | None) -> datetime | None:
    if value is None:
        return None

    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)

    return value.astimezone(timezone.utc)


def _clean_optional_string(value: str | None) -> str | None:
    if value is None:
        return None

    cleaned = value.strip()
    return cleaned or None


def _normalize_currency_code(value: str | None, default: str = "NGN") -> str:
    cleaned = _clean_optional_string(value)
    if not cleaned:
        return default
    return cleaned.upper()


def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    to_encode["exp"] = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def create_refresh_token(data: dict) -> str:
    to_encode = data.copy()
    to_encode["exp"] = datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def register_user(db: Session, payload: RegisterRequest) -> User:
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    otp = generate_otp()
    otp_expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)
    user = User(
        id=str(uuid.uuid4()),
        email=payload.email,
        password=hash_password(payload.password),
        is_verified=True,
        verification_code=otp,
        verification_code_expires_at=otp_expires_at,
        company_name=payload.company_name,
        preferred_currency="NGN",
    )
    db.add(user) 
    db.commit()
    db.refresh(user)
    
    # Keep OTP generation in place for compatibility, but never block registration on email delivery.
    try:
        EmailService.send_otp_email(payload.email, otp, payload.company_name)
    except Exception as exc:
        logger.warning(
            "Email sending failed for %s - continuing without email: %s",
            payload.email,
            str(exc),
        )
    
    return user


def verify_otp(db: Session, payload: VerifyOtpRequest) -> User:
    user = db.query(User).filter(User.email == payload.email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    if user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already verified",
        )
    
    # Check if OTP has expired
    expires_at = _normalize_utc_datetime(user.verification_code_expires_at)
    if expires_at and datetime.now(timezone.utc) > expires_at:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="OTP has expired. Please request a new one.",
        )
    
    if user.verification_code != payload.otp:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid OTP",
        )

    user.is_verified = True
    user.verification_code = None
    user.verification_code_expires_at = None
    db.commit()
    db.refresh(user)
    return user


def resend_otp(db: Session, payload: ResendOtpRequest) -> None:
    user = db.query(User).filter(User.email == payload.email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    if user.verification_code_expires_at:
        expires_at = _normalize_utc_datetime(user.verification_code_expires_at)
        if expires_at:
            cooldown_until = expires_at - timedelta(minutes=9)
            if datetime.now(timezone.utc) < cooldown_until:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="Please wait at least 1 minute before requesting a new verification code.",
                )

    otp = generate_otp()
    otp_expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)
    user.verification_code = otp
    user.verification_code_expires_at = otp_expires_at
    db.commit()
    db.refresh(user)
    try:
        EmailService.send_otp_email(payload.email, otp, user.company_name)
    except Exception as exc:
        logger.warning(
            "Email sending failed for %s - continuing without email: %s",
            payload.email,
            str(exc),
        )
    # No return


def login_user(db: Session, payload: LoginRequest) -> dict:
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
    if not user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Email not verified. Please verify your email first.",
        )

    if not user.preferred_currency:
        user.preferred_currency = "NGN"
        db.commit()
        db.refresh(user)

    access_token = create_access_token({"sub": user.id, "email": user.email})
    refresh_token = create_refresh_token({"sub": user.id, "email": user.email})
    return {"access_token": access_token, "refresh_token": refresh_token, "token_type": "bearer", "user": user}


def update_user_profile(db: Session, current_user: User, payload: ProfileUpdateRequest) -> User:
    fields_set = payload.model_fields_set
    next_email = payload.email.strip() if payload.email is not None else current_user.email

    if next_email != current_user.email:
        existing = db.query(User).filter(User.email == next_email).first()
        if existing and existing.id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered",
            )
        current_user.email = next_email

    if "company_name" in fields_set:
        current_user.company_name = _clean_optional_string(payload.company_name)
    if "first_name" in fields_set:
        current_user.first_name = _clean_optional_string(payload.first_name)
    if "last_name" in fields_set:
        current_user.last_name = _clean_optional_string(payload.last_name)
    if "phone" in fields_set:
        current_user.phone = _clean_optional_string(payload.phone)
    if "country" in fields_set:
        current_user.country = _clean_optional_string(payload.country)
    if "business_type" in fields_set:
        current_user.business_type = _clean_optional_string(payload.business_type)
    if "time_zone" in fields_set:
        current_user.time_zone = _clean_optional_string(payload.time_zone)
    if "preferred_currency" in fields_set:
        current_user.preferred_currency = _normalize_currency_code(payload.preferred_currency)
    elif not current_user.preferred_currency:
        current_user.preferred_currency = "NGN"
    current_user.updated_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(current_user)
    return current_user


security = HTTPBearer()


def get_current_user(credentials = Depends(security), db: Session = Depends(get_db)) -> User:
    """
    Get the current authenticated user from the JWT token.
    
    Args:
        credentials: HTTP Bearer credentials from the Authorization header
        db: Database session (injected through dependency)
    
    Returns:
        User object if token is valid
        
    Raises:
        HTTPException: If token is invalid or user not found
    """
    token = credentials.credentials
    
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token",
            )
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
        )
    
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )
    
    return user
