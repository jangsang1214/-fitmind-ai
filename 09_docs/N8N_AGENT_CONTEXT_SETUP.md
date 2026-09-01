# GARANG Agent Context API와 n8n 연결

## 엔드포인트

- 메서드: `GET`
- 배포 URL: `https://asia-northeast3-fitfind-ai.cloudfunctions.net/api/agent/context`
- 선택 쿼리: `?limit=50` (1~200, 기본 50)
- 본문: 없음
- 캐시: 사용 안 함

이 API는 URL, 쿼리, 본문에서 사용자 ID를 받지 않는다. `Authorization` 헤더의 Firebase ID 토큰을 서버에서 검증하고, 검증된 `uid`의 `users/{uid}` 문서만 읽는다.

## 앱 또는 n8n 진입 Webhook에서 보낼 값

로그인된 웹 앱은 요청 시점마다 다음 방식으로 최신 Firebase ID 토큰을 얻어 n8n Webhook에 `firebaseIdToken`으로 함께 전달한다.

```js
const firebaseIdToken = await firebase.auth().currentUser.getIdToken();
```

Firebase 웹 API 키나 서비스 계정 JSON은 이 토큰을 대신할 수 없다. 서비스 계정 키를 브라우저나 n8n 프롬프트에 넣지 않는다.

## n8n HTTP Request Tool

1. Method: `GET`
2. URL: `https://asia-northeast3-fitfind-ai.cloudfunctions.net/api/agent/context`
3. Send Headers: 켬
4. Header Name: `Authorization`
5. Header Value: `Bearer {{ $json.firebaseIdToken }}`
6. Header Name: `Accept`
7. Header Value: `application/json`
8. Send Body: 끔

Webhook 노드의 데이터를 직접 참조해야 하는 워크플로라면 Header Value를 다음처럼 설정한다.

```text
Bearer {{ $('Webhook').item.json.firebaseIdToken }}
```

AI Agent의 사용자 Prompt `{{ $json.message }}`와 GARANG Core System Instruction은 그대로 유지할 수 있다. 토큰은 프롬프트에 섞지 않고 HTTP Tool 헤더에만 둔다.

## 응답의 실제 데이터 대응

| 기능 | 응답 키 | 현재 Firestore 원본 |
|---|---|---|
| Profile | `profile` | `users/{uid}.profile` |
| Goal | `goal` | `users/{uid}.profile.goal` |
| Workout | `workouts` | `users/{uid}.workouts` |
| Nutrition | `meals` | `users/{uid}.meals` |
| Running | `runs` | `users/{uid}.runs` |
| Body | `body` | `users/{uid}.body` |
| Performance Score | `performanceScore` | 현재 기록으로 `recording-v2` 공식 재계산 |
| Planner | `planner` | `users/{uid}.planner` |
| Memory | `memory` | `users/{uid}.memory` |

`aiChats`, 결제 플랜, 언어, 알림 설정, 러닝 GPS 좌표와 삭제된·미확정·만료된 장기기억은 Agent 문맥에서 제외한다. 러닝 거리·시간·페이스·칼로리 기록은 유지하되 정확한 이동 경로는 AI 서비스로 보내지 않는다.

## 배포

프로젝트 루트에서 Firebase CLI 로그인을 마친 후 실행한다.

```text
firebase deploy --only functions:api
```

Cloud Functions 배포에는 Firebase 프로젝트의 Blaze 요금제가 필요하다. 2026-09-02 실제 배포 시도에서는 `fitfind-ai`가 Spark 요금제여서 필수 Artifact Registry API 활성화 단계에서 중단됐으며 함수는 아직 생성되지 않았다. Blaze 업그레이드 후 다시 배포해야 한다. 배포가 끝나면 위 URL에 Firebase ID 토큰 없이 요청해 `401 UNAUTHENTICATED`가 반환되는지 먼저 확인한다.
