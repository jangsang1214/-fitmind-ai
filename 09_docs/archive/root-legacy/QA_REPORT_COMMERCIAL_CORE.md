# GARANG Commercial Core QA Report

기준일: 2026-09-02
버전: 0.11.0-beta.1

## 자동 정적 QA

`python tests/qa_commercial_core.py`

결과: **25 / 25 PASS**

검사 항목:
- index.html static duplicate id
- runtime local asset references
- 4 core navigation
- runtime JS syntax 4개
- onboarding presence
- Coach Engine V1
- Memory V2
- user-confirmed Planner write
- Progress
- Weekly Review
- Meal Scan foundation
- cloud sync retry
- account-scoped localStorage
- Body Intelligence
- frontend error capture
- analytics base
- 4-column bottom navigation CSS
- mobile 320/560 responsive breakpoints
- Firestore user isolation rule
- PWA scope/start_url
- service worker cache version

## HTTP asset smoke test

로컬 HTTP 서버에서 아래 런타임 파일 모두 **HTTP 200 PASS**:
- index.html
- styles.css
- app.js
- garang-services-config.js
- manifest.webmanifest
- sw.js
- garang-mark.svg
- exercise-db.json
- food-db.json

## Cloud Sync 수정 사항

코드 레벨 PASS:
- user별 localStorage key 분리
- local-first 저장
- Firebase sync queue
- debounce
- 최대 3회 exponential retry
- synced / syncing / pending / failed 상태
- cloud failure 시 local data 유지
- 신규 path: `users/{uid}/app/state`
- legacy user document read fallback
- Firestore Rules userId isolation 명시

### BLOCKED: 실제 Firebase 종단간 검증

실제 로그인 계정과 운영 Firebase Rules 배포 상태가 이 환경에 없기 때문에 다음은 최종 PASS로 표시하지 않는다.
- 실제 이메일/Google/Apple 로그인
- 실제 Firestore write/read
- 네트워크 단절 → reconnect 후 sync
- 두 실제 계정 간 데이터 격리

이 부분은 배포 전에 실제 테스트 계정으로 반드시 검증해야 한다.

## Meal Scan

PASS:
- 사진 선택
- 이미지 미리보기
- 분석 초안 UI
- Food DB 기반 수동 보정
- 사용자 확인 후 Meal Draft 추가
- auto-save 금지
- Vision endpoint adapter boundary

BLOCKED:
- 실제 음식 이미지 인식은 Vision API endpoint 미연결 상태

## 브라우저/기기 QA

CSS에 320~430px 대응 구조를 반영했으나, 이 실행 환경의 headless Chromium이 정상 종료되지 않아 실제 렌더 기반 전수검사는 **BLOCKED**로 남긴다.
실기기 iPhone Safari 테스트는 배포 전 필수다.

## Release 판단

**Development / Commercial Core Beta Candidate**

정적/구조 QA는 PASS지만, 실제 Firebase 종단간과 실기기 모바일 QA가 남아 있으므로 Production PASS로 표시하지 않는다.
