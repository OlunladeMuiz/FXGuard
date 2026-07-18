# Update Routine

## When To Update The Memory

- Update these files after any task that changes architecture, adds a new pattern, fixes a tricky bug, changes a source of truth, or teaches a lesson you do not want to relearn.
- Skip tiny cosmetic-only edits unless they expose a durable convention or pitfall.

## How To Update It

1. Rebuild the change from code and tests, not memory alone.
2. Choose the narrowest file that matches the lesson:
   - `current-state.md` for capability and project-scope changes.
   - `engineering-patterns.md` for conventions, folder responsibilities, or architectural rules.
   - `decision-log.md` for tradeoffs and why they were accepted.
   - `pitfalls-and-guardrails.md` for regressions, hidden traps, and debugging lessons.
3. Write concise entries that explain the context, the decision or problem, and the lasting implication.
4. If a previous note is now wrong, correct it instead of leaving contradictory history.
5. Record how the change was verified or what caveat still remains.

## Suggested Entry Templates

### Decision Entry

```md
## YYYY-MM-DD: Short Decision Title

- Context:
- Decision:
- Why:
- Consequence:
- Verification:
```

### Pitfall Entry

```md
## YYYY-MM-DD: Short Pitfall Title

- Symptom:
- Root cause:
- Guardrail:
- Verification:
```

### Current State Update

```md
- Added:
- Changed:
- Still in flight:
- Files to inspect:
```

## Review Habit

- Before starting substantial work, read the minimum relevant references again.
- Before finishing substantial work, leave the memory in a better state than you found it.
