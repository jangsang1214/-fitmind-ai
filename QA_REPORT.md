# QA REPORT — V10.9.1 DEV BASE first major update

**Disposition: V10.1 CORE BLOCKED (development candidate).** Feature implementation is delivered, but production certification is blocked on real provider configuration and physical iPhone testing. “BLOCKED” does not mean missing ZIP or missing source.

Test date: 2026-08-31, Asia/Seoul. Base: the user's local `GARANG_V10.9.1_DEV_BASE.zip`, not the earlier GitHub checkout. Browser: Codex in-app Chromium on Windows; local HTTP server. Test records were synthetic and stored only in that browser, never seeded into the delivered application.

## Reproducible automated tests

- `node tests/core.test.cjs`: **15 PASS**. Empty scores, aliases, migration idempotence, malformed collections, strict import rejection, future schema, corrupt-source preservation, backup/restore, storage quota failure, score date/session rules, achievement streaks, context fields, legacy-memory deletion, impossible dates and unsafe numeric content.
- `node tests/adapters.test.cjs`: **8 PASS**. Disconnected LLM/payment, invalid OCR files, untrusted endpoint rejection, invalid response/HTTP errors, independent Memory CRUD and Planner edits. The response/HTTP tests use explicit **unit stubs**, not a real backend and not production mock success.
- `node scripts/check.cjs --build`: **PASS**. Checks every JS/CJS syntax, JSON/JSONL parse, active entry assets, shell duplicate IDs and a narrow no-eval rule; creates static `dist/`. Machine counts and full scope are in `09_docs/qa-data/final-static.json`.

## Actual browser actions

| Flow | Result | Observed evidence |
|---|---|---|
| Home / sidebar / bottom navigation | PASS | 13 routes exercised through visible buttons |
| Planner | PASS | Add; edit title/date/time; completion; reload; undo; delete |
| InBody manual records | PASS | Two dates, weight/fat/muscle fields saved; 72.5 → 71.8 kg trend; reload retained records |
| InBody image | PASS | Test PNG chosen through file chooser; visible image preview; unconfigured OCR displayed explicit error; no automatic record |
| Actual OCR extraction | BLOCKED | No OCR backend supplied |
| Memory | PASS | Add, edit, reload, delete, backup restore; original mixed-language user text preserved |
| Score | PASS | Empty state unknown; recorded workout/meal/body changed score; battery UI rendered; no fabricated prior-day delta |
| Achievement | PASS | First workout/meal/body/plan reflected actual test records; 10/50-session and 7-day logic also covered by unit tests |
| AI local rule coach | PASS | Explicit “not an LLM” label; suggestion; persisted conversation; plan added to Planner; new chat; reload remains empty |
| Actual LLM calls | BLOCKED | No LLM backend supplied |
| Workout regression | PASS | Exercise DB selection, draft insertion, kcal calculation, session save and reload |
| Nutrition regression | PASS | Chicken breast DB values (109 kcal / 23g protein per 100g), draft/save/reload |
| Running screen | PASS | Route, empty state and controls render; DOM callbacks guarded when route changes |
| Real GPS/background tracking | BLOCKED | No live location permission or physical outdoor run performed |
| Settings / profile / plan comparison | PASS | Screens, controls and routes render |
| Backup / restore | PASS | Create backup, delete test memory, restore through in-app confirmation, memory returns |
| Import parser/corrupt data | PASS (unit) | Reject malformed input before replacement; backup and recovery tests. Browser file-import end-to-end not separately executed |
| Korean ↔ English | PASS | KO → EN → reload; EN → KO → reload; menus/new feature labels; user content preserved |
| FREE / PRO failure path | PASS | Upgrade click displayed no-service error; no PRO granted |
| Real payment / entitlement | BLOCKED | No provider or webhook supplied |
| Firebase sign-in/cloud sync | BLOCKED | Config preserved; no real account/console access used |
| Camera / OS share / video | BLOCKED | Existing implementation preserved; no physical camera/share/codec certification |

## Mobile regression

**52 viewport-route checks PASS:** 320×760, 375×812, 390×844, 430×932; 13 screens each: Home, Workout, Nutrition, Running, Planner, AI Coach, Profile, InBody, Score, Memory, Achievement, Settings, FREE/PRO.

Each check inspected rendered main/header/nav element bounds and all DOM IDs. No element exceeded viewport bounds in those inspected regions, and no duplicate IDs were found. This is stronger than checking `scrollWidth` alone because the base CSS hides horizontal overflow. Representative screenshots are included. Physical iPhone Safari, input zoom and software-keyboard behavior remain BLOCKED on device access.

## Required final classifications

| Check | Status | Scope / limitation |
|---|---|---|
| JS syntax errors | PASS | All delivered JS/CJS checked |
| Build errors | PASS | Static validation/build completed |
| Runtime console errors | PASS | No errors/warnings in final tested browser session and observed flows; not all possible interactions |
| Missing imports/assets | PASS | Active entry script/style/data paths resolve; dormant modules classified separately |
| Broken routes | PASS | All 13 active routes reached via UI |
| Duplicate IDs | PASS | Shell check plus 52 rendered page checks |
| Undefined functions / event errors | PASS in tested flows | No exceptions in exercised flows; static syntax cannot prove every historical code path |
| localStorage errors | PASS | Persistence flows; unit quota/unavailable/corrupt cases |
| Migration errors | PASS | Explicit unit cases; unknown legacy versions require source-specific mapping |
| Mobile overflow | PASS | Listed Chromium viewport bounds checks |
| UI regression | PASS in tested flows | Working workout/nutrition/auth shell preserved; native capabilities not certified |
| Production launch | BLOCKED | See `REMAINING_WORK.md` |

## Issues found during QA and fixed

1. Classic-script data fetches were relative to the script folder instead of the document base; corrected.
2. Empty accounts showed positive scores; replaced with unknown categories.
3. Whole-page substring translation could change user-authored text; replaced with exact UI translation and protected text regions.
4. Deleted migrated memories could return on reload; migration completion marker added and tested.
5. GPS callbacks could access removed DOM nodes; guarded; no GPS sample means no saved run.
6. Native browser confirmation blocked automation; restore/import/reset now use accessible in-app dialogs. Backup restore was then re-tested successfully.

No test result here certifies unavailable live services or dormant legacy features. Historical QA files remain unchanged for provenance and do not apply to this build.
