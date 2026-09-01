# GARANG first major update — completed candidate

This package keeps the recovery build's flat GitHub Pages runtime and categorized source tree while fixing the release-blocking data regressions found during independent validation.

## Release fixes

- Migrates demo records into the first authenticated account cache without deleting the guest backup.
- Keeps a new non-demo account isolated from unrelated guest records.
- Merges local and cloud record collections by stable IDs instead of replacing an entire state from a partial emptiness check.
- Treats null and blank numeric values as missing so profile fallbacks work correctly.
- Returns an explicit insufficient-data coach response instead of `null/100`.
- Versions Performance Score history so legacy and current formulas are not compared as a real user trend.
- Precaches the PWA registration script and manifest in the root-safe service worker.
- Adds release-specific regression tests and root/source synchronization checks.

No API key, payment provider, OCR backend, or LLM backend is introduced. Those integrations remain explicit same-origin service adapters and require separate authorized production configuration.
