# GARANG Commercialization Stage 1 Audit

Date: 2026-09-13
Baseline: `main` @ `1e619cdc844c5989580b9d804b12181297508085`
Baseline release gate: GARANG release gate #1066 — GREEN

## Objective

Move GARANG from a healthy development beta toward commercial readiness without sacrificing existing working capability.

Stage 1 does **not** redesign the product architecture, replace canonical data ownership, connect production secrets, enable live payment, migrate production data, or introduce paid external AI providers.

The goal is:

**Preserve the Golden Path + reduce friction + make behavior measurable + prepare commercial infrastructure boundaries.**

Canonical Golden Path to preserve:

`Sign up -> Onboarding -> First record -> Today -> Coach -> Daily Plan -> Execute -> Record -> Accumulation`

## Preservation Contract

Every Stage 1 implementation PR must preserve these product contracts unless a separate Founder-approved decision explicitly supersedes them.

1. Today remains a read-oriented orchestration surface and does not become a competing write owner.
2. Coach remains the judgment/reasoning owner for recommendation decisions.
3. `GarangDailyPlanV1` remains the canonical daily planning source for training, recovery and nutrition.
4. Planner remains the canonical plan detail/edit/execution surface.
5. Existing workout, nutrition, running and body record write paths remain valid.
6. Existing authenticated account isolation, recovery, export/delete, idempotency and action-confirmation boundaries remain intact.
7. Analytics instrumentation must be observational: failure to emit telemetry must never block a user action.
8. No production secret or provider credential may be shipped to browser code.
9. Existing mobile/WebKit interaction, no-overflow and Golden Path contracts remain release blockers.
10. No Stage 1 PR merges while its latest release gate is RED or UNKNOWN.

## Current Verified Baseline

### Product / Golden Path

- Current main unifies Coach, Home and Planner around the same three-track Daily Plan.
- Today has a single next-action ownership model rather than competing primary CTAs.
- Coach confirmed `createPlan` flows persist the canonical Daily Plan and continue to Planner.
- Existing automated coverage includes Golden Path, Today, Coach, Planner execution, authenticated app boot, persistence/recovery, privacy/security and mobile WebKit regression.

### Commercial runtime boundary

The current browser service configuration leaves these production integrations disconnected:

- Coach gateway
- Meal scan / vision gateway
- First-party analytics collector
- Payment checkout
- Payment entitlement

This is intentional development/fallback behavior and must not be represented as production-connected behavior.

### Backend boundary

The reference commercial API already defines useful production contracts including authentication-required user data access, per-user isolation, idempotency, rate limiting, export/delete, analytics ingestion, error ingestion and confirmed agent actions.

The default reference repository is still process-local `MemoryStore`, so it is not a durable production data layer.

## Stage 1 Scope

### A. Commercialization Gap Audit — THIS PR

Status: IN PROGRESS

Output:
- freeze the baseline and preservation contract
- separate Must / Should / Later work
- prevent visual polish or new feature work from hiding production blockers

No runtime behavior change.

### B. Analytics Contract & Instrumentation

Priority: P1

Goal: make the Golden Path measurable before adding more intelligence.

Minimum canonical events:

- `signup_completed`
- `onboarding_completed`
- `first_record_created`
- `today_viewed`
- `coach_opened`
- `coach_recommendation_shown`
- `daily_plan_applied`
- `planned_action_started`
- `planned_action_completed`
- `record_created`
- `accumulation_viewed`
- `day2_return`
- `day7_active`

Requirements:
- one versioned event contract
- no sensitive raw health/chat payloads in event properties
- no action may fail because analytics failed
- local/dev sink is valid while `analyticsEndpoint` is null
- tests verify event shape, consent boundary and non-blocking behavior

### C. Record Friction Reduction

Priority: P1

Goal: reduce time from Record entry to a valid saved record without replacing existing write paths.

Target improvements:
- recent-value reuse where reliable data already exists
- safe prefill for repeated workouts/meals where current product contracts allow it
- fewer unnecessary confirmations/fields on the happy path
- preserve edit/delete/recovery and account pinning behavior

Acceptance:
- workout/nutrition/running/body records remain supported
- existing persisted data schema remains compatible
- save failure never silently destroys the draft
- authenticated account-switch protections remain intact

### D. Coach Decision-First UX

Priority: P2

Goal: make Coach output read as a GARANG decision system rather than a generic chatbot while preserving full conversation capability.

Default hierarchy:

`Judgment -> Why -> Recommended action -> Apply / Continue`

Acceptance:
- conversation history remains available
- confirmed action boundary remains unchanged
- `createPlan` continues to write only through the canonical Daily Plan path
- users can understand what will change before applying an action

### E. Planner Execution UX

Priority: P2

Goal: make Planner optimize for acting on today's canonical plan instead of feeling like a separate plan-authoring product.

Acceptance:
- training / recovery / nutrition remain one coordinated Daily Plan
- existing edit behavior remains available
- user-edited or already-confirmed plans are not silently overwritten
- action completion writes remain owned by existing execution/record paths

### F. Today Simplification

Priority: P2

Goal: reinforce Today as the place that answers: **What should I do next?**

Target hierarchy:

1. current state / interpretation
2. one primary next action
3. compact three-track Daily Plan
4. factual accumulation
5. secondary explanation/details progressively disclosed

Acceptance:
- at most one visible primary next-action owner
- check-in ownership remains canonical
- Today does not create a new mutation path
- Coach routing and Planner routing remain canonical
- no horizontal clipping/overflow on target mobile widths

## Must / Should / Later

### MUST — before commercial production

1. Durable managed persistence and backup/restore policy for commercial API data.
2. Server-side Firebase ID token verification at the production API boundary.
3. Production HTTPS API deployment and environment separation.
4. Consented analytics + error monitoring with privacy-safe event contracts.
5. Payment entitlement enforcement before paid access is sold.
6. Privacy / terms / retention / health-disclaimer legal review.
7. Staging security, restore, account, load and end-to-end tests.
8. Physical target-device Golden Path validation before production release.

### SHOULD — Stage 1 product readiness

1. Golden Path analytics instrumentation.
2. Record friction reduction.
3. Coach decision-first presentation.
4. Planner execution-first presentation.
5. Today hierarchy simplification.
6. Activation funnel and retention baseline measurement.

### LATER — do not block Stage 1

1. Meal-photo vision provider.
2. Apple Health / Health Connect / wearable expansion.
3. Social feed, leaderboard or community surfaces.
4. Multiple Coach personas.
5. High-cost cinematic brand assets if they do not improve the core user loop.
6. Additional subscription tiers beyond a simple Free / Pro launch model.

## Release / Regression Gate for Every Stage 1 PR

Required before merge:

- existing unit/contract tests
- production build/runtime validation
- authenticated app boot
- Today action flow
- Coach confirmed plan flow
- canonical Daily Plan flow
- Planner execution flow
- Record write/persistence/recovery
- Golden Path integration and complete journey
- privacy/security boundaries
- Firebase rules checks
- mobile WebKit interaction and layout boundary
- no critical runtime errors

Verdict rules:

- **GREEN**: acceptance + preservation contract verified; mergeable.
- **YELLOW**: implementation works but non-blocking verification remains; do not claim Stage 1 item complete.
- **RED**: Golden Path, persistence, security or critical UX regression; do not merge.

## Next Execution Order

1. Merge this audit only after the existing release gate remains GREEN.
2. Implement Analytics Contract & Instrumentation as the first behavior-changing Stage 1 PR.
3. Then Record friction reduction.
4. Then Coach decision-first UX.
5. Then Planner execution UX.
6. Finish with Today simplification after upstream flows are stable.

Each item is a separate small PR. Stage 1 is one program, not one large code change.
