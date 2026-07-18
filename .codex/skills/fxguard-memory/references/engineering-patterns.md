# Engineering Patterns

## Frontend Patterns

- Use the Next.js App Router structure under `frontend/src/app` with route-local `page.tsx` and `page.module.css` files.
- Keep shared network logic in `frontend/src/lib/api`. `client.ts` owns the Axios instance, auth token injection, and login redirection behavior.
- Validate backend responses at the frontend boundary with Zod before the data spreads through the UI.
- Prefer domain hooks in `frontend/src/hooks` to wrap fetching, loading state, mutation state, and error formatting for pages and components.
- Keep reusable types in `frontend/src/lib/types` and utility logic in `frontend/src/lib/utils`.
- Avoid direct environment-string guessing. `frontend/src/lib/env.ts` expects `NEXT_PUBLIC_API_URL` without appending `/api` because route strings already include that prefix.

## Backend Patterns

- Keep route modules in `Backend/app/api/endpoints` thin. Parse input, enforce auth/dependencies, then hand work to services.
- Keep domain logic in `Backend/app/services`. This is where provider interaction, analytics, recommendation logic, and orchestration belong.
- Keep request and response contracts explicit in `Backend/app/schemas` using Pydantic models.
- Keep persistence definitions in `Backend/app/models`, with schema evolution tracked by Alembic migrations in `Backend/migrations/versions`.
- Use `Backend/app/db/database.py` as the central place for database URL resolution, engine creation, startup initialization, and compatibility handling.

## Data And Reliability Patterns

- Treat external FX providers as ingestion sources. Persist and normalize data locally before using it for analytics or recommendations.
- Prefer deterministic fallback behavior over hard failures when upstream providers are incomplete, unavailable, or unsupported.
- Use synthetic or virtual data only as an explicit fallback and label it clearly so recommendation quality stays interpretable.
- Keep UTC-aware datetime handling across backend flows. Convert only for display.

## Product-Architecture Patterns

- Keep decision intelligence separate from execution. FX insight generation should not be tightly coupled to payment-provider execution.
- Model integrations as connection state and readiness first, then layer real provider calls on top when needed.
- Add new product domains in the established vertical slice: model, schema, service, endpoint, frontend API, frontend hook, UI.

## Change Discipline

- When changing a shared pattern, inspect at least one representative file on both frontend and backend sides before introducing a new abstraction.
- When adding schema fields, prefer formal migrations. Keep startup backfills as a compatibility bridge, not the primary migration strategy.
- When changing UX data flows, update both the network contract and the types/hook surfaces that expose it.
