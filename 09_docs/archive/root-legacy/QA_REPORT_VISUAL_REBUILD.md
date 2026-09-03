# GARANG Visual-First Rebuild QA

Build: 0.11.0-beta.2
Date: 2026-09-02
Base: GARANG_COMMERCIAL_CORE_KOREAN_UI_0.11.0-beta.1

## Scope
- Workout visual-first anatomical muscle map
- Nutrition camera-first Meal Scan UX
- Settings restored
- FREE / PRO comparison restored
- Language + unit settings restored
- Existing 4-core navigation preserved
- Certification overlay implementation intentionally NOT redesigned in this build

## Automated static QA
- Commercial Core suite: 29 / 29 PASS
- JavaScript syntax: app.js PASS
- JavaScript syntax: sw.js PASS
- JavaScript syntax: garang-services-config.js PASS
- Runtime local HTTP assets: 9 / 9 HTTP 200
- Static duplicate IDs: PASS
- Mobile breakpoints 320 / 560: PASS (static CSS presence)
- Firestore user isolation rule presence: PASS
- Service-worker cache revision: PASS

## Regression checks
- Workout certification functions certInfo/showCert/shareMedia: unchanged from beta.1
- TODAY / COACH / LOG / PROGRESS navigation preserved
- Workout session save preserved
- Meal manual entry + Food DB preserved
- Meal Scan adapter behavior preserved; Vision API absence does not fake image recognition
- Cloud sync/local-first path preserved

## Blocked / needs real environment
- Chromium headless visual run: BLOCKED because Chromium network service crashed in this environment. Do not count as PASS.
- iPhone Safari physical-device QA: BLOCKED until real device test.
- Firebase authenticated E2E sync and two-user isolation: BLOCKED without authenticated test accounts.
- Actual Vision image recognition: BLOCKED until Vision provider endpoint is configured.
- Actual PRO purchase/entitlement: BLOCKED until payment provider is configured. UI does not fake activation.

## Release decision
Development / Commercial Beta Candidate. Not Production.
