# GARANG Memory Intelligence Stage 3

## Status target
Stage 3 closes the first Personal Intelligence loop:

Memory Intelligence -> User State / Pattern Intelligence -> Decision Intelligence -> Coach context -> Action proposal -> explicit user confirmation -> application state write.

## Decision contract
Engine: `decision-intelligence-v1`

Modes:
- `collect_data`: insufficient current evidence; do not create a plan proposal.
- `caution`: pain/caution signal; block automatic training intensity proposal.
- `recover`: recovery-first choice when load/fatigue/readiness signals strongly disagree with normal training.
- `reduce`: reduce intensity/volume.
- `maintain`: keep planned training level.
- `progress`: allow only a small controlled progression when readiness/load/fatigue evidence is stable and sufficiently confident.
- `goal_focus`: train, but make the next action more aligned with the current goal.

Every plan proposal generated from a decision carries `decisionEngineVersion`, `decisionMode`, reason codes, intensity/volume scales, and remains pending until the existing Agent confirmation gate approves it.

## Guardrails
- No silent mutation.
- Pain/caution dominates progression signals.
- Missing data remains unknown instead of generating a fabricated score or recommendation.
- Decision outputs are deterministic and explainable.
- This engine is not a medical diagnostic system.
- Browser and Firebase Functions implementations must remain parity-tested.

## Visible app behavior
Coach shows a persistent `GARANG 판단 / GARANG DECISION` card above recommended prompts. It displays the current mode, confidence, readiness/fatigue/load bands, and a plan-proposal button when a safe proposal exists. The button only sends a plan request; the actual Planner write still requires user approval.

## Enterprise boundary
`backend/src/intelligence-contract.cjs` defines `garang-personal-intelligence-v1`, a tenant- and subject-scoped compact intelligence envelope. It carries only Memory context, User State, and Decision output, not raw workout/run coordinates or local chat logs. This is an SDK/API contract foundation, not a claim that enterprise production hosting is complete.

## Automated completion criteria
- Decision browser/server parity.
- Deterministic decision benchmark >= 95% on the frozen golden cases.
- Decision-to-Agent E2E confirms no write before approval and no plan on collect-data/caution modes.
- Existing Memory, State, Sync, Security, i18n, UI and build regressions remain green.
- Main release gate and Pages deployment succeed after merge.

## Manual device checks after merge
1. Open Coach and confirm the decision card is visible above persistent prompts.
2. With sparse/no recent data, confirm the card says more data is needed and no plan button is shown.
3. Add a current check-in and several recent records; reopen Coach and confirm mode/confidence changes without app restart if state changes.
4. When a plan button appears, tap it. A normal Coach message and an Action Proposal should appear; Planner must remain unchanged before approval.
5. Reject the proposal and confirm Planner remains unchanged.
6. Repeat and approve; confirm exactly one Planner item is created and survives app restart/sync.
7. Switch Korean/English and confirm the decision card and proposal text switch fully without mixed-language fragments.
8. Test account switching and confirm no decision from the previous account appears.
9. Test offline save/reopen/online recovery and confirm the created Planner item is not duplicated.
10. If a pain/caution check-in is available, confirm no automatic plan proposal is offered.
