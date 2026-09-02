# GARANG work status

Date: 2026-09-02 (Asia/Seoul)  
Target repository: `jangsang1214/-fitmind-ai`, branch `main`  
Release candidate: `0.11.0-beta.1`

## Completed

- Firebase Agent Context READ API is deployed and rejects unauthenticated, forged-token and non-GET requests.
- The n8n workflow has the GARANG webhook and authenticated HTTP Request Tool configuration in place.
- TODAY, Daily Check-in and deterministic Coach Engine V0 are implemented.
- Daily Check-ins are isolated by the existing signed-in user state and saved through the existing local/Firebase state path.
- Recommendations explain the applied rules and open the existing workout recording screen.
- Mobile layout, persistence after reload, rule results and workout navigation were checked at a 390 x 844 viewport.

## Verification

- Automated tests: 77 passed.
- Lint/static checks: passed.
- Production build asset checks: passed.
- Mobile horizontal overflow: none on TODAY and Workout screens.
- Daily Check-in reload persistence: passed in local/demo mode.

## External checks still pending

- A successful n8n AI response requires available OpenAI API credit. Configuration is complete up to that paid request.
- The Agent Context API still needs one final `200` response check using a real signed-in user's fresh Firebase ID token.
- Daily Check-in cloud persistence should be manually confirmed once with a real signed-in account. Automated merge and account-isolation coverage is already present.

## Current limitation

The app does not yet have a separate active-workout-session entity. The TODAY action therefore opens the existing Workout recording screen. Adding a generated session plan and requiring confirmation before Planner writes belongs to the later WRITE Agent phase.

## Security

No Firebase ID token, OpenAI API key, service-account key, n8n credential or n8n database is included in the repository or release archive.
