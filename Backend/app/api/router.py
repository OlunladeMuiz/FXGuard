from app.api.endpoints import auth, fx, invoice, recommendation
from fastapi import APIRouter

router = APIRouter()
router.include_router(auth.router, prefix="/auth", tags=["Auth"])
router.include_router(fx.router)
router.include_router(invoice.router)
router.include_router(recommendation.router)
