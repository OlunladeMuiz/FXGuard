# Workspace Behavioral Rules & Protocols

## 1. Plan-Then-Code Protocol (Two-Phase Execution)

### Phase 1: Planning (No Code Changes)
Before making any source code modifications or running commands that alter the workspace state:
* **Restate the Task:** Outline the goal and understand the requirements.
* **Function Breakdown:** Document every function to be touched, detailing its inputs, outputs, and connections.
* **Data Structure Audit:** State the exact schema and contents of the data structures involved, citing the actual files and types in the codebase (no inferred property names or placeholders).
* **Failure Modes & Edge Cases:** List potential runtime failures, edge cases, and recovery scenarios.
* **Pseudocode:** Write the logic out in pseudocode for complex functions.
* **Stop & Wait:** Pause and wait for explicit user approval ("go ahead") before moving to execution.

### Phase 2: Implementation (One Function at a Time)
* **Single-Function Scoping:** Focus on one function at a time. Do not batch modifications across multiple files or functions into a single turn.
* **Show Real Diffs:** Present the actual `git diff` for the function under review. Do not replace it with summaries or status tables.
* **Line-by-Line Rationale:** Explain any non-obvious code paths, design choices, or dependencies.
* **Incremental Verification:** Pause after completing each function to verify correctness and answer questions before starting the next one.

---

## 2. Workspace Management & Verification

### Rule 3: Verification of Completed Tasks
* Never mark a task as "Completed" (`[x]`) in `task.md` just because the code has been written.
* A task is only considered done after the changes have been visually/logically demonstrated in the conversation and explicitly approved by the user.

### Rule 4: Audit on Restoration/Re-implementation
* If code is restored or re-implemented (due to a revert, merge conflict, or switching branches), perform a validation check on every piece.
* Explicitly diff the restored version against the previously-approved code to confirm that no sub-features, copy changes, or bug fixes were dropped in the reconstruction.

### Rule 5: Safety Guardrails for Git Operations
* Any git command that can discard uncommitted local changes (`git checkout -- <file>`, `git reset --hard`, `git clean`, `git stash` without listing first) is treated as a high-risk operation.
* You must obtain explicit user permission before executing these commands.
* Always run `git status` and `git diff --stat` first to show what changes would be lost.

### Rule 6: Database Migrations
* Generating an Alembic migration file is not sufficient to complete a database task.
* All generated migrations must be successfully applied (`alembic upgrade head`) and verified against the actual database schema before marking the task complete.
