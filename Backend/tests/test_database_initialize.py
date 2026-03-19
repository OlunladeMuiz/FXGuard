import sqlite3
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

from sqlalchemy.exc import OperationalError

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.db import database
from app.models.auth import User


class InitializeDatabaseTests(unittest.TestCase):
    def setUp(self) -> None:
        self.original_database_url = database.DATABASE_URL
        self.original_engine = database.engine

    def tearDown(self) -> None:
        database.engine.dispose()
        database.DATABASE_URL = self.original_database_url
        database.engine = self.original_engine
        database.SessionLocal.configure(bind=database.engine)

    def test_initialize_database_backfills_missing_nullable_user_columns(self) -> None:
        db_path = Path(__file__).resolve().parent / f"legacy_{next(tempfile._get_candidate_names())}.db"
        self.addCleanup(lambda: db_path.exists() and db_path.unlink())
        temp_url = f"sqlite:///{db_path}"

        connection = sqlite3.connect(str(db_path))
        try:
            connection.execute(
                """
                CREATE TABLE users (
                    id VARCHAR PRIMARY KEY,
                    email VARCHAR NOT NULL UNIQUE,
                    password VARCHAR NOT NULL,
                    is_verified BOOLEAN NOT NULL DEFAULT 0,
                    created_at DATETIME,
                    updated_at DATETIME,
                    verification_code INTEGER
                )
                """
            )
            connection.commit()
        finally:
            connection.close()

        database.DATABASE_URL = temp_url
        database.engine = database._create_engine(temp_url)
        database.SessionLocal.configure(bind=database.engine)

        # Importing the model ensures Base.metadata contains the users table definition.
        self.assertEqual(User.__tablename__, "users")

        database.initialize_database()

        connection = sqlite3.connect(str(db_path))
        try:
            columns = {
                row[1]: row[2]
                for row in connection.execute("PRAGMA table_info(users)").fetchall()
            }
        finally:
            connection.close()

        self.assertIn("verification_code_expires_at", columns)
        self.assertIn("company_name", columns)
        self.assertIn("first_name", columns)
        self.assertIn("last_name", columns)
        self.assertIn("phone", columns)
        self.assertIn("time_zone", columns)

    def test_resolve_database_url_prefers_psycopg_for_postgres_urls(self) -> None:
        raw_url = "postgres://user:password@localhost:5432/fxguard"

        def fake_find_spec(module_name: str):
            if module_name == "psycopg2":
                return None
            if module_name == "psycopg":
                return object()
            return None

        with mock.patch("app.db.database.importlib.util.find_spec", side_effect=fake_find_spec):
            resolved_url = database._resolve_database_url(raw_url)

        self.assertEqual(
            resolved_url,
            "postgresql+psycopg://user:password@localhost:5432/fxguard",
        )

    def test_resolve_database_url_raises_when_no_postgres_driver_is_installed(self) -> None:
        raw_url = "postgresql://user:password@localhost:5432/fxguard"

        with mock.patch("app.db.database.importlib.util.find_spec", return_value=None):
            with self.assertRaisesRegex(RuntimeError, "no PostgreSQL driver is installed"):
                database._resolve_database_url(raw_url)

    def test_postgres_connection_failure_does_not_fall_back_to_sqlite(self) -> None:
        database.DATABASE_URL = "postgresql+psycopg://user:password@localhost:5432/fxguard"
        database.engine = mock.Mock()
        database.engine.connect.side_effect = OperationalError("SELECT 1", {}, Exception("boom"))

        with self.assertRaisesRegex(RuntimeError, "use PostgreSQL only"):
            database._ensure_database_connection()

        self.assertEqual(
            database.DATABASE_URL,
            "postgresql+psycopg://user:password@localhost:5432/fxguard",
        )


if __name__ == "__main__":
    unittest.main()
