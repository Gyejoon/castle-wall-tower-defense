# Mobile Game Production Harness Design Spec

**Date:** 2026-03-30
**Status:** Approved
**Target:** PWA (Mobile Web) + AI Agent Orchestration Workflow

## 1. Problem Statement

Grid Line Defense PvP Phase 1 프로토타입은 완료되었으나, 프로덕션 모바일 게임에 필요한 인프라가 전무한 상태. 게임플레이는 검증되었지만 출시를 위한 "게임 외" 시스템(Analytics, 서버, 인증, CI/CD, 모네타이제이션, 크래시 리포팅)이 0%.

## 2. Goals

1. **133개 방법론 리서치 카탈로그** 정리 완료 (별도 문서 참조)
2. **Edge-First Minimal Harness** 아키텍처로 프로덕션 인프라 구축
3. **4단계 점진적 구현** (Phase 1.5 → 2 → 3 → 4)
4. **AI 에이전트 오케스트레이션** 워크플로우로 병렬 구현

## 3. Architecture: Edge-First Minimal Harness

### 3.1 Why Edge-First

- 1인 개발 + AI 에이전트 → 서버 관리 최소화가 핵심
- Cloudflare 에코시스템이 PWA와 자연스러운 시너지
- 무료 티어로 시작 가능, 스케일 시 비용 예측 가능
- 전 세계 50ms 미만 레이턴시 (엣지 배포)

### 3.2 Architecture Diagram

```
[Browser (PWA)]
  ├── React 18 (UI Shell)
  ├── Phaser 3.87 (Game Engine)
  ├── Zustand (State)
  ├── Service Worker (Offline + Cache)
  └── IndexedDB (Local Save)
         │
         ▼
[Cloudflare Edge]
  ├── Pages (Static PWA Hosting)
  ├── Workers (API + Validation)
  ├── D1 (SQLite DB)
  ├── R2 (Asset Storage)
  └── KV (Session Cache)
         │
         ▼
[External Services]
  ├── Supabase Auth
  ├── Sentry (Error Tracking)
  ├── PostHog (Analytics)
  └── PartyKit (Real-time PvP)
```

### 3.3 Data Flow

1. **Game Events** → EventBus → Analytics Service → PostHog
2. **Errors** → Sentry SDK → Sentry Dashboard
3. **Game Saves** → IndexedDB (local) + CF Workers API → D1 (server)
4. **Ghost Battle** → Record locally → Sync to D1 → Fetch opponent from D1
5. **Auth** → Supabase Auth → JWT → CF Workers verify

## 4. Implementation Phases

### Phase 1.5: Production Readiness (Immediate)

| Task | Method # | Priority | Effort |
|------|----------|----------|--------|
| PWA Manifest + Service Worker | #21, #22, #33 | P0 | 2h |
| Sentry Error Tracking | #82 | P0 | 1h |
| GitHub Actions CI | #51 | P0 | 2h |
| Cloudflare Pages Deploy | #129 | P0 | 1h |
| Bundle Size Budget | #60 | P1 | 30m |
| WebP Asset Conversion | #118 | P1 | 1h |
| Sprite Atlas Packing | #115 | P1 | 2h |
| Wake Lock + Orientation Lock | #24, #33 | P1 | 30m |

### Phase 2: Server + Analytics

| Task | Method # | Priority | Effort |
|------|----------|----------|--------|
| Supabase Auth | #99 | P0 | 4h |
| CF D1 + Workers API | #40, #42 | P0 | 6h |
| PostHog Analytics | #78 | P0 | 2h |
| Ghost Battle Server Save | #49 | P0 | 4h |
| Leaderboard | #46 | P1 | 3h |
| PartyKit Real-time PvP | #41 | P1 | 8h |
| IndexedDB Migration | #28 | P1 | 2h |

### Phase 3: Monetization + Growth

| Task | Method # | Priority | Effort |
|------|----------|----------|--------|
| Toss Payments | #90 | P0 | 6h |
| Battle Pass System | #91 | P1 | 8h |
| Daily Rewards | #97 | P0 | 2h |
| Push Notifications | #30 | P1 | 4h |
| Tutorial System | #106 | P0 | 6h |
| Achievement System | #109 | P1 | 4h |

### Phase 4: Scale + Polish

| Task | Method # | Priority | Effort |
|------|----------|----------|--------|
| A/B Testing | #85 | P1 | 3h |
| Session Replay | #81 | P1 | 2h |
| Server-Side Validation | #98 | P0 | 8h |
| Performance Monitoring | #83 | P1 | 2h |
| AI Game Balancing | #17 | P2 | 4h |

## 5. AI Agent Orchestration Strategy

### 5.1 Parallel Worktree Pattern

```
Orchestrator (Human)
  ├── Agent A (worktree: feat/pwa-harness) → PWA + Service Worker
  ├── Agent B (worktree: feat/ci-cd) → GitHub Actions + Lighthouse CI
  ├── Agent C (worktree: feat/error-tracking) → Sentry Setup
  └── Agent D (worktree: feat/deploy) → Cloudflare Pages
```

### 5.2 Agent Coordination Rules

1. **Independence:** 각 에이전트는 독립 worktree에서 작업. 공유 상태 없음
2. **Shared Types:** `@gld/shared` 변경은 한 번에 하나의 에이전트만 수행
3. **Merge Order:** shared → phaser-game → web-shell 순서로 머지
4. **Review Gate:** 모든 에이전트 결과물은 코드 리뷰 후 머지

## 6. Technology Decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| Hosting | Cloudflare Pages | PWA 최적, 무료, 글로벌 CDN |
| API Layer | Cloudflare Workers | Edge 배포, D1/R2 네이티브 통합 |
| Database | Cloudflare D1 (SQLite) | Serverless, 마이그레이션 간단 |
| Auth | Supabase Auth | 소셜 로그인, JWT, 무료 50K MAU |
| Analytics | PostHog Cloud | 오픈소스, 이벤트 기반, 무료 1M 이벤트/월 |
| Error Tracking | Sentry | 업계 표준, 소스맵 지원, 무료 5K 이벤트/월 |
| Real-time PvP | PartyKit | CF Workers 기반, WebSocket 자동 관리 |
| Payment | 토스페이먼츠 | 한국 시장 타겟, 간편결제 |
| ORM | Drizzle | TypeScript 네이티브, D1 지원 |

## 7. Research Catalog Reference

133개 방법론 리서치 카탈로그는 플랜 파일에 포함:
`/Users/lio/.claude-personal/plans/stateful-wibbling-barto.md`

### Category Summary

| Category | Count | Key Items |
|----------|-------|-----------|
| AI Agent & VibeCoding | 20 | Worktree 병렬, AITDD, Skill 특화 |
| PWA Platform | 15 | Service Worker, Wake Lock, IndexedDB |
| Game Server & Backend | 15 | Colyseus, PartyKit, CF D1 |
| CI/CD & DevOps | 15 | GitHub Actions, Lighthouse CI, Preview Deploy |
| Testing & QA | 12 | Playwright E2E, Property-Based, Replay |
| Analytics & Telemetry | 10 | PostHog, Sentry, Session Replay |
| Monetization | 10 | Toss Payments, Battle Pass, Daily Rewards |
| Security & Anti-cheat | 8 | Server Validation, CSP, Ghost Validation |
| UX & Retention | 8 | Tutorial, Achievement, Challenges |
| Asset Pipeline | 8 | Sprite Atlas, WebP, AI Music |
| Performance | 7 | Object Pool, Spatial Hashing, Lazy Load |
| Infra & Deploy | 5 | CF Pages, Docker, Multi-Region |

## 8. Verification Plan

### Phase 1.5 Verification

1. `bun test` — All tests pass
2. `bun build:web` — Build succeeds, bundle < 2MB budget
3. Lighthouse CI — PWA score 90+, Performance 80+
4. PWA install — Chrome "Add to Home Screen" works
5. Sentry — Test error captured with source map
6. CI — GitHub Actions green on push/PR
7. Deploy — Site accessible via Cloudflare Pages URL
8. Offline — Game playable after going offline (cached assets)

### Phase 2 Verification

1. Auth — Sign up, login, logout flow
2. Ghost save — Play → record saved to D1 → fetch from D1
3. Leaderboard — Score submitted → appears on board
4. Analytics — PostHog receives game events
5. Real-time — Two players in same PartyKit room

## 9. Files to Modify (Phase 1.5)

| File | Change |
|------|--------|
| `packages/web-shell/public/manifest.json` | **NEW** — PWA manifest |
| `packages/web-shell/index.html` | Add manifest link, meta tags |
| `packages/web-shell/vite.config.ts` | Add vite-plugin-pwa config |
| `packages/web-shell/package.json` | Add vite-plugin-pwa, @sentry/browser deps |
| `.github/workflows/ci.yml` | **NEW** — GitHub Actions CI pipeline |
| `packages/web-shell/src/main.tsx` | Add Sentry.init() |
| `scripts/generate-assets/generate-all.ts` | Add WebP output option |
| `packages/web-shell/src/utils/wakeLock.ts` | **NEW** — Wake Lock API wrapper |
