from datetime import datetime

from pydantic import BaseModel, EmailStr, model_validator


class RegisterRequest(BaseModel):
    email: EmailStr
    company_name: str
    password: str
    password_confirmation: str

    @model_validator(mode="after")
    def passwords_match(self):
        if self.password != self.password_confirmation:
            raise ValueError("Passwords do not match")
        return self


class User(BaseModel):
    id: str
    email: str
    company_name: str | None = None
    first_name: str | None = None
    last_name: str | None = None
    phone: str | None = None
    country: str | None = None
    business_type: str | None = None
    time_zone: str | None = None
    preferred_currency: str | None = "NGN"
    created_at: datetime | None = None
    updated_at: datetime | None = None

    class Config:
        from_attributes = True

class RegisterResponse(BaseModel):
    user: User
    message: str


class VerifyOtpRequest(BaseModel):
    email: EmailStr
    otp: int


class ResendOtpRequest(BaseModel):
    email: EmailStr


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class LoginResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: User


class ProfileUpdateRequest(BaseModel):
    email: EmailStr | None = None
    company_name: str | None = None
    first_name: str | None = None
    last_name: str | None = None
    phone: str | None = None
    country: str | None = None
    business_type: str | None = None
    time_zone: str | None = None
    preferred_currency: str | None = None


class MessageResponse(BaseModel):
    message: str


class BVNVerifyRequest(BaseModel):
    bvn: str

    @model_validator(mode="after")
    def bvn_must_be_eleven_digits(self):
        if not self.bvn.isdigit() or len(self.bvn) != 11:
            raise ValueError("BVN must be exactly 11 digits")
        return self

