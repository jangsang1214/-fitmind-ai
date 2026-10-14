# GARANG COMMERCIAL QUALITY GATE

## Purpose
Founder가 승인한 Golden Master Board를 실제 제품의 visible source of truth로 유지하면서, 기존 GARANG canonical 기능을 손상시키지 않고 상용 최상급 수준까지 완성도를 끌어올리기 위한 검증 기준이다.

## Visible source of truth
현재 제품이 사용자에게 보여줘야 하는 1차 구조는 다음 5개다.
- Home
- Recovery
- Training
- Nutrition
- Coach

필수 시각 방향:
- light iOS-style canvas
- white / light-gray card hierarchy
- blue active navigation accent
- restrained premium finish
- fixed five-tab primary navigation

기존 dark Reference UI v2는 underlying capability와 regression evidence로 유지할 수 있지만, 최종 visible presentation source of truth는 아니다.

## Product principle
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
- presentation shell이 canonical write/state owner를 복제하는 구조

## Screen quality bar

### Home
- 첫 화면에서 현재 상태와 오늘 해야 할 행동이 즉시 읽힌다.
- 큰 green Recovery Score hero가 상태 해석의 중심이다.
- Sleep / Training / Nutrition은 분리된 보조 카드로 읽힌다.
- bell / profile action이 상단에서 명확하다.
- 정보량보다 행동 우선순위가 먼저 보인다.

### Recovery
- Today / Trends / Insights 구조가 명확하다.
- recovery score는 green semi-ring으로 즉시 읽힌다.
- HRV / Resting HR / Sleep은 각각 독립 카드와 추세 evidence를 가진다.
- signal이 없을 때 숫자를 꾸며내지 않는다.

### Training
- Today/date context가 상단에 있다.
- 오늘 운동 hero가 가장 강하다.
- 운동명 / 예상 시간 / exercise count가 한눈에 읽힌다.
- START WORKOUT가 hero의 단일 primary CTA다.
- 운동 목록은 thumbnail + sets/reps + load hierarchy로 빠르게 스캔된다.
- START 이후에는 기존 canonical Workout execution / timer / rest / save owner가 그대로 이어진다.

### Nutrition
- Today / Analysis / History 구조가 명확하다.
- calorie progress는 multicolor ring으로 읽힌다.
- Protein / Carbs / Fat은 분리된 macro cards다.
- Today’s Meals는 image/evidence + kcal + time 구조다.
- Meal Scan 실행 이후에는 기존 canonical 분석/확인/저장 owner가 그대로 이어진다.

### Coach
- chat-first다.
- GARANG Coach의 실제 메시지가 첫 콘텐츠다.
- quick prompt는 대화를 시작하게 돕되 dashboard를 만들지 않는다.
- composer는 항상 안정적으로 접근 가능하다.
- 실제 canonical send/model/action owner와 연결된다.

## Canonical capability boundary
Golden Master Board는 presentation/discovery owner다. 다음을 새로 소유하지 않는다.
- state
- save
- persistence
- recommendation engine
- Workout execution state machine
- Meal Scan analysis/write path
- Coach model/send/action path

기존 canonical owner와 연결만 한다.

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
- fixed five-tab nav가 action center를 가리지 않음
- safe-area 처리

## Commercial finish gate
다음을 만족하지 못하면 Design GREEN이 아니다.
- 동일한 spacing rhythm
- 동일한 radius family
- 동일한 light-surface depth grammar
- primary / secondary action contrast 명확
- loading / empty / error / disabled 상태가 geometry를 깨지 않음
- 화면별로 다른 앱처럼 보이지 않음
- 실제 데이터가 없는 곳에 fake metric을 만들지 않음
- Training/Nutrition visual asset이 저해상도 placeholder처럼 보이지 않음

## Runtime QA boundary
Production에서는 Golden Master Board가 기본 presentation이다.
Localhost canonical regression은 underlying owner를 직접 검증하기 위해 board 없이 실행할 수 있다. Golden Master regression은 `?golden-board=1`로 production presentation을 명시적으로 활성화한다.

이 분리는 테스트 범위를 분리하기 위한 것이며 별도 제품 shell을 유지한다는 의미가 아니다.

## Release rule
Visual polish는 기능 regression을 정당화하지 않는다.

Required before merge:
- exact-head Release Gate FULL GREEN
- Golden Master Board 320 / 360 / 390 / 430 GREEN
- Golden Path GREEN
- Workout execution GREEN
- Meal Scan continuation GREEN
- Coach send GREEN
- Recovery / Check-in GREEN
- Settings / menu touch GREEN
- mobile runtime stress GREEN
- no main/head drift
- Founder explicit merge approval

구조 테스트가 GREEN이어도 실제 시안의 photographic/visual parity가 확인되지 않았다면 visual status는 YELLOW다.
Design GREEN은 code merge 자체가 아니라 실제 user-visible quality + regression evidence로 판정한다.
