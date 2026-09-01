# GARANG source of truth

## Canonical release

- Product: GARANG Commercial Core
- Version: `0.10.0-beta.2`
- Channel: Development Build
- Canonical source: this repository on branch `main`
- Canonical deploy root: repository root
- Production preview: `https://jangsang1214.github.io/-fitmind-ai/`
- Download artifact: `GARANG BETA.zip`, generated from the canonical source tree

`GARANG BASE MOBLIE MAX.zip` and earlier V8/V9/V10 files are historical references. They must not replace files listed in `runtime-manifest.json` or be added to `index.html` without a reviewed migration and regression run.

## Runtime entry point

`index.html` is the only browser entry point. `runtime-manifest.json` is the machine-readable list of active local assets. Root-level runtime files are deployable copies; categorized files under `01_app`, `02_core`, `03_styles`, `06_features`, `07_config`, and `services` are maintained source copies and are checked for synchronization.

Historical source remains in categorized folders for auditability. It is inactive unless explicitly listed in `runtime-manifest.json`. Moving historical files is deferred because path churn creates more deployment risk than leaving verified inactive files in place.

## Release gate

Every production candidate must pass:

1. JavaScript syntax and JSON/JSONL validation.
2. Active asset and runtime-manifest validation.
3. Duplicate shell/runtime source detection.
4. Core, adapter, Commercial Core, backend, and regression tests.
5. 280/320/390px and desktop route/overflow checks.
6. ZIP file-by-file verification.
7. GitHub tree equality and live Pages verification.

Backend, remote AI, OCR, monitoring, analytics delivery, and payment remain `NOT_CONNECTED` until an authenticated same-origin API and owner-controlled provider credentials are configured. A disconnected integration must never report success.
