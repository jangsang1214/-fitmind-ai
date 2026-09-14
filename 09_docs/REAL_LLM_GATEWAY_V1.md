# GARANG Real LLM Gateway v1

## Objective

Connect a real language model to GARANG without transferring decision or mutation ownership to the model.

Canonical flow:

`Authenticated user state -> normalized recovery/check-in state -> Memory Intelligence -> State Intelligence -> Outcome Learning -> Decision Intelligence -> minimal server context -> LLM explanation -> existing GARANG action surfaces -> Agent proposal -> user confirmation -> existing GARANG write path -> outcome -> next decision`

The invariant is:

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

The gateway computes GARANG Intelligence before invoking the provider. The server path is:

`confirmed/retrieved Memory -> State Intelligence -> bounded Plan Outcome summary -> deterministic GARANG Decision`

Recent finalized canonical Daily Plan outcomes can therefore constrain the next deterministic decision. In particular, repeated partial/missed execution can suppress automatic progression, and recovery-constrained outcomes can become explicit decision evidence.

Only a bounded subset is exposed to the provider:

- current goal
- confirmed/retrieved Memory entries required by the current query
- recent workout summaries
- recent nutrition summaries
- recent running summaries
- recent body summaries
- current canonical planner summaries
- normalized recovery check-in
- State Intelligence
- Performance / readiness signal
- compact Outcome Learning summary
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

Normalized response:

- `answer`
- `decisionSummary`
- `reasoningSummary`
- `suggestedNextStep`
- `confidence`
- provider/model metadata

The provider response deliberately contains no action-intent or write contract. The gateway also whitelists returned provider fields so unexpected mutation-shaped output cannot escape the provider boundary.

Actionable changes remain owned by GARANG's deterministic action surfaces and Agent Contract, where user confirmation is mandatory.

## Decision / explanation alignment

The provider system instruction explicitly states that GARANG's deterministic intelligence owns the decision. The server returns the canonical `garangDecision` alongside the LLM explanation.

The gateway caps LLM-reported confidence at the deterministic GARANG decision confidence. Alignment metadata records the deterministic decision id/mode and whether the LLM confidence was capped. The provider may explain uncertainty but may not manufacture a stronger confidence claim than GARANG's current evidence supports.

The provider is not given a write adapter, Firestore handle, Agent write capability, or Firebase Admin object. It cannot create, update, approve, or execute a proposal.

## Abuse / spend boundary

Every authenticated `/coach` request is checked against a server-side Firestore transaction before user-state reads or provider invocation.

Current per-authenticated-user quotas:

- 20 provider requests per rolling 10-minute window
- 120 provider requests per UTC day

Rate-limit storage is kept in the server-only `_internal_coach_rate_limits` collection. Exceeding quota returns HTTP `429`, `COACH_RATE_LIMITED`, `fallbackRequired: true`, and `Retry-After`. If the quota store is unavailable, the gateway fails closed with `COACH_RATE_LIMIT_UNAVAILABLE` instead of making an unmetered provider call.

The Firebase Function also retains a bounded `maxInstances` setting. These controls reduce accidental or abusive provider spend; provider-side project budgets and billing alerts remain recommended defense in depth and are production/cost changes requiring explicit Founder approval.

## Privacy-safe observability

The gateway distinguishes provider lifecycle events without logging raw user context:

- `llm_request`
- `llm_success`
- `llm_fallback`

Fallback codes distinguish missing secret, timeout, provider HTTP/rate-limit errors, malformed response, unsupported provider, Coach quota exhaustion, and quota-store unavailability where applicable.

Event payloads may include bounded operational metadata such as request id, provider, deterministic decision mode, outcome classification, provider status, and confidence-cap status. They must not contain the raw user message, uid, confirmed Memory values, or full provider context.

Proposal approval/rejection and outcome tracking remain owned by the existing Agent/action and plan-outcome paths rather than the LLM gateway.

## Secret configuration

Do not place provider API keys in source code, browser config, GitHub Pages assets, Firebase public config, or test fixtures.

The Firebase Function binds the secret:

`GARANG_LLM_API_KEY`

Configure it through Firebase Secret Manager tooling in the target Firebase project only from an authorized operator environment.

Optional non-secret runtime configuration:

- `GARANG_LLM_PROVIDER` (default `openai`)
- `GARANG_LLM_MODEL` (default `gpt-5.6-luna`)
- `GARANG_LLM_TIMEOUT_MS` (default `8000`)

Secret changes, Functions production deploys, authenticated production smoke tests that require privileged credentials, and billing/cost changes require explicit Founder approval. A merged client endpoint is not proof that the live provider is activated.

## Failure and fallback

Provider failure is intentionally non-fatal.

These conditions return an explicit non-success response with `fallbackRequired: true`:

- Coach quota exceeded
- quota-store unavailable
- provider timeout
- provider HTTP error / provider rate limit
- malformed provider response
- missing provider secret
- unsupported provider

The existing browser `askAI()` catch path then uses GARANG's deterministic local Coach response. The UI must not label this as a successful remote LLM response.

If no authenticated Firebase user exists, the browser transport does not send a network request and falls back locally.

## Cross-user isolation

The server ignores any client-supplied user identifier or context. The only user lookup key is the uid from the verified Firebase ID token.

Required invariant:

`verified token uid -> quota -> users/{uid}/app/state -> normalized state -> Memory/State/Outcome/Decision Intelligence -> bounded provider context`

A request cannot select a different user by modifying its JSON body. Memory selection is also owner-scoped before it reaches the AI context.

## Deployment verification

A production activation is complete only when all are true:

1. `GARANG_LLM_API_KEY` exists in the target project Secret Manager.
2. the current `api` Firebase Function containing `/coach` is deployed.
3. an authenticated request receives `source: llm` from the live endpoint.
4. the same question against materially different authenticated user states produces explanations anchored to each user's server-computed GARANG decision.
5. provider failure and Coach quota exhaustion are verified to return to deterministic local fallback.
6. no raw private context appears in production observability.
7. the full GARANG Release Gate remains GREEN.

Until steps 1-6 are observed against the deployed environment, live-provider production readiness remains `UNKNOWN` even if repository CI is GREEN.
