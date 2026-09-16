# Wanted AI Championship 2026 — Final Form Copy

> 제출 직전 `[WANTED_PUBLIC_URL]`만 실제 Wanted 전용 공개 URL로 교체한다.
> 심사 체험 데이터는 실제 사용자 데이터가 아니라 명확히 표시된 14일 합성 데이터다.

## 프로젝트명
GARANG — Personal Performance Intelligence

## 서비스 링크
[WANTED_PUBLIC_URL]

## 한 줄 소개
운동·식단 기록을 쌓는 데서 끝나지 않고, 사용자의 목표와 최근 상태를 해석해 오늘의 다음 행동을 판단하고 그 실행·결과를 다시 이후 판단에 연결하는 Personal Performance Intelligence.

## 해결하고자 한 문제
운동, 식단, 러닝, 체성분 데이터는 계속 쌓이지만 사용자가 실제로 어려워하는 순간은 기록 이후입니다. 오늘 원래 계획대로 운동해도 되는지, 회복 상태가 좋지 않을 때 무엇을 바꿔야 하는지, 최근 식단과 훈련이 목표와 같은 방향으로 가고 있는지, 지금까지의 행동이 다음 행동에 어떻게 연결되는지를 기존 기록 앱은 충분히 설명하지 못합니다.

GARANG은 Goal → Plan → Action → Record → Interpretation → Feedback → Next Action → Long-term Change를 하나의 흐름으로 연결해, 과거 기록을 보여주는 것을 넘어 사용자가 지금 무엇을 해야 하는지 이해하고 실제 행동으로 이어지게 하는 것을 목표로 합니다.

## AI 활용 방식
GARANG은 중요한 판단을 범용 LLM에 그대로 맡기지 않습니다.

1. GARANG Deterministic Intelligence가 목표, 운동, 식단, 러닝, 체성분, 수면, 에너지, 스트레스, 근육통, 일정, 장기 메모리를 구조화된 상태로 읽습니다.
2. State / Decision Intelligence가 readiness, fatigue, training load, trend, goal alignment 등의 신호를 해석해 오늘의 판단과 다음 행동 방향을 결정합니다.
3. LLM Coach는 이 결정과 근거를 현재 사용자 맥락에서 자연어로 설명하고 추가 질문에 답합니다. LLM은 GARANG의 결정이나 사용자 상태를 임의로 변경할 수 없습니다.
4. 사진을 첨부하면 Multimodal Coach가 일회성 시각 맥락으로 해석하며 raw 이미지는 GARANG 사용자 기록이나 대화 텍스트에 저장하지 않습니다.
5. GARANG은 decision → recommendation → action → plan → execution → outcome을 연결해 어떤 판단이 실제 행동 및 결과로 이어졌는지 추적하고, 축적된 근거를 이후 판단에 사용할 수 있도록 설계했습니다.

## 사용한 주요 AI 도구
- OpenAI GPT-5.6 Luna: Production Coach의 자연어 설명 및 멀티모달 맥락 해석
- GARANG Deterministic Intelligence Core: 사용자 상태 해석, decision/recommendation/plan logic
- Firebase Authentication / Firestore / Cloud Functions: 인증 사용자 상태와 Production Coach gateway
- GitHub Actions + Playwright WebKit: Golden Path, 모바일 상호작용, Wanted 60초 심사 동선 및 회귀 검증
- ChatGPT: 제품/엔지니어링 분석, 구현 지원, QA 및 프로젝트 오케스트레이션

## 심사위원용 60초 체험 방법
1. 첫 화면에서 `60초 심사 체험`을 누릅니다.
2. 실제 개인정보가 아닌 최근 14일 합성 운동·식단·회복·체성분 기록이 로컬에서 로드됩니다.
3. Today에서 최근 고강도 하체 운동, 수면 저하, 스트레스, 근육통과 오늘 계획을 GARANG이 어떻게 해석해 다음 행동으로 연결하는지 확인합니다.
4. Coach에서 같은 판단의 근거와 설명을 확인합니다.
5. Progress에서 2주 동안 누적된 운동·식단·러닝·체성분 근거와 변화를 확인합니다.
6. 실제 GPT 기반 Coach와 사진 입력은 회원가입/로그인 후 동일 Coach 화면에서 사용할 수 있습니다.

## 데이터 안내
60초 심사 체험에 사용되는 기록은 심사 편의를 위해 만든 명시적 14일 합성 데이터입니다. 실사용자 개인정보나 실제 사용자 샘플을 포함하지 않습니다. 날짜는 상대 날짜로 생성되어 심사 시점에도 최근 2주 데이터처럼 일관되게 표시됩니다.

## 제출 전 사람 확인 항목
- Wanted 참가 신청이 최종 완료 상태인지 확인
- `[WANTED_PUBLIC_URL]`을 실제 Wanted 전용 공개 URL로 교체
- 시크릿/인코그니토 모바일 브라우저에서 `60초 심사 체험 → Today → Coach → Progress` 1회 확인
- 원티드 제출 페이지에서 필수 항목 전체 입력
- `최종 제출` 완료 여부 확인 (임시저장 상태로 끝내지 않기)
- 상용 GARANG이 이미 서비스 중이라면 운영 기간 및 수익화 여부를 원티드 안내에 따라 별도로 고지
