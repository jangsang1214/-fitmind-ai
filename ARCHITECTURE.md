# GARANG DEV BASE — first major update

## Authoritative base

The user-supplied **GARANG_V10.9.1_DEV_BASE.zip** is the sole implementation base. The earlier GitHub checkout was not used. The V10.1 first-major-update specification is the feature checklist; the version labels do not imply a downgrade to an unavailable V10.1 ZIP.

All original archive files remain. Original Firebase configuration and knowledge/media assets are preserved. Historical files are retained but not activated indiscriminately: several expect an older DOM and competing global routers.

## Runtime dependency graph

`index.html` loads existing theme CSS, Firebase compatibility SDK/config, legacy snapshot contract, then translations → schema → storage/performance → backend configuration/adapters → record services → feature renderers → `01_app/app.js` → PWA registration.

| Layer | Responsibility |
|---|---|
| `01_app/app.js` | Existing app lifecycle, auth, routes, workout/meal builders, GPS, image/video certification; integration with new services |
| `02_core/data-schema.js` | Schema v3, legacy aliases, type normalization, input-boundary validation |
| `services/storage.js` | Local repository, pre-migration copy, corrupt-data quarantine, backup/import/restore/reset |
| `services/performance.js` | Pure 30-day scores and achievement calculations; no render side effects |
| `services/records.js` | Planner and Memory CRUD repositories independent from DOM |
| `services/adapters.js` | Same-origin LLM, OCR, payment interfaces and bounded context builder |
| `06_features/final/features.js` | Planner, InBody, Score, Memory, Achievement, chat views and DOM bindings |
| `04_data/ui-*.js` | Existing translation catalogue plus additions; exact UI text and anchored dynamic patterns |
| `03_styles/features/final.css` | Additive responsive fixes, battery meters, charts, keyboard viewport sizing |
| `07_config/services-config.js` | Backend endpoint configuration; no API keys in client code |
| `sw.js` | Root-scope static-asset cache only; APIs, external origins and user records excluded |
| `09_docs` | Source classification, historical reports and current QA evidence |

No framework or bundler is required. `node scripts/check.cjs --build` validates and creates a static `dist/` package. `npm run lint` is a dependency-free syntax/asset/data/no-eval check, not ESLint or a proof of every possible undefined identifier.

## Data contract

The base app's names are canonical to avoid rewriting working record flows:

- User: `profile` (`name`, `age`, `height`, `weight`, `goal`, optional `runningGoalKm`). Weight is kg; height cm.
- Workout: `workouts` with `id`, `sessionId`, local calendar `date`, `name`, `sets`, `reps`, lifted `weight`, `rpe`, duration minutes, estimated `kcal`, `volume`.
- Nutrition: `meals`, each containing `items` with grams/kcal/protein/carbs/fat and summed totals.
- Running: `runs`, distance km, duration minutes, pace min/km and GPS coordinate samples.
- InBody: `body`, date, `weight`, `muscle`, `fatMass` kg, `bodyFat` percent, `bmi`, `bmr` kcal. Missing measurements are null, not invented zeros.
- Planner: `planner`, id/date/time/title/type/done/notify; source references make chat-plan insertion idempotent.
- Performance: derived score and dated `scoreHistory`.
- Memory: editable `memory.entries` categories, separated from `aiChats`; original events/facts/preferences/goals retained. Migration marker prevents deleted legacy memories returning.
- Achievement: derived from real session/record counts, consecutive completed Planner dates, and running distance goal (default 5 km).

`weight/bodyWeight/body_weight/체중` aliases on profile/InBody are normalized at the migration boundary. Unknown top-level fields survive migration. Failed or future-schema loads preserve raw source and block overwrite until restore/import/reset. Successful legacy migration keeps a `.pre-migration` copy. Import validates before replacement and saves a backup. Browser localStorage is not encrypted; users should export important data and treat exports as sensitive.

The legacy guest key is `garang_v99_state_v2`. Authenticated local caches are isolated as `garang_account_<uid>`. Cloud synchronization uses the existing Firebase users collection. Last-write timestamps are only a basic conflict strategy, not a distributed merge system; see remaining work.

## Scores and backend truthfulness

Scores describe **recording and plan adherence**, not medical health or physique quality. Exercise target: 12 distinct sessions/30 days; nutrition: 30 logged days; recovery: completion ratio of recovery plans; activity: 20 active days; body: 3 weight records. Values are capped at 100; unknown categories stay null and are excluded from the mean. Formula and renderer are separate. Historical comparison uses the preceding recorded day; no prior observation means no invented delta.

Without an LLM endpoint, the preserved local rule coach remains available and is explicitly labelled “not an LLM.” It never claims remote AI execution. OCR and checkout fail clearly when unconfigured. OCR results populate editable fields only; the user must confirm a separate save.

## API contracts

Configure same-origin routes in `07_config/services-config.js`. Implement authentication, rate limits, authorization, CSRF/origin checks and secrets on the server. Do not put provider keys in this file.

- `POST llmEndpoint`: `{context, messages:[{role,content}], language}` → `{text:string, plans?:[{title,date,time,type}]}`. Context includes recent workouts/meals/runs/body/planner, score, profile and explicit memories. UI requires opt-in before sending to configured LLM backend.
- `POST ocrEndpoint`: multipart `image` (max 10 MB) → `{measurements:{date?,weight?,muscle?,fatMass?,bodyFat?,bmi?,bmr?}}`. No automatic persistence. Server must verify file type and enforce resource limits; client checks are not a security boundary.
- `POST paymentEndpoint`: `{product:'GARANG_PRO'}` → `{checkoutUrl:'https://...'}`. Provider webhook must verify payment and store server-owned entitlement. Client does not grant PRO from the checkout response.

Firebase browser configuration is preserved. Actual email/Google/Apple provider enablement, authorized domains and Firestore rules must be checked in the owner-controlled project before production.
