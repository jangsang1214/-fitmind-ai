# GARANG Repository Layout

The repository root is intentionally minimal because GitHub Pages, npm and Firebase need a few root entry files. Runtime source belongs to categorized folders.

- `01_app/` — canonical application shell/runtime
- `02_core/` — schema, core logic and service-worker runtime
- `03_styles/` — active styles in `runtime/`, historical styles in archive/core/features
- `04_data/` — knowledge/data assets
- `05_assets/` — brand and media assets
- `06_features/` — feature modules; UI is under `06_features/ui/`
- `07_config/` — Firebase, manifest and service configuration
- `08_business/` — business/pricing material
- `09_docs/` — documentation, QA and legacy root archive
- `services/` — reusable service modules
- `backend/`, `functions/` — server code
- `tests/`, `scripts/` — validation and repository tooling

Root runtime duplicates are forbidden by `scripts/check.cjs`.
