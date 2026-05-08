# Operations

> **Last Updated:** 2026-05-06 (v4.0 — low-maintenance operations)
> **Goal:** 1인/소규모 운영이 가능한 수준으로 스택과 운영 루틴을 줄인다.

---

## 1. V1 Operating Stack

| 툴 | v1 정책 |
|----|---------|
| Vercel | web deploy |
| GitHub Actions | build/test |
| Sentry | 선택. 크래시 확인용으로만 사용 |
| App In Toss | 배포/광고/결제 연동 지점 |
| localStorage | v1 save |

아래 스택은 v1 운영 필수에서 제외한다.

| 툴 | 상태 | 이유 |
|----|------|------|
| Supabase | 보류 | 서버 저장/랭킹 전까지 불필요 |
| PostHog | 보류 | 초기에는 수동 QA와 최소 로그로 충분 |
| Resend | 제외 | 이메일 기능 없음 |
| Upstash | 제외 | 서버 캐시 없음 |
| Pinecone | 제외 | AI 기능 없음 |

---

## 2. Monitoring

| 항목 | 기준 |
|------|------|
| JS Exception | Sentry 연동 시 5분 내 10건 이상 확인 |
| Game Freeze | 실기기 재현 시 P0 |
| Build Failure | main 배포 차단 |
| Runtime Asset Missing | P0, 게임 진입 불가 가능성 |

서버 API 오류 모니터링은 v1에서 제외한다.

---

## 3. Manual QA Checklist

출시 전에는 자동 대시보드보다 직접 플레이 체크가 중요하다.

| 체크 | 기준 |
|------|------|
| 5분 플레이 | 다시 시작 욕구가 있는지 |
| 첫 보스 | 2~3분 안에 도달하는지 |
| 모바일 조작 | 한 손으로 소환/배치/합성이 가능한지 |
| 결과 화면 | 재시작이 1탭으로 가능한지 |
| 광고 미시청 | 광고 없이도 정상 진행되는지 |
| 성능 | 모바일에서 프리즈 없이 1판 종료되는지 |

---

## 4. Minimal Metrics

SDK 연동 전에는 QA 로그나 수동 기록으로도 충분하다.

| 지표 | 목적 |
|------|------|
| Session Length | 평균 6~8분 유지 |
| Final Wave | 난이도 튜닝 |
| First Boss Reach | 초반 재미 도달 |
| Retry Rate | 한 판 더 욕구 |
| Continue Ad Opt-in | 광고 placement 자연스러움 |
| Card Reroll Ad Opt-in | 리롤 placement 자연스러움 |

DAU/WAU/MAU, retention, conversion은 출시 후 필요할 때 붙인다.

---

## 5. LiveOps Policy

v1에는 LiveOps를 넣지 않는다.

| 항목 | v1 정책 |
|------|---------|
| 일일 미션 | 제외 |
| 주간 미션 | 제외 |
| 출석 보상 | 제외 |
| 시즌 이벤트 | 제외 |
| 한정 웨이브 | 제외 |
| 복귀 유저 보상 | 제외 |

운영비를 벌기 위해 운영비를 만드는 구조를 피한다.

---

## 6. Deployment

| 환경 | 트리거 |
|------|--------|
| Preview | PR |
| Production | main branch |

배포 전 필수:

- build 통과
- 문서/코드 불일치 확인
- 모바일 1판 smoke test

---

## 7. Unity Operations

Unity 전환은 유지하되 운영 스택을 늘리지 않는다.

| 단계 | 운영 원칙 |
|------|-----------|
| Unity PoC | 별도 production surface가 아니라 `/unity/?slice=poc` 확인용 |
| Unity build | CI에서 가능하면 검증, license 없으면 skip 가능 |
| Migration | Phaser와 같은 shared data를 사용 |
| Release switch | Unity가 최소 루프 동등성을 충족한 뒤 별도 판단 |

Unity 때문에 서버, 시즌, 신규 BM을 앞당기지 않는다.
