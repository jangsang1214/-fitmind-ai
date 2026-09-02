# GARANG Project Source of Truth

기준일: 2026-09-03
버전: 0.11.0-beta.3

## 기준

이 디렉터리의 루트 런타임이 canonical source다.

실제 실행 파일:
- `index.html`
- `styles.css`
- `app.js`
- `firebase-config.js`
- `garang-services-config.js`
- `manifest.webmanifest`
- `sw.js`
- `garang-mark.svg`
- `exercise-db.json`
- `food-db.json`

`archive/`는 이번 리빌드 직전 GitHub 메인 ZIP의 런타임 백업이다. 실행 소스로 사용하지 않는다.
기존 V5~V10 계열 파일은 호환/역사 자료이며 `index.html`에서 로드하지 않는다.

## 이번 Commercial Core 리빌드 목표

1. 홈 화면 정보 밀도 축소
2. 하단 IA를 `TODAY / COACH / LOG / PROGRESS`로 단순화
3. 한국적 정서를 직접적인 전통 문양 복제보다 먹색·한지색·옻칠 적색·절제된 선과 여백으로 표현
4. Onboarding/User Model 추가
5. Coach Engine V1의 결정 레이어 추가
6. Memory V2 구조 추가
7. 사용자 승인 기반 Planner WRITE 경로 추가
8. Progress / Weekly Review 추가
9. Meal Scan 개발용 UI 및 실제 Vision Adapter 경계 추가
10. 계정별 로컬 저장 분리 및 Firebase 동기화 큐/재시도/상태 표시 추가
11. Service Worker cache 정책 개선

## 0.11.0-beta.3 Visual-First 원칙

- Workout은 텍스트보다 전/후면 신체와 타깃 근육을 먼저 보여준다.
- 운동 선택은 부위 → 시각 운동 카드 → 세트 기록 순서로 진행한다.
- Nutrition은 검색 폼보다 Meal Scan/음식 사진을 먼저 보여준다.
- TODAY는 체크인 원본값을 늘어놓지 않고 신체 상태, GARANG 결정, 핵심 수치만 우선 노출한다.
- Settings의 언어, 단위, FREE/PRO, Cloud Sync, 데이터 관리 기능은 상용 제품의 기본 기능으로 유지한다.
- Workout/Running 인증 투명 오버레이 리디자인은 이번 런타임 변경에서 제외한다.

## 외부 서비스 상태

`garang-services-config.js`의 endpoint가 `null`이면 해당 외부 Provider는 미연결 상태다.
앱은 Provider 성공을 가장하지 않는다.

- Coach endpoint: 미연결 시 로컬 Coach Engine V1만 사용
- Meal Scan endpoint: 미연결 시 사진 미리보기 + Food DB 수동 보정 초안
- Payment endpoint: 계약 구조만 준비, 실제 결제 비활성
- Analytics endpoint: 로컬 이벤트 기록, 외부 수집 서버 선택적

## Firebase 동기화

신규 canonical 문서 경로:
`users/{uid}/app/state`

앱은 로그인 사용자마다 별도 localStorage key를 사용한다.
클라우드 실패 시 로컬 기록을 유지하고 `pending/failed` 상태로 표시하며 자동 재시도한다.
구버전 root user document는 읽기 migration fallback으로만 지원한다.
