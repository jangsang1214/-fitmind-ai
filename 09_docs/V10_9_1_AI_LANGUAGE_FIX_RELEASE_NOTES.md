# GARANG V10.9.1 MOBILE BUGFIX RELEASE

Base: GARANG_10_9_RUNTIME_FIX_v2

## Fixed
- AI Coach dark-theme contrast bug: AI response text is now explicitly styled for readable contrast.
- AI Coach composer/placeholder/avatar/button contrast stabilized on iPhone Safari.
- Added missing mobile CSS variables used by the ChatGPT-style coach layout.
- Language switching is now bidirectional (KO <-> EN) instead of one-way.
- Expanded KO/EN translation coverage across navigation, AI Coach, Dashboard, Workout, Nutrition, Running, Planner, InBody, Score, Premium and Settings.
- Menu drawer is rebuilt from the current language each time it opens, so it cannot remain in a stale language.
- AI Coach local responses now return English when the app language is English.
- Menu body scroll is stabilized on mobile while the drawer is open.
- Existing routing, InBody save flow, Planner, Performance Score, local persistence and payment-safe behavior were left intact.

## Intentionally not changed
- Real LLM backend: still local/rule-based in this release.
- Real payment provider: no fake payment success was added.
- Firebase/Health/Watch/background push: platform/server integration remains separate work.

## QA
- All JavaScript files: `node --check` passed.
- Index local asset references: 0 missing.
- Static duplicate HTML/source IDs: 0.
- Route target validation: all declared navigation targets map to existing pages.
- Runtime device-specific checks still require an actual iPhone Safari session.
