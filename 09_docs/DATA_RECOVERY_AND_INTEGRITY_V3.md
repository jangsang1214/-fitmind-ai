# GARANG Data Recovery & Integrity v3

Status: release-safety policy for the current web/PWA architecture.

## Goal

GARANG treats Workout, Meal, Run and Body records as durable user history. A temporary empty screen, bounded shell, stale device, partial local state or migration mismatch must not be interpreted as a request to remove that history.

## Durable history

The long-term collections are:

- `users/<uid>/workoutHistory`
- `users/<uid>/mealHistory`
- `users/<uid>/runHistory`
- `users/<uid>/bodyHistory`

`users/<uid>/app/state` is a bounded runtime shell, not the lifetime archive.

## Deletion policy

Workout, Meal, Run and Body are append-safe by default. Missing rows in a later local/app-state array do not create deletion tombstones. A future product feature that intentionally deletes a saved historical record must create an explicit tombstone (`explicit: true`) after a direct user confirmation.

Legacy inferred tombstones for these four durable domains are ignored. This is intentional because the current product has not exposed a saved-history deletion flow for them, while partial-state regressions have occurred.

Planner and Memory keep their existing explicit user-delete behavior.

## Stale-device protection

Before a changed durable record is overwritten, the sync runtime checks the remote record when the local device has evidence that the record has already been synchronized. If the remote record is newer, the remote record wins and is merged back into the outgoing state.

## Rolling recovery copies

The browser keeps a small rolling set of same-account state/cloud copies in addition to the existing compatibility backups. The ring is bounded so recovery protection does not grow localStorage without limit.

## Recovery Center

Settings > Data uses `데이터 복구 확인` rather than a single-key legacy-import interpretation.

A user-triggered scan can inspect only the current browser/account scope:

1. current active local state,
2. the historical `garang_v99_state_v2` key when present,
3. same-account sync/import/sanitizer/rolling backups,
4. the authenticated user's Firestore app state,
5. the four durable history collections,
6. the authenticated user's recovery snapshots.

The scan reports record counts only. It does not render workout/meal/body content in the diagnostics UI.

## Recovery semantics

Recovery is conservative:

- Current profile, onboarding, preferences and other active non-history state stay primary.
- Workout, Meal, Run and Body rows are unioned by stable ID.
- For the same record ID, the newest record timestamp wins.
- Durable history ignores old inferred tombstones.
- Before applying a recovery, the current local state is backed up.
- When authenticated, a Firestore recovery snapshot is created before the recovered state is written.
- Existing newer remote durable records are never overwritten by older recovery candidates.
- Source backups are not removed by recovery.

## Source-of-truth rule

There is no single destructive 'newest whole state wins' rule for historical domains. GARANG resolves current account state and historical records separately:

- current account/profile state: current active state remains primary;
- durable history: union/record-level recency across available same-account sources;
- recovery snapshots: fallback candidates, never automatic replacements.

## Production contract

This release does not rename canonical fields or alter `garang-state-v1`. The frozen production data contract remains unchanged. These changes are persistence/recovery semantics around the existing schema.

## Follow-up architecture

The current app still has a large legacy `01_app/app.js` plus compatibility runtimes. The next structural phase should move persistence behind explicit repositories (`StateRepository`, `HistoryRepository`, `AuthService`) and retire prototype patching only after parity tests cover all current flows. This should be done incrementally rather than in the same data-safety release.
