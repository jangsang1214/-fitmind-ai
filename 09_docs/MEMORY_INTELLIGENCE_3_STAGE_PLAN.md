# GARANG Memory Intelligence — 3 Stage Plan

## Goal
GARANG의 개인 장기기억을 단순 저장이 아니라 현재 상태와 시간 변화를 이해하고 다음 행동 판단에 사용할 수 있는 Personal Intelligence layer로 발전시킨다.

## Stage 1 — Memory Foundation & Retrieval
Status: implemented in `memory-intelligence-stage1-foundation-20260905`.

Scope:
- 5 canonical memory classes: episodic / semantic / procedural / preference / state
- backward-compatible legacy `type` and `key`
- exact duplicate consolidation
- semantic conflict grouping
- temporal history: active / superseded / expired
- validFrom / validTo / observedAt / supersededBy
- importance / confidence / utility / source trust / evidence count
- recency-aware and query-aware retrieval scoring
- unconfirmed-memory suppression by default
- context character budget
- structured user-model candidate extraction
- conservative explicit Korean/English candidate extraction
- live Agent State Bridge integration
- memory deletion IDs for resurrection protection
- browser/server contract parity tests
- deterministic retrieval/conflict benchmark

Not in Stage 1:
- embeddings/vector DB
- LLM-based free-form memory extraction
- user-state trend inference
- proactive coaching decisions

## Stage 2 — User State, Hybrid Retrieval & Pattern Intelligence
Planned scope:
- lexical + embedding/vector hybrid retrieval
- query intent and memory-type routing
- workout / meal / run / body / recovery time-series state estimation
- trend, plateau, inconsistency, adherence and recovery pattern detection
- uncertainty/confidence calibration
- state snapshots and change explanations
- evidence links from recommendation back to source records/memories
- fixed golden-set evaluation for state/pattern accuracy

## Stage 3 — Decision / Coach / Enterprise Intelligence
Planned scope:
- goal-aligned decision engine
- recommendation ranking and safety constraints
- proactive coach triggers with anti-spam policy
- LLM adapter using selected memory/state evidence only
- tool-action planning with confirmation gates
- A/B and longitudinal evaluation
- B2B API/SDK boundary
- tenant-aware observability, audit and enterprise evaluation package

## Completion rule
A stage is not considered complete because code exists. It is complete only after:
1. tests and benchmark pass on the development branch,
2. runtime/build gate passes,
3. changes are merged into `main`,
4. `main` release gate and Pages deployment succeed,
5. any real-device-only limitations are explicitly reported.
