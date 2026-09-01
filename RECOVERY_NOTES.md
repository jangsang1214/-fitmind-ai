# GARANG V10.9.1 Major Update Recovery

Root cause addressed: the major update changed the deployment entrypoint from the previously flat GitHub Pages layout to a categorized directory layout (`01_app`, `03_styles`, `05_assets`, etc.). The delivered build itself contained those files and passed local tests, but deploying only/replacing root files while the live repository retained the old flat layout makes the new `index.html` request nested assets that are absent on Pages. The visible result is unstyled HTML plus a broken GARANG logo.

Recovery strategy:
- Preserve the categorized source folders.
- Restore a flat, root-level runtime shell for GitHub Pages compatibility.
- Make all active CSS/JS/icon/knowledge paths root-relative (`./...`).
- Replace PWA registration with a project-Page-safe root scope.
- Bump and simplify the service worker cache, delete stale GARANG/FitMind caches on activation, and use network-first navigation.
- Keep the major-update feature implementation; do not revert to the old feature set.

Deploy the CONTENTS of this folder to the repository Pages branch root. Do not upload only `index.html`.
