# GARANG V10 Core Baseline

목적: 기존 V9.x 기능을 보존하면서 GARANG Core 중심으로 재구축하기 위한 기준 골격.

## 구조

- `v10/core/memory-engine.js` — 장기기억 저장/검색/업데이트 정책
- `v10/core/data-engine.js` — 사용자 운동/식단/러닝/신체 데이터 접근 추상화
- `v10/core/agent-engine.js` — 전문 Agent 라우팅
- `v10/core/tool-router.js` — 데이터/검색/계산 등 Tool 호출 계층
- `v10/core/ai-router.js` — LLM provider 추상화
- `v10/core/garang-core.js` — 전체 orchestration 진입점
- `v10/core/GARANG_CORE_SPEC.md` — 설계 기준

이 패키지는 기존 앱 UI를 교체하지 않는다. 기존 UI/기능을 유지한 채 Core를 연결하는 것을 전제로 한다.
