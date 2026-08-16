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

---

## 8. Security Posture

### 8.1 랭킹 제출 신뢰 모델

점수는 **클라이언트가 주장하는 값**이다. 이를 전제로 서버가 다음을 강제한다.

| 계층 | 강제 내용 | 위치 |
|------|-----------|------|
| 세션 발급 | 런 시작 시 `start_run()` 이 1회용 세션 발급. 사용자당 동시 open 5개, TTL 24h | `20260817000001` |
| 세션 소진 | `submit_run()` 이 `UPDATE ... RETURNING` 으로 원자적 단회 소진. 동시 제출 경합 불가 | 동일 |
| 실시간 하한 | wave N 도달은 최소 N초의 실제 경과 필요 (최소 wave 간격 3s ÷ 최대 배속 3x) | 동일 |
| 게임시간 상한 | 주장 `duration_sec` ≤ 실경과 × 3 + 15s (`elapsedMs` 는 배속 적용 게임시간) | 동일 |
| 결과 정합성 | `defeat ⇒ hp = 0`, `victory ⇒ hp ≥ 1 ∧ wave = 50` | 동일 |
| 빈도 | 사용자당 쿨다운 `clamp(30, prev_duration/2, 180)`초, advisory lock 으로 TOCTOU 차단 | `20260421000001` |

**남은 위험 (알고 남겨둔 것):** 세션을 열어둔 채 실제 시간을 흘려보낸 뒤 위조 점수를 제출하는
것은 여전히 가능하다. 위 통제는 공격 비용을 "요청 1회"에서 "웨이브당 실제 N초 대기"로 올릴 뿐
완전 검증이 아니다. 또한 `implausible_run` 거부 시 함수 트랜잭션이 롤백되어 세션이 다시 열린
채로 남는다 — 정상 클라이언트의 일시적 실패를 보호하는 대신 공격자의 재시도도 허용하는
트레이드오프다.

**완전 검증 경로:** 입력 로그를 기록해 `packages/shared/src/testing/replay-runner.ts` 로
서버에서 재시뮬레이션하고 결과 해시를 대조하는 것. Unity parity gate 가 이미 같은 러너를 쓰고
있어 결정론 기반은 확보돼 있다. 별도 과제로 남긴다.

### 8.2 공개 노출 범위

- `public.runs` / `public.profiles` 는 **본인 행만** SELECT 가능하다.
- 외부 공개 창구는 `v_leaderboard` 하나뿐이며 `security_invoker = false` 로 소유자 권한
  실행된다. 노출 컬럼은 nickname, avatar_key, wave, hp, result, achieved_at, rank,
  `is_me` 뿐이다.
- **`user_id` 를 다시 노출하지 말 것.** 과거 이 뷰가 auth UUID 를 게시해 anon key 만으로 전
  사용자 식별자와 플레이 이력을 결합 열거할 수 있었다. 본인 행 강조는 서버가 계산한 `is_me`
  로 처리한다.

### 8.3 CI / 저장소 위생

- 모든 워크플로우는 `permissions: contents: read` 를 명시한다. 기본값 상속 금지.
- PR 제목 등 사용자 제어 문자열은 `${{ }}` 직접 보간 대신 `env:` 경유로만 셸에 전달한다.
- 트리거는 `pull_request` 를 쓴다. `pull_request_target` 은 fork PR 에 시크릿을 노출하므로
  금지.
- 이 저장소는 public 이다. 커밋 identity 는 GitHub noreply 를 쓴다:
  `git config --local user.email "22903875+Gyejoon@users.noreply.github.com"`.
  회사 이메일을 공개 커밋 로그에 남기지 않는다.
