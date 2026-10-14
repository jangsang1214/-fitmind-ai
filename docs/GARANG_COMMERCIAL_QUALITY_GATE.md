# GARANG COMMERCIAL QUALITY GATE

## Purpose
Founder가 승인한 기존 GARANG UI/UX v2 방향을 유지한 채, 실제 제품의 시각 완성도를 상용 최상급 수준으로 끌어올리기 위한 검증 기준이다.

이 문서는 새로운 디자인 source of truth가 아니다.

Source of truth:
- `GARANG_VISUAL_REFERENCE.md`
- `GARANG_PRODUCT_UI_SYSTEM.md`
- `GARANG_WORKOUT_EXECUTION_SPEC.md`

## Principle
외부 레퍼런스나 새 생성 시안은 다음만 참고한다.
- finish quality
- hierarchy clarity
- spacing discipline
- visual density
- surface depth
- image treatment quality
- touch confidence

복제하지 않는다.
- 색상 체계
- navigation structure
- information architecture
- brand identity
- unsupported behavior

## Required product feeling
GARANG은 다음처럼 느껴져야 한다.
- premium
- quiet
- precise
- athletic
- disciplined
- modern Korean
- intelligent
- trustworthy

피해야 한다.
- generic dashboard
- AI mockup 느낌
- 카드 폭발
- 과도한 glow
- decorative metrics
- 기능은 많지만 어디를 눌러야 할지 모르는 화면
- 임의의 새 shell이 canonical owner를 가리는 구조

## Screen quality bar

### Today
- 첫 화면에서 오늘 해야 할 행동이 즉시 읽힌다.
- 결정 카드가 가장 강하다.
- 이유는 한 줄 수준으로 조용하다.
- 운동 계획은 구체적이다.
- primary CTA는 하나다.
- body/status evidence는 결정을 보조한다.

### Workout
- 실행 화면은 dashboard가 아니다.
- LIVE / timer / current set / rest / next가 시각적으로 즉시 구분된다.
- Weight/Reps는 동일한 useful width를 가진다.
- Complete Set이 가장 강한 action이다.
- 준비/관리 UI는 실행 중 경쟁하지 않는다.
- 320px에서도 bottom nav와 물리적 touch overlap이 없다.

### Nutrition
- Meal Scan/photo evidence가 첫 번째다.
- 결과 확인/저장 흐름이 끊기지 않는다.
- macro/history는 secondary다.
- 사진 선택 후 canonical 분석/확인/저장 owner가 계속 보인다.

### Body
- anatomy가 화면 hero다.
- mannequin/armor/random-line 인상이 없어야 한다.
- visible geometry와 hit geometry가 일치한다.
- metric은 anatomy를 보조한다.

### Coach
- chat-first다.
- summary dashboard가 대화보다 앞서지 않는다.
- composer는 항상 안정적으로 접근 가능하다.
- 실제 canonical send control과 연결된다.

## Geometry gate
반드시 검증:
- 320
- 360
- 390
- 430

필수:
- horizontal overflow 없음
- text collision 없음
- 44x44 minimum touch
- primary CTA truncation 없음
- unexplained dead space 최소화
- fixed nav가 action center를 가리지 않음

## Commercial finish gate
다음을 만족하지 못하면 GREEN이 아니다.
- 동일한 spacing rhythm
- 동일한 radius family
- 동일한 surface-depth grammar
- primary/secondary action contrast 명확
- loading/empty/error/disabled 상태가 geometry를 깨지 않음
- 화면별로 다른 앱처럼 보이지 않음
- 기능을 숨기기 위해 새 presentation owner를 덧씌우지 않음

## Release rule
Commercial polish는 기능 regression을 정당화하지 않는다.

Required before merge:
- exact-head Release Gate FULL GREEN
- Reference UI v2 320/360/390/430 GREEN
- Golden Path GREEN
- Workout execution GREEN
- Meal Scan continuation GREEN
- Coach send GREEN
- Recovery/Check-in GREEN
- Settings/menu touch GREEN
- mobile runtime stress GREEN

Design GREEN은 code merge 자체가 아니라 실제 user-visible quality + regression evidence로 판정한다.
