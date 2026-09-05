# GARANG Item 7 — Security / Privacy / Commercial Operations Readiness

## Implemented in repository
- Per-user Firestore ownership rules for user documents and active app state.
- Sync ownership marker validation to block cross-account state writes.
- Global Learning is opt-in: consent defaults to false and Firestore creation requires explicit `consent.globalLearning == true`.
- Global Learning event top-level schema is allow-listed and direct client read/update/delete is denied.
- Unknown Firestore document paths are denied by default.
- Privacy settings UI with separate Global Learning / Analytics consent toggles.
- Secure account deletion flow with explicit DELETE confirmation and recent reauthentication.
- Verified backup is attempted before permanent account deletion.
- Current known user app state and user document are deleted before Firebase Auth deletion.
- Server-side account deletion handler is also prepared with fresh-auth enforcement and recursive Firestore deletion for deployment environments.
- Function API disables X-Powered-By, returns no-store, nosniff and no-referrer headers, and restricts browser CORS origins.
- Error/privacy helper redacts common secret/identity field names before security logs.
- Privacy and security regression tests are part of `npm test`.

## Operational work outside repository
The following are deployment/legal/account-console work and cannot be certified by source code alone:
- Deploy the updated Firestore Rules and Cloud Functions to the production Firebase project.
- Run Firebase Emulator Suite rules tests in the deployment environment and preserve the report.
- Finalize Korean/target-market privacy policy, terms, retention periods, processor/subprocessor disclosures and age requirements with qualified legal review.
- Configure App Store privacy disclosures, payment provider settings and production secrets.
- Establish incident response contacts, production alerting, log retention, backups and access-review process.
- Perform external security review / penetration test before high-scale enterprise use.

## Data boundary
Personal Memory remains per-user. Global Learning must use only consented, minimized, de-identified learning events and must never copy raw personal conversations or another user's Memory into a different user's context.
