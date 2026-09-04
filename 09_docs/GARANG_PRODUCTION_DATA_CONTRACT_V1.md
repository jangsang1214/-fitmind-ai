# GARANG Production Data Contract v1

Status: **FROZEN BEFORE LIVE SERVER / LLM CONNECTION**  
Contract ID: `garang-state-v1`  
Schema version: `8`

## 1. Purpose

GARANG's active UI may keep local implementation names for backward compatibility. External boundaries must not depend on those names directly.

Every server, LLM, OCR, analytics, migration or future native-client boundary must consume data produced by:

- `GarangSchema.migrate(state)` for canonicalization
- `GarangSchema.toTransport(state)` for outbound transport
- `GarangSchema.assertContract(state)` when a canonical state must be enforced

This prevents future server/provider work from forcing a rewrite of the active app state.

## 2. Canonical top-level state

The transport contract contains:

- `contractVersion`
- `schemaVersion`
- `profile`
- `userModel`
- `workouts`
- `meals`
- `runs`
- `body`
- `planner`
- `dailyCheckins`
- `memory`
- `aiChats`
- `scoreHistory`
- `plan`
- `language`
- `settings`
- `updatedAtMs`

Operational UI-only containers such as `meta`, `preferences`, `checkins`, `aiChat`, `onboarding`, `actionLog`, `analytics`, and `errors` are not part of the outbound production contract.

## 3. Stable aliases accepted at the boundary

To protect existing user data, migration accepts the current app's local names and converts them without requiring a UI refactor:

| Current/local field | Canonical field |
| --- | --- |
| `onboarding` | `userModel` |
| `checkins` | `dailyCheckins` |
| `aiChat` | `aiChats` |
| `preferences.language` | `language` |
| `preferences.unit` | `settings.unit` |
| `planner.completed` | `planner.done` |
| `planner.source` | `planner.origin` |
| `body.fatPercent` / `bodyFatPercent` | `body.bodyFat` |

Aliases are accepted only at the schema boundary. New server code must use canonical fields.

## 4. Canonical units

Stored/transported measurements are canonical even when the UI displays imperial units:

- weight: `kg`
- length/height: `cm`
- distance: `km`
- duration: `min`
- pace: `min/km`
- energy: `kcal`
- calendar date: `YYYY-MM-DD`
- timestamps: ISO-8601

`settings.unit` is only a display preference and must never change the canonical measurement unit stored in the contract.

## 5. Domain rules

### Profile

Optional object. Numeric fields such as age, height, weight, target weight and running goal are normalized to finite numbers or `null`.

### User Model

Optional object derived from the current `onboarding` state when necessary. Stable fields include goal, experience, weekly frequency, available minutes, preferences, completion and skipped state.

### Workout

Each record has a stable string `id`, valid `date`, string `name`, stable `sessionId`, and normalized non-negative workout metrics.

### Meal

Each meal has a stable string `id`, valid `date`, name, normalized nutrition totals and item records with stable IDs.

### Run

Each run has a stable `id`, valid date, canonical km/min values, pace and numeric coordinate tuples.

### Body

Canonical body-fat field is `bodyFat`. Legacy `fatPercent` is not emitted by `toTransport`. Derived metrics may include fat mass, lean mass, BMI and BMR.

### Planner

Canonical completion field is `done`; canonical source field is `origin`. `completed` and `source` are migration-only aliases. Time is `HH:MM`.

### Daily Check-ins

Canonical collection is `dailyCheckins`. Current app `checkins` is accepted as an alias.

### Memory

Memory stays internal as a product capability but is part of the private user data contract. Entry confidence is `0..1`; importance is frozen to an integer `1..5`. Deleted IDs prevent migrated memory from resurrecting.

### AI Chats

Canonical collection is `aiChats`; current app `aiChat` is accepted as an alias. Roles are `user`, `assistant`, or `system`.

## 6. Change policy

`garang-state-v1` is now frozen. A future change that renames a canonical field, changes its meaning/unit/type, or removes a required domain must not silently modify v1.

Such a change requires:

1. a new migration path,
2. regression fixtures proving old user data survives,
3. an explicit schema-version bump,
4. a new contract ID only when the boundary becomes meaningfully incompatible.

Adding backward-compatible optional extension data is allowed, but existing canonical semantics must remain stable.

## 7. Pre-connection rule

Actual server/LLM providers are intentionally not connected yet. Mock/backend work should validate this contract first. When the real provider is connected, adapters should translate provider-specific input/output at the edge instead of changing GARANG's canonical data model.
