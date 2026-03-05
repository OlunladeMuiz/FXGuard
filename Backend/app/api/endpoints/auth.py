from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.schemas.auth import (
    RegisterRequest, RegisterResponse,
    VerifyOtpRequest, ResendOtpRequest,
    LoginRequest, LoginResponse, MessageResponse, OTPResponse
)
from app.services.auth import (
    register_user as create_user,
    verify_otp as verify_user_otp,
    resend_otp as resend_user_otp,
    login_user,
)

router = APIRouter()


@router.post("/register", response_model=RegisterResponse, status_code=201)
def register_user(payload: RegisterRequest, db: Session = Depends(get_db)):
    user = create_user(db=db, payload=payload)
    return RegisterResponse(
        message="Verify your email to complete registration",
        user=user
    )


@router.post("/verify-otp", response_model=MessageResponse)
def verify_otp(payload: VerifyOtpRequest, db: Session = Depends(get_db)):
    otp = verify_user_otp(db=db, payload=payload)
    return MessageResponse(message="Email verified successfully", user=otp)


@router.post("/resend-otp", response_model=OTPResponse)
def resend_otp(payload: ResendOtpRequest, db: Session = Depends(get_db)):
    otp = resend_user_otp(db=db, payload=payload)
    return OTPResponse(otp=otp, message="OTP resent successfully")


@router.post("/login", response_model=LoginResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    return login_user(db=db, payload=payload)