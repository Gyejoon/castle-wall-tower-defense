# Operations

> **Last Updated:** 2026-04-07  
> **Source:** Obsidian `운영용 툴.md` + `ai/product/specs/일반모드 게임 설계 문서.md` §12

---

## 1. 운영 스택

| 툴 | 역할 | 비용 |
|----|------|------|
| Claude | AI 코딩 에이전트 | 월 $110 |
| Supabase | DB (서버 동기화, Phase 5) | — |
| Vercel | Deploy | — |
| InappToss | 결제, 로그인 | — |
| Resend | 이메일 (알림, 트랜잭션) | — |
| Cloudflare | DNS | — |
| PostHog | 유저 분석 | — |
| Sentry | 에러 추적 | — |
| Upstash | Redis (세션/캐시, Phase 5) | — |
| Pinecone | 벡터 DB (AI 기능, Phase 5+) | — |

---

## 2. 에러 모니터링

> Sentry 기준

| 이벤트 | Alert 조건 | 담당 |
|--------|----------|------|
| JS Exception | 5분 내 10건+ | 즉시 확인 |
| 게임 프리즈 (메모리 누수) | 실기기 재현 시 | P0 대응 |
| API 오류 (Phase 5+) | 에러율 1%+ | 알림 |

---

## 3. 분석 대시보드 항목 (PostHog)

| 지표 | 목적 |
|------|------|
| DAU / WAU / MAU | 서비스 건강 지표 |
| D1 / D7 Retention | 재방문율 |
| Session Length | 세션 길이 (목표: 5~7분) |
| Wave Reach Distribution | 웨이브별 이탈 구간 분석 |
| Boss Reach Rate | 첫/최종 보스 도달율 |
| Wave 10 Clear Rate | 최종 클리어율 |
| Retry Rate | 즉시 재도전 비율 |
| Tower Placement Heatmap | 배치 패턴 분석 |
| Ad Views / DAU | 광고 시청량 (Phase 5+) |
| Conversion Rate | 결제 전환율 (Phase 5+) |

---

## 4. LiveOps 운영 체계

### 일일 운영

| 항목 | 내용 | 코드 위치 |
|------|------|---------|
| 일일 미션 | KST 00:00 리셋 | `missions.ts` |
| 무료 상자 | 24h 쿨타임 | `gacha.ts` |
| 출석 체크 | 앱 오픈 시 자동 달성 | `missions.ts` |

### 주간 운영

| 항목 | 내용 | 코드 위치 |
|------|------|---------|
| 주간 미션 | 매주 월요일 KST 00:00 리셋 | `missions.ts` |
| 주간 접속 팩 | 7d 쿨타임 오퍼 | Phase 5 |

### 이벤트 (Phase 5+)

| 항목 | 내용 |
|------|------|
| 시즌 이벤트 | 시즌별 최고 웨이브/클리어 기록 리셋 |
| 한정 웨이브 | 특정 기간 한정 적 구성 |
| 복귀 유저 케어 | 7일+ 미접속 복귀 시 성장 가속 보상 |

---

## 5. 배포 체계

| 환경 | URL | 트리거 |
|------|-----|--------|
| Preview | Vercel Preview URL | PR merge |
| Production | (TBD) | main 브랜치 push |

---

## 6. 변경 이력

| 날짜 | 항목 | 변경 내용 |
|------|------|---------|
| 2026-04-07 | 최초 작성 | 운영용 툴 + GDD §12 기반 |
