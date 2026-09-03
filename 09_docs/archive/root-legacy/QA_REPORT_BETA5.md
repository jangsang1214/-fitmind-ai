# GARANG 0.11.0-beta.5 QA REPORT

기준 빌드: `GARANG_VISUAL_FIRST_COMMERCIAL_CORE_0.11.0-beta.5`

## 이번 수정 목적

사용자가 실제 iPhone 화면에서 확인한 다음 회귀를 수정했다.

- 남성/여성 신체 모델이 초기 단순 실루엣처럼 보여 근육 정보가 부족함
- Workout 예상 1RM 정보가 UI에 자연스럽게 녹지 않고 숫자/단위가 붙어서 보임
- GARANG Coach가 채팅 UI가 아니라 긴 텍스트 문서처럼 렌더링됨
- Body Intelligence 그래프가 모바일에서 찌그러지고 날짜/수치가 겹침
- Body 입력 기능과 신규 기능이 한 화면에 과도하게 노출됨
- 인증 화면이 최초 승인한 premium transparent overlay 시안보다 단순함
- 일부 모바일 화면에서 레이아웃이 밀리거나 가로 overflow가 발생할 위험

## 적용 결과

### PASS — 구조/정적 QA

- Static duplicate IDs: PASS (25 IDs, duplicate 0)
- Runtime local references: PASS (missing 0)
- `app.js` JavaScript syntax: PASS
- `sw.js` JavaScript syntax: PASS
- `firebase-config.js` syntax: PASS
- `garang-services-config.js` syntax: PASS
- VERSION: `0.11.0-beta.5`
- Service Worker cache: `garang-commercial-v5`
- CSS/app cache bust query applied
- Male/Female anatomical model structure: PASS
- Muscle detail/highlight paths: PASS
- ChatGPT-style Coach markup/CSS: PASS
- Estimated 1RM UI + calculation hook: PASS
- Body derived calculations: PASS
- Body chart responsive SVG: PASS
- Body input/history collapse structure: PASS
- Body PNG/CSV export hooks: PASS
- InBody image/PDF attachment + IndexedDB storage: PASS
- Workout/Running premium certification overlay: PASS (code/Canvas path)
- Settings / FREE·PRO / Language / Cloud Sync preservation: PASS
- TODAY / COACH / LOG / PROGRESS navigation: PASS

정적 자동검사: **25 / 25 PASS**

## PASS — Chromium runtime harness

실제 Chromium 엔진에 HTML/CSS/JS를 인라인으로 로드하고, localStorage/Firebase 외부 의존성은 테스트용 메모리 stub으로 대체했다. 이는 브라우저 렌더링/JS 오류/레이아웃 검사이며 실제 Firebase나 iPhone Safari 종단간 검증을 의미하지 않는다.

검사 viewport:

- 320px
- 375px
- 390px
- 430px

검사 화면:

- TODAY
- COACH
- LOG
- WORKOUT
- BODY

결과:

- 20/20 화면 horizontal overflow: **0px**
- Runtime page error: **0**
- Dynamic duplicate ID: **0**
- Coach message bubbles/composer render: PASS
- Body chart render: PASS
- Workout anatomical model render: PASS

## PASS — 기능 계산 smoke test

- Estimated 1RM: `100kg × 5` → `116.7kg` (Epley): PASS
- Body auto calculation test (`80kg / 180cm / 20%`):
  - 체지방량 `16.0kg`
  - 제지방량 `64.0kg`
  - BMI `24.7`
  - BMR `1790kcal` (테스트 프로필 28세 남성)
- Coach composer visible + conversation bubbles: PASS

## BLOCKED — 실제 외부/기기 검증

다음은 이 실행 환경만으로 PASS 처리하지 않았다.

- 실제 iPhone Safari 320~430px 실기기 QA
- 실제 Firebase 로그인 계정 Cloud write/read/restore
- User A ↔ User B Firestore isolation E2E
- n8n/OpenAI 실제 AI 응답
- Vision Meal Scan 실제 이미지 인식
- 실제 결제 provider/webhook/entitlement
- 영상 프레임에 certification overlay를 재인코딩한 결과

## Release 판단

**Commercial Core Beta Candidate — PASS with external gates BLOCKED**

현재 빌드는 이전 beta.4에서 확인된 UI 통합 회귀를 수정한 브라우저 검증 후보이다. 실기기 Safari + Firebase E2E가 통과하기 전에는 Production Release로 승격하지 않는다.
