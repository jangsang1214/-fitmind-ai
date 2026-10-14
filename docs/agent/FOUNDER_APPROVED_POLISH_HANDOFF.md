# Founder-approved Commercial Polish — Handoff

## Current line
Branch: `design/founder-approved-commercial-polish`
Base: PRODUCT main `62c008e8cb6e7f4219682b3f0b5ee71261de80e1`

## Source of truth
- `docs/GARANG_VISUAL_REFERENCE.md`
- `docs/GARANG_PRODUCT_UI_SYSTEM.md`
- `docs/GARANG_WORKOUT_EXECUTION_SPEC.md`

External/generated visual boards are quality references only unless Founder explicitly approves them as implementation source of truth.

## Intent
Raise the approved premium dark GARANG UI/UX v2 system to commercial-product finish quality without introducing a competing shell or changing canonical state/action ownership.

## Changed scope
- additive commercial polish CSS for Today / Workout / Nutrition / Body / Coach / chrome
- version loader loads the polish exactly once
- dedicated WebKit regression asserts approved four-tab navigation, no competing Golden Master shell, no horizontal overflow at 320/360/390/430
- Release Gate runs the new polish regression
- durable commercial quality checklist added

## Guardrails
- no new router owner
- no new state/save owner
- no new recommendation owner
- no Golden Master five-tab replacement shell
- Workout execution, Meal Scan, Coach send, Body, Today remain canonical
- exact-head FULL GREEN required before merge

## Next
1. Open PR from this branch.
2. Run exact-head Release Gate.
3. Fix only evidence-backed blockers.
4. When FULL GREEN, perform visual QA against the Founder-approved GARANG direction at 320/360/390/430.
5. Request Founder merge approval only after both functional and visual gates are satisfied.
