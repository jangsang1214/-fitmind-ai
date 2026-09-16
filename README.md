# GARANG — Personal Performance Intelligence

GARANG is a personal performance product built around one connected loop:

**Goal → Plan → Action → Record → Interpretation → Feedback → Next Action → Long-term Change**

The product is not intended to be a generic fitness logger or an LLM chatbot. GARANG's deterministic intelligence reads the user's own records, estimates current state, makes a bounded performance decision, and uses the Coach to explain that decision and help the user act on it.

## Current product model

The commercial Golden Path is:

**Onboarding → Today → Record → Coach → Plan → Confirmation → Execution → Record → Progress**

Core data domains include workouts, running, nutrition, body records, recovery check-ins, plans, execution evidence, memory, recommendations, actions and outcomes.

The current intelligence stack includes:

- **State Intelligence** for readiness, fatigue, load, trends, goal alignment and evidence coverage.
- **Decision Intelligence** for deterministic decision modes and reason codes.
- **Adaptive planning / execution** with explicit user confirmation and canonical write ownership.
- **Nutrition Intelligence v2** and traceable food-data foundations.
- **Coach knowledge grounding** that can support an explanation but cannot override the GARANG decision.
- **Intelligence Learning Contract v1** linking `decisionId → recommendationId → actionId → planId → executionId → outcomeId`.
- **Outcome Learning** that can conservatively constrain future recommendations without silently mutating user state or automatically increasing progression.

## AI Coach architecture

Production Coach requests use an authenticated server gateway. The browser does not receive the model-provider secret and does not choose another user's context.

At a high level:

1. The authenticated server loads the canonical GARANG user state.
2. GARANG State / Decision Intelligence computes the current deterministic decision.
3. Curated knowledge and deterministic nutrition signals may be attached as supporting grounding.
4. The remote LLM produces the natural-language explanation.
5. Server-side alignment checks require the LLM to preserve GARANG's exact `decisionId`, `decisionMode` and supported reason codes before an LLM success is returned.

The ownership rule is deliberately strict:

**GARANG decides → LLM explains → User confirms → GARANG acts.**

The production Coach supports authenticated text and body-photo context. Photo input is ephemeral context for the request; the released path does not persist the raw photo into GARANG state, Firestore, telemetry or conversation text history. The Coach is constrained from medical diagnosis, sensitive-trait inference and hidden body-composition estimation from an image.

## Food and nutrition data

GARANG includes deterministic nutrition interpretation plus tooling for traceable official-food ingestion. K-FIND / USDA source records are not allowed to overwrite canonical GARANG foods automatically: provenance, core macro completeness and mapping quality are checked first, and ambiguous replacements remain reviewable rather than becoming confidently wrong product data.

## Learning and personalization

The released causal learning contract attributes confirmed recommendations through execution and outcome. Current personalization remains evidence-conservative: longitudinal outcome evidence may suppress or reduce progression, but it cannot silently increase progression.

The next personalization layer is **User Performance Model v1**: common user dimensions should be derived from attributable behavioral evidence with `value`, `confidence`, `sampleSize`, `lastUpdated` and `evidenceIds`, including future explicit rejection/dismissal evidence. This is roadmap work, not claimed as released functionality here.

## Validation and release discipline

The repository uses a broad automated release gate covering core contracts, Golden Path behavior, browser/WebKit regressions, authenticated Coach boundaries, intelligence alignment, persistence, Firebase rules and production dependency security.

Useful local commands:

```bash
npm test
npm run lint
npm run build
npm run audit:prod
```

As of **2026-09-17**, the commercial `main` baseline at `fab7fba387fcbf1235af0163dff0f169314b88d7` passed GARANG Release Gate #1477 and GitHub Pages #802. A separate authenticated production Coach live smoke previously verified text and photo responses with `source=llm`. These run references are evidence for that snapshot, not a substitute for re-running the gate after later changes.

## Repository and release boundaries

This repository is the GARANG **PRODUCT** source of truth for application code, product tests/CI, UX and releases. GARANG's orchestration, durable project state and project graph live separately in the CONTROL repository.

Commercial GARANG remains canonical. Competition/demo derivatives are isolated release channels and do not automatically redefine or merge back into the commercial product.

## Current engineering debt

Known non-blocking hardening work includes server-enforced main-branch protection, migration of production deployment authentication from a long-lived JSON credential toward OIDC / Workload Identity Federation, a dedicated Firebase Functions dependency-family upgrade, and continued simplification of UI runtime ownership. These are tracked separately from current commercial functionality.

## Product principle

New features are secondary to the quality of the connected loop. GARANG should become more useful because it understands the relationship between a user's state, recommendation, action and outcome over time—not because it accumulates more screens or chatbot behavior.
