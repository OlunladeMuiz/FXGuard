import os
import secrets
from fastapi import HTTPException, Security, status
from fastapi.security import APIKeyHeader

api_key_scheme = APIKeyHeader(name="X-Internal-Secret", auto_error=False)

def verify_scheduler_token(secret_header: str = Security(api_key_scheme)) -> bool:
    expected_secret = os.getenv("INTERNAL_JOBS_SECRET")
    if not expected_secret:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="INTERNAL_JOBS_SECRET environment variable is missing."
        )

    if not secret_header or not secrets.compare_digest(secret_header, expected_secret):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing X-Internal-Secret header."
        )
    return True
