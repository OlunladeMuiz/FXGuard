from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.api.router import limiter
from app.db.database import get_db
from app.schemas.auth import (
    RegisterRequest, RegisterResponse,
    VerifyOtpRequest, ResendOtpRequest,
    LoginRequest, LoginResponse, MessageResponse, User, ProfileUpdateRequest
)
from app.services.auth import (
    register_user as create_user,
    verify_otp as verify_user_otp,
    resend_otp as resend_user_otp,
    login_user,
    update_user_profile,
    get_current_user,
)
from app.models.auth import User as UserModel

router = APIRouter()


@router.post("/register", response_model=RegisterResponse, status_code=201)
@limiter.limit("5/minute")
def register_user(request: Request, payload: RegisterRequest, db: Session = Depends(get_db)):
    user = create_user(db=db, payload=payload)
    return RegisterResponse(
        message="Verify your email to complete registration",
        user=user
    )


@router.post("/verify-otp", response_model=MessageResponse)
def verify_otp(payload: VerifyOtpRequest, db: Session = Depends(get_db)):
    otp = verify_user_otp(db=db, payload=payload)
    return MessageResponse(message="Email verified successfully")


@router.post("/resend-otp", response_model=MessageResponse)
@limiter.limit("3/minute")
def resend_otp(request: Request, payload: ResendOtpRequest, db: Session = Depends(get_db)):
    resend_user_otp(db=db, payload=payload)
    return MessageResponse(message="A new verification code has been sent to your email")


@router.post("/login", response_model=LoginResponse)
@limiter.limit("10/minute")
def login(request: Request, payload: LoginRequest, db: Session = Depends(get_db)):
    return login_user(db=db, payload=payload)


@router.get("/profile", response_model=User)
def read_profile(current_user: UserModel = Depends(get_current_user)):
    return current_user


@router.put("/profile", response_model=User)
def update_profile(
    payload: ProfileUpdateRequest,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):
    return update_user_profile(db=db, current_user=current_user, payload=payload)
