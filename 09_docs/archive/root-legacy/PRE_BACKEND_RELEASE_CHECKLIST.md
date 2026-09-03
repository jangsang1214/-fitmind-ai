# GARANG — Backend 연결 전 필수 체크리스트

## P0 — backend 전에 반드시 닫기
1. Canonical runtime 고정: index/app/styles/service worker/source-of-truth 일치
2. 320/375/390/430px 전 페이지 visual regression 및 iPhone Safari 실기기 QA
3. Workout/Nutrition/Running/Body/Planner/Coach/Memory/Settings 데이터 schema v5 확정 및 migration fixture 테스트
4. 로컬 저장 → refresh → logout/login → user A/B 격리 테스트
5. Estimated 1RM, Body 자동계산, Progress 산식에 unit tests 추가
6. 이미지 인증 합성: 세로/가로/고해상도 사진 export 테스트; EXIF orientation 케이스 확인
7. Coach WRITE는 사용자 승인 이전 실행 금지, write action idempotency contract 확정
8. API 계약 문서 확정: auth/error/version/rate-limit/request-id/validation
9. Secret은 client에서 제거할 목록 확정 (LLM/Vision/payment keys)
10. User data export/delete/account delete의 데이터 범위 정의

## P1 — backend 연결 직후
1. Firebase/Auth 실계정 E2E와 Firestore rules user-isolation
2. n8n READ tools → 실제 user context 검증
3. n8n WRITE tools → confirmation → validation → DB write → action log
4. Memory V2 server persistence/retrieval/dedup/versioning
5. Meal Scan Vision + food database confidence/review flow
6. Error monitoring + analytics 실제 endpoint
7. Payment webhook + server-side entitlement
8. Backup/restore, staging/prod separation, rollback

## Commercial Beta gate
Backend/Auth security/Agent READ+WRITE/Memory/User delete-export/monitoring/analytics/mobile E2E가 모두 PASS일 때만 Commercial Beta로 표기.
