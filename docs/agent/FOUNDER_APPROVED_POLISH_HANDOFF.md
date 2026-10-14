# Founder-approved Golden Master Board — Handoff

## Current line
Branch: `design/founder-approved-commercial-polish`
Base: PRODUCT main `62c008e8cb6e7f4219682b3f0b5ee71261de80e1`
Active PR: `#419`

## Founder-visible source of truth
The latest Founder-approved Golden Master board is the visible product target.

Required primary surfaces:
- Home
- Recovery
- Training
- Nutrition
- Coach

Required visual grammar:
- light iOS-style canvas
- white/light-gray cards
- blue active navigation state
- restrained premium hierarchy
- fixed five-tab Home / Recovery / Training / Nutrition / Coach navigation

The older dark four-tab UI/UX v2 remains useful as a canonical capability/regression baseline, but it is no longer the target presentation shell.

## Golden Master screen contract

### Home
- Good Morning / daypart greeting
- bell + profile avatar
- large green Recovery Score hero
- separate Sleep / Training / Nutrition cards

### Recovery
- Today / Trends / Insights
- green semi-ring recovery score
- separate HRV / Resting HR / Sleep cards with trend sparklines

### Training
- date controls
- strong workout hero treatment
- workout title / duration / exercise count
- START WORKOUT overlay CTA
- exercise rows with visual thumbnails

### Nutrition
- Today / Analysis / History
- multicolor calorie ring
- Protein / Carbs / Fat cards
- Today’s Meals list with visual thumbnail / kcal / time evidence

### Coach
- chat-first surface
- GARANG Coach message
- four quick prompt chips
- bottom composer

## Canonical capability boundary
The Golden Master Board is presentation/discovery only. It must not create duplicate product owners.

Existing canonical owners remain authoritative for:
- Workout execution / timer / set completion / rest / save
- Meal Scan / food confirmation / meal save
- Coach send / model invocation / action application
- state and persistence
- routing and intelligence

Board actions enter those canonical execution/write surfaces through `garang-golden-master-board-continuation-v1.js`.

## Runtime / QA rule
Production defaults to the Golden Master Board.
Localhost keeps the canonical regression surface by default so the existing deep capability suite can test the underlying owners without a presentation overlay; `?golden-board=1` explicitly runs the production presentation locally and is required by the Golden Master board regression.

This split is a QA boundary, not a second product direction.

## Verification required before merge
- exact-head Release Gate FULL GREEN
- Golden Master board regression GREEN at 320 / 360 / 390 / 430
- exactly five primary board tabs
- no horizontal overflow / clipping / bottom-nav touch interception
- Golden Path GREEN
- Workout execution regression GREEN
- Meal Scan regression GREEN
- Coach regression GREEN
- Recovery / Check-in regression GREEN
- Settings / menu touch GREEN
- mobile runtime stress GREEN
- no main drift
- Founder review and explicit merge approval

## Known visual gap
Training currently uses an existing repository anatomy visual as the hero/thumbnail asset. Structure, hierarchy and interaction can be verified in CI, but true photographic parity with the approved board is not considered visually VERIFIED until the final visual asset/runtime is inspected.

## Next
1. Let the latest exact-head Release Gate complete.
2. Fix only evidence-backed blockers on PR #419.
3. Keep PR #419 Draft until the Golden Master board and canonical regressions are GREEN.
4. Confirm visual parity separately from structural/functional GREEN.
5. Request Founder merge approval only after both are satisfied.
