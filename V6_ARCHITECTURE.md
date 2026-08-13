# FitMind AI V6 — Local-first Pro Architecture

## Product split
- Free: local-first, core logging/analysis, no default cloud inference.
- Pro: cloud AI + long-term memory for high-value queries.
- Pro+: higher monthly server-credit allowance and priority routing.

## Cost controls
1. Local-first routing.
2. Server only for long-horizon/complex analysis.
3. Relevant-memory retrieval instead of full-history prompts.
4. Monthly credits and rate limits.
5. Server-side API secrets only.
6. Graceful fallback to local coach when the cloud is unavailable.

## Memory
Separate chat history from long-term memory. Store only user-approved or high-confidence memory candidates.
Allow export/delete of cloud memory.

## Recommended production safeguards
- Authentication and subscription verification
- Per-user quota
- Provider timeout + retry policy
- Request-size limits
- PII minimization
- Encryption at rest/in transit
- Delete/export controls
- Audit logs without raw conversation content
