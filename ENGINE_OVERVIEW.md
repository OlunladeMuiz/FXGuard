# FXGuard Engine Overview

This document explains the FXGuard Engine end‑to‑end: what it does, how data flows, how intelligence is produced, and how to position it in investor conversations.

## 1. Executive Summary

FXGuard is a decision intelligence engine for the Nigerian FX market. It does not just show “a rate.” It monitors the three NGN rate layers that matter (official NAFEM, BDC, and parallel), measures the spread between them, and converts those signals into actionable guidance (risk levels, alerts, simulator output, savings reports, and operational dashboards). The result is a defensible moat: a multi‑source, multi‑signal view of NGN that most competitors do not have.

## 2. Core Moat: The Three NGN Layers

Nigeria’s FX market has distinct layers:
- NAFEM (CBN official rate): legal benchmark for banks and regulated flows.
- BDC rate: what SMEs and individuals actually pay in the street.
- Parallel market: the real market pressure signal.

FXGuard ingests each layer, computes the spread, and uses it as a predictive risk signal. Widening spread indicates stress and likely intervention. Converging spread indicates stabilization.

## 3. Data Sources & Ingestion

The engine ingests multiple sources to avoid single‑point failure and to allow cross‑validation:

Rates:
- ExchangeRate API: baseline multi‑currency rates.
- CBN (NAFEM): daily official market reference.
- AbokiFX API (parallel): supported parallel market source (if token is provided).
- Nairatoday (parallel + BDC): public HTML fallback.

Macro:
- Alpha Vantage (Brent crude): crude oil price signal.
- CBN Reserves: automated ingestion via configurable source URL (weekly).

News:
- Nairametrics, BusinessDay, CBN RSS feeds.

Automation:
- APScheduler runs scrapers, news ingestion, and alert checks on schedules.

## 4. Data Models

Key models are designed to support multi‑source comparisons and analytics:
- FXRateSnapshot: multiple rates per day per source.
- SpreadSnapshot: official vs parallel spread and risk level.
- BrentCrude: daily crude price and signal.
- CbnReserves: reserves data for intervention capacity.
- NewsHeadline: flagged financial news with sentiment.
- RateAlert + InAppNotification: user alerts and in‑app messages.
- ConversionLog: conversion history for savings and analytics.
- Teams + TeamMembers: company plans and multi‑user access.

## 5. Intelligence Engines

### 5.1 Spread Engine (Core Signal)
- Computes official vs parallel spread, trend direction, and risk level (LOW → CRITICAL).
- Supplies risk message to UI and alerting.

### 5.2 GARCH Volatility + Risk Per Pair
- Uses a GARCH(1,1) model on log returns for USD/NGN, EUR/NGN, GBP/NGN.
- Produces volatility percentage and risk band.
- “Risk per pair” is derived from the volatility score.

### 5.3 Seasonality + Holiday Signals
- Encodes month‑end, quarter‑end, December remittances, and Nigerian public holidays.
- Produces a composite seasonality risk score and clear textual guidance.

### 5.4 News Sentiment Engine (Nairametrics + BusinessDay + CBN)
- RSS headlines are flagged with NGN‑relevant keywords.
- Simple keyword‑weighted sentiment score (–1 to +1).
- Topic detection flags “policy,” “intervention,” “reserves,” “oil,” “inflation.”
- Outputs a risk flag if sentiment and topics signal intervention risk.

### 5.5 CBN Reserves Signal
- Uses weekly reserves data via a configurable ingestion feed.
- Flags weakening reserve levels that historically correlate with FX pressure.

### 5.6 Intervention Early Warning
Composite score using:
- Spread risk level
- Reserves signal
- News sentiment
- Brent oil signal
- Seasonality score

This produces a single “intervention risk” level (LOW/MEDIUM/HIGH) with context.

## 6. Simulator & Analytics

### 6.1 Conversion Simulator
User asks: “What if I convert $X today?”
Engine responds:
- Today’s rate vs best/worst in the last 30 days
- Opportunity cost
- Timing recommendation

### 6.2 Monthly Savings Report
For each user:
- Total converted
- Optimal conversion value
- Total lost to timing
- Saved vs worst
Output is available as JSON and as a shareable PDF.

### 6.3 Lost Revenue Analytics
Aggregates historical conversions, compares to optimal timing, and computes the “timing tax” the user paid.

## 7. Multi‑Currency Exposure

The engine aggregates open invoices and converts exposure into a reporting currency (default NGN). This allows “all exposure in one place.”

## 8. Alerts & Notifications

Users can set rate alerts, choose direction (above/below), and receive in‑app notifications (email ready). Alerts are checked on a scheduler, and triggered alerts generate in‑app messages.

## 9. Integrations (Phase 2)

Integration connections are stored and tracked for:
- Paystack
- Stripe
- PayPal
- Interswitch

These connections are stored server‑side (no live provider API calls yet) but allow dashboard flows and settings UX to behave like real integrations.

## 10. Team Accounts

Team and member models are live with endpoints for:
- Create team
- List teams
- Add members

This supports company plans and multi‑user usage patterns.

## 11. API Surface (Highlights)

Engine endpoints now include:
- `/engine/spread/current`
- `/engine/signals/brent`
- `/engine/signals/seasonality`
- `/engine/signals/news`
- `/engine/signals/cbn-reserves`
- `/engine/signals/intervention`
- `/engine/risk/garch`
- `/engine/simulator`
- `/engine/alerts`
- `/engine/notifications`
- `/engine/reports/monthly-savings`
- `/engine/reports/monthly-savings/pdf`
- `/engine/exposures/multi-currency`

## 12. Investor Pitch Narrative

FXGuard is not a rate checker. It is a risk engine:
- Unique signal: the NAFEM vs BDC/parallel spread.
- Differentiated data stack: multiple NGN sources + crude + reserves + news.
- Measurable ROI: monthly savings reports quantify value.
- Defensible moat: once the dataset grows, competitors cannot replicate the behavioral and historical signals.

## 13. Phase 2 Caveats (Truthful Positioning)

These are implemented with pragmatic heuristics and can be upgraded later:
- GARCH volatility uses fixed parameters (good for signal, not a full quant finance stack).
- News sentiment is keyword‑based (NLP upgrade path exists).
- CBN reserves ingestion is source‑driven and depends on a configured feed URL.
- Integrations are simulated (backend stores connection state only).
- PDF reports are single‑page summaries (can be expanded to branded multi‑page exports).

## 14. Next Up (Phase 3)

Strategic upgrades that deepen the moat:
- Full NLP sentiment pipeline and model‑based topic detection.
- Real reserves scraper and archival historic reserves series.
- Live integrations with Paystack, Stripe, PayPal.
- Behavioral ML personalization on conversion choices.
- Branded multi‑page reports with charts.

---

## Appendix A: Data Formats & Terms (Quick Reference)

This section clarifies common data formats and terms used across the engine.

### ISO 8601 Date/Time (ISO String)
An ISO 8601 date/time string is a standard, unambiguous way to represent time.
Example: `2026-04-03T09:21:34.123Z`

Key points:
- The `T` separates date and time.
- The trailing `Z` means the time is in UTC (Coordinated Universal Time).
- This format is stable across systems and is used for API payloads, logs, and database timestamps.

Why we use it:
- It avoids timezone confusion.
- It is universally parseable by JavaScript and backend services.

### UTC vs Local Time
- UTC is a global reference time used in data storage and APIs.
- Local time (e.g., Africa/Lagos) is only for display.

### “Observed On” vs “Recorded At”
- **Observed On**: The date the market rate was observed (e.g., close of day).
- **Recorded At**: The timestamp when the data was stored or ingested.

---

If you want, I can convert this into a formal investor one‑pager or a data‑room‑ready technical appendix.
