# GARANG — Wanted AI Championship 2026 Submission

> Derivative source boundary: commercial GARANG `b863a7634bd64b03a6e6f3772950c43cc81afb6f`.
> Competition-specific changes in this branch do not redefine commercial GARANG.

## One-line pitch

**기록을 모으는 운동 앱이 아니라, 오늘의 상태를 해석해 다음 행동을 판단하고 결과를 다시 다음 판단에 연결하는 Personal Performance Intelligence.**

## Problem

운동, 식단, 러닝, 체성분 데이터는 여러 앱에 계속 쌓입니다. 하지만 사용자가 실제로 어려워하는 순간은 기록 이후입니다.

- 오늘 원래 계획대로 운동해도 되는가?
- 회복 상태가 좋지 않을 때 무엇을 바꿔야 하는가?
- 최근 식단과 훈련은 목표와 같은 방향으로 가고 있는가?
- 한 번의 기록이 다음 행동에 어떻게 연결되는가?

기존 기록 앱은 대개 과거를 보여주고, 범용 AI 챗봇은 사용자의 장기 행동 상태를 안정적으로 소유하지 않습니다.

## Solution

GARANG은 사용자의 목표와 실제 기록을 하나의 행동 루프로 연결합니다.

**Goal → Plan → Action → Record → Interpretation → Feedback → Next Action → Long-term Change**

사용자가 수면, 에너지, 스트레스, 근육통, 운동, 식단, 러닝, 체성분을 기록하면 GARANG이 현재 상태를 해석하고 오늘의 다음 행동을 제안합니다. 사용자가 승인하고 실행한 결과는 다시 다음 판단의 근거가 됩니다.

## How AI is used

GARANG은 중요한 의사결정의 책임을 LLM에 넘기지 않습니다.

1. **Deterministic Intelligence** — 구조화된 사용자 데이터와 규칙/계약을 이용해 상태, 추천 방향, 계획을 판단합니다.
2. **LLM Coach** — 이미 계산된 판단과 근거를 자연어로 설명하고, 사용자의 추가 질문을 현재 기록 맥락에서 해석합니다.
3. **Multimodal Coach** — 사용자가 Coach composer의 `+`로 첨부한 사진을 현재 GARANG 기록과 함께 해석합니다. 사진은 다음 요청 1회에만 사용되며 raw image를 GARANG 기록/대화 텍스트에 저장하지 않습니다.
4. **Learning Contract** — `decision → recommendation → action → plan → execution → outcome`을 연결해 어떤 판단이 실제 행동과 결과로 이어졌는지 추적합니다.

이 구조는 생성형 AI가 임의로 사용자 상태를 바꾸는 것을 막으면서도, 개인화된 설명과 상호작용을 제공합니다.

## AI / tools

- OpenAI GPT-5.6 Luna — authenticated production Coach explanation and multimodal context interpretation
- GARANG deterministic Intelligence Core — state / decision / recommendation / plan logic
- Firebase Authentication / Firestore / Cloud Functions — authenticated user state and production Coach gateway
- GitHub Actions + Playwright WebKit — Golden Path, mobile interaction, authenticated Coach and regression verification
- ChatGPT — product/engineering reasoning, implementation support, release verification and project orchestration

## 60-second judging path

The competition derivative provides a clearly labeled synthetic-data experience. It does not use a real user's data and does not pretend its sample Coach response is a live GPT call.

1. **`60초 심사 체험`** — enter without creating an account; synthetic local records are loaded.
2. **Today** — see signals become an interpreted GARANG decision and next action.
3. **Coach** — see why the deterministic decision was made and how it is explained.
4. **Progress / 누적** — see how workout, nutrition, running and body evidence accumulate over time.
5. **Production AI** — create/sign in to an account to use the real authenticated GPT Coach and photo input path.

## What is already verified in the commercial source snapshot

- Commercial source Release Gate: GREEN
- Mobile WebKit Golden Path complete journey: GREEN
- Authenticated Coach flow: GREEN
- Production text Coach live smoke: GREEN
- Production photo Coach live smoke: GREEN
- GitHub Pages deployment: GREEN
- Raw Coach image persistence to GARANG user state / Firestore / telemetry / conversation text history: prohibited by the released multimodal contract

## Submission positioning

GARANG is not positioned as “ChatGPT for fitness.” The core product value is the connected decision loop: **the system turns accumulated behavior signals into a next action, then learns from what the user actually did and what happened next.**

## Judge-facing screenshots / demo sequence

Use only three core scenes in the submission material:

1. **Today** — signal → interpretation → next action
2. **Coach** — explanation + `+` photo input
3. **Progress** — accumulated evidence and change

Avoid feature-catalog screenshots. The submission should make the causal loop understandable before showing secondary capabilities.

## Pre-submit checklist

- [ ] Wanted participation registration is completed before the registration deadline.
- [ ] The derivative is deployed to its own public URL, separate from commercial GARANG.
- [ ] `60초 심사 체험` works in a fresh private/incognito browser.
- [ ] Mobile viewport has no clipping/overlap and the judge guide does not block bottom navigation.
- [ ] Real signup/login remains available for production GPT/photo Coach verification.
- [ ] No personal data, secrets, company-confidential information or real-user sample data is included.
- [ ] Required submission fields include the problem, AI usage, major AI tools and deployed service URL.
- [ ] If the commercial GARANG service is already operating, separately disclose its service period / monetization status to Wanted as required by the event FAQ.
- [ ] Keep the submitted public URL available throughout the judging period.
