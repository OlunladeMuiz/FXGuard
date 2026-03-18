from app.api.endpoints import (auth, invoice)
from fastapi import APIRouter

router = APIRouter()
router.include_router(auth.router, prefix="/auth", tags=["Auth"])
router.include_router(invoice.router)