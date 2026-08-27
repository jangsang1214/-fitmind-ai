# GARANG V10 Real Integration Pack

## 목적
기존 GARANG을 유지하면서 V10 Core와 제품 누락 기능의 연결 지점을 정리한다.

### 포함
- V10 bootstrap import 경로 수정
- FREE / PRO 비교 및 upgrade 진입점
- 실제 결제를 가짜로 완료하지 않는 payment boundary
- 신체 데이터 / InBody 입력 진입점
- 언어 선택 상태
- 확장된 AI Chat UI 진입점

## 적용
1. `v10/core/v10-bootstrap.js`를 기존 파일과 교체한다.
2. `v10/integration/v10-product-layer.js`를 업로드한다.
3. `index.html`의 기존 스크립트 마지막에 추가한다.

```html
<script type="module" src="v10/core/v10-bootstrap.js"></script>
<script src="v10/integration/v10-product-layer.js"></script>
```

단, 기존 앱에서 bootstrap을 실제 초기화하는 코드는 앱의 auth/state API에 맞춰 연결해야 한다.

## 중요
이 패키지는 결제 성공이나 LLM 응답을 가짜로 만들지 않는다.
실제 checkout과 LLM 호출은 서버/provider 연결이 필요하다.

Golden Baseline 브랜치에는 적용하지 않는다.
