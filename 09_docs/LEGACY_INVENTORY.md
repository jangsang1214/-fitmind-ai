# Legacy / source inventory

The only active browser entry point is `/index.html`, governed by `/runtime-manifest.json`.

Repository files use four explicit classes:

| Class | Rule |
| --- | --- |
| Active runtime | Listed by `runtime-manifest.json` or dynamically loaded by an active runtime owner |
| Test / tooling | Used by package scripts, CI, tests, migration/import tooling, or explicit examples |
| Compatibility / evidence | Retained because historical-data compatibility, provenance, validation, or release evidence still depends on it |
| Dead / orphan | No runtime, dynamic-load, test, tooling, compatibility, or evidence role; delete it |

As of 2026-10-02, historical source archives, disconnected V8/V9/V99 UI/runtime families, obsolete launch/config duplicates, and unused visual assets were removed from PRODUCT. Git history is the archive.

`scripts/check.cjs` fails CI if those retired source families or known orphan assets/configs are reintroduced.

Do not create new `archive/`, `legacy/`, backup-copy, version-snapshot, deploy-marker, or superseded runtime files inside PRODUCT. Durable project history belongs in Git history and CONTROL state, not copied source trees.
