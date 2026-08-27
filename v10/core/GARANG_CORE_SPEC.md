# GARANG V10 CORE SPEC

## 핵심 루프
Observe → Remember → Understand → Decide → Act → Learn

## 계층
UI → GARANG Core → Memory/Data/Agent Engine → Tool Router → AI Router → LLM Provider

## 원칙
1. LLM은 GARANG 자체가 아니다.
2. LLM provider는 교체 가능해야 한다.
3. 대화 기록과 장기기억을 분리한다.
4. 사용자 데이터는 UID 단위로 격리한다.
5. 계산/DB 사실은 가능한 한 Tool/Data Engine에서 확정하고 LLM은 설명과 의사결정을 담당한다.
6. 기존 UI와 기능을 보존하면서 점진적으로 연결한다.

## Agent
- Workout
- Nutrition
- Running
- Recovery
- Report
- Core Orchestrator

## Memory
- facts
- goals
- preferences
- topics
- feedback
- memory confidence
- source
- timestamps

## 실행 흐름
1. 사용자 입력 수신
2. 사용자 상태/최근 데이터 조회
3. 관련 장기기억 조회
4. 의도 및 Agent 결정
5. 필요한 Tool 실행
6. AI Router를 통해 모델 호출
7. 응답 생성
8. 새로운 기억 후보 추출
9. 검증 후 Memory 저장
10. 사용자에게 다음 행동 제시
