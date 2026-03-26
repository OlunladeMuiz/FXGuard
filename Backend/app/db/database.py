import importlib.util
import logging
import os
import re
from pathlib import Path
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.exc import OperationalError, SQLAlchemyError
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv

logger = logging.getLogger(__name__)
SAFE_SQL_IDENTIFIER = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*$")

BASE_DIR = Path(__file__).resolve().parents[2]
DEFAULT_SQLITE_PATH = (BASE_DIR / "test.db").resolve()
DEFAULT_SQLITE_URL = f"sqlite:///{DEFAULT_SQLITE_PATH}"

load_dotenv(BASE_DIR / ".env")


def _resolve_database_url(raw_url: str | None) -> str:
    configured_url = (raw_url or "").strip()
    if not configured_url:
        return DEFAULT_SQLITE_URL

    if configured_url.startswith("postgres://"):
        configured_url = configured_url.replace("postgres://", "postgresql://", 1)

    if configured_url.startswith("postgresql://"):
        if importlib.util.find_spec("psycopg2") is None and importlib.util.find_spec("psycopg") is not None:
            return configured_url.replace("postgresql://", "postgresql+psycopg://", 1)
        if importlib.util.find_spec("psycopg2") is None and importlib.util.find_spec("psycopg") is None:
            raise RuntimeError(
                "DATABASE_URL points to PostgreSQL, but no PostgreSQL driver is installed. "
                "Install either psycopg2 or psycopg."
            )

        return configured_url

    if not configured_url.startswith("sqlite:///"):
        return configured_url

    sqlite_path = configured_url.removeprefix("sqlite:///")
    if Path(sqlite_path).is_absolute():
        return configured_url

    return f"sqlite:///{(BASE_DIR / sqlite_path).resolve()}"


def _create_engine(database_url: str):
    connect_args = {"check_same_thread": False} if database_url.startswith("sqlite") else {}
    engine_kwargs = {"connect_args": connect_args}

    if not database_url.startswith("sqlite"):
        engine_kwargs.update(
            pool_size=5,
            max_overflow=10,
            pool_pre_ping=True,
        )

    return create_engine(database_url, **engine_kwargs)


DATABASE_URL = _resolve_database_url(os.getenv("DATABASE_URL", "sqlite:///./test.db"))
engine = _create_engine(DATABASE_URL)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

Base = declarative_base()


def _load_models() -> None:
    # Import ORM modules here so Base.metadata is complete before create_all runs.
    from app.models import auth as _auth  # noqa: F401
    from app.models import fx_candle as _fx_candle  # noqa: F401
    from app.models import fx_rate as _fx_rate  # noqa: F401
    from app.models import invoice as _invoice  # noqa: F401


def _ensure_database_connection() -> None:
    if not DATABASE_URL.startswith("postgresql"):
        return

    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
    except OperationalError as exc:
        raise RuntimeError(
            "Could not connect to the configured PostgreSQL database. "
            "Local development is configured to use PostgreSQL only."
        ) from exc
    except SQLAlchemyError as exc:
        raise RuntimeError(
            "PostgreSQL initialization failed. Local development is configured to use PostgreSQL only."
        ) from exc


def _sync_user_columns() -> None:
    with engine.begin() as connection:
        inspector = inspect(connection)
        if "users" not in inspector.get_table_names():
            return

        existing_columns = {column["name"] for column in inspector.get_columns("users")}
        missing_columns = []

        # Import here to avoid circular imports during module load.
        from app.models.auth import User

        for column in User.__table__.columns:
            if column.name in existing_columns or column.primary_key:
                continue
            if not column.nullable:
                logger.warning(
                    "Column '%s' is missing from the 'users' table but is defined as "
                    "non-nullable in the ORM model. This will cause query failures. "
                    "Create and run an Alembic migration to add this column manually.",
                    column.name,
                )
                continue
            missing_columns.append(column)

        for column in missing_columns:
            if not SAFE_SQL_IDENTIFIER.fullmatch(column.name):
                raise RuntimeError(
                    f"Unsafe column name generated during user schema sync: {column.name}"
                )
            column_type = column.type.compile(dialect=engine.dialect)
            connection.execute(
                text(f'ALTER TABLE "users" ADD COLUMN "{column.name}" {column_type}')
            )


def initialize_database() -> None:
    _ensure_database_connection()
    _load_models()
    Base.metadata.create_all(bind=engine)
    _sync_user_columns()


def close_database() -> None:
    engine.dispose()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
