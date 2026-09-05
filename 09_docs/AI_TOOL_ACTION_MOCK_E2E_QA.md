# GARANG AI Tool / Action + Mock AI E2E QA

Date: 2026-09-05  
Status: **COMPLETE — Item 4**

## Scope

This document closes development item 4: **AI Tool / Action contract + Mock AI**.

The goal is to validate the complete Coach action flow without requiring a paid or live LLM provider. A future real LLM only needs to replace the provider adapter while preserving the GARANG contracts.

## What already existed before this pass

- `POST /v1/agent/actions` could create a pending action.
- `POST /v1/agent/actions/{id}/confirm` could mark an action confirmed/rejected.
- Per-user action ownership and idempotency infrastructure already existed.
- The frozen production data boundary was already `garang-state-v1` / schema v8.

## Gaps found

The previous implementation did **not** yet complete the full item-4 flow:

- No provider-neutral AI response contract.
- No strict per-tool argument validation.
- No Mock AI adapter that could drive Coach flows without an external LLM.
- Confirmation changed action status but did not execute the action against canonical GARANG state.
- No fail-closed handling for malformed/unauthorized provider tool output.
- No end-to-end regression test from Coach response → pending action → user confirmation → state mutation.

## Completed implementation

### Contracts

- AI contract: `garang-ai-v1`
- Tool contract: `garang-tools-v1`
- Allowed mutation tools:
  - `createPlan`
  - `updatePlan`
  - `saveMemory`
  - `deleteRecord`
  - `updateGoal`
- Unsupported tools and unsupported/invalid arguments are rejected before an action is created.

### Mock AI adapter

`backend/src/mock-ai.cjs` provides a deterministic provider adapter for development and regression testing.

The backend accepts dependency injection through `createService({ aiProvider })`, so a future LLM adapter can replace Mock AI without changing the data contract or action executor.

### Coach endpoint

`POST /v1/coach/respond`

- validates the GARANG AI request,
- calls the active AI adapter,
- validates provider output,
- converts valid tool calls into **pending** GARANG actions,
- never mutates user state before explicit confirmation,
- fails closed if the provider emits an unknown tool or invalid tool arguments.

### Confirmation / execution boundary

Confirmed actions now execute against canonical GARANG state:

- `createPlan` → `planner` entry with canonical `done` and `origin` fields
- `updatePlan` → updates only the requested planner record
- `saveMemory` → writes to `memory.entries` with confidence, importance, confirmation and timestamps
- `deleteRecord` → removes only the confirmed target record from an allowed record domain
- `updateGoal` → updates canonical `profile.goal`

Rejected actions do not mutate state.

### Reliability guards

- Existing per-user action isolation remains in place.
- Idempotency keys prevent duplicate AI actions from retried Coach requests.
- Provider failures return retryable `AI_PROVIDER_ERROR` without creating actions.
- Invalid provider tool output returns `AI_TOOL_CONTRACT_VIOLATION` without creating actions.
- Invalid direct action arguments return `INVALID_TOOL_ARGS` before persistence.

## Verification

The exact modified backend implementation was syntax-checked and executed locally before commit.

Backend core regression: **10 / 10 PASS**  
AI Tool / Action E2E: **11 / 11 PASS**  
Combined item-4 backend checks: **21 / 21 PASS**

E2E coverage includes:

- no-action Mock AI response,
- Coach → `createPlan` → pending → confirm → planner mutation,
- `updatePlan`,
- `saveMemory`,
- `deleteRecord`,
- `updateGoal`,
- rejection/no mutation,
- invalid tool arguments,
- invalid provider tool output,
- provider outage handling,
- idempotent retry behavior.

## Boundary after completion

Item 4 is complete at the **contract / Mock AI / backend E2E** level.

Not included in item 4 and intentionally still separate:

- connecting a real paid/open-source LLM provider,
- production deployment of the new Coach/action endpoints,
- real-device UI confirmation UX,
- live Firestore persistence adapter for these new action mutations.

Those can be implemented later without changing the frozen GARANG state contract or the new AI/tool contracts.
