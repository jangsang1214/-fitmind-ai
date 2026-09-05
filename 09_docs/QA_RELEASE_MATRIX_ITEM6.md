# GARANG Item 6 — QA / Regression Matrix

## Automated in CI
- JS syntax for active runtime and service files
- JSON / JSONL parsing
- runtime manifest asset existence
- index.html runtime wiring
- duplicate shell IDs
- schema migration and cloud/local merge regressions
- sync durability / deletion tombstones / account isolation
- Coach Tool/Action approval E2E
- persistent Coach prompts and English-mode regression
- privacy/security policy unit tests
- Firestore rules static security gate
- actual app route/shell/runtime smoke gate
- production build output verification

## Manual real-device gate
These cannot be fully simulated by repository-only CI and must be verified on a physical phone before store release:
1. iPhone Safari/PWA GPS permission, background/lock-screen behavior and route continuity.
2. Camera picker, gallery picker, image/video permissions and large media handling.
3. Share Sheet and saved certification image/video behavior.
4. MediaRecorder / video playback behavior by iOS version.
5. Offline -> app kill -> reopen -> online resync on cellular and Wi-Fi.
6. Two-account switching on a real Firebase session.
7. Password / Google / Apple reauthentication during permanent account deletion.

## Release rule
A CI PASS means repository/runtime regressions are clear. It does not certify device APIs that CI cannot physically exercise. A store candidate requires this document's manual device gate to be checked on the target iPhone/iOS versions.
