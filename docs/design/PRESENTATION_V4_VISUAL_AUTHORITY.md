# GARANG Presentation v4 — Founder visual authority

Status: **BINDING VISUAL TARGET FOR PRODUCT PR #420**

The Founder handoff document `GARANG_NEXT_AGENT_HANDOFF_2026-10-18.docx` contains one final 11-screen commercial board (`image1`). That board is the visual acceptance authority for Presentation v4.

## Rule

The board defines composition, hierarchy, density, spacing, typography, action prominence and art direction. It is **not** a runtime asset source. Production code must never crop or paste portions of the board into Today, Workout, Rest, Summary, Nutrition, Body, Coach, History, Settings or navigation.

## Required states

1. Today — decisive workout hero, direct workout action, compact evidence and Coach interpretation.
2. Workout LIVE — exercise context, SET x/N, previous/target, weight/reps, full-width set completion.
3. Exercise record — completed/current/future set hierarchy and session completion.
4. Rest — focused timer state with next-set context.
5. Session summary — restrained completion metrics, body response, GARANG interpretation and next action.
6. Nutrition — real user meal media/camera action first; premium empty state without fake meal photography.
7. Body — the real interactive anatomy renderer is visually dominant; visible renderer and hit geometry must agree.
8. Coach — conversation-first surface with compact composer and no dead canvas.
9. History — tabs, calendar, selected-day summary and high-signal month summary.
10. Settings — compact aligned rows, no card soup.
11. Bottom navigation — four canonical tabs only: 오늘 | 기록 | 코치 | 누적.

## Verification

- 390 px is the primary composition reference.
- 320 / 360 / 390 / 430 must remain structurally and physically touch-safe.
- Release functionality and Golden Path remain separately gated.
- `tests/browser-presentation-v4-review-screenshots.cjs` captures the 11 review states.
- `.github/workflows/presentation-v4-review.yml` publishes those screenshots as an artifact for Founder-board comparison.
