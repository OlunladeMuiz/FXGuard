import os
from fastapi import HTTPException, Security, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from google.oauth2 import id_token
from google.auth.transport import requests

bearer_scheme = HTTPBearer()

def verify_scheduler_token(credentials: HTTPAuthorizationCredentials = Security(bearer_scheme)) -> dict:
    audience = os.getenv("CLOUD_RUN_SERVICE_URL")
    if not audience:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="CLOUD_RUN_SERVICE_URL environment variable is missing."
        )

    try:
        request = requests.Request()
        decoded_token = id_token.verify_oauth2_token(
            credentials.credentials, 
            request, 
            audience=audience
        )
        return decoded_token
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid scheduler token: {str(e)}"
        )
