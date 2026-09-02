# TODAY and Coach Engine V0 QA

Date: 2026-09-02  
Build: `0.11.0-beta.1`

## Implemented behavior

- TODAY uses the device's local calendar date and displays the matching Daily Check-in, Planner items and nutrition records.
- Daily Check-in stores sleep, energy, stress, available minutes, soreness by body part, notes, pain caution, revision and schema version.
- Coach Engine V0 is deterministic. The same normalized input produces the same recommendation and reason codes.
- Pain caution takes priority over ordinary intensity rules. Low energy, high soreness, short sleep, limited time and missing plans reduce the recommendation as applicable.
- Missing check-in values remain unknown. A user-entered zero remains a real zero.
- Reading or generating a recommendation does not add, edit or complete Planner items.

## Automated coverage

Seven focused scenarios cover missing check-in, zero available time, pain caution, low energy, high soreness, short sleep and normal input. The complete application test suite contains 77 passing checks.

## Mobile browser coverage

At 390 x 844, the form stays inside its cards and uses a single-column layout. A check-in with 4.5 hours of sleep, energy 2, stress 4, 35 available minutes and lower-body soreness 4 produced the expected reduced recommendation, survived reload and showed localized reasons. The start action opened the existing Workout recording screen. No console errors or horizontal overflow were observed.

## Manual follow-up

Repeat the save/reload check once while signed in to verify the deployed Firestore path with a real account. This does not block local release validation, but it is required before claiming full production cloud verification.
