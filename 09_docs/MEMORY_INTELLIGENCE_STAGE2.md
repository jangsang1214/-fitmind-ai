# GARANG Memory Intelligence — Stage 2

Status: implementation candidate pending full release gate and main deployment verification.

## Purpose

Stage 2 turns stored records into a deterministic, explainable user-state layer. It does not diagnose disease and it does not silently change the user's plan. It gives the Coach/Agent a compact description of recent state, trends, coverage, and detected patterns.

## Inputs

Only canonical GARANG domains are used:

- workouts
- runs
- meals
- body
- dailyCheckins
- profile / userModel goal

Future-dated records are excluded. GPS coordinates, chat logs, account secrets, and unrelated settings are not used by the state engine.

## Output contract

`state-intelligence-v1` returns:

- `readiness`: check-in-derived readiness value/band, component scores, confidence, reason codes
- `fatigue`: a non-medical fatigue proxy using available load/readiness/sleep/stress/soreness evidence
- `load`: 7-day acute load, previous 28-day weekly baseline, ratio, band, confidence
- `trends`: training load, running distance, body weight, weekly activity consistency
- `patterns`: explainable pattern events with severity, confidence, summary, and evidence
- `goalAlignment`: evidence-based alignment estimate for running, fat-loss, strength/muscle, or general performance goals
- `coverage`: domain counts and coverage score
- `confidence`: overall confidence derived from data coverage and signal confidence

Missing data remains missing. Empty state must not fabricate readiness or fatigue numbers.

## Deterministic load proxy

Strength session load is currently a reproducible proxy:

`session load = session duration minutes × average recorded RPE`

If duration or RPE is absent, conservative defaults are used only to estimate training-load history; the output is labelled as an internal proxy and is not a physiological measurement.

Running load uses duration when available and distance only as a fallback. This is intentionally provider-independent until wearable heart-rate/power integrations exist.

## Current pattern detectors

- training load spike
- training load drop
- load outlier against prior baseline
- sleep debt cluster
- low-energy + elevated-stress fatigue cluster
- weekly consistency increase / drop
- large body-weight trend
- low readiness
- high fatigue proxy

Every pattern carries its triggering evidence. No hidden LLM inference is required.

## Browser / server parity

The browser runtime and Firebase Functions implementation freeze the same `state-intelligence-v1` contract. The Agent State Bridge exposes compact state context and diagnostics, while the server Agent context includes the same compact User State object.

## Stage boundary

Stage 2 does **not** autonomously prescribe or mutate workouts. Stage 3 will consume Memory + User State + Pattern Intelligence through a Decision Engine, then present recommendations/actions behind the existing user-confirmation gate.

## Known gaps before commercial-leader parity

- no continuous HRV / resting-HR / skin-temperature / wearable sleep stream
- no device-derived recovery-time model
- no population-scale model trained on millions of workouts
- no outcome-calibrated personalization model yet
- no prospective validation that state scores improve user outcomes
- body-weight trend detector is intentionally conservative

These are product/data/integration gaps, not hidden as completed features.
