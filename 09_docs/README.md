# GARANG V9.9 FINAL FEATURE UPGRADE — QA BUILD

This package is based on the supplied GARANG V9.9 feature build and preserves the existing data assets. It is intended to be copied over the V9.9 project root.

## Fixed in this QA build
- Meal builder supports repeated additions plus batch input (`음식명, g`) and automatic DB nutrition totals.
- Meal draft items support edit/remove before saving.
- Workout builder supports multiple exercises per session and edit/remove before saving.
- Workout kcal uses the exercise DB `met_default` when available, then applies a small RPE adjustment with body weight and duration.
- Running kcal remains weight/distance based and GPS route points are rendered on the in-app route preview.
- Certification images are composited onto a canvas before save/share, so the downloaded/shared image contains the GARANG overlay rather than the original image only.
- Video certification attempts real-time canvas + MediaRecorder compositing when the browser supports it; unsupported browsers fall back to original-file sharing.
- AI input auto-grows and is substantially larger on mobile.
- Local coach knowledge assets are actually loaded for retrieval context.
- Existing workout DB, food DB, Korean dialogue assets, FitMind rules/SFT, AI rules and certification SVG assets are preserved.

## Important architecture finding
The supplied build is **not connected to an external web-search system or remote LLM**.
The AI answer path is local JavaScript (`generateAnswer`) and the included JSON/JSONL assets are loaded locally. Loading local knowledge files is not the same thing as external search.

If a future build is supposed to use a remote LLM or search provider, that requires an explicit backend/API integration. This package does not pretend that one exists.

## Firebase
`firebase-config.js` contains the browser Firebase configuration. Browser Firebase config is not a service-account secret, but Authentication providers and the GitHub Pages domain still must be enabled in Firebase Console. This package cannot verify Firebase Console settings from static files alone.

## Static QA performed
- `node --check app.js`
- `node --check sw.js`
- `node --check firebase-config.js`
- Parsed `exercise-db.json` and `food-db.json` successfully.
- Verified all preserved knowledge/data assets remain in the package.
- Searched source for external search/Maps/remote-AI integration; none exists in this build.

## Files intentionally deleted
None.

## Remaining environment-dependent tests
These require the actual deployed GitHub Pages/Firebase environment and cannot be truthfully certified from a ZIP alone:
- Firebase email/Google/Apple authentication against the live project.
- Firestore permission behavior against the live project.
- iOS Safari GPS permission and background behavior.
- iOS Safari file share/download policy.
- Video MediaRecorder codec support on the target iPhone/Safari version.
