# GARANG Production Coach Preflight v1

## Purpose

Close the last non-secret production readiness gaps before Founder approval for provider secret configuration and Firebase Functions production deployment.

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

## Verified production observation — 2026-09-16

The zero-provider-cost production probe was executed from GitHub Actions against the documented endpoint.

- Firebase project public Auth/Firestore health was reachable for `fitfind-ai`.
- Unauthenticated `POST /api/coach` returned HTTP `404` instead of the repository contract `401 UNAUTHENTICATED`.
- Therefore the current production Functions surface does not expose the repository's Real Coach `/coach` route at the documented endpoint.
- This is deployment evidence, not an LLM reasoning/code failure. Repository provider, gateway, alignment, personalization, mutation-boundary, build and regression tests passed before the live route probe.

Conclusion: a current Firebase Functions production deployment is required before authenticated live LLM verification can proceed.

## Production route preflight command

Run:

`npm run preflight:coach:prod-route`

The check is intentionally activation-scoped rather than part of the ordinary repository Release Gate while production remains undeployed. After deployment it must pass:

1. unauthenticated `POST /coach` -> `401 UNAUTHENTICATED`;
2. `GET /coach` -> `405 METHOD_NOT_ALLOWED`.

This proves the public Functions route and fail-closed auth/method boundaries are reachable without a provider call, privileged credential, user-state read, or LLM cost. It does **not** prove the provider secret exists or that a live LLM response succeeds.

## Founder approval gate

The following are now the remaining high-impact production actions and require explicit Founder approval immediately before execution:

1. configure or confirm `GARANG_LLM_API_KEY` in Firebase Secret Manager for `fitfind-ai` without exposing its value in source, browser assets, repository files, test fixtures, or chat;
2. deploy the current repository `functions` source to production project `fitfind-ai`;
3. rerun `npm run preflight:coach:prod-route` and require the expected 401/405 boundary;
4. run authenticated production smoke using privileged Firebase ID tokens.

## Post-approval verification

Run `npm run smoke:coach:prod` with one authenticated token and preferably `GARANG_FIREBASE_ID_TOKEN_ALT` for a second intentionally different user state. A production activation is accepted only when:

- response `source` is `llm`;
- deterministic `garangDecision` is present;
- provider alignment contract is verified;
- provider decision identity/mode exactly match GARANG;
- two distinct users do not collapse to the same deterministic decision identity, and intentionally different prepared states produce different modes when required;
- failure/quota paths remain deterministic fallback;
- no raw private context appears in observability;
- full GARANG Release Gate remains GREEN.
