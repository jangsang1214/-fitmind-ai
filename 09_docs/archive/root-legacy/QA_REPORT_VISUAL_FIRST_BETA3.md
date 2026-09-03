# GARANG Visual-First Commercial UX QA

Build: 0.11.0-beta.3
Date: 2026-09-03
Base: GARANG_VISUAL_FIRST_COMMERCIAL_CORE_0.11.0-beta.2

## Product scope
- TODAY visual hierarchy refinement
- Workout human-body-first UI + muscle filters + visual exercise library
- Nutrition camera-first flow retained and simplified
- Settings / language / unit / FREE-PRO / data controls preserved
- Certification overlay runtime intentionally not redesigned in this package

## PASS
1. `app.js` JavaScript syntax
2. `sw.js` JavaScript syntax
3. `garang-services-config.js` JavaScript syntax
4. `index.html` local runtime references: missing 0
5. Dynamic template render smoke test: TODAY
6. Dynamic template render smoke test: LOG
7. Dynamic template render smoke test: WORKOUT
8. Dynamic template render smoke test: NUTRITION
9. Dynamic template render smoke test: SETTINGS
10. Dynamic template duplicate-ID check
11. Workout front/back body visual present
12. Workout muscle region filters present
13. Workout visual exercise cards present
14. Nutrition Meal Scan camera stage present
15. Settings language selector present
16. Settings units selector present
17. FREE / PRO comparison present
18. Cloud Sync controls present
19. Profile → Settings route retained
20. Bottom navigation TODAY / COACH / LOG / PROGRESS retained
21. Certification runtime block byte-for-byte unchanged from beta.2
22. Service Worker cache version bumped to prevent stale beta.2 shell
23. 320px Chromium static-template render: TODAY/WORKOUT/NUTRITION/SETTINGS overflow 0
24. 375px Chromium static-template render: TODAY/WORKOUT/NUTRITION/SETTINGS overflow 0
25. 390px Chromium static-template render: TODAY/WORKOUT/NUTRITION/SETTINGS overflow 0
26. 430px Chromium static-template render: TODAY/WORKOUT/NUTRITION/SETTINGS overflow 0

## BLOCKED / external verification required
- Full app browser navigation against localhost/file URL is blocked by this execution environment's browser administrator policy. Individual generated templates were rendered in Chromium for layout QA, but this is not a substitute for full runtime E2E.
- Real iPhone Safari keyboard/safe-area/device QA.
- Firebase authenticated read/write, cross-account isolation, offline→online Cloud Sync E2E.
- n8n/OpenAI real Agent response.
- Vision API real Meal Scan recognition.
- Real payment provider / webhook / entitlement.

## Regression note
Workout/Running certification functions (`certInfo`, `showCert`, `shareMedia`) were deliberately kept unchanged. New transparent-overlay design is excluded from this source package by product-owner request.

## Release label
Commercial Core Beta Candidate — not Production Release until the blocked E2E checks pass.
