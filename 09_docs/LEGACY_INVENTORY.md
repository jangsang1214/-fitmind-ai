# Legacy inventory

The PRODUCT working tree is intentionally **not** an archive.

## Current policy

- `index.html` + `runtime-manifest.json` define the browser runtime.
- Test-only, build-tool, server, native-host, evaluation and compatibility files may remain when they have an explicit consumer.
- Historical V4–V10/V99 UI, Coach, Planner, Workout, style snapshots and one-off migration scripts are not kept beside current source.
- Git history is the canonical archive for removed snapshots and old QA/rebuild evidence.
- Committed `archive/` trees and `scripts/legacy/` are rejected by `scripts/check.cjs`.
- Old FitMind launch/config mirrors and retired mockups are also rejected by the repository-hygiene check.

## Intentionally retained non-runtime files

Examples include:

- `01_app/pwa.js` — exercised by the PWA safety contract.
- `06_features/final/commercial-core.js`, `06_features/final/features.js`, `03_styles/features/final.css`, `03_styles/features/commercial.css` — direct test/compatibility consumers remain.
- `02_core/lifetime-history.js` — historical-data compatibility contract.
- Food ingestion/evaluation corpora and scripts — active data-quality and import tooling.
- `06_features/ai-coach/coach-endpoint.example.js` and config examples — setup/reference templates.

## Cleanup baseline

On 2026-10-02, the repository hygiene pass removed the disconnected legacy/archive source layer after checking runtime manifest ownership, the full test suite reference surface, package scripts and GitHub workflows.

A file being absent from the browser runtime does **not** automatically make it junk; test, tooling, compatibility, server, native and data-pipeline ownership are preserved when verified.
