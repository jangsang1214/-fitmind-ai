# GARANG Production Coach Activation

Approved by Founder on 2026-09-20 (Asia/Seoul).

Purpose: trigger the existing fail-closed Production Coach Activation workflow for commercial main revision `645ac184425124b0ff5e906f495d5474d126b8f2` after PR #166 merged Autonomous Intelligence Loop v1 and PR #170 hardened structured-response completion/retry reliability.

Scope:
- deploy only Firebase Function `api` to project `fitfind-ai`
- preserve the existing `GARANG_LLM_API_KEY` secret
- deploy the merged bounded typed Coach tool-call path and authenticated transactional user-state mutation boundary
- keep raw database authority and destructive/bulk/account/security/schema/secret/billing/production tools unavailable to the LLM
- require authenticated production Coach smoke using a disposable Firebase identity
- require the smoke to return `source=llm` with GARANG decision/alignment verification
- delete the disposable identity in cleanup
- do not change billing, secrets, auth architecture, Firestore schema, or unrelated production resources

Success requires deployment plus authenticated live LLM smoke AND authenticated autonomous-write smoke. The write smoke must persist an explicit bounded createPlan request, deny/hold sensitive email-memory mutation, expose the persisted plan through canonical Agent Context, and clean up the disposable account. A skipped or failed write smoke is not success.

Activation retry authorized after Production Activation #16 isolated the remaining failure to provider structured-response completion. PR #170 Release Gate #1540 attempt 3 is GREEN.

## Personalized Intelligence Loop v1 activation approval — 2026-09-21

Founder explicitly approved production deployment of PRODUCT main `56ff9c788cac69b8106da66598ecbe4da35c0fcc`.

Purpose:
- activate the merged Personalized Intelligence Loop v1 server intelligence in the production Coach backend
- deploy only Firebase Function `api` to `fitfind-ai`
- preserve the existing `GARANG_LLM_API_KEY`
- require authenticated disposable-user live LLM smoke
- require GARANG decision/alignment verification
- require bounded autonomous `createPlan` write smoke
- require sensitive-write denial/confirmation behavior
- require disposable identity cleanup
- do not change billing, secrets, auth architecture, Firestore schema, or unrelated production resources

Source/runtime behavior is the already-verified PR #186 code. This documentation-only activation commit exists solely to satisfy the fail-closed production activation trigger without changing runtime logic.


## Real Meal Scan v1 production activation — 2026-09-22

Founder authorized final production activation in this session.

Verified source/web baseline:
- PRODUCT main: `d926b12a35105c02e240e2c0e677432b53c99d76`.
- Real Meal Scan v1 merged through PR #206.
- PR #206 exact-head Release Gate #1634: GREEN.
- Post-merge Real Meal Scan release Gate #1635: GREEN.
- Current commercial main Release Gate #1650: GREEN.
- Current Pages #844: SUCCESS.

Activation scope:
- deploy only Firebase Function `api` to `fitfind-ai`
- preserve `GARANG_LLM_API_KEY`
- include authenticated `POST /meal/scan` on the production API
- keep Vision limited to visible-food identity/portion/confidence; GARANG Food DB remains nutrition authority
- keep user confirmation before meal mutation
- run authenticated live Coach + bounded autonomous-write smoke and disposable-user cleanup
- use Workload Identity Federation automatically when repository WIF variables are configured; otherwise retain the currently verified fail-closed credential fallback

Production activation is complete only when the activation workflow reports SUCCESS and records its non-secret Firebase authentication mode.

## Real Meal Scan live Vision verification retry — 2026-09-22

Founder approved the production verification retry after PRODUCT PR #213 merged as `c002389ff7e6811994e2547ee86e675181ea1857`.

Trigger-only checkpoint:
- runtime Meal Scan logic is unchanged by this checkpoint
- PR #213 replaced only the production smoke image with a provider-valid 128×128 RGB PNG
- PR #213 exact-head Release Gate #1655 / `35717702324` was FULL GREEN
- deploy only Firebase Function `api` to `fitfind-ai`
- preserve the existing `GARANG_LLM_API_KEY`
- require authenticated live Meal Scan smoke before production Vision is considered VERIFIED
- retain existing authenticated Coach, autonomous-write, sensitive-write boundary, and disposable-user cleanup checks

## Nutrition fallback production activation — 2026-09-23

Founder explicitly approved production activation after PR #225 merged as `e84e012c3e0a0269634637c85d62bf0d19b0ece9`.

Activation scope:
- deploy only Firebase Function `api` to project `fitfind-ai`
- preserve the existing `GARANG_LLM_API_KEY`
- activate the authenticated nutrition lookup route merged by PR #225
- require public nutrition lookup auth/method boundary preflight
- require authenticated live nutrition lookup smoke
- retain authenticated live Meal Scan and Coach smoke, bounded autonomous-write smoke, sensitive-write boundary checks, and disposable Firebase identity cleanup
- do not change billing, secrets, auth architecture, Firestore schema, or unrelated production resources

Success requires the Production Coach Activation workflow to complete successfully with the live nutrition lookup smoke PASS. A skipped or failed nutrition smoke is not success.

## Nutrition fallback activation retry — 2026-09-23

Activation #29 successfully deployed Firebase Function `api` and passed Coach / Meal Scan / nutrition lookup public auth-method boundaries, but the newly added synthetic negative Meal Scan fixture was visually ambiguous to the live Vision provider and returned a false-positive food candidate before the nutrition smoke could run.

This retry keeps the no-food assertion strict, replaces only the synthetic negative fixture with an unambiguous solid-color RGB PNG, and preserves the same Founder-approved production activation scope. No runtime Meal Scan, nutrition lookup, Coach, or data mutation logic changes in this retry.

## Nutrition fallback activation retry 2 — 2026-09-23

Activations #29 and #30 both deployed the approved `api` Function and passed public auth/method boundaries, but the newly introduced live negative-image semantic assertion proved unsuitable as a production gate: one synthetic fixture produced a Vision false-positive food candidate and a solid-color replacement was rejected by the provider with `MEAL_SCAN_PROVIDER_ERROR`.

Boundary correction:
- keep no-food behavior fail-closed and strict in deterministic server/browser CI contracts;
- keep production Meal Scan smoke focused on an authenticated real-food image and live provider reachability;
- run authenticated live nutrition lookup smoke before the independent Meal Scan provider smoke so nutrition activation evidence is not hidden by unrelated multimodal provider semantics;
- require the activation workflow overall to PASS, including nutrition lookup, positive Meal Scan, Coach, bounded write, and cleanup.

No production runtime logic is relaxed or changed by this retry.

## Nutrition fallback final activation checkpoint — 2026-09-23

Founder-approved final activation checkpoint after PR #229.

Verified preconditions:
- PRODUCT main before this checkpoint: `690e3f931c956043ab9b02a3ebf060e344e53a0c`.
- PR #229 exact-head Release Gate #1764: FULL GREEN.
- Post-merge Release Gate #1765: FULL GREEN.
- Pages #855: SUCCESS.
- Production runtime logic is unchanged by this documentation-only checkpoint.

Final activation requirements remain unchanged:
- deploy only Firebase Function `api` to `fitfind-ai`;
- preserve the existing `GARANG_LLM_API_KEY`;
- require public Coach / Meal Scan / nutrition lookup auth-method boundaries;
- require authenticated live nutrition lookup smoke using the branded official-primary-source fixture;
- require authenticated positive Meal Scan live provider smoke;
- require authenticated live Coach and bounded autonomous-write smokes;
- require sensitive-write boundary preservation and disposable Firebase identity cleanup.

Do not mark nutrition fallback production VERIFIED unless the activation workflow is SUCCESS.
