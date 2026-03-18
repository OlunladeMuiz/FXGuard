import importlib.util
from pathlib import Path
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv
import os

load_dotenv()

BASE_DIR = Path(__file__).resolve().parents[2]


def _resolve_database_url(raw_url: str) -> str:
    if raw_url.startswith("postgresql://"):
        if importlib.util.find_spec("psycopg2") is None and importlib.util.find_spec("psycopg") is not None:
            return raw_url.replace("postgresql://", "postgresql+psycopg://", 1)

    if not raw_url.startswith("sqlite:///"):
        return raw_url

    sqlite_path = raw_url.removeprefix("sqlite:///")
    if Path(sqlite_path).is_absolute():
        return raw_url

    return f"sqlite:///{(BASE_DIR / sqlite_path).resolve()}"


DATABASE_URL = _resolve_database_url(os.getenv("DATABASE_URL", "sqlite:///./test.db"))

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {})

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

Base = declarative_base()


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
                continue
            missing_columns.append(column)

        for column in missing_columns:
            column_type = column.type.compile(dialect=engine.dialect)
            connection.execute(
                text(f"ALTER TABLE users ADD COLUMN {column.name} {column_type}")
            )


def initialize_database() -> None:
    Base.metadata.create_all(bind=engine)
    _sync_user_columns()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
