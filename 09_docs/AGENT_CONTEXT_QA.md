# GARANG Agent Context API QA

Date: 2026-09-02  
Status: DEPLOYED / LIVE SECURITY PASS

## 확인 결과

- 현재 앱은 Firestore `users/{uid}` 단일 문서에 Profile, Workout, Meal, Run, Body, Planner, Memory를 배열과 객체로 저장한다.
- Goal의 실제 위치는 `profile.goal`이며 별도 Goal 컬렉션은 없다.
- 서버는 요청의 URL·쿼리·본문에서 사용자 ID를 받지 않고 검증된 Firebase ID 토큰의 `uid`만 사용한다.
- Firebase Admin `verifyIdToken(token, true)`로 서명, 만료 및 토큰 폐기를 확인한다.
- Performance Score는 앱과 동일한 최근 30일 `recording-v2` 공식을 사용한다.
- `aiChats`, 설정, 결제 플랜, 러닝 GPS 좌표, 삭제·미확정·만료 Memory는 AI 전송 대상에서 제외했다.
- 빈 신규 사용자 문서는 오류 대신 빈 배열과 데이터 부족 상태의 Performance Score를 반환한다.

## 자동 검사

- 기존 회귀 검사 61개 통과
- Agent Context 전용 검사 9개 통과
- 총 70개 통과
- 전체 JavaScript 구문, JSON/JSONL, 실행 자산 검사 통과
- Firebase Functions 실제 모듈을 설치한 상태에서 `functions/index.js` 로드 및 `api` export 확인

## 배포 상태

`fitfind-ai`의 Blaze 전환 후 Node.js 22 2세대 `api` 함수를 `asia-northeast3`에 배포했다.

- Base URL: `https://asia-northeast3-fitfind-ai.cloudfunctions.net/api`
- Agent Context: `https://asia-northeast3-fitfind-ai.cloudfunctions.net/api/agent/context`
- 인증 없음: `401 UNAUTHENTICATED`
- 위조 토큰: `401 UNAUTHENTICATED`
- POST 요청: `405 METHOD_NOT_ALLOWED`, `Allow: GET`
- 응답 캐시: `Cache-Control: private, no-store`, `Vary: Authorization`
- Artifact Registry: 1일보다 오래된 배포 이미지를 자동 삭제하는 정책 적용

실제 로그인 사용자의 정상 Firebase ID 토큰을 통한 `200` 응답은 앱에서 n8n Webhook으로 토큰 전달을 연결할 때 최종 확인한다.
