# GARANG Production Coach Preflight v1

## Purpose

Close the last non-secret production readiness gaps before Founder approval for provider secret configuration and/or Firebase Functions production deployment.

## Verified repository contract

- Production project: `fitfind-ai`.
- Production Coach endpoint: `https://asia-northeast3-fitfind-ai.cloudfunctions.net/api/coach`.
- Firebase Function: `api`, region `asia-northeast3`.
- Provider: server-side OpenAI Responses API adapter.
- Default model: `gpt-5.6-luna`.
- Provider secret binding: `GARANG_LLM_API_KEY` through Firebase Functions Secret Manager.
- Browser sends only authenticated Firebase ID token, message, and language.
- Server derives uid and user state from the verified ID token.
- GARANG deterministic Decision Intelligence remains decision owner.
- Provider output is explanation-only and must echo the exact GARANG decision identity/mode and supported reason codes.
- Provider has no state-write adapter or Firestore mutation capability.

## Public, zero-provider-cost route gate

`tests/coach-production-route-health.test.cjs` verifies the deployed production route without an authenticated user and therefore before any user-state read or provider invocation:

1. unauthenticated `POST /coach` must return `401 UNAUTHENTICATED`;
2. `GET /coach` must return `405 METHOD_NOT_ALLOWED`.

This proves the public Functions route and fail-closed auth/method boundaries are reachable, but it does **not** prove the provider secret exists or that a live LLM response succeeds.

## Founder approval gate

The following remain high-impact/production actions and require explicit Founder approval immediately before execution:

1. configure/rotate `GARANG_LLM_API_KEY` in Firebase Secret Manager for `fitfind-ai`, if it is not already configured;
2. deploy the current `functions` source to the production Firebase project when deployed source cannot be proven current;
3. run authenticated production smoke using privileged Firebase ID tokens.

No provider key belongs in source, browser assets, GitHub repository files, test fixtures, or chat.

## Post-approval verification

Run `npm run smoke:coach:prod` with one authenticated token and preferably `GARANG_FIREBASE_ID_TOKEN_ALT` for a second intentionally different user state. A production activation is accepted only when:

- response `source` is `llm`;
- deterministic `garangDecision` is present;
- provider alignment contract is verified;
- provider decision identity/mode exactly match GARANG;
- two distinct users do not collapse to the same deterministic decision identity, and intentionally different prepared states produce different modes when required;
- failure/quota paths remain deterministic fallback;
- full Release Gate remains GREEN.
