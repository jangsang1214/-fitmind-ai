# Production Coach Activation

Approved by Founder on 2026-09-20 (Asia/Seoul).

Purpose: trigger the existing fail-closed Production Coach Activation workflow for commercial main revision `bfd59699af6fb667d744ee81f6961a3751c3fa47` after the collect-data conversational response hardening in PR #159 and the mandatory authenticated live-smoke hardening in PR #160.

Scope:
- deploy only Firebase Function `api` to project `fitfind-ai`
- preserve the existing `GARANG_LLM_API_KEY` secret
- require authenticated production text Coach smoke using a disposable Firebase identity
- delete the disposable identity in cleanup
- do not change billing, secrets, auth architecture, Firestore schema, or unrelated production resources

Success requires the live smoke to return `source=llm` with GARANG decision/alignment verification. A skipped authenticated smoke is not considered success.
