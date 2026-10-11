# GARANG WORKOUT EXECUTION SPEC

## Purpose
Workout 실행의 단일 구현 계약이다.

```text
SESSION_READY
→ SESSION_ACTIVE
→ CURRENT_SET
→ REST
→ NEXT_SET
→ SESSION_COMPLETE
```

반드시 하나만 존재:
- session owner
- timer owner
- current-set owner
- save owner
- canonical draft

## State machine

```text
NO_PLAN
  │ Generate Routine
  ▼
ROUTINE_READY
  │ Start Workout
  ▼
SESSION_ACTIVE
  ▼
CURRENT_SET
  │ Complete Set
  ├───────────────┐
  │               │
  ▼               ▼
REST          NEXT_MEMBER
  │               │
  └──────┬────────┘
         ▼
      NEXT_SET
         │
         ├─ more → CURRENT_SET
         └─ done
             ▼
      SESSION_COMPLETE
             ▼
      INTERPRETATION
             ▼
        NEXT_ACTION
```

## NO_PLAN
Visible:
```text
운동
오늘 운동을 준비하세요.

[ 루틴 추천 생성 ]
```

금지:
- Start Workout
- active timer
- fake routine
- current-set UI

## ROUTINE_READY
Visible:
```text
TODAY PLAN
하체 중심 · 45분 · RPE 8

Squat               4 × 8 · 100kg
Romanian Deadlift   3 × 10 · 70kg
Leg Press           3 × 10 · 140kg

[ 운동 시작 ]
```

규칙:
- one primary action
- concrete routine
- canonical draft only
- no second session card

## SESSION_ACTIVE
Start Workout 직후 즉시:
- LIVE state
- timer visible
- current exercise focus
- current set focus
- Finish available
- Start disappears/disabled
- unrelated preparation UI collapses

사용자가 “시작된 건가?”라고 생각하면 실패.

## Live header
Target:

```text
LIVE · 기록 중                     [종료]

03:42

현재 기록 중
```

Geometry:
- timer 34–40px
- tabular numerals
- left aligned
- Finish >=44px
- sticky below app chrome
- safe-area aware
- Finish secondary to Complete Set

## Current exercise

```text
Squat
SET 3 / 4
```

Optional:
```text
Previous 100 × 8
Target   102.5 × 8
```

Target은 실제 로직이 제공할 때만 표시.

## CURRENT_SET

```text
┌──────────────────────────────┐
│ CURRENT SET           3 / 4 │
│                              │
│ Previous   100 × 8           │
│                              │
│ ┌────────────┐ ┌───────────┐ │
│ │ 중량       │ │ 반복      │ │
│ │ 102.5      │ │ 8         │ │
│ └────────────┘ └───────────┘ │
│                              │
│ [        세트 완료 →       ] │
│                              │
│ 상세 ▾                        │
└──────────────────────────────┘
```

Geometry at 320/360/390/430:
- full available width
- weight/reps equal width ±2px
- no dead set-number column
- inputs >=56px
- Complete Set >=50px
- Complete Set full width
- no horizontal overflow
- no text collision
- no >24px unexplained blank region

Advanced behind 상세:
- RPE
- RIR
- set type
- notes

## Completed set

```text
✓ SET 1        100 × 8
```

규칙:
- compressed
- no full input UI
- readable without color
- current set보다 약함

## Upcoming set

```text
SET 4          102.5 × 8
```

규칙:
- collapsed
- no advanced controls
- no destructive actions
- current가 될 때만 expanded

## REST

```text
REST
01:24

NEXT
Squat · Set 4
102.5kg × 8

[ 건너뛰기 ]
```

규칙:
- Complete Set 후 즉시 표시
- session timer와 rest timer 구분
- next context visible
- Skip >=44px
- bottom nav와 겹치지 않음
- fullscreen modal 기본 금지
- unpredictable page jump 금지

## NEXT_SET
Rest 종료 후:
- previous completed compact
- next becomes current
- saved/prefilled values 유지
- session timer 지속
- session context 유지

## SESSION_COMPLETE

```text
SESSION COMPLETE

18 SETS
6 EXERCISES
6,820 KG

오늘 수행
계획한 강도를 완료했습니다.

GARANG NEXT
다음 Squat: 102.5kg × 8 유지
오늘 결과를 다음 운동 추천에 반영합니다.
```

Priority:
1. completion
2. meaningful result
3. next decision

Secondary:
- photo
- sharing
- history
- advanced analytics

## Draft

```text
오늘 세션                      4개 운동

1  Squat
   4 × 8 · 100kg
   [기록] [관리]

2  Romanian Deadlift
   3 × 10 · 70kg
   [기록] [관리]
```

규칙:
- 기록 primary
- 관리 disclosure
- reorder/edit/replace/delete behind 관리
- delete default hidden
- metadata wraps
- live current set 중 draft chrome은 경쟁하지 않음

## Advanced settings
Default hidden:
- RPE
- RIR
- duration
- set type
- notes
- plate calculation
- warm-up generation
- grouping

Disclosure:
```text
고급 설정
RPE · RIR · 메모 · 플레이트 · 워밍업
```

## Persistence
Preserve:
- session started
- elapsed reference
- current exercise
- set rows
- completed state
- rest state when appropriate
- draft context

Reload 금지:
- duplicate session
- duplicate timer
- duplicate draft
- duplicate save

## Bottom-nav clearance
각 CTA center point가 실제 CTA에 속해야 한다.

검증 대상:
- Start Workout
- Record
- Complete Set
- Skip Rest
- Finish Workout

`elementFromPoint(center)`로 physical touch ownership 확인.

## Error
Save failure:
- entered set values 유지
- draft 유지
- session state 유지
- retry 제공
- silent data loss 금지

## Accessibility
- current set may use aria-current="step"
- completed readable without color
- timer has descriptive label
- icon-only buttons aria-label
- min 44px touch
- advanced disclosure keyboard accessible

## WebKit regression

Widths:
- 320
- 360
- 390
- 430

Geometry assertions:
- document width <= viewport + 1px
- current-set rect inside viewport
- weight width ~= reps width ±2px
- input height >=56px
- Complete Set width >= inner width - 2px
- Complete Set height >=50px
- timer does not intersect app header
- active CTA does not intersect bottom nav
- rest does not intersect bottom nav

State test:
```text
ready
→ start
→ timer advances
→ complete set
→ rest
→ skip / expire
→ next set
→ finish
→ result
→ next recommendation visible
```

## Acceptance
- [ ] one session owner
- [ ] one timer
- [ ] one record owner
- [ ] Start causes immediate visible change
- [ ] timer advances
- [ ] current set dominant
- [ ] weight/reps equal useful width
- [ ] Complete Set full width
- [ ] rest obvious
- [ ] next set obvious
- [ ] advanced controls available but quiet
- [ ] no bottom-nav touch interception
- [ ] 320/360/390/430 pass
- [ ] restore does not duplicate state
- [ ] completion shows GARANG next action
- [ ] Golden Path remains Today → Workout → Record → Next
