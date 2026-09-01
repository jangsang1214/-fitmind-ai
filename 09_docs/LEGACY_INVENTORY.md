# Legacy inventory

The only active entry point is /index.html, governed by /runtime-manifest.json.

| Area | Status | Rule |
| --- | --- | --- |
| Flat root runtime | Active | GitHub Pages deployment source |
| Categorized copies under 01_app–09_docs | Maintained source mirror | Exact-copy checks protect synchronized modules |
| Historical V8/V9/V99 or stability/integrated variants | Legacy only | Must never appear in the active runtime manifest |
| Recovery ZIPs and comparison artifacts outside this directory | Evidence only | Never imported by the runtime |
| Server reference under /backend | Development foundation | Not served by GitHub Pages and not represented as connected |

CI rejects a missing runtime asset, a package/manifest version mismatch, an unsynchronized maintained copy, and activation of named historical runtime families.
