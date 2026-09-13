# GARANG Real LLM Gateway v1

## Objective

Connect a real language model to GARANG without transferring decision or mutation ownership to the model.

Canonical flow:

`Authenticated user state -> Memory Intelligence -> State Intelligence -> Decision Intelligence -> minimal server context -> LLM explanation/orchestration -> optional action intent -> existing Agent proposal -> user confirmation -> existing GARANG write path`

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

## Server-derived LLM context

The gateway computes GARANG Intelligence before invoking the provider, then exposes only a bounded subset:

- current goal
- confirmed/retrieved Memory entries required by the server context query
- recent workout summaries
- recent nutrition summaries
- recent running summaries
- recent body summaries
- current canonical planner summaries
- State Intelligence
- Performance / readiness signal
- GARANG Decision
- Decision reason codes
- whether an action proposal is allowed

Direct identity fields, tokens, precise location, raw chat history, and arbitrary free-text record notes are not included in the provider context.

## Provider adapter

`functions/src/llm-provider.cjs` is the provider boundary.

Current built-in provider:

- provider: `openai`
- default model: `gpt-5.6-luna`
- API style: server-side Responses API request through `fetch`

Model/provider selection is configuration, not browser code. Future provider adapters must return the same normalized contract and must not gain state mutation dependencies.

Normalized response:

- `answer`
- `decisionSummary`
- `reasoningSummary`
- `suggestedNextStep`
- `actionIntent.type`
- `confidence`
- provider/model metadata

Allowed action intents are advisory only: `none`, `createPlan`, `updatePlan`, `askFollowup`.

## Decision ownership

The provider system instruction explicitly states that GARANG's deterministic intelligence owns the decision. The server also returns the canonical `garangDecision` alongside the LLM explanation.

The provider is not given a write adapter, Firestore handle, Agent write capability, or Firebase Admin object.

If an LLM response suggests an action, mutation still requires the existing Agent Contract proposal/confirmation flow. A repeated confirmation cannot write twice because resolved Agent proposals cannot be confirmed again.

## Secret configuration

Do not place provider API keys in source code, browser config, GitHub Pages assets, Firebase public config, or test fixtures.

The Firebase Function binds the secret:

`GARANG_LLM_API_KEY`

Configure it through Firebase Secret Manager tooling in the target Firebase project, for example from an authorized operator environment:

```bash
firebase functions:secrets:set GARANG_LLM_API_KEY --project fitfind-ai
```

Optional non-secret runtime configuration:

- `GARANG_LLM_PROVIDER` (default `openai`)
- `GARANG_LLM_MODEL` (default `gpt-5.6-luna`)
- `GARANG_LLM_TIMEOUT_MS` (default `8000`)

After the secret is configured, deploy the Functions code through the authorized production deployment process. Do not treat a merged client endpoint as proof that the provider is live.

## Failure and fallback

Provider failure is intentionally non-fatal.

These conditions return an explicit non-success response with `fallbackRequired: true`:

- provider timeout
- provider HTTP error
- malformed provider response
- missing provider secret
- unsupported provider

The existing browser `askAI()` catch path then uses GARANG's deterministic local Coach response. The UI must not label this as a successful remote LLM response.

If no authenticated Firebase user exists, the browser transport does not send a network request and falls back locally.

## Cross-user isolation

The server ignores any client-supplied user identifier or context. The only user lookup key is the uid from the verified Firebase ID token.

Required invariant:

`verified token uid -> users/{uid}/app/state -> server Intelligence -> bounded provider context`

A request cannot select a different user by modifying its JSON body.

## Deployment verification

A production activation is complete only when all are true:

1. `GARANG_LLM_API_KEY` exists in the target project Secret Manager.
2. `api` Firebase Function containing `/coach` is deployed.
3. an authenticated request receives `source: llm` from the live endpoint.
4. the same question against materially different authenticated user states produces explanations anchored to each user's server-computed GARANG decision.
5. provider failure is verified to return to deterministic local fallback.
6. full GARANG Release Gate remains GREEN.

Until steps 1-5 are observed against the deployed environment, live-provider status is `UNKNOWN`, even if repository CI is GREEN.
