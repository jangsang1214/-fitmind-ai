# GARANG Real LLM Gateway v1

## Objective

Connect a real language model to GARANG without transferring decision or mutation ownership to the model.

Canonical flow:

`Authenticated user state -> normalized recovery/check-in state -> Memory Intelligence -> State Intelligence -> recent Outcome Intelligence v1 + longitudinal Outcome Learning v2 -> Decision Intelligence -> minimal server context -> LLM explanation -> existing GARANG action surfaces -> Agent proposal -> user confirmation -> existing GARANG write path -> outcome -> next decision`

Invariant:

`GARANG decides -> LLM explains -> User confirms -> GARANG acts`

The LLM is not the source of truth for the GARANG decision and has no Firestore write capability.

## Runtime boundary

Browser endpoint:

`https://asia-northeast3-fitfind-ai.cloudfunctions.net/api/coach`

Firebase Functions Express route:

`POST /coach`

The browser sends only:

- Firebase ID token in `Authorization: Bearer ...`
- `message`
- `language`

Legacy client-generated `context`, `uid`, and `userId` values are removed at the Coach transport boundary. The server derives the user solely from the verified Firebase ID token and reads `users/{uid}/app/state`, with legacy root fallback only for older data.

## Server-derived Intelligence context

Before State / Decision Intelligence runs, active `checkins` and legacy `dailyCheckins` are merged and normalized to canonical recovery fields. This prevents an empty legacy collection or field aliases from hiding current sleep, energy, stress, soreness, pain-caution, or available-time evidence.

The gateway computes GARANG Intelligence before invoking the provider:

`confirmed/retrieved Memory -> State Intelligence -> Outcome Learning -> deterministic GARANG Decision`

Outcome Learning preserves the existing recent `plan-outcome-intelligence-v1` contract and adds `learningVersion: outcome-learning-v2`.

- recent window: canonical finalized Daily Plan outcomes over 7 days
- longitudinal window: canonical finalized Daily Plan outcomes over 28 days
- longitudinal classes: `insufficient_longitudinal_evidence`, `fragile_execution`, `recovery_constrained_pattern`, `stable_execution`, `mixed_execution`
- longitudinal learning is read-only
- longitudinal evidence can suppress progression or prefer reduced load when repeated recovery constraints are sufficiently evidenced
- longitudinal learning can never create an automatic progression increase

Only a bounded subset is exposed to the provider:

- current goal
- confirmed/retrieved Memory entries required by the current query
- recent workout / nutrition / running / body summaries
- current canonical planner summaries
- normalized recovery check-in
- State Intelligence
- Performance / readiness signal
- compact recent + longitudinal Outcome Learning
- canonical GARANG Decision
- Decision reason codes
- whether the deterministic decision permits an action proposal

Direct identity fields, tokens, precise location, raw chat history, arbitrary free-text record notes, and raw outcome records are not included in provider context.

## Provider adapter

`functions/src/llm-provider.cjs` is the provider boundary.

Current built-in provider:

- provider: `openai`
- default model: `gpt-5.6-luna`
- API style: server-side Responses API request through `fetch`

Model/provider selection is configuration, not browser code. Future provider adapters must return the same normalized explanation contract and must not gain state mutation dependencies.

Normalized provider response:

- `answer`
- `decisionSummary`
- `reasoningSummary`
- `suggestedNextStep`
- `confidence`
- `alignment.decisionId`
- `alignment.decisionMode`
- `alignment.reasonCodesUsed`
- provider/model metadata

The provider response deliberately contains no action-intent or write contract. The gateway whitelists returned provider fields so unexpected mutation-shaped output cannot escape the provider boundary.

## Decision / explanation alignment

The provider system instruction states that GARANG deterministic intelligence owns the decision.

The provider must echo the exact deterministic decision identity:

- `alignment.decisionId` must equal `garangDecision.decisionId`
- `alignment.decisionMode` must equal `garangDecision.mode`
- every `alignment.reasonCodesUsed` value must exist in the server-supplied GARANG decision reason codes

The gateway rejects structural divergence before returning an LLM success:

- decision id or mode mismatch -> `LLM_ALIGNMENT_MISMATCH`
- unsupported / invented reason code -> `LLM_ALIGNMENT_UNSUPPORTED_REASON`

The gateway also caps LLM-reported confidence at the deterministic GARANG decision confidence. Alignment metadata records the decision identity, confidence cap, recent outcome class, longitudinal outcome class, verified reason codes, and whether the alignment contract was verified.

This does not claim perfect natural-language semantic verification. It prevents the provider from structurally reversing the GARANG decision, attaching unsupported reason codes, or claiming stronger confidence than GARANG evidence supports. Free-text semantic quality remains subject to eval coverage and live-provider smoke verification.

## Agent / mutation boundary

The provider is not given a write adapter, Firestore handle, Agent write capability, or Firebase Admin object. It cannot create, update, approve, or execute a proposal.

Actionable changes remain owned by GARANG deterministic action surfaces and Agent Contract. Behavior-changing writes require explicit user confirmation and retain idempotency / recommendation linkage / outcome tracking.

## Abuse / spend boundary

Every authenticated `/coach` request is checked against a server-side Firestore transaction before user-state reads or provider invocation.

Current per-authenticated-user quotas:

- 20 provider requests per rolling 10-minute window
- 120 provider requests per UTC day

Rate-limit storage is kept in the server-only `_internal_coach_rate_limits` collection. Exceeding quota returns HTTP `429`, `COACH_RATE_LIMITED`, `fallbackRequired: true`, and `Retry-After`. If the quota store is unavailable, the gateway fails closed with `COACH_RATE_LIMIT_UNAVAILABLE` instead of making an unmetered provider call.

The Firebase Function retains a bounded `maxInstances` setting. Provider-side budgets and billing alerts remain recommended defense in depth and are production/cost changes requiring explicit Founder approval.

## Privacy-safe observability

The gateway distinguishes provider lifecycle events without logging raw user context:

- `llm_request`
- `llm_success`
- `llm_fallback`

Fallback codes distinguish missing secret, timeout, provider HTTP/rate-limit errors, malformed response, unsupported provider, alignment mismatch, unsupported alignment reason, Coach quota exhaustion, and quota-store unavailability where applicable.

Event payloads may include bounded operational metadata such as request id, provider, deterministic decision mode, outcome classification, provider status, confidence-cap status, and alignment verification status. They must not contain the raw user message, uid, confirmed Memory values, or full provider context.

Proposal approval/rejection and outcome tracking remain owned by the existing Agent/action and plan-outcome paths rather than the LLM gateway.

## Secret configuration

Do not place provider API keys in source code, browser config, GitHub Pages assets, Firebase public config, or test fixtures.

Firebase Function secret binding:

`GARANG_LLM_API_KEY`

Configure it through Firebase Secret Manager tooling in the target Firebase project only from an authorized operator environment.

Optional non-secret runtime configuration:

- `GARANG_LLM_PROVIDER` (default `openai`)
- `GARANG_LLM_MODEL` (default `gpt-5.6-luna`)
- `GARANG_LLM_TIMEOUT_MS` (default `8000`)

Secret changes, Functions production deploys, authenticated production smoke tests that require privileged credentials, and billing/cost changes require Founder authorization. A merged client endpoint is not proof that the live provider is activated.

## Failure and fallback

Provider failure is intentionally non-fatal. These conditions return an explicit non-success response with `fallbackRequired: true`:

- Coach quota exceeded
- quota-store unavailable
- provider timeout
- provider HTTP error / provider rate limit
- malformed provider response
- missing provider secret
- unsupported provider
- decision alignment mismatch
- unsupported provider reason code

The browser `askAI()` catch path then uses GARANG deterministic local Coach response. The UI must not label this as a successful remote LLM response.

If no authenticated Firebase user exists, the browser transport does not send a network request and falls back locally.

## Cross-user isolation

The server ignores any client-supplied user identifier or context. The only user lookup key is the uid from the verified Firebase ID token.

Required invariant:

`verified token uid -> quota -> users/{uid}/app/state -> normalized state -> Memory/State/Outcome/Decision Intelligence -> bounded provider context`

A request cannot select a different user by modifying its JSON body. Memory selection is owner-scoped before it reaches the AI context.

## Production smoke command

Repository command:

`npm run smoke:coach:prod`

Required environment:

- `GARANG_FIREBASE_ID_TOKEN`

Optional:

- `GARANG_FIREBASE_ID_TOKEN_ALT` for a second authenticated user
- `GARANG_EXPECT_DIFFERENT_MODE=1` when the two prepared users are intentionally expected to produce different decision modes
- `GARANG_COACH_ENDPOINT` to override the documented production endpoint
- `GARANG_SMOKE_MESSAGE` / `GARANG_SMOKE_LANGUAGE`

The smoke script does not print ID tokens, raw user messages, Memory values, or full provider context. It verifies `source: llm`, deterministic GARANG decision presence, verified alignment, and optional two-user decision differentiation.

## Deployment verification

Production activation is VERIFIED only when all are observed against the deployed environment:

1. `GARANG_LLM_API_KEY` exists in the target project Secret Manager.
2. the current `api` Firebase Function containing `/coach` is deployed.
3. an authenticated request receives `source: llm` from the live endpoint.
4. provider alignment is verified against the server-computed GARANG decision.
5. the same question against intentionally different authenticated user states can be shown to produce appropriately different deterministic decisions when the states materially warrant it.
6. provider failure and Coach quota exhaustion return to deterministic local fallback.
7. no raw private context appears in production observability.
8. the full GARANG Release Gate remains GREEN.

Until steps 1-7 are observed against the deployed environment, live-provider production readiness remains `UNKNOWN` even if repository CI is GREEN.
