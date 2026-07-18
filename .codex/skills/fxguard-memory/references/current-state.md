# Current State

## Snapshot

- As of 2026-04-04, FXGuard is an AI-assisted FX risk and collections platform for African SMEs handling cross-border payments.
- The stack is a Next.js 14 frontend with TypeScript and CSS Modules plus a FastAPI backend with SQLAlchemy, Pydantic schemas, Alembic migrations, and external data/provider integrations.
- The product is intentionally more than a dashboard. It combines auth, settings, invoice workflows, FX analytics, AI recommendation logic, payment-provider readiness, and a growing NGN intelligence engine.
- The backend persists market history locally so analytics and recommendations do not depend on live third-party responses at render time.
- Market ingestion now treats FX, Brent crude, and CBN reserves as durable append-only history: backfill is attempted where providers support it, and synthetic fallback must not overwrite real market rows.
- The recommendation service now supports both Gemini and Anthropic for AI interpretation, with environment-based provider selection and deterministic fallback when neither provider is usable.

## Trusted Starting Documents

- `README.md` is the best high-level summary of product purpose, architecture, and major engineering decisions.
- `ENGINE_OVERVIEW.md` explains the newer NGN intelligence engine, spread model, macro/news signals, alerts, simulator, reports, teams, and integrations framing.
- `UNDERSTANDING.md` captures important recent fixes and behavior changes, especially around auth, invoice flows, FX handling, and frontend stability.
- `Backend/AUTH_LOGIN_ISSUE_NOTES.md` is a durable case study in tracing misleading frontend symptoms back to backend failures and schema drift.

## Major Product Areas Present In The Repo

- Authentication with OTP verification and persistent user profile fields.
- Settings flows for profile, business details, bank details, notifications, and integrations.
- Invoice creation, review, draft/save, send, print, and payment-link workflows.
- FX dashboards, history, analytics, and recommendation endpoints backed by stored market data.
- Engine endpoints for spread, source health, volatility, seasonality, news, reserves, intervention, simulator, alerts, reports, and multi-currency exposure.
- Team and integration management modules are present in the backend and related frontend support files exist in the current working tree.

## Important Current Realities

- This repository may be mid-flight between sessions. Always inspect `git status` before editing and do not revert unrelated changes.
- Current docs and code indicate active engine, teams, and integrations expansion work. Verify adjacent files before restructuring any shared models, schemas, routes, or settings flows.
- Existing docs sometimes describe history as it evolved. When prose conflicts with code, treat the freshest code as the operative truth, then repair the memory files.

## First Files To Inspect By Task

- Product or architecture question: `README.md`, `ENGINE_OVERVIEW.md`, `UNDERSTANDING.md`
- Frontend API/data flow: `frontend/src/lib/api/client.ts`, `frontend/src/lib/api/*.ts`, `frontend/src/hooks/*.ts`
- Backend request flow: `Backend/app/api/router.py`, `Backend/app/api/endpoints/*.py`, `Backend/app/services/*.py`
- Database behavior: `Backend/app/db/database.py`, `Backend/migrations/versions/*.py`, `Backend/app/models/*.py`
- Auth edge cases: `Backend/AUTH_LOGIN_ISSUE_NOTES.md`, `Backend/app/services/auth.py`
