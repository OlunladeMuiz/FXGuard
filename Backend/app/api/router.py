from app.api.endpoints import (auth)
from fastapi import APIRouter

router = APIRouter()
router.include_router(auth.router, prefix="/auth", tags=["Auth"])