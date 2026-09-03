# GARANG 0.11.0-beta.4 QA Report

기준: 2026-09-03
베이스: GARANG_VISUAL_FIRST_COMMERCIAL_CORE_0.11.0-beta.3.zip
목표: 기능 회귀 복구 + Visual-first UX 유지 + Backend 연결 전 안정화

## 자동/정적 QA — PASS

- `app.js` JavaScript syntax: PASS (`node --check`)
- `sw.js` JavaScript syntax: PASS (`node --check`)
- index.html local runtime asset references: PASS / missing 0
- index.html duplicate static IDs: PASS / duplicate 0
- Version source: PASS (`0.11.0-beta.4`)
- Schema: PASS (`v4`)
- Service Worker cache bump: PASS (`garang-commercial-v4`)
- Estimated 1RM implementation: PASS
- Estimated 1RM pure function test: PASS (`100kg x 5 -> 116.7kg`)
- Body derived calculation pure function test: PASS
  - 80kg / 180cm / 20% / male age 30 -> fat mass 16kg, lean mass 64kg, BMI 24.69, BMR 1780
  - 60kg / 165cm / 25% / female age 30 -> fat mass 15kg, lean mass 45kg, BMR 1320
- Chat-style Coach structure: PASS (persistent role messages, sticky composer, suggestion chips)
- Body trend implementation: PASS (7/30/90/365/all + weight/muscle/fat%/fat mass)
- Body export implementation: PASS (PNG + CSV)
- Body report attachment implementation: PASS (IndexedDB image/PDF storage + later download)
- Body history default-collapsed: PASS
- Workout history default-collapsed: PASS
- Male/Female anatomy model switching: PASS (Profile/Onboarding selection)
- Certification image overlay composition implementation: PASS (Canvas image compositing path)
- Settings retained: PASS
- FREE/PRO surface retained: PASS
- Language/unit settings retained: PASS
- Cloud sync implementation retained: PASS
- Meal Scan development path retained: PASS
- hard-coded LLM secret scan in canonical runtime: PASS / none found

정적 검사: 23/23 PASS + 계산 함수 테스트 PASS.

## 회귀 방지 확인

변경된 canonical files:
- app.js
- styles.css
- index.html
- sw.js
- VERSION.txt
- PROJECT_SOURCE_OF_TRUTH.md

추가 문서:
- GARANG_BETA4_REBUILD_NOTES.md
- PRE_BACKEND_RELEASE_CHECKLIST.md
- QA_REPORT_BETA4.md

기존 TODAY / COACH / LOG / PROGRESS, Settings, FREE/PRO, language/unit, Meal Scan 기반, Memory V2, Planner, Cloud Sync 구조는 삭제하지 않음.

## BLOCKED — 외부/실기기 환경 필요

다음 항목은 현재 실행 환경에서 실제 PASS라고 표기하지 않는다.

1. iPhone Safari 실제 기기 320/375/390/430px 전체 경로 E2E
2. Firebase 실계정 로그인 -> Firestore write/read -> 재로그인 restore
3. User A / User B 실제 Firestore Rules 격리 공격 테스트
4. n8n/OpenAI 실제 Agent READ/WRITE
5. Meal Scan Vision 실제 이미지 인식 정확도
6. 실제 결제 provider / webhook / entitlement
7. Push notification 실기기 권한
8. Sentry/운영 monitoring 실제 전송
9. 인증 이미지 Canvas export를 iPhone Safari 사진 라이브러리/Share Sheet에서 최종 검증
10. 영상 자체에 투명 Overlay를 인코딩하는 기능 — 현재는 원본 영상 공유만 지원하며 완료로 표시하지 않음

## Release 판정

현재 상태: **Commercial Core Beta Candidate / Backend Pre-Integration Build**

Production / Commercial Beta로 표기하지 않는다.
