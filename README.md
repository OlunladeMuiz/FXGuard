# FXGuard

**AI-powered FX risk management for African SMEs handling cross-border payments**

Built by **NEXUS LABS**, FXGuard is a startup-grade fintech platform that helps small and mid-sized businesses understand currency exposure, act on live FX intelligence, and execute collections through connected payment providers.

## Overview

FXGuard is designed for businesses that invoice internationally but do not have a treasury desk, in-house FX analysts, or tightly integrated payment operations. Instead of forcing teams to juggle spreadsheets, market tabs, and disconnected payment tools, FXGuard brings market monitoring, invoice workflows, recommendation logic, and payment execution into one operating layer.

The product is intentionally positioned beyond a demo dashboard. It combines a modern Next.js frontend, a service-oriented FastAPI backend, persisted FX market history, rule-based and AI-assisted recommendation logic, and a provider integration layer for payment-link generation.

## Problem Statement

African SMEs doing cross-border business face a structural FX challenge:

- Currency volatility can materially reduce invoice value between issuance and settlement.
- Many businesses convert at the wrong time because they lack market context, technical indicators, or risk signals.
- Available FX tools are often built for traders, not operators managing invoices and cash flow.
- Payment collection and FX decision-making are fragmented across separate products.
- Historical market visibility is unreliable when teams depend directly on third-party APIs without storing their own data.

The result is avoidable loss, delayed decisions, and poor visibility into when to convert, hedge, or wait.

## Solution

FXGuard solves this by combining four layers into a single workflow:

- **Data-driven FX insights** through persisted exchange-rate history, live snapshots, and analytics.
- **AI-powered recommendations** that interpret technical indicators in plain business language.
- **Payment execution rails** through external providers that generate executable payment links.
- **A centralized operator dashboard** for settings, invoices, analytics, and provider readiness.

Rather than acting as a bank or custodial wallet, FXGuard functions as an intelligent decision and execution layer on top of trusted financial rails.

## Key Features

- **FX analytics dashboard** for live rates, tracked movement, and business-facing market summaries.
- **AI recommendation engine** that suggests when to convert now, wait, hedge, or split conversion.
- **Multi-currency invoice workflows** with pricing, settlement context, and invoice review.
- **Payment link generation** via connected providers for invoice collection.
- **Email-enabled invoice delivery** with safe draft-to-send transitions.
- **Settings control center** for profile, business identity, bank details, notifications, and integrations.
- **Historical FX storage** with daily rate persistence and intraday candle fallback.
- **Provider readiness workflow** that ensures at least one payment provider is connected before link execution.
- **BVN verification path** through Interswitch for identity/compliance flows.

## System Architecture

FXGuard uses a layered architecture that separates customer experience, business logic, market data processing, and third-party integrations.

```text
Users
  |
  v
Next.js Frontend (App Router, TypeScript, CSS Modules)
  |
  v
Centralized API layer (Axios + Zod validation)
  |
  v
FastAPI Backend
  |-- Auth service
  |-- FX service
  |-- Recommendation service
  |-- Invoice service
  |-- Interswitch service
  |
  v
PostgreSQL / SQLAlchemy models
  |-- users
  |-- invoices
  |-- invoice_items
  |-- fx_rates
  |-- fx_candles
  |
  +--> ExchangeRate API (daily FX snapshots/history)
  +--> Twelve Data (intraday candles fallback)
  +--> Anthropic (AI interpretation layer)
  +--> Interswitch (payment links + BVN verification)
  +--> SMTP / Gmail (transactional email)
```

### Data Flow

1. A user signs in through the frontend and interacts with dashboard, invoice, analytics, or settings screens.
2. The frontend calls a centralized API client that targets the FastAPI backend.
3. The backend authenticates the user via JWT, loads or updates persisted records, and coordinates external service calls.
4. FX data is normalized and stored locally before being used for analytics or AI recommendations.
5. Invoices are persisted server-side and can be sent by email or linked to a payment provider.
6. Payment providers return payment URLs and references, which are stored back on the invoice record.

## Tech Stack

### Frontend

- **Next.js 14**
- **React 18**
- **TypeScript**
- **CSS Modules**
- **Axios**
- **Zod**

### Backend

- **FastAPI**
- **Python**
- **SQLAlchemy**
- **httpx**
- **PyJWT**
- **bcrypt**

### Data & Infrastructure

- **PostgreSQL** as the primary application database
- **SQLite fallback** for lightweight local/testing scenarios
- **Alembic** for schema migration support
- **SMTP / Gmail** for transactional mail delivery

### External Services

- **ExchangeRate API**
- **Twelve Data**
- **Anthropic**
- **Interswitch**

## Key Engineering Decisions

### 1. Centralized API layer on the frontend

All network access is routed through shared API helpers in `frontend/src/lib/api`. This keeps request logic, response parsing, fallback behavior, and validation out of page components.

### 2. Strict typed boundaries

The frontend validates backend responses with **Zod**, while the backend uses **Pydantic** schemas for request and response enforcement. This reduces silent data-shape drift across the stack.

### 3. Modular backend services

FX logic, recommendations, invoices, authentication, and provider integrations are split into dedicated service modules. This makes the backend easier to test, reason about, and extend.

### 4. Separation of concerns between insight and execution

FXGuard does not try to become a bank. Recommendation logic is independent from payment execution logic, allowing the product to provide treasury intelligence while delegating transactions to regulated third-party providers.

### 5. Local persistence over direct API dependency

Instead of relying on external FX APIs at render time for every decision, FXGuard stores normalized market data locally. This improves resilience, consistency, and analytical depth.

### 6. Defensive fallbacks for critical flows

The system uses deterministic fallbacks when:

- FX history is incomplete
- intraday candles are needed as provisional substitutes
- AI interpretation fails
- email delivery fails during invoice send

This keeps the platform usable even when external dependencies are degraded.

## FX Data Architecture

This is one of the most important engineering choices in FXGuard.

### Why not rely directly on external APIs?

Direct API dependency creates multiple problems:

- market history can disappear behind plan limits or provider outages
- the same request can return different results at different times
- recommendations become impossible to audit later
- analytics become fragile if the provider is slow or incomplete

FXGuard avoids this by treating external APIs as **data sources**, not the source of truth for product behavior.

### Internal FX history store

FXGuard persists market data into two dedicated tables:

- **`fx_rates`** for normalized daily FX observations
- **`fx_candles`** for intraday candle series used when daily history is insufficient

Each stored rate includes:

- base currency
- quote currency
- observed date
- source
- synthetic/real quality marker

### USD base strategy and cross-rate handling

In the UI and analytics flows, FXGuard frequently standardizes around **USD as a stable reference base** and derives inverse display pairs where needed. This reduces the number of provider calls required for broad coverage and simplifies rate normalization across screens.

The dashboard, for example, pulls USD snapshots and derives user-facing pairs such as `EUR/USD` by inversion where appropriate. This avoids hard-coding every direct pair and keeps the display model consistent.

### Reliability improvements

This architecture improves reliability in several ways:

- persisted history makes recommendations reproducible
- upsert logic prevents duplicate rate rows while keeping data fresh
- seeded history fills gaps when historical APIs are unavailable
- candle fallback creates provisional signals instead of hard failures
- same-currency virtual points avoid unnecessary provider calls

In practice, FXGuard is building its own internal market memory rather than asking external APIs to serve as both ingestion layer and live analytics engine.

## AI Recommendation Engine

FXGuard’s recommendation engine is not a static tip generator. It combines market data engineering with an AI interpretation layer.

### How it works

1. The backend loads the last 30 days of stored FX history for the requested pair.
2. It computes technical and statistical indicators such as:
   - RSI
   - SMA(7)
   - SMA(20)
   - volatility
   - 7-day and 30-day change
   - current range position
3. It classifies the data quality as `full`, `mixed`, `seeded`, `same_currency`, or `candle_fallback`.
4. It decides whether the recommendation should be treated as:
   - `ready`
   - `limited_data`
   - `insufficient_data`
   - `provisional_data`
5. It sends a structured prompt to Anthropic to convert those indicators into business-language guidance.

### Why this is better than static insights

- It is grounded in **real stored FX data**, not generic advice.
- It explains **why** the recommendation exists in plain English.
- It degrades gracefully when the AI layer is unavailable.
- It adapts confidence based on real vs synthetic data quality.

### Fallback logic

If AI fails, FXGuard falls back to deterministic recommendation logic based on:

- RSI conditions
- volatility thresholds
- range position
- history quality
- signal maturity

This ensures the recommendation system remains usable even when external AI is unavailable or returns invalid output.

## Integrations

Integrations are critical because **FXGuard does not hold funds** and does not attempt to replace regulated financial rails. Instead, it orchestrates execution through external providers.

### Why integrations matter

- FXGuard helps businesses decide **when** to act on FX exposure.
- Payment providers help businesses actually **collect** money.
- The platform needs both layers to turn treasury insight into business execution.

### Provider model

The settings experience currently presents three payment providers:

- **Paystack**
- **Flutterwave**
- **Interswitch**

The provider registry and connection UX are already present in the product, allowing teams to model provider readiness from the settings area. In the current implementation, **Interswitch is the fully wired backend payment-link path**, while Paystack and Flutterwave are represented in the integration layer for future execution expansion.

### Interswitch integration

Interswitch is used in FXGuard for:

- payment-link generation for invoices
- payment-reference capture
- invoice payment-status updates through webhook handling
- BVN verification support

### How payment links work

When a user requests a payment link for an invoice:

1. FXGuard loads the invoice record from the backend.
2. The backend authenticates with Interswitch Passport.
3. It creates a bill payment link on the Interswitch `paybill` API.
4. The returned `paymentUrl` and reference are saved on the invoice.
5. The frontend displays the generated payment link so it can be copied or shared with the client.

### Working payload structure

The successful Interswitch bill request uses:

```json
{
  "merchantCode": "YOUR_MERCHANT_CODE",
  "payableCode": "YOUR_PAYABLE_CODE",
  "amount": 10000,
  "redirectUrl": "https://your-frontend-url/invoice-generator/review?id=<invoice_id>",
  "customerId": "client@example.com",
  "currencyCode": "566",
  "customerEmail": "client@example.com",
  "transactionReference": "invoice-uuid"
}
```

Notes:

- `amount` is sent in the **minor unit**
- `currencyCode` is numeric
- `transactionReference` is the merchant reference
- `redirectUrl` is required for checkout completion flow

### Authentication challenges and what went wrong

Interswitch was one of the hardest parts of the project because the initial implementation was pointed at the wrong sandbox assumptions.

The issues encountered included:

- using the wrong Passport auth host
- calling the wrong payment-link endpoint
- sending the wrong payload fields
- stale merchant credentials in local config

### How it was solved

The final working integration uses:

- the correct **QA Passport** token host
- the correct **`/paymentgateway/api/v1/paybill`** endpoint
- the correct bill payload contract
- proper reference persistence on the invoice
- redirect URL generation from backend config

This is a strong example of real-world fintech integration work: the technical challenge was not just writing HTTP calls, but reconciling documentation, auth hosts, provider-specific payload formats, and invoice domain behavior.

## Challenges & Solutions

### 1. Historical FX API limitations

**Challenge:** Free or sandbox market-data providers can have missing historical coverage, sparse pairs, or plan-restricted endpoints.

**Solution:** FXGuard stores its own `fx_rates` history, seeds gaps when needed, and uses candle fallback when daily history is insufficient.

### 2. Data consistency for analytics

**Challenge:** Recommendations are unreliable if market data is fetched ad hoc on every request.

**Solution:** The backend normalizes and persists rates locally using upsert logic and quality metadata, so analytics operate on stable stored history.

### 3. Early-stage signal quality

**Challenge:** A system cannot pretend to have strong recommendation confidence when only a few market points exist.

**Solution:** FXGuard labels recommendation maturity explicitly with `ready`, `limited_data`, `insufficient_data`, and `provisional_data`.

### 4. CORS and frontend/backend coordination

**Challenge:** The frontend and backend run on separate localhost origins during development.

**Solution:** FastAPI is configured with explicit CORS settings for development origins, and the frontend uses a centralized `NEXT_PUBLIC_API_URL` configuration.

### 5. Invoice delivery integrity

**Challenge:** An invoice should not appear “sent” if email delivery fails.

**Solution:** FXGuard saves failed send attempts as drafts and returns actionable errors instead of silently marking the invoice as delivered.

### 6. Interswitch integration complexity

**Challenge:** Payment generation initially failed because auth, endpoint, and payload assumptions did not match the real sandbox contract.

**Solution:** The integration was corrected to use the QA Passport host, the `paybill` endpoint, proper currency code formatting, and invoice-linked redirect/reference handling.

## Team & Contributions

**Team Name:** NEXUS LABS

### 1. Olunlade Abdulmuiz

**Role:** Full Stack Developer

**Contributions:**

- Designed the overall system architecture
- Built the frontend dashboard, settings, and FX analytics experience
- Integrated FX APIs and the data-ingestion pipeline
- Implemented the recommendation engine flow
- Connected frontend experiences to backend services
- Managed repositories and deployments

### 2. Osemen Esezobor

**Role:** Backend Developer

**Contributions:**

- Built and structured the FastAPI backend
- Implemented core API endpoints
- Worked on integration logic
- Contributed backend improvements through remote branches
- Handled backend service and data-flow design

### 3. Precious Liberty

**Role:** UI/UX Designer

**Contributions:**

- Designed the product interface and user experience
- Created intuitive layouts for dashboard and settings flows
- Helped shape a clean and user-friendly design system

## Getting Started

### Prerequisites

- **Node.js 18+**
- **Python 3.11+**
- **PostgreSQL**

### 1. Clone the repository

```bash
git clone https://github.com/OlunladeMuiz/FXGuard.git
cd FXGuard
```

### 2. Install frontend dependencies

```bash
npm install
```

### 3. Create and activate a Python virtual environment

#### Windows (PowerShell)

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r Backend\requirements.txt
```

#### macOS / Linux

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r Backend/requirements.txt
```

### 4. Configure environment variables

Create `Backend/.env` with values like:

```env
DATABASE_URL=postgresql://username:password@localhost:5432/fxguard
SECRET_KEY=replace_with_a_secure_secret

EXCHANGE_RATE_API_KEY=replace_with_exchange_rate_api_key
TWELVE_DATA_API_KEY=replace_with_twelve_data_api_key

GMAIL_ADDRESS=replace_with_sender_email
GMAIL_PASSWORD=replace_with_app_password
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=465
SMTP_USE_SSL=true
SMTP_USE_TLS=false
SMTP_TIMEOUT_SECONDS=30

INTERSWITCH_BASE_URL=https://qa.interswitchng.com
INTERSWITCH_AUTH_BASE_URL=https://qa.interswitchng.com
INTERSWITCH_CLIENT_ID=replace_with_interswitch_client_id
INTERSWITCH_CLIENT_SECRET=replace_with_interswitch_client_secret
INTERSWITCH_MERCHANT_CODE=replace_with_merchant_code
INTERSWITCH_PAYABLE_CODE=replace_with_payable_code
FRONTEND_BASE_URL=http://localhost:3000

ANTHROPIC_API_KEY=replace_with_anthropic_api_key
ANTHROPIC_MODEL=claude-3-5-sonnet-latest
```

Optional frontend environment:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api
NEXT_PUBLIC_USE_MOCK=false
```

### Railway backend deployment

For Railway, create a backend service from this repository and set the **Root Directory** to `Backend`.

If you want Railway to use the checked-in deployment settings, point the service's config-as-code path to:

```text
/Backend/railway.json
```

Key production variables for Railway include:

```env
DATABASE_URL=<Railway Postgres connection string>
SECRET_KEY=<generated secret>
FRONTEND_URL=https://your-frontend.vercel.app
FRONTEND_BASE_URL=https://your-frontend.vercel.app
LOG_LEVEL=INFO
```

Your Vercel frontend should then use:

```env
NEXT_PUBLIC_API_URL=https://your-backend.up.railway.app/api
NEXT_PUBLIC_USE_MOCK=false
```

### 5. Run the backend

```bash
cd Backend
..\.venv\Scripts\python.exe -m uvicorn app.main:app --reload
```

On macOS / Linux:

```bash
cd Backend
../.venv/bin/python -m uvicorn app.main:app --reload
```

The backend will be available at `http://localhost:8000`.

### 6. Run the frontend

From the repository root:

```bash
npm run dev --workspace=frontend
```

The frontend will be available at `http://localhost:3000`.

### 7. Run quality checks

```bash
npm run type-check --workspace=frontend
npm run lint --workspace=frontend
.\.venv\Scripts\python.exe -m unittest discover Backend/tests
```

## Deployment Notes — Email Service

### Current Status

Email delivery is intentionally disabled in this hackathon deployment.
User accounts are auto-verified on registration - no OTP confirmation
step is required to access the platform.

### Why

FXGuard's backend is hosted on Railway, which restricts outbound
connections to external SMTP servers (port 465/587) at the network
level. This is a documented Railway infrastructure limitation affecting
all services on their free tier, not a bug in the application.

### What This Means for the Demo

- **Registration works immediately** - sign up and log in without
  waiting for any email
- **Invoice creation works fully** - invoices are created, saved, and
  returned successfully. The client notification email is queued but
  not delivered in this environment
- **All other features are fully functional** - FX analytics, payment
  link generation, BVN verification, AI recommendations

### Production Email Plan

The email infrastructure is fully built and ready. The switch to
production email delivery requires one environment variable change:

```env
RESEND_API_KEY=<key from resend.com>
RESEND_FROM_EMAIL=noreply@fxguard.com
```

Resend uses HTTPS (port 443) which Railway permits. A verified sending
domain will be configured post-hackathon. The estimated time to enable
full email delivery in production is under 30 minutes.

### Email Features Built

- OTP verification emails (HTML template)
- Welcome emails on registration
- Invoice notification emails to clients (with payment link)
- All templates are production-ready and will activate automatically
  once the email provider is connected

## Future Improvements

- Add real payout and bank settlement orchestration beyond payment-link collection
- Expand provider execution from Interswitch to deeper Paystack and Flutterwave backend flows
- Introduce richer treasury workflows such as approval chains and hedging playbooks
- Add more currencies and regional corridors across African trade routes
- Build a mobile companion app for founders and finance teams
- Improve prediction depth with more advanced ML/AI forecasting layers
- Add live trading and hedge execution integrations where regulation and provider capabilities allow
- Move provider connection state from browser local storage into secure backend credential management

---

**FXGuard by NEXUS LABS** is more than a rate dashboard. It is an operating system for SMEs that need to understand FX risk, act with confidence, and execute collections through trusted financial rails.
