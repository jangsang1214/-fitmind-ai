# GARANG Agent Context API QA

Date: 2026-09-02  
Status: CODE PASS / DEPLOYMENT WAITING FOR FIREBASE LOGIN

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

현재 실행 환경의 Firebase CLI에 로그인 정보가 없어 실제 Cloud Functions 배포는 수행되지 않았다. `firebase login` 후 `firebase deploy --only functions:api`를 실행해야 공개 URL이 활성화된다.
