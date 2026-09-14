# Firebase Staging Gate v1

## Purpose
Provide a separate Firebase environment for GARANG server verification without touching the current production project `fitfind-ai`.

This gate is intentionally fail-closed:
- every staging command requires `GARANG_FIREBASE_STAGING_PROJECT_ID`;
- `fitfind-ai` is rejected as a staging project;
- staging Coach smoke only accepts the exact `asia-northeast3-<staging-project>.cloudfunctions.net/api/coach` endpoint;
- provider secrets remain in Firebase/Google Secret Manager and are never stored in the repository;
- browser privileged endpoints remain activation-gated until staging deployment and smoke verification pass.

## Repository preflight
From the repository root:

```bash
GARANG_FIREBASE_STAGING_PROJECT_ID=<YOUR_STAGING_PROJECT_ID> npm run staging:preflight
```

The command verifies the repository Firebase boundary and prints the exact project-scoped commands for the selected staging project.

## External staging setup
Create a dedicated Firebase project that is not `fitfind-ai`. Use the same region contract as the repository: `asia-northeast3`.

Set the provider secret against the staging project only:

```bash
npx firebase-tools functions:secrets:set GARANG_LLM_API_KEY --project <YOUR_STAGING_PROJECT_ID>
```

Do not paste the secret into source files, `.env` files committed to git, PR comments, logs, or this document.

Optional non-secret Function environment values may be stored in `functions/.env.<YOUR_STAGING_PROJECT_ID>` on the deployment machine, for example:

```text
GARANG_LLM_PROVIDER=openai
GARANG_LLM_MODEL=gpt-5.6-luna
GARANG_LLM_TIMEOUT_MS=8000
```

Project-specific `.env.*` files are git-ignored.

## Deploy staging only
Deploy the API function with an explicit project flag:

```bash
npx firebase-tools deploy --only functions:api --project <YOUR_STAGING_PROJECT_ID>
```

Deploy Firestore rules/indexes to the same staging project before full client Golden Path testing:

```bash
npx firebase-tools deploy --only firestore:rules,firestore:indexes --project <YOUR_STAGING_PROJECT_ID>
```

Never rely on the repository default Firebase project for staging deployment.

## Authenticated Coach smoke
Use an ID token from a staging Firebase Auth test user:

```bash
GARANG_FIREBASE_STAGING_PROJECT_ID=<YOUR_STAGING_PROJECT_ID> \
GARANG_FIREBASE_ID_TOKEN=<STAGING_ID_TOKEN> \
npm run smoke:coach:staging
```

For two-user personalization verification, also provide `GARANG_FIREBASE_ID_TOKEN_ALT`. Set `GARANG_EXPECT_DIFFERENT_MODE=1` only when the two staging users have deliberately prepared materially different states.

Expected evidence:
- HTTPS request succeeds;
- `source: llm`;
- deterministic GARANG decision exists;
- Decision↔LLM alignment contract is verified;
- provider decision identity/mode match GARANG;
- no secret material appears in output.

## Activation boundary
A GREEN staging smoke does not automatically activate account deletion/export, analytics ingestion, telemetry ingestion, payment, or production endpoints. Each remains a separate explicit activation/release decision.
