# GARANG 0.10.0 Beta 1 QA

Date: 2026-09-02  
Status: PASS

## Verified

- 60 automated checks passed: core 15, adapters 10, commercial browser core 8, backend core 8, major update regression 19.
- Static validation passed across 92 JavaScript files, 32 JSON or manifest files, 11 JSONL datasets and 30 active entry assets.
- The active runtime manifest, package version and visible build label all resolve to 0.10.0-beta.1.
- A 390 px mobile browser run found no document, form-control or certification-card horizontal overflow.
- Planner date/time/type/title inputs stay inside their cards.
- Certification preview rendered the new GARANG Performance OS overlay with no browser console errors.
- Server-side tests verify authentication, per-user isolation, idempotency, rate limiting, account deletion confirmation and agent-action confirmation.

## Deployment boundary

This is a development build. GitHub Pages remains a static host. The new commercial API, telemetry and payments are deliberately shown as not connected until a separately hosted backend and production credentials are configured.

## Remaining production gates

- Deploy the backend implementation behind HTTPS and verify Firebase ID tokens at the server boundary.
- Replace the in-memory reference repository with a managed database and backup policy.
- Complete privacy, terms, retention and health-disclaimer legal review.
- Configure consented analytics, error monitoring and payment webhooks with production secrets.
- Run staging load, restore, security and end-to-end account tests before changing the build channel to production.
