# GARANG VISUAL REFERENCE

## Purpose
승인된 시안과 그 시안에서 따라야 할 요소만 관리하는 파일이다.

Implementation source of truth:
- `GARANG_PRODUCT_UI_SYSTEM.md`
- `GARANG_WORKOUT_EXECUTION_SPEC.md`

## Approval rule
Founder가 명시적으로 승인한 시안만 구현 목표가 된다.

승인 전 생성 이미지는:
- exploratory
- non-binding
- not pixel-perfect source of truth

## Current approved Workout reference
Founder가 승인한 현재 Workout reference는 다음 흐름을 한 화면 시스템으로 고정한다.

```text
Today workout CTA
→ Session ready
→ Live timer + current set
→ Rest timer + next set
→ Next set
→ Session complete
→ GARANG next recommendation
```

승인된 시안에서 구현해야 하는 핵심:
- premium dark GARANG visual grammar
- concrete Today workout action
- routine/session hierarchy
- large, unmistakable live timer
- current set as the dominant execution card
- equal Weight / Reps geometry
- full-width Complete Set CTA
- Rest state with next-set context and Skip Rest
- completion summary with GARANG next decision
- 320 / 360 / 390 / 430 responsive consistency

## Previous generated images
현재 승인본 이전의 GARANG 생성 시안들은 **최종 승인 기준에서 제외**한다.

이유:
- 실제 runtime보다 AI가 상상한 구조가 포함됨
- 일부 navigation/metrics/layout이 임의 생성됨
- technical labels와 숫자가 illustrative였음

사용 가능:
- mood
- hierarchy inspiration
- density reference
- presentation quality

사용 금지:
- exact navigation
- exact owner
- exact data
- exact architecture
- exact screen behavior

## Follow
승인 시안에서 따라야 할 것:
- hierarchy
- spacing character
- proportions
- surface depth
- typography hierarchy
- action priority
- density
- brand restraint
- Workout state progression

## Do not copy blindly
- invented numbers
- fake user data
- fake sensor values
- invented navigation
- impossible geometry
- unsupported capability
- fake architecture
- decorative actions without canonical behavior

## Founder approval checklist

Clarity:
- next action obvious?
- current set obvious?
- timer obvious?
- rest obvious?
- completion obvious?

Geometry:
- wasted space?
- weight/reps large enough?
- CTA full width where needed?
- bottom-nav clearance correct?

Brand:
- premium?
- restrained?
- athletic?
- modern Korean?
- not generic?

Product advantage:
- simpler than typical logger?
- more intelligent without more visible complexity?
- one connected OS?
