# GARANG Commercial Core UX / Reliability Sprint

## 제품 방향

학생 프로젝트가 아니라 실제 상용 Personal Performance OS를 목표로 한다.
UI는 특정 럭셔리 브랜드를 복제하지 않고, 프리미엄 필기구/가죽 제품에서 느껴지는 절제·정밀함·여백·재료감을 참고했다.
한국적 정서는 먹색, 한지 아이보리, 옻칠을 연상시키는 절제된 적색, 청자 계열 회녹, 한글 타이포그래피와 미세한 격자 리듬으로 구현했다.

## 변경된 핵심 UX

- Bottom Navigation: TODAY / COACH / LOG / PROGRESS
- TODAY: Score + 오늘 결정 + 최소 상태 + 오늘 일정 + 빠른 기록
- Check-in raw value는 저장 후 홈을 차지하지 않고 요약 chip으로만 표시
- LOG: Workout / Nutrition / Running / Body를 한 허브에 통합
- PROGRESS: 7일/30일/3개월/1년, PR, 볼륨, 러닝, 체중 추세, Weekly Review
- COACH: Coach Engine V1 결정과 데이터 근거, Planner 적용 승인
- Onboarding: 목표/경험/주간 횟수/가능 시간/선호
- Memory V2: type/key/value/source/confidence/importance/userConfirmed/createdAt/updatedAt/expiresAt

## Meal Scan

실제 이미지 인식 endpoint가 없을 때 AI가 사진을 인식했다고 가장하지 않는다.
현재 개발 모드:
1. 사진 선택
2. 미리보기
3. 음식명/중량 수동 보정
4. Food DB 영양 초안
5. 사용자 확인 후 Meal Draft 추가
6. 최종 저장

Vision endpoint 연결 시 multipart image -> `{items:[...]}` 계약을 사용한다.

## Cloud Sync

기존 방식의 문제를 줄이기 위해:
- 로그인 사용자별 localStorage 격리
- 로컬 저장 우선
- Firebase sync queue
- 700ms debounce
- 최대 3회 exponential retry
- synced/syncing/pending/failed UI 상태
- 실패해도 로컬 데이터 보존
- 새 문서 경로 `users/{uid}/app/state`
- 구버전 `users/{uid}` 데이터 read migration fallback

실제 Firebase 종단간 PASS는 로그인 가능한 테스트 계정과 배포된 Rules가 있어야 확정할 수 있다.
