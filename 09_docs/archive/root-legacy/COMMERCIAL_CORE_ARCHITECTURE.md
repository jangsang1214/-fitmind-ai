# GARANG Commercial Core architecture

## Delivery boundary

The current GitHub Pages app is the web client. It may keep an offline local copy, but it is not an authority for subscriptions, provider secrets, cross-device data, audit records, or destructive account operations.

```text
GARANG Web/PWA
  -> same-origin /v1 API
     -> verified Firebase identity
     -> user-scoped repositories
     -> Agent action gate
     -> AI/OCR/payment provider adapters
     -> analytics, audit and error sinks
```

`commercial-core.js` supplies the browser API client, trace IDs, idempotency keys, migration preparation, server repositories, analytics buffering, error capture, and the Agent approval gate. It does not contain secrets and does not fabricate a connected backend.

`backend/src/core.cjs` is a dependency-free reference service core. It enforces authentication, user scope, payload limits, rate limits, idempotency and a consistent error envelope. A deployment adapter must verify Firebase ID tokens before populating `request.user`; unverified client-supplied user IDs are forbidden.

## API response contract

Success:

```json
{"ok":true,"data":{},"traceId":"trace-id"}
```

Failure:

```json
{"ok":false,"error":{"code":"UNAUTHORIZED","message":"Authentication required","retryable":false},"traceId":"trace-id"}
```

All mutations accept `Idempotency-Key`. User data routes are namespaced under the verified UID. The initial contract is recorded in `backend/openapi.json`.

## Local-to-server migration

1. Keep the existing local record and backup.
2. Create a deterministic migration ID from UID, schema version and local update time.
3. Upload the entire normalized state through `/v1/migrations/local` with an idempotency key.
4. Verify the server acknowledgement and record the migration receipt locally.
5. Continue to retain the local cache for offline use. Never erase it merely because an upload was attempted.

## Agent safety

Read tools may inspect workout, nutrition, running, body, score, planner and confirmed Memory. Write tools create a proposal first. `createPlan`, `updatePlan`, `saveMemory`, deletion and goal changes require a matching proposal ID plus explicit user confirmation. Every confirmed or rejected action produces an append-only action log entry.

## Environment states

- Development Build: local features and test backend core; external integrations may be disconnected.
- Staging: isolated Firebase/API/provider projects and synthetic or consented test accounts.
- Commercial Beta: all P0 release gates passed, legal notices published, monitoring active and rollback tested.
- Production: entitlement, retention, incident response, backups and closed-beta evidence reviewed.
