# GARANG Server Readiness Stage 0

Status: implementation complete when the repository Release Gate is GREEN. Production activation remains a separate explicit release decision.

## Goal

Prepare GARANG to expand server-owned capabilities without replacing the working Firebase Auth + Firestore local-first architecture or creating a second general-purpose user-data backend.

## Architecture boundary

- Browser/PWA remains the interaction and local-first state owner.
- Firebase Auth remains identity/authentication.
- Firestore remains authenticated user state and durable-history storage.
- Cloud Functions owns privileged operations: Coach/LLM, account lifecycle, telemetry ingestion, future payment webhooks and future OCR/provider secrets.
- `garang-state-v1` schema v8 remains the canonical external/server contract.
- Provider secrets never enter browser configuration.

## Stage 0 work

1. Repository boundary
   - `StateRepository`, `HistoryRepository`, `AuthService` are exposed through `GarangRepositories`.
   - Existing app.js persistence behavior is preserved; migration to the facade is incremental.

2. Canonical server state
   - Functions reuse the browser production schema through `server-state-boundary.cjs`.
   - Server normalization emits canonical aliases while retaining internal `meta` evidence required by outcome learning.

3. Account lifecycle
   - `/account/export` returns a canonical user export including durable history and server-owned telemetry.
   - `/account/delete` remains recent-auth protected and recursively deletes current/future user subcollections when supported.
   - Browser account delete/export switches to server ownership only after endpoints are explicitly activated; until then the verified client fallback stays available.

4. Staging/security readiness
   - Allowed origins are centralized in `request-security.cjs`.
   - Additional HTTPS staging origins are supplied with `GARANG_ALLOWED_ORIGINS`.
   - Security headers and CORS preflight behavior are centralized.
   - A separate staging Firebase project/host must be selected before activation; this repository does not invent a project ID.

5. Analytics/error telemetry readiness
   - `/analytics/events` accepts only `garang-analytics-v1` canonical/legacy-mapped events and strips non-allowlisted properties.
   - `/telemetry/errors` accepts only bounded error taxonomy fields.
   - Both require authenticated users and server-verified `consent.analytics === true`.
   - Browser transport also suppresses analytics/error requests when local consent is false.
   - Telemetry is stored under `users/<uid>/telemetry`, so server-side recursive account deletion covers it.

## Activation sequence

Do not activate the new endpoints directly in production from this PR.

1. Create/select a staging Firebase project and staging web origin.
2. Deploy the current Functions revision to staging.
3. Configure `GARANG_ALLOWED_ORIGINS` for the staging HTTPS origin.
4. Configure the LLM secret through Firebase/Google secret management, never through checked-in env files.
5. Smoke verify authenticated `/coach`, `/account/export`, `/account/delete` with a disposable account, `/analytics/events` with consent OFF and ON, and `/telemetry/errors` with consent OFF and ON.
6. Verify delete removes app state, durable histories, recovery snapshots, telemetry and Firebase Auth user.
7. Enable staging browser endpoint values and run the full Golden Path on a real iPhone/in-app browser.
8. Only after staging evidence is GREEN should production endpoint activation be proposed.

## Out of scope

- Payment/entitlement activation.
- Meal/body OCR provider activation.
- Moving Firestore user data into a second database.
- Production deployment or secret changes without Founder approval.
