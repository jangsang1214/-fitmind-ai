# GARANG Production Coach Activation

Approved by Founder on 2026-09-20 (Asia/Seoul).

Purpose: trigger the existing fail-closed Production Coach Activation workflow for commercial main revision `5483b848e2973f2bf66a1a67148f3c5a5142fb66` after PR #166 merged Autonomous Intelligence Loop v1.

Scope:
- deploy only Firebase Function `api` to project `fitfind-ai`
- preserve the existing `GARANG_LLM_API_KEY` secret
- deploy the merged bounded typed Coach tool-call path and authenticated transactional user-state mutation boundary
- keep raw database authority and destructive/bulk/account/security/schema/secret/billing/production tools unavailable to the LLM
- require authenticated production Coach smoke using a disposable Firebase identity
- require the smoke to return `source=llm` with GARANG decision/alignment verification
- delete the disposable identity in cleanup
- do not change billing, secrets, auth architecture, Firestore schema, or unrelated production resources

Success requires deployment plus authenticated live LLM smoke. A skipped authenticated smoke is not considered success. The standard production smoke verifies provider/alignment/auth boundaries; bounded-write execution and denial/confirmation behavior must be verified separately after activation if the standard smoke does not cover those assertions.
