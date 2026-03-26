from contextlib import asynccontextmanager
import logging
import os
import time

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from slowapi import _rate_limit_exceeded_handler

from app.api.router import limiter, router
from app.db.database import close_database, initialize_database

MAX_REQUEST_BODY_SIZE = 1024 * 1024
logger = logging.getLogger(__name__)
request_logger = logging.getLogger("app.request")


class RequestBodyTooLargeError(Exception):
    """Raised when a request body exceeds the configured size limit."""


def configure_logging() -> None:
    log_level_name = os.getenv("LOG_LEVEL", "INFO").upper()
    log_level = getattr(logging, log_level_name, logging.INFO)

    logging.basicConfig(
        level=log_level,
        format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
        force=True,
    )


def validate_required_environment() -> None:
    missing = [
        key
        for key in ("SECRET_KEY", "DATABASE_URL")
        if not os.getenv(key, "").strip()
    ]
    if missing:
        raise RuntimeError(
            "Missing required environment variables: "
            + ", ".join(missing)
            + ". Configure them before starting FXGuard."
        )


def get_allowed_origins() -> list[str]:
    origins = {"http://localhost:3000"}
    frontend_url = os.getenv("FRONTEND_URL", "").strip().rstrip("/")
    if frontend_url:
        origins.add(frontend_url)
    return sorted(origins)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    configure_logging()
    validate_required_environment()
    initialize_database()
    logger.info("FXGuard backend startup completed successfully.")
    try:
        yield
    finally:
        close_database()
        logger.info("FXGuard backend shutdown completed successfully.")


app = FastAPI(lifespan=lifespan)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=get_allowed_origins(),
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def enforce_request_body_limit(request: Request, call_next):
    if request.method not in {"POST", "PUT", "PATCH"}:
        return await call_next(request)

    content_length = request.headers.get("content-length")
    if content_length and int(content_length) > MAX_REQUEST_BODY_SIZE:
        return JSONResponse(
            status_code=413,
            content={"detail": "Request body exceeds the 1MB limit."},
        )

    received_bytes = 0
    original_receive = request._receive

    async def limited_receive():
        nonlocal received_bytes
        message = await original_receive()

        if message["type"] == "http.request":
            body = message.get("body", b"")
            received_bytes += len(body)
            if received_bytes > MAX_REQUEST_BODY_SIZE:
                raise RequestBodyTooLargeError

        return message

    request._receive = limited_receive

    try:
        return await call_next(request)
    except RequestBodyTooLargeError:
        return JSONResponse(
            status_code=413,
            content={"detail": "Request body exceeds the 1MB limit."},
        )


@app.middleware("http")
async def log_requests(request: Request, call_next):
    start = time.perf_counter()
    client_host = request.client.host if request.client else "unknown"

    try:
        response = await call_next(request)
    except Exception:
        duration_ms = (time.perf_counter() - start) * 1000
        request_logger.exception(
            "request_failed method=%s path=%s client=%s duration_ms=%.2f",
            request.method,
            request.url.path,
            client_host,
            duration_ms,
        )
        raise

    duration_ms = (time.perf_counter() - start) * 1000
    request_logger.info(
        "request_completed method=%s path=%s status_code=%s client=%s duration_ms=%.2f",
        request.method,
        request.url.path,
        response.status_code,
        client_host,
        duration_ms,
    )
    return response


@app.get("/health")
def health_check():
    return {"status": "ok"}


app.include_router(router, prefix="/api")
