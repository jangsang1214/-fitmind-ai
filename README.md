# GARANG V9.9 REBUILD FINAL

이 패키지는 V5~V10 세대의 실행 스크립트를 중첩 로딩하지 않는 단일 SPA 기준선입니다.

## Root overwrite
GitHub 저장소의 앱 루트에서 기존 실행 코드(index.html, legacy JS/CSS)를 삭제한 뒤 이 폴더의 루트 파일을 업로드합니다.

## 보존된 데이터
exercise-db.json, food-db.json, exercise_knowledge.jsonl, food_knowledge.jsonl, fitmind_sft.jsonl, fitmind_rules.jsonl, korean-dialogue-sources-v6.json, synthetic_korean_dialogue_v6.jsonl, v5_coach_rules.json을 그대로 포함합니다. 데이터는 실행 코드와 분리되어 있습니다.

## Firebase
firebase-config.js의 기존 Web App config를 사용합니다. Firebase Console에서 Email/Password, Google, Apple provider와 GitHub Pages 도메인을 승인해야 실제 소셜 로그인이 동작합니다.

## 주요 기능
- Auth: Email/Password, Google, Apple
- FREE / PRO 상태
- Profile / Body
- Workout / volume / RPE / calorie estimate / media certification
- Nutrition DB / kcal / protein / carbs / fat
- Running GPS / distance / pace / calorie / media certification
- AI Coach / local user state / memory / learning counters
- 모바일 safe-area / 단일 bottom navigation
- Service Worker cache versioned

## 주의
이 빌드는 브라우저 단독 실행 가능한 안정 기준선입니다. 외부 LLM API나 결제 서버가 없는 상태에서는 AI 답변과 PRO 전환이 로컬 코어로 동작합니다. 실제 결제/LLM 서버 연결은 별도 backend 단계에서 추가해야 합니다.
