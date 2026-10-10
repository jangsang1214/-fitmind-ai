# GARANG PRODUCT UI SYSTEM

## Purpose
GARANG의 장기 UI/UX 규칙을 정의하는 개발 문서다. PR 번호, SHA, 현재 작업 상태, 릴리즈 상태는 이 문서에 기록하지 않는다.

## North Star
GARANG은 Personal Performance Intelligence / Personal Performance OS다.

```text
Goal → Plan → Today → Action → Record → Interpretation → Feedback → Next Action → Long-term Change
```

사용자에게는 더 단순하게 보여야 한다.

```text
오늘 → 지금 해야 할 행동 → 실행 → 기록 → GARANG 해석 → 다음 행동
```

핵심 질문:

> GARANG을 열면 오늘 뭘 해야 하는지 바로 알 수 있는가?

## Core rules
- Action before information.
- One owner per behavior.
- Beginner-first, progressive disclosure.
- Intelligence behind simplicity.
- Golden Path를 방해하는 UI는 추가하지 않는다.
- 기능 추가보다 기존 owner를 개선한다.

## Brand
GARANG은 premium, quiet, precise, athletic, disciplined, modern Korean, intelligent, trustworthy 해야 한다.

피해야 할 것:
- generic dashboard
- neon gaming UI
- excessive glassmorphism
- card explosion
- chatbot-first identity
- decorative metrics
- 기능 설명이 화면을 지배하는 구조

## Primary navigation

```text
오늘 | 기록 | 코치 | 누적
```

규칙:
- 4 primary tabs.
- Workout은 capability route로 접근.
- bottom nav는 active CTA touch point를 가리면 안 됨.
- safe-area를 반영.
- content는 nav 뒤로 숨지 않음.

## Responsive widths
반드시 검증:
- 320px
- 360px
- 390px
- 430px

권장 기준:
- horizontal padding: 14px
- <=360px 필요 시 12px
- major section gap: 16–20px
- card gap: 10–12px
- control gap: 8–12px
- primary CTA: 48–52px
- secondary CTA: 44–48px
- min touch target: 44×44px
- card radius: 16–18px

Critical execution card 안에 설명되지 않는 24px 초과 빈 여백을 두지 않는다.

## Typography
- Screen title: 26–32px / 700
- Primary decision: 20–24px / 700
- Timer / primary metric: 32–40px / 700
- Section title: 16–20px / 650–700
- Card title: 15–18px / 600–700
- Body: 14–16px
- Secondary: 12–14px
- Metadata: 11–13px

규칙:
- Korean-first
- 중요한 숫자는 팔을 뻗고 봐도 읽혀야 함
- 충돌을 폰트 축소로 해결하지 않음
- primary CTA text truncate 금지
- timer는 tabular numerals

## Color behavior
기존 runtime palette가 구현 source of truth다.

Role:
- background: quiet dark neutral
- surface: content grouping
- active surface: current execution
- accent: primary CTA / selection / live state
- success: complete
- caution: constraint
- danger: destructive/error

Accent는 화면의 소수 영역만 사용한다.

## TODAY
목적: “오늘 무엇을 해야 하는가?”

Hierarchy:

```text
Today context
→ GARANG judgment
→ one-line reason
→ concrete recommendation
→ one primary CTA
→ secondary supporting state
```

Workout day example:

```text
오늘은 하체 중심 45분 운동 하세요.
최근 수행과 회복 상태를 반영했습니다.

Squat               4 × 8 · 100kg
Romanian Deadlift   3 × 10 · 70kg
Leg Press           3 × 10 · 140kg

[ 오늘 운동 시작 ]
```

금지:
- generic “운동 보러가기”
- Planner가 primary CTA보다 위
- Coach가 primary path를 가로막음
- multiple equal-priority CTAs
- no routine인데 Start Workout 노출

Rest day에는 contradictory Start Workout 금지.

## WORKOUT
Workout은 dashboard가 아니라 execution surface다.

Priority:

```text
Session state
→ Current exercise
→ Current set
→ Rest / next set
→ Completion
→ Detail
```

Default visible:
- exercise
- sets
- reps
- weight

Progressive:
- RPE
- RIR
- set type
- notes
- plates
- warm-up
- grouping

Live:
- timer visible
- current set obvious
- next set obvious
- rest obvious
- single completion action
- unrelated preparation UI collapses

상세 규칙은 `GARANG_WORKOUT_EXECUTION_SPEC.md`.

## NUTRITION

```text
Meal time → Meal Scan → Confirm → Save → Simple evaluation → Next meal
```

Default:
- current state
- next meal direction
- one Meal Scan CTA
- latest meal feedback

Detailed macros/history/lineage는 progressive disclosure.

## COACH
Coach는 deep explanation + bounded action surface다.

Coach는 다음 owner가 아니다:
- Today decision
- Workout state
- Nutrition save

Default answer:

```text
판단 → 이유 → 다음 행동 → optional detail
```

LLM이 canonical product state를 silently mutate하지 않는다.

## BODY

```text
human silhouette
→ muscle volume
→ anatomy
→ subtle fiber
→ selection
```

금지:

```text
mannequin
→ armor plates
→ random lines
```

Visible geometry와 hit geometry는 일치해야 한다.

## RECOVERY

```text
Recovery state
→ Reason
→ What changes today
→ Supporting signals
→ Trend
```

Raw sensor list부터 보여주지 않는다.
Missing evidence는 unknown이다.

## Empty / Loading / Error / Disabled
모든 production component는 네 상태를 정의한다.

Empty:
- 무엇이 없음
- 왜 중요
- 무엇을 하면 됨

Loading:
- geometry 유지
- layout jump 최소화

Error:
- entered data 보존
- safe retry
- raw stack/provider language 금지

Disabled:
- 이유가 불명확하면 이유 표시

## Accessibility
- 44×44 minimum touch
- visible focus
- semantic labels
- no color-only state
- reduced motion
- modal/sheet focus ownership
- bottom nav와 CTA 충돌 금지

## Motion
좋은 motion:
- session start
- set complete
- rest reveal
- body selection
- action feedback

나쁜 motion:
- decorative pulsing
- floating dashboards
- layout shift during touch

Target:
- micro 120–180ms
- state/card 180–240ms

## Anti-bloat
새 UI 전 확인:
1. 기존 컴포넌트로 해결 가능한가?
2. Golden Path를 강화하는가?
3. 별도 카드가 꼭 필요한가?
4. disclosure로 숨길 수 있는가?
5. 사용자가 실제 결정을 하는가?
6. state duplication인가?
7. 유지비용보다 가치가 큰가?

## Commercial-quality bar

Typical logger:
```text
record → history
```

GARANG:
```text
understand today
→ know what to do
→ execute
→ record naturally
→ understand result
→ know next action
→ accumulate learning
```

성공 기준:

> 초보자는 즉시 다음 행동을 이해하고, 고급 사용자는 흐름을 떠나지 않고 깊이를 열 수 있어야 한다.
