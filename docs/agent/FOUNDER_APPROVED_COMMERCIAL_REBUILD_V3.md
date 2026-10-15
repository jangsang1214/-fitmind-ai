# GARANG Founder-Approved Commercial Rebuild v3

Status: **BINDING VISUAL TARGET — FOUNDER APPROVED 2026-10-15**

This document replaces the previous interpretation that generated boards are merely non-binding quality references **for the specific board approved by the Founder on 2026-10-15**. The approved board is now the visual implementation target for PR #419 and any continuation of this work.

## Source image

Conversation artifact name:

`a_wide_high_resolution_ui_showcase_mockup_collage.png`

Founder instruction:

> 지금 보낸 사진대로 진행해 … 이미지도 지금 시안 넣어서 이거랑 똑같이 나와야해

If a new agent takes over, retrieve the approved image from the 2026-10-15 Founder conversation / handoff bundle and compare every real WebKit screenshot against it. Do not substitute an older Golden Master board or the previously rejected actual PR #419 screenshot.

## Product constraints that remain canonical

- Premium dark GARANG visual language.
- Primary navigation remains **오늘 | 기록 | 코치 | 누적**.
- Golden Path remains **Today → concrete workout → execute/record → GARANG interpretation → next action**.
- Existing routing, state, persistence, workout session/timer/set/rest/save, Meal Scan, Coach writes and Intelligence owners remain canonical.
- Do not invent user measurements, workout history, meal history or recovery data when absent.
- Visual target may use representative imagery to define composition, but production runtime must bind to real app state or an explicit empty state.

## Approved visual grammar

### Global

- 390 px is the composition reference; verify 320 / 360 / 390 / 430.
- Near-black background, graphite panels, restrained indigo/blue gradient primary actions.
- One strong visual anchor per screen. No developer-dashboard card soup.
- 16–20 px outside gutter at 390 px, 12–16 px on smaller widths.
- Major vertical rhythm 20–28 px; card internal rhythm 12–18 px.
- Primary surfaces use 16–22 px radii and quiet 1 px borders.
- Large Korean display copy is left aligned, compact and intentional. Avoid tiny English labels dominating the hierarchy.
- Supporting labels use muted gray; important numbers/actions use white; accent is reserved for current state / primary action.
- Touch target minimum 44 px; primary CTA 52–58 px.
- Bottom navigation visually light, fixed, four equal tabs; active tab uses indigo emphasis without oversized pill geometry.

### 01 Today

Approved composition:

1. Compact top chrome.
2. Date/context.
3. Large decisive headline: user immediately understands today's action.
4. Dominant workout/action hero with relevant body/training imagery and one **운동 시작** CTA.
5. Three compact readiness/status indicators.
6. Short GARANG Coach interpretation.

Do not lead with a generic score graph. Score/readiness is evidence below the decision, not the product's main action.

### 02 Workout execution

Approved composition:

1. Workout title and compact muscle/equipment context.
2. Exercise visual/hero occupies meaningful space.
3. Strong `SET 1 / N` state.
4. Previous vs target context in two compact cells.
5. Weight / reps are balanced, large and easy to manipulate.
6. Full-width **세트 완료** primary CTA.
7. Next-set context below.

Once session is LIVE, preparation/configuration controls must collapse or move behind secondary disclosure. LIVE execution must be visually unmistakable.

### 03 Exercise record

Approved composition:

- Compact tabs: 기록 / 분석 / 가이드.
- Set list is the main content.
- Completed sets are clearly checked.
- Current set has indigo emphasis and large editable weight/reps.
- Future sets are quiet.
- Full-width **세션 완료** action at bottom.

### 04 Rest timer

Approved composition:

- Rest state takes over the screen rather than appearing as a small overlay on top of clutter.
- Large circular timer centered and dominant.
- Set progress immediately above/below.
- `+30초 추가` and `건너뛰기` are clear secondary controls.
- Next exercise/set card shows real next movement, weight and reps when known.
- Short GARANG Coach cue may appear at bottom.

### 05 Session summary

Approved composition:

- Celebration is restrained and premium.
- Duration / total sets / total volume / average RPE as 2×2 compact metrics.
- Anatomy/muscle response visual is prominent.
- GARANG interpretation explains what changed and what to do next.
- Secondary `루틴에 저장`, primary `다음 추천 보기`.

### 06 Nutrition

Approved composition:

- One large meal-photo hero and **음식 사진으로 기록하기** as the primary action.
- Barcode / nutrition label are compact secondary actions.
- Today's intake progress and meal history below.
- Empty state must still feel complete; never show a huge blank placeholder or fake meal/photo.

### 07 Body

Approved composition:

- Anatomy is the dominant visual, not squeezed between cards.
- FRONT / SIDE / BACK switch is compact and obvious.
- Front/back anatomy model may share the hero when composition allows; on constrained widths prioritize one model cleanly.
- Muscle activation bars / selected muscle evidence sit beside or immediately below the model.
- Weight / skeletal muscle / body fat metrics form a clean footer row.
- No developer legend fragments, overlapping metrics or unreadable anatomy.

### 08 Coach

Approved composition:

- Conversation-first screen with compact identity header.
- Existing messages occupy the canvas; avoid a large empty black gap.
- Suggestion chips fit or scroll intentionally.
- Composer is anchored, premium and obvious.
- Coach does not become owner of Today/Workout/Nutrition writes.

### 09 History

Approved composition:

- Category tabs, calendar, selected-day summary and high-signal month summary.
- Keep detail dense but not dashboard-like.

### 10 Settings

Approved composition:

- Compact profile row.
- Simple list rows with strong alignment and one clear trailing value/action.
- No oversized cards around each setting.

## Acceptance contract

The redesign is not considered visually complete merely because DOM/interaction tests pass.

Required before merge:

1. Real WebKit screenshots from the exact PR head for Today, Workout LIVE, Rest, Nutrition, Body and Coach.
2. Founder-target comparison at 390 px.
3. No obvious misalignment, random card widths, clipped text, developer leftovers, unexplained blank space, overlapping controls or weak action hierarchy.
4. 320 / 360 / 390 / 430 structural + touch regression GREEN.
5. Golden Path / Meal Scan / Coach / Recovery / runtime stability GREEN.
6. Exact-head Release Gate FULL GREEN.
7. Main drift = zero before merge.

## Handoff rule

If conversation capacity becomes risky, stop code changes at a safe commit, update this file with:

- current PR head SHA
- exact latest gate and failing step if any
- files changed in this rebuild pass
- completed screen targets
- remaining screen targets
- latest real screenshot artifact run ID
- next smallest safe action

Then provide the Founder a short handoff prompt that tells the next agent to run `PROJECT START`, open PR #419, read this file first, recover the approved image from the project conversation/handoff bundle, and continue until screenshot parity + FULL GREEN.