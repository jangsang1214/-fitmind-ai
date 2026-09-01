# First major update on V10.9.1 DEV BASE

## Completion recovery (2026-09-01)

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
