# GARANG Workout Intelligence — 2026-09-06

## User feedback addressed

1. Coach prompts must not collapse into the same answer.
   - `계획 만들기` -> a concrete generated workout routine.
   - `회복 상태` -> recovery/readiness only.
   - `오늘 운동 강도` -> target RPE and volume recommendation.
   - `최근 운동 분석` -> body-part workload, sets and average RPE rather than only the latest exercise name.

2. One exercise can use different weights/reps/RPE by set.
   - The optional `세트별 중량 입력` tool creates multiple canonical one-set draft records through the existing `#addWorkout` action.
   - No hidden rewrite of `workoutDraft` or stored workout state is used.
   - Pyramid, drop and warm-up/work sets can therefore be entered in one batch while existing session save behavior remains intact.

3. Today gains a Daily Workout generator.
   - User chooses target body part, available minutes and intensity.
   - GARANG combines today's check-in with the last 7 days of body-part load.
   - Generated routines can be loaded into the existing Workout draft through the canonical Add action.

## Recommendation safety rules

- A generated suggestion never automatically increases a known exercise weight above the user's latest logged weight.
- If readiness is low, a requested hard session is capped to a lower RPE/volume.
- If the selected target matches a high-soreness area, target RPE and volume are reduced.
- Missing data is surfaced as missing data; no recovery score is fabricated.
- This engine is performance guidance, not medical diagnosis.

## Architecture

- Pure deterministic core: `02_core/workout-intelligence-v1.js`
- UI integration: `06_features/ui/runtime/garang-workout-intelligence-ui-v1.js`
- Regression suite: `tests/workout-intelligence-v1.test.cjs`

The existing `01_app/app.js`, Memory/State/Decision Intelligence and persisted schema are intentionally preserved. This feature is additive and can be removed without migrating stored user data.
