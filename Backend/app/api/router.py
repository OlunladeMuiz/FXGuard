from fastapi import APIRouter
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

from app.api.endpoints import auth, fx, invoice, recommendation

router = APIRouter()
router.include_router(auth.router, prefix="/auth", tags=["Auth"])
router.include_router(fx.router)
router.include_router(invoice.router)
router.include_router(recommendation.router)
