# First major update on V10.9.1 DEV BASE

## 0.11.0 Beta 1 — TODAY and Coach Engine V0 (2026-09-02)

- Replaced the Home view with a responsive TODAY dashboard for the current local date.
- Added a per-user Daily Check-in for sleep, energy, stress, available time, soreness, notes and pain caution.
- Added deterministic Coach Engine V0 recommendations with visible reason codes and Korean explanations.
- Preserved unknown numeric values as `null`, while keeping a deliberately entered zero distinct from missing data.
- Added today's actual nutrition totals, Planner items and a clear goal-not-configured state without fabricating targets.
- Connected the workout recommendation action to the existing workout recording screen without mutating Planner data.
- Upgraded the persisted schema to version 7 and added Daily Check-in merge, import and account-isolation support.
- Added the TODAY runtime asset to the service worker and runtime manifest and bumped the app to `0.11.0-beta.1`.
- Added seven Coach Engine regression scenarios and completed mobile browser checks for persistence, navigation and horizontal overflow.

## Completion recovery (2026-09-01)

- Constrained every text, number, date, time, select and textarea control to its parent card width, including intrinsic-width mobile Safari date/time fields. Narrow screens now use one-column forms and a stacked Planner date filter.
- Added workout analytics grouped by body part and exercise, with separate max-weight, estimated 1RM and per-record volume PRs. Saving a session now reports how many PR categories were updated.
- Added running analytics that separate distance-weighted average pace, fastest pace, longest distance and total distance, plus badges on the matching run records.
- Redesigned Planner date filtering, plan type selection and plan entry controls for clearer labels and mobile touch targets.
- Redesigned long-term Memory category/content entry and saved-memory cards, and restored high-contrast GARANG AI `계획 추가` actions.
- Changed workout/run certification to explicitly open the media library and added standalone 1080×1350 transparent PNG overlay export, while retaining photo and video composition.
- InBody manual entry now requires only weight, body-fat percentage and skeletal muscle mass. Fat mass, BMI and estimated resting metabolism are calculated live; BMI uses the saved profile height and remains blank when height is unavailable.
- Derived InBody values are read-only, explicitly labelled as automatic estimates and saved with calculation-version metadata so they are not confused with device measurements.
- Historical records without the calculation-version marker remain labelled as recorded values instead of being misrepresented as automatically estimated.
- Kept the flat GitHub Pages runtime and categorized source synchronized so CSS, JavaScript, images, data files, manifest and service worker all resolve from the deployed root.
- Migrated the demo session into the first signed-in account without deleting the guest backup, while keeping non-demo and existing accounts isolated.
- Changed cloud restore from whole-state replacement to record-level merging; unique records are preserved and duplicate IDs select the newest item timestamp.
- Treated `null` and blank numeric values as missing instead of zero, preventing false 0 g targets and invalid score text.
- Versioned the Performance Score formula and prevented legacy scores from being used for new-formula comparisons.
- Replaced empty AI score output such as `null/100` with an explicit insufficient-records response.
- Added focused regression tests and mobile browser coverage for all 13 application routes.

- Preserved every supplied source/data/style/media file; recorded a local Git baseline before editing.
- Corrected document-relative data/image fetch paths after the base's directory rearrangement; fixed launch link and manifest start URL/scope.
- Added schema v3 and resilient storage/import/backup handling, normalized legacy aliases and isolated authenticated caches.
- Replaced fabricated positive empty-state scores with unknown values. Added pure record-based calculations, battery meters and prior-day comparison.
- Implemented Planner date/time/title editing, full-date list, completion/undo/deletion and persistent chat-plan insertion.
- Added seven-field InBody form, image/camera chooser, preview, OCR adapter, explicit review/save, three trend charts and record history.
- Added editable long-term Memory by category, separate from chat history, with a replaceable repository interface.
- Added standalone Achievement screen with actual counts and Planner streaks; added Home Planner/run/body summaries.
- Preserved local rule coaching while labelling its limitations; added LLM context/API boundary, pending/error handling, chat persistence and new-chat race protection.
- Retained FREE/PRO comparison, added checkout interface without fabricated payment success.
- Added menu destinations, exact UI translation catalogue, protected user-authored text from translation, and persistence of selected language.
- Fixed GPS callbacks accessing removed DOM nodes and prevented saving a run with no GPS samples.
- Added responsive battery/chart/form/chat fixes, root-scope PWA worker and static-only caching.
- Added reproducible core/adapter tests and static build checker. Current QA report separates implementation, tested behavior and external blockers.

Historical QA files describe older builds and are retained for provenance. Only `QA_REPORT.md` and `09_docs/qa-data/final-*` refer to this delivery.
# 0.10.0 Beta 1 — Commercial Core and visual system

- Added a single runtime manifest and semantic build identity.
- Added authenticated commercial API contracts, per-user repositories, rate limits, idempotency, migration/export/deletion paths and Firebase security rules.
- Added an agent tool gate that separates read operations from explicitly confirmed write proposals.
- Upgraded Memory and Planner records with origin, confirmation, revisions and deletion tombstones.
- Redesigned the app shell, controls and mobile navigation with a unified commercial visual layer.
- Redesigned workout/running certification preview, composite export and transparent PNG overlay.
- Added CI and 60 passing automated checks while keeping unavailable services visibly disconnected.
# 0.10.0 Beta 2 — Mobile Planner hotfix

- Restored the Planner notification control as a fixed-size, accessible toggle.
- Excluded checkbox, radio and file controls from full-width text-input styling.
- Forced the mobile Planner date filter and action button into one full-width column.
