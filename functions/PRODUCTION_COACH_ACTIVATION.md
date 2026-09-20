# Production Coach Activation

Approved by Founder on 2026-09-20 (Asia/Seoul).

Purpose: trigger the existing fail-closed Production Coach Activation workflow for commercial main revision `5483b848e2973f2bf66a1a67148f3c5a5142fb66` after PR #166 merged Autonomous Intelligence Loop v1.

Scope:
- deploy only Firebase Function `api` to project `fitfind-ai`
- preserve the existing `GARANG_LLM_API_KEY` secret
- deploy the current server-side bounded typed Coach write tools and longitudinal/personalization code already merged to PRODUCT main
- require authenticated production Coach smoke using a disposable Firebase identity
- require the smoke to return `source=llm` with GARANG decision/alignment verification
- verify the authenticated tool path remains bounded by owner-scoped transactions, explicit evidence/confirmation rules, idempotency, and audit/rollback metadata
- delete the disposable identity in cleanup
- do not change billing, secrets, auth architecture, Firestore schema, or unrelated production resources

Success requires deployment plus authenticated live LLM smoke. A skipped authenticated smoke is not considered success. Bounded write execution and denial/confirmation boundaries must remain enforced by server policy.
