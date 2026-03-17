# Auth Login Issue Notes

## Summary

The browser error looked like a CORS failure:

```text
Access to XMLHttpRequest at 'http://localhost:8000/api/auth/login' from origin 'http://localhost:3000' has been blocked by CORS policy
```

That was only the visible symptom. The real failure was a backend `500 Internal Server Error` during login. Because the request crashed before a normal response was produced, the browser surfaced it as a CORS-style failure.

## Problems Found

### 1. The reported CORS error was misleading

- `Backend/app/main.py` already had `CORSMiddleware` configured for `http://localhost:3000`.
- The login endpoint still failed because the server raised an exception while querying the database.
- Result: the frontend saw a failed cross-origin request, but the real root cause was on the API side.

### 2. The SQLite schema was out of sync with the SQLAlchemy model

- `Backend/app/models/auth.py` defines a `company_name` column on the `users` table.
- The existing local SQLite database file `Backend/test.db` did not contain that column.
- Any query loading `User` records attempted to select `users.company_name`, which caused:

```text
sqlite3.OperationalError: no such column: users.company_name
```

- This broke `/api/auth/login` before the route could return a valid response.

### 3. `Base.metadata.create_all()` did not fix the existing table

- `create_all()` only creates missing tables.
- It does not alter an existing table to add new columns.
- That meant older local databases remained broken after the `company_name` field was added to the model.

### 4. The SQLite path depended on the working directory

- The environment used `DATABASE_URL=sqlite:///./test.db`.
- With a relative SQLite path, the actual database file can depend on where the server is started from.
- This makes local debugging inconsistent and can lead to checking one database file while the app uses another.

### 5. The frontend signup request no longer matched the backend schema

- The backend register schema requires `company_name`.
- The signup form displayed a company name field but did not store or submit its value.
- Result: new registrations would fail validation even after the login issue was fixed.

## Fixes Applied

### 1. Added explicit database initialization logic

File:

- `Backend/app/db/database.py`

Changes:

- Resolved relative SQLite paths to an absolute path under the backend directory.
- Added `initialize_database()` to run startup database setup in one place.
- Kept `Base.metadata.create_all(bind=engine)` for table creation.
- Added a SQLite compatibility check that inspects the `users` table and runs:

```sql
ALTER TABLE users ADD COLUMN company_name VARCHAR
```

when the column is missing.

Why this fix:

- It repairs older local SQLite databases without deleting user data.
- It addresses the actual failure mode instead of masking it.

### 2. Switched FastAPI startup to use the new initializer

File:

- `Backend/app/main.py`

Changes:

- Replaced the direct `Base.metadata.create_all(bind=engine)` call with `initialize_database()`.

Why this fix:

- Startup now creates missing tables and backfills the missing `company_name` column before auth queries run.

### 3. Kept the local development CORS configuration in place

File:

- `Backend/app/main.py`

Current local origins include:

- `http://localhost:3000`
- `http://localhost:3001`
- `http://localhost:8000`

Why this matters:

- CORS was not the root cause, but the middleware still needs to stay correct for frontend development.

### 4. Fixed the frontend registration payload

Files:

- `frontend/src/lib/api/auth.ts`
- `frontend/src/app/signup/page.tsx`

Changes:

- Added `company_name` to the frontend `RegisterPayload` type.
- Added `company_name` to the frontend `User` type.
- Connected the signup page input to component state.
- Sent `company_name` in the registration request.
- Added a basic frontend validation check so blank company names are rejected before sending the request.

Why this fix:

- It restores alignment between frontend and backend request contracts.
- It prevents a second auth failure path after login is repaired.

## Verification Performed

The following checks were completed after the fix:

- Confirmed the `users` table now includes `company_name`.
- Confirmed querying `User` records no longer raises `OperationalError`.
- Confirmed `login_user(...)` succeeds for a verified test user and returns bearer tokens.
- Confirmed frontend lint still passes apart from pre-existing warnings unrelated to auth.

## Remaining Notes

### Verified users can log in

- Accounts with `is_verified = True` should log in successfully after restarting the backend.

### Unverified users will still be blocked by design

- The backend intentionally returns `403 Forbidden` for users who have not completed email verification.
- That is expected behavior, not part of this bug.

### There is still a JWT configuration warning

- The current fallback `SECRET_KEY` is too short for production use.
- It works in development, but it should be replaced with a strong key of at least 32 bytes.

### There are unrelated frontend type-check errors

These were already present and were not introduced by the auth fix:

- `frontend/src/app/dashboard/page.tsx`
- `frontend/src/app/invoice-generator/review/page.tsx`

They do not block the auth repair, but they should be cleaned up separately.

## Recommended Next Steps

1. Restart the FastAPI backend so startup runs `initialize_database()`.
2. Retry login from `http://localhost:3000`.
3. If login fails with `403`, verify the user has completed OTP/email verification.
4. Replace the development `SECRET_KEY` with a strong environment-provided value.
5. Add proper migrations later instead of relying on startup backfills for schema changes.

## Long-Term Improvement

This fix is appropriate for local development and recovery of the current SQLite database, but the stronger engineering approach is to introduce formal schema migrations with Alembic. That avoids hidden drift between ORM models and actual database structure as the backend evolves.
