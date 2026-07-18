---
name: fxguard-memory
description: Preserve and recover FXGuard project memory across sessions. Use when working in the FXGuard repository and you need continuity on architecture, active product scope, past engineering decisions, design patterns, known pitfalls, or update discipline so new work does not repeat earlier mistakes or re-discover settled choices.
---

# FXGuard Memory

## Overview

Use this skill to rebuild working context quickly before planning, implementing, reviewing, or refactoring FXGuard. Read only the smallest set of references needed for the task, then update the memory after any meaningful change.

## Quick Recovery

1. Read `references/current-state.md` first for the current product snapshot, trusted docs, and active workstreams.
2. Read `references/engineering-patterns.md` before touching shared architecture, frontend data flows, backend service boundaries, database initialization, or API typing.
3. Read `references/decision-log.md` when the task could reopen a previously settled tradeoff.
4. Read `references/pitfalls-and-guardrails.md` before auth, FX data, invoices, dates/timezones, schema, SSR, or provider integration changes.
5. Read `references/update-routine.md` before wrapping up so the memory stays current.

## Repo Sources Of Truth

- Prefer current code over stale prose.
- Treat these repo docs as high-signal starting points:
  - `README.md` for product positioning, stack, and major engineering choices.
  - `ENGINE_OVERVIEW.md` for the NGN intelligence engine, source model, and phase framing.
  - `UNDERSTANDING.md` for recent implementation history and fixes.
  - `Backend/AUTH_LOGIN_ISSUE_NOTES.md` for a concrete example of debugging, schema drift, and local-environment lessons.
- If docs conflict, trust the freshest code and update these references to explain the divergence.

## Working Style

- Preserve established patterns before inventing new ones.
- Keep frontend network logic in shared API modules and consume it through hooks and pages instead of scattering raw requests.
- Keep backend route files thin, business logic in services, schemas explicit, and persistence changes deliberate.
- Treat external market providers as ingestion sources, not the product's source of truth.
- Record meaningful decisions, regressions, and migration caveats immediately after resolving them.

## Update Memory After Real Work

After any substantial task, update one or more references if you learned something durable:

- `references/current-state.md` for new product capabilities or source-of-truth changes.
- `references/engineering-patterns.md` for new conventions or folder responsibilities.
- `references/decision-log.md` for new tradeoffs and why they were chosen.
- `references/pitfalls-and-guardrails.md` for bugs, regressions, and "do not repeat this" notes.
- `references/update-routine.md` only when the maintenance process itself changes.

## Minimum Closeout Checklist

- Capture what changed.
- Capture why it changed.
- Capture what should not be repeated.
- Capture any verification or remaining caveat.
