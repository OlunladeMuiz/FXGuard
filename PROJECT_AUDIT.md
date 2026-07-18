## 1. Project Structure
Source tree only; generated/vendor directories such as `node_modules`, `.venv`, `.git`, and `.pytest_cache` are intentionally omitted.

```text
.
├── ENGINE_OVERVIEW.md
├── README.md
├── UNDERSTANDING.md
├── fxguard_data.dump
├── package-lock.json
├── package.json
├── Backend/  # FastAPI backend: API, DB models, migrations, schedulers, services, and tests
│   ├── alembic.ini
│   ├── AUTH_LOGIN_ISSUE_NOTES.md
│   ├── CONTRIBUTING.md
│   ├── requirements.txt
│   ├── railway.json
│   ├── SETUP.md
│   ├── app/
│   │   ├── api/
│   │   │   ├── router.py
│   │   │   └── endpoints/
│   │   │       ├── __init__.py
│   │   │       ├── auth.py
│   │   │       ├── engine.py
│   │   │       ├── fx.py
│   │   │       ├── integration.py
│   │   │       ├── invoice.py
│   │   │       ├── recommendation.py
│   │   │       └── team.py
│   │   ├── db/
│   │   │   └── database.py
│   │   ├── jobs/
│   │   │   ├── fx_jobs.py
│   │   │   └── scheduler.py
│   │   ├── main.py
│   │   ├── models/
│   │   │   ├── auth.py
│   │   │   ├── brent_crude.py
│   │   │   ├── cbn_reserves.py
│   │   │   ├── conversion_log.py
│   │   │   ├── fx_candle.py
│   │   │   ├── fx_rate.py
│   │   │   ├── fx_rate_snapshot.py
│   │   │   ├── integration_connection.py
│   │   │   ├── invoice.py
│   │   │   ├── news_headline.py
│   │   │   ├── rate_alert.py
│   │   │   ├── spread_snapshot.py
│   │   │   └── team.py
│   │   ├── schemas/
│   │   │   ├── auth.py
│   │   │   ├── engine.py
│   │   │   ├── fx.py
│   │   │   ├── integration.py
│   │   │   ├── invoice.py
│   │   │   ├── recommendation.py
│   │   │   └── team.py
│   │   ├── services/
│   │   │   ├── alert_service.py
│   │   │   ├── analytics_service.py
│   │   │   ├── auth.py
│   │   │   ├── brent_crude_service.py
│   │   │   ├── cbn_reserves_service.py
│   │   │   ├── exposure_service.py
│   │   │   ├── fx.py
│   │   │   ├── integration_service.py
│   │   │   ├── intervention_service.py
│   │   │   ├── interswitch.py
│   │   │   ├── invoice.py
│   │   │   ├── news_service.py
│   │   │   ├── recommendation.py
│   │   │   ├── seasonality_service.py
│   │   │   ├── simulator_service.py
│   │   │   ├── spread_service.py
│   │   │   ├── team_service.py
│   │   │   ├── volatility_service.py
│   │   │   └── scrapers/
│   │   │       ├── abokifx_scraper.py
│   │   │       ├── cbn_reserves_scraper.py
│   │   │       ├── cbn_scraper.py
│   │   │       └── nairatoday_scraper.py
│   │   ├── templates/
│   │   │   ├── invoice_created_email.html
│   │   │   ├── invoice_notification_email.html
│   │   │   └── otp_email.html
│   │   └── utils/
│   │       ├── __init__.py
│   │       ├── email_service.py
│   │       └── pdf.py
│   ├── migrations/
│   │   ├── env.py
│   │   └── versions/
│   │       ├── 202603220000_initial_schema.py
│   │       ├── 202603220101_invoice_number_per_user.py
│   │       ├── 202603220102_add_invoice_payment_fields.py
│   │       ├── 202603220103_add_invoice_interswitch_payment_columns.py
│   │       ├── 202603250101_add_user_business_detail_columns.py
│   │       ├── 202604010001_phase1_engine_tables.py
│   │       ├── 202604020001_phase2_teams.py
│   │       └── 202604030001_phase2_integrations.py
│   └── tests/
│       ├── test_auth_service.py
│       ├── test_database_initialize.py
│       ├── test_email_service.py
│       ├── test_fx_candles_endpoint.py
│       ├── test_fx_candles_service.py
│       ├── test_fx_endpoint.py
│       ├── test_fx_service.py
│       ├── test_invoice_service.py
│       ├── test_interswitch_service.py
│       ├── test_news_service.py
│       ├── test_recommendation_endpoint.py
│       ├── test_recommendation_service.py
│       └── test_simulator_service.py
└── frontend/  # Next.js frontend: routes, UI, hooks, client-side API layer, and styling
    ├── STYLING_GUIDE.md
    ├── STYLING_INDEX.md
    ├── next.config.js
    ├── next-env.d.ts
    ├── package-lock.json
    ├── package.json
    ├── tsconfig.json
    ├── tsconfig.tsbuildinfo
    ├── vercel.json
    └── src/
        ├── app/
        │   ├── layout.tsx
        │   ├── page.tsx
        │   ├── page.module.css
        │   ├── convert/
        │   │   └── page.tsx
        │   ├── currency-settings/
        │   │   ├── page.tsx
        │   │   └── page.module.css
        │   ├── dashboard/
        │   │   ├── page.tsx
        │   │   └── page.module.css
        │   ├── fx-analytics/
        │   │   ├── page.tsx
        │   │   ├── page.module.css
        │   │   └── deep/
        │   │       ├── page.tsx
        │   │       └── page.module.css
        │   ├── invoice-generator/
        │   │   ├── page.tsx
        │   │   ├── page.module.css
        │   │   └── review/
        │   │       ├── page.tsx
        │   │       └── page.module.css
        │   ├── login/
        │   │   ├── page.tsx
        │   │   └── page.module.css
        │   ├── settings/
        │   │   ├── page.tsx
        │   │   └── page.module.css
        │   ├── signup/
        │   │   ├── page.tsx
        │   │   └── page.module.css
        │   ├── transactions/
        │   │   ├── page.tsx
        │   │   └── page.module.css
        │   ├── verify-otp/
        │   │   ├── page.tsx
        │   │   └── page.module.css
        │   └── wallet/
        │       ├── page.tsx
        │       └── page.module.css
        ├── components/
        │   ├── ConditionalNavbar.tsx
        │   ├── ErrorBoundary.tsx
        │   ├── ProtectedRouteGate.tsx
        │   ├── index.ts
        │   ├── currency/
        │   │   ├── CurrencyBalanceCard/
        │   │   │   ├── CurrencyBalanceCard.tsx
        │   │   │   └── CurrencyBalanceCard.module.css
        │   │   ├── CurrencySelector/
        │   │   │   ├── CurrencySelector.tsx
        │   │   │   └── CurrencySelector.module.css
        │   │   └── FXRateDisplay/
        │   │       ├── FXRateDisplay.tsx
        │   │       └── FXRateDisplay.module.css
        │   ├── fx/
        │   │   ├── BestRateComparison/
        │   │   │   ├── BestRateComparison.tsx
        │   │   │   ├── BestRateComparison.module.css
        │   │   │   └── index.ts
        │   │   ├── FXVolatilityMeter/
        │   │   │   ├── FXVolatilityMeter.tsx
        │   │   │   └── FXVolatilityMeter.module.css
        │   │   ├── RecommendationPanel/
        │   │   │   ├── RecommendationPanel.tsx
        │   │   │   ├── RecommendationPanel.module.css
        │   │   │   └── index.ts
        │   │   ├── RiskScoreBadge/
        │   │   │   ├── RiskScoreBadge.tsx
        │   │   │   ├── RiskScoreBadge.module.css
        │   │   │   └── index.ts
        │   │   └── SavingsEstimator/
        │   │       ├── SavingsEstimator.tsx
        │   │       ├── SavingsEstimator.module.css
        │   │       └── index.ts
        │   ├── invoices/
        │   │   ├── InvoiceForm/
        │   │   │   ├── InvoiceForm.tsx
        │   │   │   ├── InvoiceForm.module.css
        │   │   │   └── index.ts
        │   │   └── InvoiceTable/
        │   │       ├── InvoiceTable.tsx
        │   │       ├── InvoiceTable.module.css
        │   │       └── index.ts
        │   ├── layout/
        │   │   ├── Navbar/
        │   │   │   ├── Navbar.tsx
        │   │   │   └── Navbar.module.css
        │   │   └── Sidebar/
        │   │       ├── Sidebar.tsx
        │   │       └── Sidebar.module.css
        │   ├── settings/
        │   │   ├── BankDetailsSection.tsx
        │   │   ├── BusinessDetailsSection.tsx
        │   │   ├── IntegrationsSection.tsx
        │   │   ├── navigation.tsx
        │   │   ├── NotificationsSection.tsx
        │   │   ├── ProfileSecuritySection.tsx
        │   │   └── SettingsSidebar.tsx
        │   └── ui/
        │       ├── Button/
        │       │   ├── Button.tsx
        │       │   └── Button.module.css
        │       ├── Card/
        │       │   ├── Card.tsx
        │       │   └── Card.module.css
        │       ├── GlassButton/
        │       │   ├── GlassButton.tsx
        │       │   ├── GlassButton.module.css
        │       │   └── index.ts
        │       ├── Input/
        │       │   ├── Input.tsx
        │       │   └── Input.module.css
        │       └── Loader/
        │           ├── Loader.tsx
        │           └── Loader.module.css
        │       └── glass-button.ts
        ├── hooks/
        │   ├── useBankDetails.ts
        │   ├── useBusinessDetails.ts
        │   ├── useCreateInvoice.ts
        │   ├── useEngine.ts
        │   ├── useFXHistory.ts
        │   ├── useFXRates.ts
        │   ├── useIntegrations.ts
        │   ├── useInvoices.ts
        │   ├── useNotifications.ts
        │   ├── useProfileSettings.ts
        │   ├── useRecommendation.ts
        │   ├── useTransactions.ts
        │   └── useWallet.ts
        ├── lib/
        │   ├── api/
        │   │   ├── auth.ts
        │   │   ├── bank.ts
        │   │   ├── client.ts
        │   │   ├── engine.ts
        │   │   ├── errors.ts
        │   │   ├── fx.ts
        │   │   ├── integrations.ts
        │   │   ├── invoices.ts
        │   │   ├── mockData.ts
        │   │   ├── notifications.ts
        │   │   ├── recommendation.ts
        │   │   ├── settings.ts
        │   │   ├── transactions.ts
        │   │   └── wallet.ts
        │   ├── constants/
        │   │   ├── config.ts
        │   │   └── currencyPairs.ts
        │   ├── env.ts
        │   ├── invoices/
        │   │   └── editor.ts
        │   ├── types/
        │   │   ├── currency.ts
        │   │   ├── engine.ts
        │   │   ├── fx.ts
        │   │   ├── invoice.ts
        │   │   ├── recommendation.ts
        │   │   ├── settings.ts
        │   │   ├── transaction.ts
        │   │   └── wallet.ts
        │   └── utils/
        │       ├── calculateConversion.ts
        │       ├── calculations.ts
        │       ├── formatCurrency.ts
        │       └── riskMapping.ts
        └── styles/
            └── globals.css
```

## 2. API Surface

### Health
| Method | Path | Auth required | Rate limit | Request body / query | Response shape | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `GET` | `/health` | No | None explicit | None | `{"status": "ok"}` | Root health check from `Backend/app/main.py`. |

### Auth
| Method | Path | Auth required | Rate limit | Request body / query | Response shape | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `POST` | `/api/auth/register` | No | `5/minute` | `RegisterRequest { email, company_name, password, password_confirmation }` | `RegisterResponse { user: User, message }` | Creates the user, generates OTP, and sends the verification email. |
| `POST` | `/api/auth/verify-otp` | No | None explicit | `VerifyOtpRequest { email, otp: int }` | `MessageResponse { message }` | Verifies the stored OTP code. |
| `POST` | `/api/auth/resend-otp` | No | `3/minute` | `ResendOtpRequest { email }` | `MessageResponse { message }` | Resends a fresh OTP if cooldown allows. |
| `POST` | `/api/auth/login` | No | `10/minute` | `LoginRequest { email, password }` | `LoginResponse { access_token, refresh_token, token_type, user }` | Issues JWT access and refresh tokens. |
| `GET` | `/api/auth/profile` | Yes | None explicit | None | `User { id, email, company_name, first_name, last_name, phone, country, business_type, time_zone, preferred_currency, created_at, updated_at }` | Fetches the current authenticated user. |
| `PUT` | `/api/auth/profile` | Yes | None explicit | `ProfileUpdateRequest { email?, company_name?, first_name?, last_name?, phone?, country?, business_type?, time_zone?, preferred_currency? }` | `User` | Updates the current authenticated user. |

### FX
| Method | Path | Auth required | Rate limit | Request body / query | Response shape | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `GET` | `/api/fx/candles` | Yes | None explicit | Query: `base`, `quote`, `range` in `1d|7d|30d|90d|1y` default `30d`, `interval` in `1min|5min|15min|30min|1h|4h|1day|1week` default `1day` | `FXCandlesResponse { pair, base, quote, range, interval, data: FXCandleItem[], stats: FXCandlesStats, data_points, source }` | Returns `503` on `FXProviderError`. |
| `GET` | `/api/fx/rates` | Yes | None explicit | Query: `base`, optional `quotes` comma-separated, optional `date` | `FXRatesResponse { data: FXRateItem[], timestamp }` | Returns `503` on `FXProviderError`. |
| `GET` | `/api/fx/history` | Yes | None explicit | Query: `base`, `quote`, `period` in `1d|7d|30d|90d|1y` default `30d` | `FXHistoryResponse { pair, base, quote, period, data: FXHistoryPoint[], stats: FXHistoryStats, data_points, real_data_points, synthetic_data_points, contains_synthetic, source }` | Returns `503` on `FXProviderError`. |
| `POST` | `/api/fx/sync/{base}/{quote}` | Yes | None explicit | Path params `base`, `quote`; query `period` in `1d|7d|30d|90d|1y` default `30d` | `FXHistoryResponse` | Forces a sync/backfill for a pair. |

### Invoices
| Method | Path | Auth required | Rate limit | Request body / query | Response shape | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `POST` | `/api/invoices/` | Yes | None explicit | `InvoiceCreate { invoice_number, client_name, client_email, client_company?, address?, country?, amount, currency='USD', discount=0, tax_rate=0, issue_date, due_date, description?, payment_method?, payment_details?, account_name?, bank_name?, account_number?, status='draft', items: InvoiceItemCreate[] }` | `InvoiceResponse { id, user_id, invoice_number, client_name, client_email, client_company?, address?, country?, amount, currency, discount, tax_rate, issue_date, due_date, description?, payment_method?, payment_details?, account_name?, bank_name?, account_number?, status, payment_link?, payment_reference?, payment_completed_at?, created_at, updated_at, items: InvoiceItemResponse[] }` | Creates invoice items and may send creation emails if status is `sent`. |
| `GET` | `/api/invoices/{invoice_id}` | Yes | None explicit | Path param `invoice_id` | `InvoiceResponse` | Fetches a single invoice. |
| `GET` | `/api/invoices/` | Yes | None explicit | Query: `skip=0`, `limit=10`, optional `status_filter` | `list[InvoiceResponse]` | Paginated invoice list. |
| `PUT` | `/api/invoices/{invoice_id}` | Yes | None explicit | `InvoiceUpdate` with all invoice fields optional, including `items?: InvoiceItemCreate[]` | `InvoiceResponse` | Updates invoice state and items. |
| `DELETE` | `/api/invoices/{invoice_id}` | Yes | None explicit | Path param `invoice_id` | `204 No Content` | Deletes the invoice. |
| `POST` | `/api/invoices/{invoice_id}/payment-link` | Yes | `20/minute` keyed by user id or IP | No request body; uses invoice data on the server | `InvoiceResponse` | Returns an existing link if present; otherwise calls Interswitch and persists `payment_link` and `payment_reference`. |
| `POST` | `/api/invoices/webhooks/payment` | No | None explicit | Raw JSON from `await request.json()` | Raw dict, typically `{"status":"processed"}` or `{"status":"ignored", ...}` | `include_in_schema=False`; handles gateway callbacks. |
| `POST` | `/api/invoices/verify-bvn` | Yes | None explicit | `BVNVerifyRequest { bvn: 11-digit string }` | Raw dict from Interswitch BVN verification | Calls `InterswitchService.verify_bvn()`. |

### Recommendation
| Method | Path | Auth required | Rate limit | Request body / query | Response shape | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `GET` | `/api/recommendation/{base}/{quote}` | Yes | None explicit | Path params `base`, `quote`; query `amount=10000.0` (`> 0`) | `RecommendationResponse { status, history_quality, action, confidence, risk_score, explanation, factors: RecommendationFactor[], optimal_window, indicators: RecommendationIndicators, data_points, real_data_points, synthetic_data_points, contains_synthetic, generated_at, base, quote, amount }` | Hybrid rule-based plus optional AI interpretation. |

### Engine
| Method | Path | Auth required | Rate limit | Request body / query | Response shape | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `GET` | `/api/engine/spread/current` | Yes | None explicit | None | `SpreadResponse { official_rate, parallel_rate, bdc_rate, spread_ngn, spread_pct, spread_direction, risk_level, risk_message, official_source, parallel_source, bdc_source, recorded_at }` | Current spread snapshot. |
| `GET` | `/api/engine/signals/brent` | Yes | None explicit | None | `BrentSignalResponse { current_price, weekly_change_pct, signal, risk_flag, message }` | Uses Brent crude signal data. |
| `GET` | `/api/engine/sources/health` | Yes | None explicit | None | `SourceHealthResponse { sources: SourceHealthItem[], checked_at }` | Reports freshness/configuration for data sources. |
| `POST` | `/api/engine/simulator` | Yes | None explicit | `SimulatorRequest { base_currency, quote_currency, amount, lookback_days=30, rate_source='market' }` | Raw dict with keys `data_available, base_currency, quote_currency, amount, lookback_days, data_points, real_data_points, synthetic_data_points, comparison_data_points, history_quality, current_rate_source, current_rate_as_of, today_rate, today_converted, best_rate, best_rate_date, best_converted, worst_rate, worst_rate_date, worst_converted, avg_rate, avg_converted, opportunity_cost_vs_best, opportunity_saved_vs_worst, opportunity_cost_pct, current_rate_percentile, recommendation, recommendation_reason, spread_risk, brent_signal, quality_note, wait_insight` | Simulation/reporting endpoint; no dedicated response model. |
| `GET` | `/api/engine/risk/garch` | Yes | None explicit | Query: `pairs='USD/NGN,EUR/NGN,GBP/NGN'`, `window_days=60` | `list[GarchRiskItem]` | GARCH-style risk snapshot. |
| `GET` | `/api/engine/signals/seasonality` | Yes | None explicit | None | `SeasonalityResponse { as_of, composite_score, composite_level, signals: SeasonalitySignal[] }` | Calendar/holiday-driven seasonality signal. |
| `GET` | `/api/engine/signals/news` | Yes | None explicit | None | `NewsSignalResponse { as_of, headline_count, avg_sentiment, risk_flag, top_topics, headlines: NewsHeadlineItem[] }` | News-driven FX sentiment signal. |
| `GET` | `/api/engine/signals/cbn-reserves` | Yes | None explicit | None | `ReservesSignalResponse { as_of, reserves_usd_bn, signal, risk_flag, message }` | CBN reserves signal. |
| `GET` | `/api/engine/signals/intervention` | Yes | None explicit | None | `InterventionSignalResponse { as_of, risk_score, risk_level, message, inputs }` | Composite intervention warning. |
| `POST` | `/api/engine/alerts` | Yes | None explicit | `RateAlertCreate { pair, target_rate, direction, rate_source='any', channels=['email', 'in_app'] }` | `RateAlertResponse { id, pair, target_rate, direction, rate_source, channels, is_active, is_triggered, triggered_at, triggered_rate, created_at }` | Creates a rate alert. |
| `GET` | `/api/engine/alerts` | Yes | None explicit | None | `list[RateAlertResponse]` | Lists alerts for the current user. |
| `DELETE` | `/api/engine/alerts/{alert_id}` | Yes | None explicit | Path param `alert_id` | `204 No Content` | Removes an alert. |
| `GET` | `/api/engine/notifications` | Yes | None explicit | None | `list[NotificationResponse] { id, type, title, body, is_read, created_at }` | Returns in-app notifications. |
| `PATCH` | `/api/engine/notifications/{notification_id}/read` | Yes | None explicit | Path param `notification_id` | `204 No Content` | Marks a notification read. |
| `POST` | `/api/engine/conversions` | Yes | None explicit | `ConversionLogCreate { base_currency, quote_currency, base_amount, rate_used, quote_amount?, source='manual', converted_at?, followed_recommendation?, notes? }` | Created `ConversionLog` ORM row with `pair`, currencies, amounts, rates, source, timestamps, and timing-loss fields | Logs a manual conversion and computes optimal-rate comparison. |
| `GET` | `/api/engine/analytics/lost-revenue` | Yes | None explicit | Query `period=30d|90d|all_time` | Raw dict with `user_id, period, total_base_converted, total_quote_received, total_optimal_quote, net_position_quote, avg_rate_used, avg_optimal_rate, total_lost_to_timing, recommendations_followed, recommendations_ignored, conversions[]`; no-data case adds `net_outcome='no_data'` | Timing-loss analytics. |
| `POST` | `/api/engine/reserves` | Yes | None explicit | `CbnReservesCreate { week_of, reserves_usd_bn }` | Raw dict `{ id, week_of, reserves_usd_bn }` | Manual reserve ingestion. |
| `GET` | `/api/engine/exposures/multi-currency` | Yes | None explicit | Query `reporting_currency='NGN'` | `MultiCurrencyExposureResponse { as_of, reporting_currency, total_open_in_reporting, currencies: MultiCurrencyExposureItem[] }` | Open-invoice exposure report. |
| `GET` | `/api/engine/reports/monthly-savings` | Yes | None explicit | Query `year?`, `month?` | `MonthlySavingsReport { user_id, year, month, total_base_converted, total_quote_received, total_optimal_quote, total_lost_to_timing, total_saved_vs_worst, net_position_quote, conversions: MonthlySavingsConversion[], share_token }` | Monthly savings report with share token. |
| `GET` | `/api/engine/reports/monthly-savings/pdf` | Yes | None explicit | Query `year?`, `month?` | `application/pdf` bytes | PDF export of the monthly savings report. |
| `GET` | `/api/engine/reports/monthly-savings/share/{token}` | No | None explicit | Path param `token` | `application/pdf` bytes | Public share link validated by HMAC token. |

### Teams
| Method | Path | Auth required | Rate limit | Request body / query | Response shape | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `POST` | `/api/teams/` | Yes | None explicit | `TeamCreate { name }` | `TeamResponse { id, name, owner_user_id, plan, created_at }` | Creates a team and owner membership. |
| `GET` | `/api/teams/` | Yes | None explicit | None | `list[TeamResponse]` | Lists teams the current user belongs to. |
| `GET` | `/api/teams/{team_id}/members` | Yes | None explicit | Path param `team_id` | `list[TeamMemberResponse] { id, team_id, user_id?, email, role, status, invited_at, joined_at }` | Lists team members. |
| `POST` | `/api/teams/{team_id}/members` | Yes | None explicit | `TeamMemberCreate { email, role='member' }` | `TeamMemberResponse` | Adds or invites a team member. |

### Integrations
| Method | Path | Auth required | Rate limit | Request body / query | Response shape | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `GET` | `/api/integrations/` | Yes | None explicit | None | `list[IntegrationRecord] { provider, name, description, status, connected_at, credential_hint }` | Returns catalog entries for `paystack`, `stripe`, `paypal`, and `interswitch`. |
| `POST` | `/api/integrations/connect` | Yes | None explicit | `IntegrationConnectRequest { provider, credential }` | `IntegrationRecord` | Marks a provider connection as `connected` and stores a masked credential hint. |

## 3. Data Models

| Table | Fields | Relationships | Constraints / indexes | Migrations / creation |
| --- | --- | --- | --- | --- |
| `users` (`Backend/app/models/auth.py`) | `id` string PK; `email` string; `password` string; `is_verified` bool default `False`; `created_at`, `updated_at`; `verification_code` int nullable; `verification_code_expires_at` datetime nullable; `company_name` string; `first_name`, `last_name`, `phone`, `country`, `business_type`, `time_zone`, `preferred_currency` nullable strings, with `preferred_currency` default `NGN` | Referenced by `invoices.user_id`, `rate_alerts.user_id`, `in_app_notifications.user_id`, `conversion_logs.user_id`, `teams.owner_user_id`, `team_members.user_id`, and logically `integration_connections.user_id` | `email` unique and indexed; `id` PK; `updated_at` on update | Created in `202603220000_initial_schema.py`; business-detail columns added in `202603250101_add_user_business_detail_columns.py`; startup also runs `_sync_user_columns()` to add missing nullable user columns if needed. |
| `invoices` (`Backend/app/models/invoice.py`) | `id` PK; `user_id` FK string; `invoice_number`; `client_name`; `client_email`; `client_company` nullable; `address` Text nullable; `country` nullable; `amount` float; `currency` default `USD`; `discount` float default `0`; `tax_rate` float default `0`; `issue_date`; `due_date`; `description` Text nullable; `payment_method` nullable; `payment_details` Text nullable; `account_name`, `bank_name`, `account_number` nullable; `status` default `draft`; `payment_link` nullable; `payment_reference` nullable; `payment_completed_at` nullable; `created_at`, `updated_at` | `Invoice.items` relationship to `invoice_items` with cascade `all, delete-orphan` | Unique constraint `uq_user_invoice_number` on `(user_id, invoice_number)`; index on `user_id`; index on `invoice_number`; index on `payment_reference` | Created in `202603220000_initial_schema.py`; invoice-number uniqueness adjusted in `202603220101_invoice_number_per_user.py`; payment fields added in `202603220102_add_invoice_payment_fields.py` and `202603220103_add_invoice_interswitch_payment_columns.py`. |
| `invoice_items` (`Backend/app/models/invoice.py`) | `id` PK; `invoice_id` FK; `description`; `quantity` float; `unit_price` float; `created_at` | Belongs to `invoices` via `Invoice.items` | Index on `invoice_id` | Created in `202603220000_initial_schema.py`. |
| `fx_rates` (`Backend/app/models/fx_rate.py`) | `id` UUID PK; `base_currency` String(3); `quote_currency` String(3); `rate` float; `observed_on` date; `source`; `is_synthetic` bool default `False`; `created_at`, `updated_at` | No declared FK relationships | Unique constraint on `(base_currency, quote_currency, observed_on)`; index `ix_fx_rates_pair_observed_on_desc` on pair/date desc | Created in `202603220000_initial_schema.py`. |
| `fx_candles` (`Backend/app/models/fx_candle.py`) | `id` UUID PK; `base_currency` String(3); `quote_currency` String(3); `interval` String(10); `timestamp` tz-aware datetime; `open_rate`, `high_rate`, `low_rate`, `close_rate` floats; `source`; `created_at`, `updated_at` | No declared FK relationships | Unique constraint on `(base_currency, quote_currency, interval, timestamp)`; index on pair/interval/timestamp desc | Created in `202603220000_initial_schema.py`. |
| `fx_rate_snapshots` (`Backend/app/models/fx_rate_snapshot.py`) | `id` UUID PK; `base_currency`, `quote_currency`; `rate`; `buying_rate` nullable; `selling_rate` nullable; `source`; `rate_type`; `recorded_at` tz-aware datetime; `is_stale` bool default `False`; `created_at` | No FK relationships | Index on `(base_currency, quote_currency, source, recorded_at)`; index on `recorded_at`; source and rate_type values are informal enums in code comments, not DB constraints | Created in `202604010001_phase1_engine_tables.py`. |
| `integration_connections` (`Backend/app/models/integration_connection.py`) | `id` PK; `user_id` string; `provider` string; `status` string default `connected`; `credential_hint` nullable; `connected_at` datetime default now; `updated_at` datetime default now on update | Logically belongs to a user, but the model does not declare an explicit FK to `users.id` | Unique constraint on `(user_id, provider)`; indexes on `id`, `user_id`, and `provider` | Created in `202604030001_phase2_integrations.py`. |
| `rate_alerts` (`Backend/app/models/rate_alert.py`) | `id` UUID PK; `user_id` FK; `pair`; `target_rate` float; `direction`; `rate_source` default `any`; `channels` string default `email`; `is_active` bool default `True`; `is_triggered` bool default `False`; `triggered_at` nullable; `triggered_rate` nullable; `expires_at` nullable; `created_at`, `updated_at` | `user_id` -> `users.id` | Indexes on `(user_id, is_active)` and `(pair, is_active)` | Created in `202604010001_phase1_engine_tables.py`. |
| `in_app_notifications` (`Backend/app/models/rate_alert.py`) | `id` UUID PK; `user_id` FK; `type`; `title`; `body`; `is_read` bool default `False`; `created_at` | `user_id` -> `users.id` | Index on `(user_id, is_read)` | Created in `202604010001_phase1_engine_tables.py`. |
| `news_headlines` (`Backend/app/models/news_headline.py`) | `id` UUID PK; `title`; `source`; `url` nullable; `published_at` tz-aware datetime; `is_flagged` bool default `False`; `sentiment_score` nullable float; `created_at` | No FK relationships | Indexes on `published_at` and `is_flagged` | Created in `202604010001_phase1_engine_tables.py`. |
| `brent_crude` (`Backend/app/models/brent_crude.py`) | `id` UUID PK; `price_usd` float; `weekly_change_pct` nullable float; `source` default `alpha_vantage`; `recorded_at` tz-aware datetime; `created_at` | No FK relationships | Index on `recorded_at` | Created in `202604010001_phase1_engine_tables.py`. |
| `cbn_reserves` (`Backend/app/models/cbn_reserves.py`) | `id` UUID PK; `reserves_usd_bn` float; `week_of` tz-aware datetime; `source` default `cbn_website`; `created_at` | No FK relationships | Index on `week_of` | Created in `202604010001_phase1_engine_tables.py`. |
| `spread_snapshots` (`Backend/app/models/spread_snapshot.py`) | `id` UUID PK; `base_currency` default `USD`; `quote_currency` default `NGN`; `official_rate`; `parallel_rate`; `bdc_rate` nullable; `spread_ngn`; `spread_pct`; `spread_direction`; `risk_level`; `recorded_at` tz-aware datetime; `created_at` | No FK relationships | Index on `recorded_at` | Created in `202604010001_phase1_engine_tables.py`. |
| `conversion_logs` (`Backend/app/models/conversion_log.py`) | `id` UUID PK; `user_id` FK; `pair`; `base_currency` String(3); `quote_currency` String(3); `base_amount`; `quote_amount`; `rate_used`; `source` default `manual`; `converted_at` tz-aware datetime; `followed_recommendation` nullable bool; `optimal_rate_7d` nullable; `optimal_amount_7d` nullable; `lost_amount_7d` nullable; `notes` nullable Text; `created_at` | `user_id` -> `users.id` | Index on `(user_id, converted_at)` | Created in `202604010001_phase1_engine_tables.py`. |
| `teams` (`Backend/app/models/team.py`) | `id` PK; `name`; `owner_user_id` FK; `plan` default `company`; `created_at`; `updated_at` | `owner_user_id` -> `users.id`; `Team.members` relationship to `team_members`; `Team.owner` relationship to `users` | Indexes on `id` and `owner_user_id` | Created in `202604020001_phase2_teams.py`. |
| `team_members` (`Backend/app/models/team.py`) | `id` PK; `team_id` FK; `user_id` nullable FK; `email`; `role` default `member`; `status` default `invited`; `invited_at`; `joined_at` nullable | `team_id` -> `teams.id`; `user_id` -> `users.id` when present; `TeamMember.team` and `TeamMember.user` relationships | Unique constraints on `(team_id, user_id)` and `(team_id, email)`; indexes on `id`, `team_id`, `user_id`, and `email` | Created in `202604020001_phase2_teams.py`. |

Every current table has an Alembic migration. No table is migration-less. The ad hoc/runtime part is the startup path in `Backend/app/db/database.py`, which still runs `Base.metadata.create_all(bind=engine)` and then backfills nullable `users` columns if the live database is older than the ORM.

## 4. Core Business Logic

| Area | What the code does |
| --- | --- |
| FX recommendation engine | `Backend/app/services/recommendation.py` is hybrid. It reads the last 30 days of locally stored FX history via `ensure_history_window()`, falls back to 4h candles for a 7d window when there are fewer than 7 points, and computes indicators such as `current_rate`, `avg_30_day`, `sma_7`, `sma_20`, `volatility_percent`, `change_7d_percent`, `change_30d_percent`, `rsi_14`, `range_position_percent`, `trend`, `period_min`, `period_max`, `is_near_high`, `is_near_low`, `is_overbought`, `is_oversold`, `data_source`, and `analytics_mode`. The deterministic fallback decision tree is explicit: same currency -> `convert_now`; insufficient data -> `wait`; oversold or near the low end of the range -> `convert_now`; overbought or near the high end -> `wait`; volatility above `2.0` -> `hedge`; absolute 7-day change below `0.3` -> `split_conversion`; otherwise `convert_now`. Confidence is then capped by data quality (`limited_data`, `provisional_data`, mixed/seeded/candle fallback). If Gemini or Anthropic is configured, the service asks the model for structured JSON with `action`, `confidence`, `risk_score`, `explanation`, `factors`, and `optimal_window`; if the provider call fails, returns invalid JSON, or trips a hard failure status, the service falls back to the rule result. The public output is `RecommendationResponse` with `status`, `history_quality`, `action`, `confidence`, `risk_score`, `explanation`, `factors`, `optimal_window`, `indicators`, point counts, `contains_synthetic`, `generated_at`, `base`, `quote`, and `amount`. |
| FX history persistence | FX data is persisted in three places: `FXRate` for daily rates, `FXCandle` for interval candles, and `FXRateSnapshot` for source snapshots such as official CBN, parallel market, Brent, and reserves. `Backend/app/services/fx.py` syncs live data from ExchangeRate API and Twelve Data, upserts rows dialect-safely, and preserves real data when synthetic fallback rows arrive later. If a live provider fails, the code logs a warning and returns whatever local history exists; same-currency requests return a synthetic 1.0 series; when no historical rows exist it can seed synthetic history from the latest live rate; and if nothing is available the endpoint wrappers raise `FXProviderError` and return `503`. The scheduled jobs in `Backend/app/jobs/fx_jobs.py` keep filling the tables in the background. |
| Invoice lifecycle | `Backend/app/models/invoice.py` and `Backend/app/services/invoice.py` implement a loose lifecycle rather than a strict finite-state machine. `status` defaults to `draft`; creating or updating an invoice with `status='sent'` persists the record and then sends the client/creator emails; `status='paid'` is set when the payment webhook sees `responseCode == '00'`; `status='cancelled'` and `status='overdue'` exist in schemas/UI but there is no dedicated backend transition path that sets them automatically; and the database accepts other status strings because the field is a free-form string, not an enum. `generate_payment_link()` refuses `paid` and `cancelled` invoices, returns an existing `payment_link` if one already exists, and otherwise calls Interswitch, persists `payment_link` and `payment_reference`, and returns the updated invoice. |
| Payment provider integration layer | `Backend/app/services/integration_service.py` advertises four providers in the catalog: `paystack`, `stripe`, `paypal`, and `interswitch`. `list_integrations()` returns all four entries for a user with `status` set to the stored connection state or `not_connected`; `connect_integration()` lowercases the provider key, rejects anything outside the catalog, stores a masked credential hint, and marks the record `connected`. That said, the only provider actually wired into invoice payment links and BVN verification is Interswitch. `Backend/app/services/interswitch.py` performs OAuth, generates bill-payment links against `/paymentgateway/api/v1/paybill`, converts amounts to minor units, stores the gateway response URL/reference in the invoice record, and verifies BVNs through `/api/v1/identity/bvn/{bvn}`. The frontend treats `hasConnectedIntegration()` as the readiness gate by checking whether any returned integration record has `status === 'connected'`. |
| Background jobs | `Backend/app/jobs/scheduler.py` registers `job_sync_exchange_rate_api` every 5 minutes, `job_scrape_cbn` daily at 13:00 UTC, `job_scrape_abokifx` every 30 minutes, `job_scrape_nairatoday` every 30 minutes, `job_compute_spread` every 30 minutes, `job_fetch_brent_crude` every hour, `job_ingest_news` every 15 minutes, `job_check_alerts` every 5 minutes, and `job_scrape_reserves` every Monday at 08:00 UTC. The FX backfill job uses `FX_HISTORY_BACKFILL_DAYS` and loops the NGN pairs `USD/NGN`, `GBP/NGN`, `EUR/NGN`, `CAD/NGN`, `AUD/NGN`, and `GHS/NGN`. Each job creates its own session, logs and swallows per-source failures, and closes cleanly. |

## 5. Auth & Identity

| Topic | Details |
| --- | --- |
| Backend auth flow | The backend uses JWT bearer authentication, not server sessions. `Backend/app/services/auth.py` signs tokens with `HS256`, a `SECRET_KEY` read from the environment or generated ephemerally in local dev, and expiry windows of 60 minutes for access tokens and 7 days for refresh tokens. Protected routes depend on `get_current_user()`, which reads the `Authorization: Bearer ...` header, decodes the token, verifies the user exists, and raises `401` for expired/invalid tokens or missing users. |
| Frontend auth flow | `frontend/src/lib/api/client.ts` reads `NEXT_PUBLIC_API_URL`, injects the bearer token from localStorage into requests, and on `401` clears auth state and redirects to `/login`. The frontend stores `access_token`, `refresh_token`, and `user` in localStorage, and `frontend/src/components/ProtectedRouteGate.tsx` guards the app shell client-side by checking the stored access token for protected route prefixes. This is a convenience layer, not authoritative security. |
| OTP flow state | OTP routes exist and work at the service layer (`register_user`, `verify_otp`, and `resend_otp`), but the flow is only partially enforced. `register_user()` generates and emails an OTP while also setting `is_verified=True` immediately; `login_user()` auto-verifies any unverified account it sees; and `verify_otp()` rejects an already verified user. The net effect is that OTP is implemented, but it is not a hard gate for first login in the current code. |
| BVN verification | BVN verification is implemented, not stubbed. The frontend page `frontend/src/app/currency-settings/page.tsx` calls `POST /api/invoices/verify-bvn`, which delegates to `InterswitchService.verify_bvn()` and hits Interswitch's identity API at `/api/v1/identity/bvn/{bvn}` with a bearer token. The page does not persist the BVN locally; it only toggles UI state on success. |

## 6. Frontend Structure

| Route | File | Backend endpoints used | Mock / placeholder status | Notes |
| --- | --- | --- | --- | --- |
| `/` | `frontend/src/app/page.tsx` | None | Static marketing content only | Hardcoded feature cards, FAQs, and sample invoice snippets; no backend calls. |
| `/login` | `frontend/src/app/login/page.tsx` | `POST /api/auth/login` | Real API only | Stores tokens and user data in localStorage, then routes to `/dashboard`. |
| `/signup` | `frontend/src/app/signup/page.tsx` | `POST /api/auth/register` | Real API only | Routes to `/verify-otp?email=...` after successful registration. |
| `/verify-otp` | `frontend/src/app/verify-otp/page.tsx` | `POST /api/auth/verify-otp`, `POST /api/auth/resend-otp` | Real API only | Uses the `email` query param and displays resend/verify states. |
| `/dashboard` | `frontend/src/app/dashboard/page.tsx` | `GET /api/engine/spread/current`, `GET /api/engine/signals/brent`, `GET /api/engine/sources/health`, `GET /api/fx/rates`, `GET /api/invoices/` via invoice editor helper | Mostly real API; no page-level mock data | Dashboard aggregates market and invoice summaries, and uses `frontend/src/lib/invoices/editor.ts` for invoice fetches. |
| `/invoice-generator` | `frontend/src/app/invoice-generator/page.tsx` | `GET /api/fx/rates`, `GET /api/fx/rates?date=...`, `GET /api/recommendation/{base}/{quote}`, `POST /api/invoices/` or `PUT /api/invoices/{id}` via `editor.ts` | Real API; draft state stored in `sessionStorage` | This is the main invoice drafting flow. |
| `/invoice-generator/review` | `frontend/src/app/invoice-generator/review/page.tsx` | `GET /api/invoices/{id}`, `GET /api/integrations`, `GET /api/fx/rates`, `GET /api/fx/rates?date=...`, `GET /api/recommendation/{base}/{quote}`, `POST /api/invoices/{id}/payment-link` | Real API | The payment-link button is gated by `hasConnectedIntegration()`. |
| `/fx-analytics` | `frontend/src/app/fx-analytics/page.tsx` | `GET /api/fx/candles`, `GET /api/recommendation/{base}/{quote}`, `GET /api/engine/exposures/multi-currency`, `GET /api/engine/reports/monthly-savings`, `GET /api/engine/alerts`, `POST /api/engine/alerts`, `DELETE /api/engine/alerts/{id}`, plus engine spread/brent/source hooks | Real API | Uses `API_CONFIG.BASE_URL` directly for the monthly-savings PDF link. |
| `/fx-analytics/deep` | `frontend/src/app/fx-analytics/deep/page.tsx` | `GET /api/fx/rates`, `GET /api/fx/rates?date=...`, `GET /api/fx/candles`, `GET /api/recommendation/{base}/{quote}`, `POST /api/engine/simulator`, `GET /api/engine/spread/current`, `GET /api/engine/signals/brent`, `GET /api/engine/risk/garch`, `GET /api/engine/signals/seasonality`, `GET /api/engine/signals/news`, `GET /api/engine/signals/cbn-reserves`, `GET /api/engine/signals/intervention`, `GET /api/engine/alerts`, `POST /api/engine/alerts`, `DELETE /api/engine/alerts/{id}` | Real API | This is the deepest analytics route and the one used by `/convert`. |
| `/settings` | `frontend/src/app/settings/page.tsx` | `GET /api/auth/profile`, `PUT /api/auth/profile`, `GET /api/integrations`, `GET /api/engine/notifications`, `PATCH /api/engine/notifications/{id}/read` | Mix of real API and localStorage | Bank details are localStorage-only via `frontend/src/lib/api/bank.ts`; query param parsing uses `section`, not `tab`. |
| `/currency-settings` | `frontend/src/app/currency-settings/page.tsx` | `POST /api/invoices/verify-bvn` | Mostly static UI; one real API call | The rest of the form is not persisted anywhere in the backend. |
| `/wallet` | `frontend/src/app/wallet/page.tsx` | None | Redirect only | Redirects to `/invoice-generator`; there is no standalone wallet page. |
| `/transactions` | `frontend/src/app/transactions/page.tsx` | None | Redirect only | Redirects to `/dashboard`; there is no standalone transactions page. |
| `/convert` | `frontend/src/app/convert/page.tsx` | None | Redirect only | Redirects to `/fx-analytics/deep`. |
| App shell | `frontend/src/app/layout.tsx`, `frontend/src/components/ConditionalNavbar.tsx`, `frontend/src/components/ProtectedRouteGate.tsx`, `frontend/src/components/ErrorBoundary.tsx` | Indirectly all auth and feature routes | Real app shell | Uses Plus Jakarta Sans and Space Grotesk, hides navbar on `/`, and wraps the app in the route gate and error boundary. |

| Helper module / component | Behavior | Mock / placeholder status | Notes |
| --- | --- | --- | --- |
| `frontend/src/lib/api/fx.ts` | Calls `/api/fx/rates`, `/api/fx/history`, and `/api/fx/candles`; falls back to generated mock FX data when a fetch fails | Real API with mock fallback | This can hide backend outages. |
| `frontend/src/lib/api/invoices.ts` | Calls `/invoices`, `/invoices/{id}`, `POST /invoices`, `PATCH /invoices/{id}`, and `DELETE /invoices/{id}`; validates with Zod | Real API with mock fallback | The helper does not match the backend, which exposes `/api/invoices/` and `PUT /api/invoices/{id}`. |
| `frontend/src/lib/api/wallet.ts` | Calls `/wallets/{walletId}`, `/wallets`, `/wallets/{walletId}/summary`, and `/wallets/{walletId}/convert` | Mock fallback only for single-wallet fetch | The backend has no matching wallet routes, so this is currently `NOT IMPLEMENTED`. |
| `frontend/src/lib/api/transactions.ts` | Calls `/wallets/{walletId}/transactions`, `/transactions/{transactionId}`, `/wallets/{walletId}/transactions`, `/transactions/{transactionId}/cancel`, and `/wallets/{walletId}/transactions/export` | List fetch has mock fallback; other operations are real calls | The backend has no matching transaction routes, so this is currently `NOT IMPLEMENTED`. |
| `frontend/src/lib/api/notifications.ts` | Builds notification objects from live recommendation responses plus two hardcoded system notifications | Client-generated, not server-backed | No page currently consumes this helper; settings uses engine notifications instead. |
| `frontend/src/lib/api/bank.ts` | Reads and writes bank details in localStorage only | Local-only | There is no backend persistence path for these values. |
| `frontend/src/components/invoices/InvoiceForm/InvoiceForm.tsx` | Uses `useCreateInvoice()` and the invoice API helper | Real API, but unused | No route in `frontend/src/app` currently mounts it. |
| `frontend/src/components/invoices/InvoiceTable/InvoiceTable.tsx`, `frontend/src/components/fx/RecommendationPanel/RecommendationPanel.tsx`, `frontend/src/components/fx/BestRateComparison/BestRateComparison.tsx`, `frontend/src/components/fx/SavingsEstimator/SavingsEstimator.tsx`, `frontend/src/components/currency/FXRateDisplay/FXRateDisplay.tsx`, `frontend/src/components/currency/CurrencySelector/CurrencySelector.tsx`, `frontend/src/components/currency/CurrencyBalanceCard/CurrencyBalanceCard.tsx`, `frontend/src/components/fx/FXVolatilityMeter/FXVolatilityMeter.tsx`, `frontend/src/components/fx/RiskScoreBadge/RiskScoreBadge.tsx` | Present as reusable UI modules | Unmounted / not routed | They exist in the component tree, but no route under `frontend/src/app` references them directly in the current codebase snapshot. |

## 7. Environment & Config

| Variable | Configures | Required? | Safe local fallback / behavior |
| --- | --- | --- | --- |
| `LOG_LEVEL` | Backend logging verbosity in `Backend/app/main.py` | No | Defaults to `INFO`. |
| `DATABASE_URL` | SQLAlchemy database URL in `Backend/app/db/database.py` | No | Defaults to `sqlite:///./test.db`; Postgres URLs are normalized and driver-checked before use. |
| `SECRET_KEY` | JWT signing and HMAC share-token generation | No for local dev, yes for production hygiene | If missing, `Backend/app/services/auth.py` generates an ephemeral local-dev key and warns; this means tokens and share links are not stable across restarts. |
| `FRONTEND_URL` | CORS allow-list and invoice redirect base | No | Adds an origin to the allow-list and is used as the first redirect base for invoice review links if present. |
| `FRONTEND_BASE_URL` | Invoice redirect base | No | Used only in the invoice redirect fallback chain. |
| `NEXT_PUBLIC_APP_URL` | Invoice redirect base | No | Used only in the invoice redirect fallback chain. |
| `NEXT_PUBLIC_API_URL` | Frontend API base URL in `frontend/src/lib/env.ts` | Yes | `frontend/src/lib/env.ts` throws immediately if it is missing. |
| `EXCHANGE_RATE_API_KEY` | ExchangeRate API sync in `Backend/app/services/fx.py` | No, but required for live provider sync | Without it, historical sync can fail and the code falls back to stored data if available. |
| `EXCHANGE_RATE_API_BASE_URL` | ExchangeRate API base URL | No | Defaults to `https://v6.exchangerate-api.com/v6`. |
| `TWELVE_DATA_API_KEY` | Twelve Data candle sync | No, but required for live candles | Without it, candle sync can fail and the code falls back to stored data if available. |
| `TWELVE_DATA_BASE_URL` | Twelve Data base URL | No | Defaults to `https://api.twelvedata.com`. |
| `FX_HISTORY_SEED_DAYS` | Seed window for synthetic FX history | No | Defaults to `30` and is coerced to at least `30`. |
| `ABOKIFX_AUTH_TOKEN` | AbokiFX scraper and source health | No, but required for AbokiFX ingestion | If missing, AbokiFX ingestion skips and source health reports it as not configured. |
| `ABOKIFX_API_BASE_URL` | AbokiFX scraper base URL | No | Defaults to `https://abokifx.com/api/v1`. |
| `CBN_SCRAPER_USER_AGENT` | CBN scraper request header | No | Defaults to `Mozilla/5.0 FXGuard/1.0`. |
| `CBN_RESERVES_SOURCE_URL` | CBN reserves scraper source URL | No, but required to ingest reserves | If missing, the scrape job skips and returns `0`. |
| `ALPHA_VANTAGE_API_KEY` | Brent crude fetcher | No, but required for live Brent data | If missing, Brent fetch returns `None`. |
| `RECOMMENDATION_AI_PROVIDER` | Recommendation engine provider selection | No | If unset, the code auto-selects Gemini or Anthropic based on available keys. |
| `GEMINI_API_KEY` | Gemini recommendation requests | No, but required if Gemini is selected | Without it, the engine falls back to rule-based output. |
| `GEMINI_MODEL` | Gemini model name | No | Defaults to `gemini-2.5-flash-lite`. |
| `ANTHROPIC_API_KEY` | Anthropic recommendation requests | No, but required if Anthropic is selected | Without it, the engine falls back to rule-based output. |
| `ANTHROPIC_MODEL` | Anthropic model name | No | Defaults to `claude-3-5-sonnet-latest`. |
| `INTERSWITCH_BASE_URL` | Interswitch API base | No | Defaults to the QA base URL and normalizes sandbox URLs to QA. |
| `INTERSWITCH_AUTH_BASE_URL` | Interswitch OAuth base | No | Defaults to the Interswitch base URL. |
| `INTERSWITCH_CLIENT_ID` | Interswitch OAuth client ID | Yes for payment-link and BVN flows | Missing values raise a runtime error in the Interswitch service. |
| `INTERSWITCH_CLIENT_SECRET` | Interswitch OAuth client secret | Yes for payment-link and BVN flows | Missing values raise a runtime error in the Interswitch service. |
| `INTERSWITCH_MERCHANT_CODE` | Interswitch paybill merchant code | Yes for payment-link flows | Missing values raise a runtime error in the Interswitch service. |
| `INTERSWITCH_PAYABLE_CODE` | Interswitch paybill payable code | Yes for payment-link flows | Missing values raise a runtime error in the Interswitch service. |
| `SMTP_SERVER` / `SMTP_HOST` | SMTP host in `Backend/app/utils/email_service.py` | No | Defaults to `smtp.gmail.com`. |
| `SMTP_PORT` | SMTP port | No | Defaults to `587`. |
| `SMTP_TIMEOUT_SECONDS` | SMTP timeout | No | Defaults to `3.0` and is capped at `3.0` for fast failure. |
| `SMTP_USE_TLS` | SMTP TLS toggle | No | Defaults to truthy / enabled. |
| `SMTP_USE_SSL` | SMTP SSL toggle | No | Defaults to port `465` when unset. |
| `SMTP_USERNAME` / `SMTP_USER` / `GMAIL_USER` / `GMAIL_ADDRESS` | SMTP username | No | If missing, email sending skips entirely. |
| `SMTP_PASSWORD` / `GMAIL_PASSWORD` | SMTP password | No | If missing, email sending skips entirely. |
| `EMAIL_FROM_ADDRESS` | Sender address | No | Defaults to the SMTP username if available. |
| `FX_HISTORY_BACKFILL_DAYS` | FX backfill window for `job_sync_exchange_rate_api` | No | Defaults to `30`, with a minimum of `1`. |

## 8. Known Gaps

| File / area | Gap | Impact |
| --- | --- | --- |
| `Backend/app/services/auth.py` and `Backend/app/api/endpoints/auth.py` | `register_user()` auto-verifies the new account, and `login_user()` auto-verifies any still-unverified user; OTP routes exist, but the OTP is not a hard gate | Identity verification is softer than the endpoint set implies. |
| `Backend/app/main.py` | `validate_required_environment()` is intentionally empty | Misconfigured required env vars are not caught on startup. |
| `Backend/app/services/integration_service.py` and `Backend/app/services/interswitch.py` | Only Interswitch is wired into real payment-link and BVN flows; Paystack, Stripe, and PayPal are catalog entries only | The UI suggests broader payment support than the backend actually has. |
| `Backend/app/utils/email_service.py` | Password-reset links are hardcoded to `https://fxguard.app/reset-password?token=...` | Environment-specific production URL is baked into code. |
| `Backend/app/services/alert_service.py` | `whatsapp` notifications are stubbed as log-only | The channel exists in payloads but does not deliver a real WhatsApp notification. |
| `Backend/app/services/seasonality_service.py`, `Backend/app/services/spread_service.py`, `Backend/app/jobs/scheduler.py` | Holiday lists, spread thresholds, and cron schedules are hardcoded | Operational tuning requires code changes instead of config changes. |
| `Backend/app/models/integration_connection.py` | `user_id` is not declared as a foreign key to `users.id` | Referential integrity is weaker than the rest of the schema. |
| `Backend/app/services/news_service.py` | Broad per-feed `except Exception` handling and per-item date parse `pass` swallow some parsing issues | Feed problems can be hidden from operators. |
| `Backend/app/services/brent_crude_service.py` | Returns `None` when `ALPHA_VANTAGE_API_KEY` is absent and has no fallback provider | Brent signal can remain empty/neutral if the key is missing. |
| `Backend/app/services/cbn_reserves_scraper.py` | Skips ingestion when `CBN_RESERVES_SOURCE_URL` is missing | Reserves signal depends on external configuration. |
| `frontend/src/lib/api/wallet.ts` and `frontend/src/lib/api/transactions.ts` | They call backend routes that do not exist anywhere under `Backend/app/api/endpoints` | Wallet and transactions functionality is `NOT IMPLEMENTED` on the backend. |
| `frontend/src/lib/api/invoices.ts` | It calls `/invoices` and `PATCH /invoices/{id}`, but the backend exposes `/api/invoices/` and `PUT /api/invoices/{id}` | This helper is currently incompatible with the backend route surface. |
| `frontend/src/components/layout/Navbar/Navbar.tsx` and `frontend/src/app/settings/page.tsx` | Navbar uses `/settings?tab=notifications`, but settings reads `section` | The notifications shortcut does not land on the intended tab. |
| `frontend/src/app/wallet/page.tsx`, `frontend/src/app/transactions/page.tsx`, `frontend/src/app/convert/page.tsx` | These routes only redirect | The route shells exist, but the pages themselves are not implemented as standalone experiences. |
| `frontend/src/components/invoices/InvoiceForm/InvoiceForm.tsx` and related reusable modules | Present in the repo but not mounted by any route under `frontend/src/app` | They are effectively dead UI surface unless another route imports them later. |
| `frontend/src/lib/api/notifications.ts` | Builds notifications from live recommendation responses plus two hardcoded system notices, but no page currently consumes it | It looks like a backend feature, but it is currently client-generated and unused. |

## 9. Test Coverage

| Domain | Test files | What is actually covered | What remains untested or thin |
| --- | --- | --- | --- |
| Auth service | `Backend/tests/test_auth_service.py` | OTP expiry handling, registration fallback when email delivery fails, login auto-verification, profile updates, duplicate-email rejection, trimming/preservation of profile fields | No full end-to-end auth flow with frontend token storage and protected route navigation. |
| Database initialization | `Backend/tests/test_database_initialize.py` | `initialize_database()` backfills missing nullable user columns, creates `fx_rates` and `fx_candles`, resolves Postgres URLs, prefers `psycopg` when available, and fails correctly when no Postgres driver exists | No migration/upgrade integration test across the whole Alembic chain. |
| Email service | `Backend/tests/test_email_service.py` | SMTP config wiring, SSL transport, timeout behavior, and the fast-skip path when credentials are missing | No provider-specific deliverability test. |
| FX endpoints and FX service | `Backend/tests/test_fx_endpoint.py`, `Backend/tests/test_fx_candles_endpoint.py`, `Backend/tests/test_fx_service.py`, `Backend/tests/test_fx_candles_service.py` | Rates/history/candles endpoint passthrough, same-currency behavior, seeded/synthetic preservation, history formatting, backfill-window usage, Brent crude storage, and CBN reserves ingestion | No tests for `fx_rate_snapshots` source health, fallback 503 wiring under all provider failures, or every supported quote-currency pair. |
| Interswitch integration | `Backend/tests/test_interswitch_service.py` | Payment-link contract generation against the paybill API | No BVN verification success/failure matrix beyond the service call shape. |
| Invoice service | `Backend/tests/test_invoice_service.py` | Draft vs sent vs paid flows, email side effects, payment-link persistence, and failure tolerance when email delivery fails | No webhook replay/idempotency tests and no cancellation/overdue transition tests. |
| News service | `Backend/tests/test_news_service.py` | FX relevance filtering, deduplication, and sentiment behavior when data is missing | No integration test against real RSS feeds. |
| Recommendation engine | `Backend/tests/test_recommendation_service.py`, `Backend/tests/test_recommendation_endpoint.py` | Indicator math, limited/provisional-data paths, same-currency handling, candle fallback, AI fallback behavior, Gemini/Anthropic provider selection, and response assembly | No live-model E2E test and no contract test for every possible AI payload edge case. |
| Simulator service | `Backend/tests/test_simulator_service.py` | Seeded-history handling, market vs snapshot basis selection, wait-insight generation, and rejection of unsupported snapshot pairs | No direct API route test in the same depth as the service-level coverage. |
| Frontend | None found under `frontend/` | No frontend test suite is present in this repository snapshot | All route/component behavior is currently untested from an automated perspective. |
