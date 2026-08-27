# GARANG V10 Step 1 — Compatibility Pack

## 목적

기존 GARANG V9.x UI/데이터를 삭제하거나 교체하지 않고 V10 Core와 연결할 수 있는
안전한 Compatibility Layer를 추가한다.

### 보존 원칙

- 기존 UI 유지
- 기존 `app.js` 직접 수정하지 않음
- 기존 localStorage/Firebase 저장 로직을 대체하지 않음
- 기존 운동/식단/러닝/신체 데이터 삭제하지 않음
- API key를 코드에 넣지 않음
- LLM provider는 외부 주입 방식

## 현재 단계에서 실제로 바뀌는 것

없다. 이 패키지는 "연결 준비 + 어댑터" 단계다.

기존 앱을 깨뜨리지 않는 것이 Step 1의 성공 조건이다.

## 다음 단계

1. 이 폴더를 `garang-v10-core` 브랜치의 동일한 경로에 업로드
2. 커밋
3. 코드가 GitHub에 들어간 화면 확인
4. 다음 단계에서 `app.js`의 최소 bootstrap 지점만 연결
5. 이후 FREE/PRO, body(InBody), language, AI UI 등의 제품 기능은 별도 기능 감사 후 연결

## 업로드 방법

ZIP을 GitHub에 그대로 넣는 것이 아니다.

1. ZIP 압축 해제
2. `v10/integration/` 폴더를 저장소 루트의 `v10/` 아래에 업로드
3. 기존 `v10/core/` 파일은 건드리지 않는다.
4. Commit changes

