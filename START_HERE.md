# GARANG — 실행 안내

기준: 사용자가 제공한 `GARANG_V10.9.1_DEV_BASE.zip`.
적용 범위: 「V10.1 CORE — 1차 대규모 업데이트」 20개 항목.

1. 압축을 새 폴더에 해제하세요. 기존 베이스 위에 바로 덮어쓰지 않아도 됩니다.
2. Python이 있으면 이 폴더에서 `python -m http.server 8765`를 실행하세요.
3. 브라우저에서 `http://localhost:8765`를 열고 **데모로 시작하기 / Start local mode**를 누르세요. HTML을 파일로 직접 열면 데이터 fetch와 PWA 기능이 제한됩니다.
4. 중요한 기존 데이터는 설정에서 먼저 내보내세요. localStorage는 브라우저·도메인·포트마다 별도입니다. 다른 주소의 데이터를 자동으로 가져오지는 않습니다.
5. 새 기능과 확인된 범위는 `CHANGELOG.md`, `QA_REPORT.md`를 확인하세요. 외부 연결 설정은 `ARCHITECTURE.md`, 남은 검증은 `REMAINING_WORK.md`에 있습니다.

검사 명령(Node.js 필요, 추가 npm 설치 불필요):

```
node tests/core.test.cjs
node tests/adapters.test.cjs
node scripts/check.cjs
node scripts/check.cjs --build
```

`dist/`는 마지막 명령으로 만들어지는 정적 배포본입니다. Firebase 설정은 원본을 유지했으며, LLM/OCR/결제 API는 별도 서버 연결이 필요합니다. 테스트용 기록은 ZIP에 포함되지 않습니다.
