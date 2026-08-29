# GARANG V10.9 MOBILE MAX

Base: GARANG 10.8 BASE

이번 버전은 모바일 환경에서 가능한 범위까지 V10.8을 확장하는 것을 목표로 합니다.

주요 변경:
- AI Coach: 통합 사용자 상태를 읽어 운동/식단/러닝/체성분/플래너 질문에 답변
- InBody: 측정값 확장/이전 측정 대비 변화 표시
- Performance Score: 최근 30일 기반 가중 점수와 일별 점수 기록
- Adaptive Planner: Score/기록 상태에 따라 오늘 우선 계획 추천
- Memory: AI 대화/플래너 이벤트를 사용자 메모리 이벤트로 축적
- Dashboard: 홈에서 Performance Score와 주요 행동 진입
- 다국어: 기존 KO/EN 설정 기반을 유지하며 안전한 언어 상태 관리
- 데이터 안정성: 기존 LocalStorage/Firebase 저장 구조 보존
- Achievement: 기본 기록/연속 기록 성취 조건 및 Score 화면 표시
- 모바일 UX: safe-area, overflow, 입력/미디어 폭, 작은 화면 grid 대응

QA:
- 전체 JS syntax 검사 통과
- HTML 로컬 참조 검사 통과
- 중복 ID 검사 통과

서버/플랫폼 의존:
- 실제 LLM API, 결제, 백그라운드 Push, Health/Watch는 별도 백엔드/네이티브 연결이 필요하며 가짜 성공 상태를 만들지 않습니다.
