# Pitfalls And Guardrails

## Misleading CORS Errors Can Hide Backend Failures

- Symptom: The browser reports a CORS-style auth error.
- Root cause seen in this repo: The backend actually returned a `500` during login, which surfaced like a cross-origin issue.
- Guardrail: Check backend logs and real HTTP status codes before changing CORS settings.

## `create_all()` Does Not Repair Existing Tables

- Symptom: ORM models define columns that the local database does not actually have.
- Root cause seen in this repo: Existing SQLite tables stayed stale after model changes such as `company_name`.
- Guardrail: Use Alembic for schema evolution and keep startup sync logic only for narrow compatibility repairs.

## Relative SQLite Paths Cause Debugging Confusion

- Symptom: The app appears to be using a different database file than the one being inspected manually.
- Root cause seen in this repo: Relative SQLite URLs depended on the process working directory.
- Guardrail: Resolve paths explicitly and prefer PostgreSQL for normal local development.

## Timezone-Naive And Timezone-Aware Datetimes Will Bite Auth Flows

- Symptom: OTP or expiry logic crashes or behaves inconsistently.
- Root cause seen in this repo: Comparing naive and aware datetime values caused auth instability.
- Guardrail: Normalize backend timestamps to UTC-aware datetimes and avoid mixing local-time assumptions into persistence logic.

## Random Server And Client Values Cause Hydration Mismatches

- Symptom: UI warnings or inconsistent invoice-number rendering between SSR and the browser.
- Root cause seen in this repo: Randomized values diverged between server and client render paths.
- Guardrail: Keep server-rendered output deterministic. Generate stable IDs and dates from persisted or explicitly passed values.

## JavaScript Date Coercion Can Shift Invoice Dates

- Symptom: Invoice dates move by one day depending on timezone interpretation.
- Root cause seen in this repo: Converting plain date strings through `Date` objects introduced timezone drift.
- Guardrail: Preserve business dates as stable `YYYY-MM-DD` strings unless a real timestamp is required.

## Unsupported FX Pairs Must Not Break The UI

- Symptom: Pair-specific requests return `404` or incomplete data for currencies such as `NGN`.
- Root cause seen in this repo: External providers do not support every pair the product wants to display.
- Guardrail: Handle unsupported pairs with explicit fallback behavior and user-safe messaging.

## External Providers Are Too Fragile To Be The Product's Memory

- Symptom: Recommendations, analytics, or dashboards become inconsistent when a provider changes behavior or availability.
- Root cause seen in this repo: Third-party APIs are not stable enough to serve as the sole historical record.
- Guardrail: Persist, normalize, and annotate data locally before using it in business logic.

## Synthetic Fallback Must Never Overwrite Real Market Rows

- Symptom: A fallback backfill or seeded history pass quietly replaces an observed market row with synthetic data.
- Root cause seen in this repo: Upsert paths can treat synthetic and real market rows as equally writable on the same date.
- Guardrail: Prefer real rows over synthetic fallback, and only let synthetic data fill true gaps where no real row already exists.

## Frontend Fetch Logic Sprawl Creates Drift

- Symptom: Similar screens handle auth, errors, and parsing differently.
- Root cause seen in this repo: Direct request logic outside the shared API layer becomes inconsistent over time.
- Guardrail: Add or modify shared API helpers and the hook surface first, then wire pages and components to them.

## Stale Next Build Artifacts Can Masquerade As Webpack Runtime Errors

- Symptom: The browser shows a generic `Cannot read properties of undefined (reading 'call')` or `options.factory` error from `webpack.js`, even after a source fix.
- Root cause seen in this repo: A stale `.next` cache can keep an old module graph alive after a large frontend refactor or a broken client chunk.
- Guardrail: Restart the dev server after major frontend changes and clear `frontend/.next` when webpack runtime errors survive a clean type-check.

## Simulator Numbers Can Be Honest And Still Disagree

- Symptom: The conversion simulator and the dashboard show different NGN rates at the same time.
- Root cause seen in this repo: The dashboard NGN stack uses CBN and NairaToday snapshots, while the simulator can use ExchangeRate daily closes or source-specific snapshot history depending on the selected basis.
- Guardrail: Show the selected basis, source, and as-of date in the simulator, and do not compare seeded fallback history as if it were real market history.

## Sparse Snapshot Windows Can Look Like History Disappeared

- Symptom: After the backend is offline for a few real-world days, snapshot-based simulator runs suddenly report only one or two comparable days even though older snapshots still exist.
- Root cause seen in this repo: Snapshot feeds only accumulate while the backend is running, and a strict calendar-day cutoff can exclude older stored days after inactive gaps.
- Guardrail: When snapshot coverage inside the requested calendar window is sparse, reuse the latest stored snapshot days and clearly note that the simulator widened beyond the selected calendar span.

## Hard AI Provider Failures Latch The Recommendation Service Into Fallback

- Symptom: Recommendation text suddenly looks rule-based even after provider credentials are fixed.
- Root cause seen in this repo: `Backend/app/services/recommendation.py` disables a provider for the rest of the process after hard `400/401/403/404` failures to avoid repeated failing calls.
- Guardrail: Fix the provider issue and restart the backend before assuming the AI layer has recovered. Check billing and model access first for Anthropic or Gemini errors.

## News Signals Can Drift From Reality If RSS Items Are Duplicated Or Too Broadly Matched

- Symptom: The intervention/news engine reports too many headlines or flags unrelated business stories as FX risk.
- Root cause seen in this repo: RSS ingestion could store the same article repeatedly, and loose title matching treated generic “naira” mentions as FX-relevant.
- Guardrail: Deduplicate headlines on read/write, and use FX-specific title matching before sentiment or intervention scoring. Re-check headline counts whenever the RSS pipeline changes.
