# Production Coach Activation

Approved by Founder on 2026-09-20 (Asia/Seoul).

Purpose: trigger the existing fail-closed Production Coach Activation workflow for commercial main revision `47d95a71c4a526ba966656a8f923ebf0b1db46cf` after PR #164 added outcome-attributed User Performance learning to the canonical product.

Scope:
- deploy only Firebase Function `api` to project `fitfind-ai`
- preserve the existing `GARANG_LLM_API_KEY` secret
- deploy the current server-side User Performance attribution code already merged to PRODUCT main
- require authenticated production text Coach smoke using a disposable Firebase identity
- require the smoke to return `source=llm` with GARANG decision/alignment verification
- delete the disposable identity in cleanup
- do not change billing, secrets, auth architecture, Firestore schema, or unrelated production resources

Success requires deployment plus authenticated live LLM smoke. A skipped authenticated smoke is not considered success.
