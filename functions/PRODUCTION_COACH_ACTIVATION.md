# GARANG Production Coach Activation

Approved by Founder on 2026-09-20 (Asia/Seoul).

Purpose: trigger the existing fail-closed Production Coach Activation workflow for commercial main revision `645ac184425124b0ff5e906f495d5474d126b8f2` after PR #166 merged Autonomous Intelligence Loop v1 and PR #170 hardened structured-response completion/retry reliability.

Scope:
- deploy only Firebase Function `api` to project `fitfind-ai`
- preserve the existing `GARANG_LLM_API_KEY` secret
- deploy the merged bounded typed Coach tool-call path and authenticated transactional user-state mutation boundary
- keep raw database authority and destructive/bulk/account/security/schema/secret/billing/production tools unavailable to the LLM
- require authenticated production Coach smoke using a disposable Firebase identity
- require the smoke to return `source=llm` with GARANG decision/alignment verification
- delete the disposable identity in cleanup
- do not change billing, secrets, auth architecture, Firestore schema, or unrelated production resources

Success requires deployment plus authenticated live LLM smoke AND authenticated autonomous-write smoke. The write smoke must persist an explicit bounded createPlan request, deny/hold sensitive email-memory mutation, expose the persisted plan through canonical Agent Context, and clean up the disposable account. A skipped or failed write smoke is not success.

Activation retry authorized after Production Activation #16 isolated the remaining failure to provider structured-response completion. PR #170 Release Gate #1540 attempt 3 is GREEN.
