# GARANG VERIFIED — Premium Transparent Overlay

## Workout
- 사진 중심, 중앙 영역 최대한 투명 유지
- 상단: GARANG wordmark / WORKOUT VERIFIED
- 좌측: 얇은 세로선 + `가랑`
- 하단: Session title / target muscle / Duration / Volume / Calories
- 우측 하단: 현재 운동 부위를 강조한 anatomy badge
- Top Lift 1개만 노출
- 얇은 ivory border, 먹색 gradient, 과도한 패널 금지

## Running
- 사진 중심, Distance가 가장 큰 숫자
- Time / Pace / Calories 핵심만 표시
- 실제 run coords가 있으면 우측에 GPS route signature를 생성
- 시작/종료점으로 route 흐름 표현
- 동일한 GARANG wordmark / vertical mark / frame 사용

## Save behavior
이미지 인증은 원본 사진 + Canvas overlay를 합성해 새로운 JPEG로 저장/공유한다.
영상은 현재 원본 공유만 지원하며 실제 overlay 재인코딩은 Native/backend media pipeline 연결 전까지 완료로 표시하지 않는다.
