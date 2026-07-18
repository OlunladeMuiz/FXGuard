# Decision Log

# 2026-04-26: Preserve Real Market Rows And Backfill Durable FX History

- Context: FXGuard needs to survive backend downtime without “forgetting” real market history, and synthetic fallback data should never replace an observed market row.
- Decision: Make FX upserts prefer real rows over synthetic fallback, expand the ExchangeRate job to backfill a wider recent window, and ingest full historical payloads for providers that already return multi-row series such as Brent crude and CBN reserves.
- Why: This keeps business records durable across outages while still allowing best-effort recovery where the provider supports history.
- Consequence: Stored market rows remain append-only in practice, downtime gaps can be refilled on the next run where supported, and stale-but-real data stays visible instead of disappearing.

## 2026-04-04: Persist Local FX History Instead Of Relying On Live Provider Reads

- Context: FX analytics and recommendations need reproducible history, and upstream providers can be limited, slow, or unavailable.
- Decision: Store normalized FX data locally and use external APIs as ingestion inputs rather than the source of truth for product behavior.
- Why: This makes recommendations auditable, keeps analytics stable, and reduces dependence on provider quirks.
- Consequence: Data ingestion, upsert logic, and fallback quality markers are first-class concerns.

## 2026-04-04: Centralize Frontend API Access

- Context: Raw request logic scattered across pages leads to duplicated auth handling, inconsistent error behavior, and harder refactors.
- Decision: Route frontend network access through shared modules in `frontend/src/lib/api`, with `client.ts` owning the common Axios behavior.
- Why: This keeps auth, headers, timeouts, and response validation in one place and keeps pages focused on UI.
- Consequence: New fetches and mutations should be added to the shared API layer before they appear in components or hooks.

## 2026-04-04: Enforce Typed Boundaries On Both Sides Of The API

- Context: Silent data-shape drift is expensive in finance and settings-heavy products.
- Decision: Validate frontend responses with Zod and backend contracts with Pydantic schemas.
- Why: Type and shape mismatches fail faster and closer to the source.
- Consequence: API changes should be reflected in schemas and consuming types together.

## 2026-04-04: Keep The Backend Service-Oriented

- Context: FX logic, auth, invoices, recommendations, integrations, and engine analytics each have different domain rules and external dependencies.
- Decision: Keep route handlers thin and place orchestration in dedicated service modules.
- Why: This improves testability, reuse, and the ability to evolve domains independently.
- Consequence: New backend features should usually start as service functions, not route-heavy logic.

## 2026-04-04: Prefer PostgreSQL For Normal Local Development

- Context: Silent fallback to SQLite previously caused schema drift and confusing auth failures.
- Decision: Treat PostgreSQL as the intended local-development database when `DATABASE_URL` points to Postgres, instead of silently downgrading behavior.
- Why: A consistent database surface reduces hidden bugs and environment-specific surprises.
- Consequence: Missing Postgres drivers or connectivity should fail loudly so the environment is fixed instead of masked.

## 2026-04-04: Keep Startup Schema Sync As A Recovery Bridge, Not The Long-Term Migration Strategy

- Context: Older local databases needed repair for missing user columns such as `company_name`.
- Decision: Keep limited startup compatibility logic in `Backend/app/db/database.py`, but continue using Alembic for real schema evolution.
- Why: It helps recover local environments without deleting data while still preserving disciplined migrations.
- Consequence: New schema changes should still ship with migrations and not rely on ad hoc startup mutation.

## 2026-04-04: Drive Invoice Flows From Real Backend State

- Context: Placeholder invoice review data and weak draft/send transitions caused UX and email-trigger inconsistencies.
- Decision: Treat backend invoice records as the source of truth for create, update, draft, review, and send behavior.
- Why: Invoice state transitions and notifications are business logic, not presentation-only concerns.
- Consequence: Frontend helpers can support the flow, but must stay aligned with persisted server state.

## 2026-04-04: Degrade Gracefully When FX Providers Cannot Serve A Pair

- Context: Some providers and endpoints do not support all FX pairs used by the app, especially NGN-related ones.
- Decision: Fail unsupported pairs safely and use fallback behavior instead of breaking the entire UI path.
- Why: The product must stay usable even when market data coverage is incomplete.
- Consequence: Pair support, fallback logic, and clear messaging are part of the feature, not edge-case cleanup.

## 2026-04-04: Separate Intelligence From Execution

- Context: FXGuard provides advice, monitoring, and readiness, but does not need to act like a bank or treasury custodian.
- Decision: Keep recommendation logic and market intelligence decoupled from payment-provider execution and connection state.
- Why: This keeps the product modular, honest in positioning, and easier to evolve across multiple providers.
- Consequence: Insights can improve independently of payment rails, and integrations can remain staged or simulated while UX continues to work.

## 2026-04-05: Make Recommendation AI Provider Configurable

- Context: Anthropic billing failures were forcing the recommendation service into deterministic fallback, and the product needed a lower-cost provider path for development and small-volume usage.
- Decision: Add environment-driven provider selection in `Backend/app/services/recommendation.py`, supporting Gemini and Anthropic behind the same recommendation contract.
- Why: The indicator engine and fallback logic are already local to FXGuard, so the LLM layer should be swappable without changing frontend contracts or recommendation schemas.
- Consequence: New provider work should plug into the same structured prompt, JSON validation, and fallback path instead of creating provider-specific response shapes.
- Verification: `python -m pytest Backend/tests/test_recommendation_service.py -q`

## 2026-04-08: Deduplicate And Tighten FX News Signal Classification

- Context: The live news signal was inflating headline counts with duplicate RSS items and was treating unrelated “naira” mentions as FX-relevant, which polluted intervention scoring.
- Decision: Update `Backend/app/services/news_service.py` to deduplicate repeated headlines, re-filter stored rows with FX-specific title matching, and compute sentiment dynamically when older rows are missing a stored score.
- Why: Intervention and news risk features need honest FX-specific signals, not raw RSS volume.
- Consequence: Historical duplicate rows may still exist in the database, but read paths now collapse them and exclude irrelevant titles from current risk calculations.
- Verification: `python -m pytest Backend/tests/test_news_service.py -q`
