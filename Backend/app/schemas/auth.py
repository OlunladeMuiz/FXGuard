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
    verification_code: int | None = None

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


class MessageResponse(BaseModel):
    message: str

class OTPResponse(BaseModel):
    otp: int
    message: str
