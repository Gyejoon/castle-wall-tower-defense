# Tailwind 전환 + Phase 2 마무리 + Phase 3 웨이브 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 프로젝트 전체 inline style → Tailwind 전환 후, Phase 2 미완(타워 제거, XP 표시) 완료 + Phase 3 스테이지별 웨이브 추가

**Architecture:** Tailwind v4 설치 → 디자인 토큰 매핑 → 16개 파일 마이그레이션(의존도 낮은 순) → 기능 추가

**Tech Stack:** Tailwind CSS v4, Vite, Phaser.js, React, Zustand, Vitest

---

## 병렬 실행 전략 (Team Mode)

```
[Sequential] Task 1: Tailwind 설치/설정 (선행 의존성)
     │
     ▼
[Parallel Batch 1 — 4 Teams]
  ├─ Team Alpha:  Task 2 (PixelPanel,PixelButton,PhaserGame) + Task 3 (App,LobbyPage) + Task 4 (TabBg,BottomTab)
  ├─ Team Bravo:  Task 5 (ProfileBar) + Task 6 (BossHpBar) + Task 7 (DeckDock) + Task 8 (SettingsTab)
  ├─ Team Charlie: Task 9 (HomeTab) + Task 10 (GachaScreen) + Task 11 (DeckEditSheet)
  └─ Team Delta:  Task 16 (타워 제거 — phaser-game 패키지, web-shell 무관) + Task 17 (웨이브 구성 — shared+phaser-game)
     │
     ▼
[Sequential] Task 12 (CollectionTab) + Task 13 (GamePage) — 가장 복잡, 메인에서 직접
     │
     ▼
[Sequential] Task 14 (tokens.ts 정리 + 빌드/테스트) + Task 15 (XP 표시 — GamePage 전환 후)
```

각 Team은 worktree isolation 모드로 실행. 완료 후 메인에서 merge.

---

## Phase 진행 상태

| Phase | 진행률 | 미완 항목 |
|-------|--------|-----------|
| 0 Foundation | 100% | — |
| 1 Core Combat | 100% | — |
| 2 Meta Growth | 95% | 결과 화면 XP 미표시, 게임 종료 후 타워 미제거 |
| 3 Content Expansion | 80% | 스테이지별 웨이브 구성 미구현 (맵/타일맵/UI/다중경로 완료) |

---

## Part A: Tailwind CSS 설치 및 설정

### Task 1: Tailwind v4 + Vite 플러그인 설치

**Files:**
- Modify: `packages/web-shell/package.json`
- Create: `packages/web-shell/tailwind.config.ts`
- Modify: `packages/web-shell/vite.config.ts`
- Modify: `packages/web-shell/src/styles/global.css`

- [ ] **Step 1: 패키지 설치**

```bash
cd packages/web-shell && pnpm add -D tailwindcss @tailwindcss/vite
```

- [ ] **Step 2: Vite 플러그인 등록**

`vite.config.ts`에 `@tailwindcss/vite` 플러그인 추가:

```typescript
import tailwindcss from '@tailwindcss/vite';
// plugins 배열에 추가
plugins: [tailwindcss(), react(), ...]
```

- [ ] **Step 3: global.css에 Tailwind import 추가**

`global.css` 최상단에:

```css
@import "tailwindcss";
```

- [ ] **Step 4: Tailwind 테마에 디자인 토큰 매핑**

`global.css`에 `@theme` 블록으로 커스텀 토큰 등록:

```css
@theme {
  --color-bg: #1a1208;
  --color-panel: #2a2010;
  --color-border: #4a3a20;
  --color-accent: #c8a04a;
  --color-success: #7ab648;
  --color-danger: #c03020;
  --color-gold: #f0d060;
  --color-info: #5bc8e8;
  --color-text: #f0e8d8;
  --color-text-secondary: #a09070;

  --font-pixel: 'Galmuri11', 'Press Start 2P', cursive;
}
```

- [ ] **Step 5: cn() 유틸리티 생성**

`packages/web-shell/src/utils/cn.ts`:

```typescript
export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}
```

- [ ] **Step 6: 빌드 확인**

Run: `cd packages/web-shell && pnpm build 2>&1 | tail -20`
Expected: 빌드 성공, Tailwind 유틸리티 클래스 사용 가능

- [ ] **Step 7: 커밋**

```bash
git add packages/web-shell/package.json packages/web-shell/vite.config.ts packages/web-shell/src/styles/global.css packages/web-shell/src/utils/cn.ts pnpm-lock.yaml
git commit -m "chore: Tailwind CSS v4 설치 및 디자인 토큰 설정"
```

---

## Part B: Inline Style → Tailwind 전환 (의존도 낮은 순)

마이그레이션 원칙:
- 정적 스타일 → Tailwind 클래스
- 런타임 계산값(%, 동적 color) → `style={}` 유지
- 내장 `<style>` keyframes → `global.css`로 이동
- `colors.xxx` 참조 → `text-gold`, `bg-panel` 등 Tailwind 클래스로 대체

### Task 2: 유틸리티 컴포넌트 전환 (Low — 3파일)

**Files:**
- Modify: `packages/web-shell/src/components/ui/PixelPanel.tsx` (1 style)
- Modify: `packages/web-shell/src/components/ui/PixelButton.tsx` (1 style)
- Modify: `packages/web-shell/src/game/PhaserGame.tsx` (1 style)

- [ ] **Step 1: PixelPanel — inline → className**

```tsx
// Before: style={{ padding, background, border, boxShadow, ...style }}
// After:  className="p-4 bg-panel border-2 border-border shadow-[4px_4px_0px_theme(colors.border)]"
```

PixelPanel은 `style` prop spread가 있으므로, 기본값은 className으로, override용 style prop은 유지.

- [ ] **Step 2: PixelButton — 정적 부분만 className 전환**

`fontFamily`, `fontSize`, `border`, `cursor`, `textAlign`, `padding` 등 정적 스타일 → className.
동적 hover transform, variant-based colors는 `style={}` 유지 (JS 이벤트 핸들러 기반).

- [ ] **Step 3: PhaserGame — touch-action + 크기**

```tsx
// Before: style={{ width: '100%', height: '100%', touchAction: 'none' }}
// After:  className="w-full h-full touch-none"
```

- [ ] **Step 4: 커밋**

```bash
git add packages/web-shell/src/components/ui/ packages/web-shell/src/game/PhaserGame.tsx
git commit -m "refactor: PixelPanel, PixelButton, PhaserGame inline→tailwind"
```

---

### Task 3: App + LobbyPage 전환 (Low — 2파일)

**Files:**
- Modify: `packages/web-shell/src/App.tsx` (1 style)
- Modify: `packages/web-shell/src/pages/LobbyPage.tsx` (4 styles)

- [ ] **Step 1: App.tsx LoadingScreen**

```tsx
// flex centering + text color → className
className="flex h-full items-center justify-center"
// letterSpacing → style 유지 (arbitrary)
```

- [ ] **Step 2: LobbyPage.tsx — 모바일 셸 + 탭 컨테이너**

```tsx
// 외부 컨테이너: bg-bg, flex, center
// 모바일 셸: max-w-[430px], h-dvh, flex flex-col, overflow-hidden
// 탭 영역: relative, flex-1, min-h-0, overflow-hidden
// 애니메이션: style={{ animation }} 유지 (동적 타이밍)
```

- [ ] **Step 3: 커밋**

```bash
git add packages/web-shell/src/App.tsx packages/web-shell/src/pages/LobbyPage.tsx
git commit -m "refactor: App, LobbyPage inline→tailwind"
```

---

### Task 4: TabBackground + BottomTabBar 전환 (Medium — 2파일)

**Files:**
- Modify: `packages/web-shell/src/components/lobby/TabBackground.tsx` (3 styles)
- Modify: `packages/web-shell/src/components/lobby/BottomTabBar.tsx` (4 styles)

- [ ] **Step 1: TabBackground — absolute 레이어 + image 커버**

정적 positioning/inset → `absolute inset-0`. 동적 opacity → `style` 유지.

- [ ] **Step 2: BottomTabBar — flex 레이아웃 + 조건부 색상**

`justify-around`, `items-center` → className. 조건부 color (`isActive`) → `cn()` + Tailwind 색상.
safe-area padding → `style` 유지 (env() 계산).

- [ ] **Step 3: 커밋**

```bash
git add packages/web-shell/src/components/lobby/TabBackground.tsx packages/web-shell/src/components/lobby/BottomTabBar.tsx
git commit -m "refactor: TabBackground, BottomTabBar inline→tailwind"
```

---

### Task 5: ProfileBar 전환 (Medium — 10 styles)

**Files:**
- Modify: `packages/web-shell/src/components/lobby/ProfileBar.tsx`

- [ ] **Step 1: 정적 레이아웃 → className**

flex, gap, padding, overflow, text-overflow, font-family, font-size → Tailwind.
동적 XP progress bar width → `style` 유지.

- [ ] **Step 2: 커밋**

```bash
git add packages/web-shell/src/components/lobby/ProfileBar.tsx
git commit -m "refactor: ProfileBar inline→tailwind"
```

---

### Task 6: BossHpBar 전환 (Medium — 7 styles)

**Files:**
- Modify: `packages/web-shell/src/components/game/BossHpBar.tsx`
- Modify: `packages/web-shell/src/styles/global.css` (keyframes 이동)

- [ ] **Step 1: bossBarPulse keyframe → global.css로 이동**

- [ ] **Step 2: 정적 positioning/layout → className**

동적 값(HP width %, phase color) → `style` 유지.

- [ ] **Step 3: 커밋**

```bash
git add packages/web-shell/src/components/game/BossHpBar.tsx packages/web-shell/src/styles/global.css
git commit -m "refactor: BossHpBar inline→tailwind"
```

---

### Task 7: DeckDock 전환 (Medium — 10 styles)

**Files:**
- Modify: `packages/web-shell/src/components/game/DeckDock.tsx`

- [ ] **Step 1: 정적 dock 레이아웃 → className**

flex, gap, padding, overflow, safe-area → className + `cn()`.
카드 선택 상태(border, shadow, opacity) → `cn()` 조건부 클래스.
`imageRendering: 'pixelated'` → `[image-rendering:pixelated]`.

- [ ] **Step 2: 커밋**

```bash
git add packages/web-shell/src/components/game/DeckDock.tsx
git commit -m "refactor: DeckDock inline→tailwind"
```

---

### Task 8: SettingsTab 전환 (High — 13 styles)

**Files:**
- Modify: `packages/web-shell/src/components/lobby/tabs/SettingsTab.tsx`

- [ ] **Step 1: 정적 섹션/행 레이아웃 → className**

- [ ] **Step 2: 토글 스위치 동적 부분 → style 유지 (left 위치, bg 색상)**

- [ ] **Step 3: 커밋**

```bash
git add packages/web-shell/src/components/lobby/tabs/SettingsTab.tsx
git commit -m "refactor: SettingsTab inline→tailwind"
```

---

### Task 9: HomeTab 전환 (High — 15 styles)

**Files:**
- Modify: `packages/web-shell/src/components/lobby/tabs/HomeTab.tsx`

- [ ] **Step 1: 스테이지 카드, 덱 프리뷰 레이아웃 → className + cn()**

조건부 선택 스타일(border, bg) → `cn()`.
gradient overlay → `style` 유지 (복잡 gradient).
glow boxShadow → `shadow-[...]` arbitrary value.

- [ ] **Step 2: 커밋**

```bash
git add packages/web-shell/src/components/lobby/tabs/HomeTab.tsx
git commit -m "refactor: HomeTab inline→tailwind"
```

---

### Task 10: GachaScreen 전환 (Very High — 18 styles)

**Files:**
- Modify: `packages/web-shell/src/components/GachaScreen.tsx`
- Modify: `packages/web-shell/src/styles/global.css` (pulse keyframe 이동)

- [ ] **Step 1: 모달 오버레이 + 그리드 → className**

- [ ] **Step 2: 상태별 애니메이션 → global.css + cn() 조건부**

- [ ] **Step 3: 커밋**

```bash
git add packages/web-shell/src/components/GachaScreen.tsx packages/web-shell/src/styles/global.css
git commit -m "refactor: GachaScreen inline→tailwind"
```

---

### Task 11: DeckEditSheet 전환 (Very High — 21 styles)

**Files:**
- Modify: `packages/web-shell/src/components/lobby/DeckEditSheet.tsx`

- [ ] **Step 1: 모달 fixed 오버레이 → className**

- [ ] **Step 2: 그리드 레이아웃 + 슬롯 프리뷰 → className + cn()**

- [ ] **Step 3: 조건부 선택/비활성 스타일 → cn()**

tier-based 동적 색상 → `style` 유지.

- [ ] **Step 4: 커밋**

```bash
git add packages/web-shell/src/components/lobby/DeckEditSheet.tsx
git commit -m "refactor: DeckEditSheet inline→tailwind"
```

---

### Task 12: CollectionTab 전환 (Extreme — 46 styles)

**Files:**
- Modify: `packages/web-shell/src/components/lobby/tabs/CollectionTab.tsx`
- Modify: `packages/web-shell/src/styles/global.css` (promotion keyframes 이동)

- [ ] **Step 1: promotionRoll, promotionSuccess, promotionFail keyframes → global.css**

- [ ] **Step 2: 타워 그리드 레이아웃 → className**

`grid grid-cols-[repeat(auto-fill,minmax(90px,1fr))]`

- [ ] **Step 3: 바텀시트 + 스탯 디스플레이 → className + cn()**

- [ ] **Step 4: 조건부 카드 스타일 (locked, grade glow) → cn()**

동적 TIER_COLORS, GRADE_BORDER 색상 → `style` 유지.

- [ ] **Step 5: 커밋**

```bash
git add packages/web-shell/src/components/lobby/tabs/CollectionTab.tsx packages/web-shell/src/styles/global.css
git commit -m "refactor: CollectionTab inline→tailwind"
```

---

### Task 13: GamePage 전환 (High — 25 styles)

**Files:**
- Modify: `packages/web-shell/src/pages/GamePage.tsx`

- [ ] **Step 1: getHudChipStyle 함수 → className 기반 컴포넌트/유틸리티**

정적 padding, font, border → className. 동적 color/bg → `cn()` + `style`.

- [ ] **Step 2: HUD 바 레이아웃 → className**

- [ ] **Step 3: 결과 화면(승리/패배) 모달 → className + cn()**

- [ ] **Step 4: 토스트/WARNING/로딩 오버레이 → className**

WARNING keyframe `pulse` → global.css.

- [ ] **Step 5: tokens.ts에서 colors/fonts import 제거 가능 여부 확인**

Tailwind 클래스로 전환 완료 후, 동적 style에서만 사용하는 경우 import 유지.

- [ ] **Step 6: 커밋**

```bash
git add packages/web-shell/src/pages/GamePage.tsx packages/web-shell/src/styles/global.css
git commit -m "refactor: GamePage inline→tailwind"
```

---

### Task 14: tokens.ts 정리 + 전체 빌드/테스트 검증

- [ ] **Step 1: tokens.ts 사용처 확인**

Tailwind 전환 후에도 동적 style에서 tokens.ts를 참조하는 파일이 있는지 확인.
사용처가 없으면 파일 제거, 있으면 유지.

- [ ] **Step 2: 전체 빌드**

Run: `cd packages/web-shell && pnpm build`
Expected: PASS

- [ ] **Step 3: 전체 테스트**

Run: `npx vitest run --reporter=verbose 2>&1 | tail -40`
Expected: 기존 테스트 PASS

- [ ] **Step 4: 커밋**

```bash
git add -A
git commit -m "chore: Tailwind 마이그레이션 완료 — 빌드/테스트 검증"
```

---

## Part C: Phase 2 마무리 (타워 제거 + XP 표시)

### Task 15: GameOverStats에 xpEarned 추가 + 결과 화면 XP 표시

**Files:**
- Modify: `packages/web-shell/src/stores/gameStore.ts:38-43`
- Modify: `packages/web-shell/src/pages/GamePage.tsx` (Tailwind 전환된 결과 화면에 XP 추가)

- [ ] **Step 1: GameOverStats에 xpEarned 필드 추가**

```typescript
export interface GameOverStats {
  wavesCleared: number;
  towersPlaced: number;
  timeSurvivedSec: number;
  goldEarned: number;
  xpEarned: number;
}
```

- [ ] **Step 2: onGameOver에서 XP 계산 후 stats에 포함**

```typescript
const xpEarned = battleXp(data.stats.wavesCleared, data.result === 'victory');
setGameOverStats({ ...data.stats, xpEarned });
meta.addXp(xpEarned);
```

- [ ] **Step 3: 결과 화면에 XP 행 추가**

골드 행 다음에 XP 행 추가. `text-info font-pixel text-sm mt-0.5` 스타일.
텍스트: `획득 XP: {gameOverStats?.xpEarned ?? 0}`

- [ ] **Step 4: 커밋**

```bash
git add packages/web-shell/src/stores/gameStore.ts packages/web-shell/src/pages/GamePage.tsx
git commit -m "feat: 결과 화면에 획득 XP 표시"
```

---

### Task 16: 게임 종료 시 배치 타워 즉시 제거

**Files:**
- Modify: `packages/phaser-game/src/systems/TowerSystem.ts`
- Modify: `packages/phaser-game/src/scenes/Game.ts`

- [ ] **Step 1: TowerSystem.destroy() 멱등성 가드**

```typescript
private destroyed = false;

destroy(): void {
  if (this.destroyed) return;
  this.destroyed = true;
  // ... existing cleanup
}
```

- [ ] **Step 2: emitGameOver에서 타워 카운트 캡처 후 destroy**

```typescript
const towersPlaced = this.playerTowers.getTowers().length;
this.playerTowers.destroy();
// stats에 towersPlaced 사용
```

- [ ] **Step 3: 테스트 실행**

Run: `npx vitest run`
Expected: PASS

- [ ] **Step 4: 커밋**

```bash
git add packages/phaser-game/src/systems/TowerSystem.ts packages/phaser-game/src/scenes/Game.ts
git commit -m "feat: 게임 종료 시 배치 타워 즉시 제거"
```

---

## Part D: Phase 3 — 스테이지별 웨이브 구성

### Task 17: 스테이지별 웨이브 정의 + WaveSystem 연동

**Files:**
- Modify: `packages/shared/src/constants/waves.ts`
- Modify: `packages/phaser-game/src/systems/WaveSystem.ts`
- Modify: `packages/phaser-game/src/scenes/Game.ts`

- [ ] **Step 1: waves.ts에 스테이지별 웨이브 레지스트리 추가**

기존 WAVE_DEFS를 forest_gate 기본값으로 사용. lava_fortress, storm_citadel 웨이브 추가.

```typescript
export const WAVE_REGISTRY: Record<string, WaveDef[]> = {
  forest_gate: WAVE_DEFS,
  lava_fortress: LAVA_FORTRESS_WAVES,
  storm_citadel: STORM_CITADEL_WAVES,
};

export function getWavesForMap(mapId: string): WaveDef[] {
  return WAVE_REGISTRY[mapId] ?? WAVE_DEFS;
}
```

차별화:
- **lava_fortress**: 체력 ×1.2, 화염 계열 비중 높음
- **storm_citadel**: 체력 ×1.5, 번개 계열 비중 높음, 보스 강화

- [ ] **Step 2: WaveSystem 생성자에 mapId 전달**

- [ ] **Step 3: Game.ts에서 mapId 기반 WaveSystem 생성**

- [ ] **Step 4: 테스트 실행**

Run: `npx vitest run`
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add packages/shared/src/constants/waves.ts packages/phaser-game/src/systems/WaveSystem.ts packages/phaser-game/src/scenes/Game.ts
git commit -m "feat: 스테이지별 웨이브 구성 (lava_fortress, storm_citadel)"
```

---

## Verification

1. `cd packages/web-shell && pnpm build` — 빌드 성공
2. `npx vitest run` — 전체 테스트 PASS
3. 브라우저 QA:
   - 모든 화면에서 스타일 깨짐 없는지 시각 확인
   - 게임 승리/패배 시 타워 즉시 사라지는지 확인
   - 결과 화면에 "획득 XP" 파란색(`#5bc8e8`) 표시 확인
   - lava_fortress, storm_citadel 웨이브 차별화 확인

---

<!-- AUTONOMOUS DECISION LOG -->
## Decision Audit Trail

| # | Phase | Decision | Classification | Principle | Rationale | Rejected |
|---|-------|----------|---------------|-----------|-----------|----------|
| 1 | CEO | Accept premises P1-P4 | Mechanical | P6 action | All clearly valid, user-stated | — |
| 2 | CEO | Flag P5 (waves in same PR) as taste | Taste | P6 action | Could split but user asked for it together | Split PR |
| 3 | CEO | Mode: SELECTIVE EXPANSION | Mechanical | P3 pragmatic | Hold scope, no expansion needed | — |
| 4 | CEO | Include all 16 files in migration | Mechanical | P1 completeness | User explicitly chose "전체" | Partial migration |
| 5 | Design | Keep instant tower destroy (no fade) | Mechanical | P5 explicit | User said "제거" not "페이드 아웃" | Fade animation |
| 6 | Eng | Keep custom cn() over clsx | Mechanical | P4 DRY | 2 lines vs adding a dependency | Add clsx |
| 7 | Eng | Accept dual color source (Tailwind + tokens.ts) | Mechanical | P5 explicit | tokens.ts needed for dynamic JS styles | Remove tokens.ts |
| 8 | Eng | Add XP rendering test (gap found) | Mechanical | P1 completeness | No test verifies XP text appears | Skip test |
| 9 | Eng | Add waves test for getWavesForMap | Mechanical | P1 completeness | No test for fallback behavior | Skip test |

## GSTACK REVIEW REPORT

| Review | Trigger | Why | Runs | Status | Findings |
|--------|---------|-----|------|--------|----------|
| CEO Review | `/plan-ceo-review` | Scope & strategy | 1 | clean | 1 taste decision (waves scope) |
| Design Review | `/plan-design-review` | UI/UX gaps | 1 | clean | Tower destroy instant (by design) |
| Eng Review | `/plan-eng-review` | Architecture & tests | 1 | issues_open | 3 test gaps (XP render, waves fallback, per-map wave counts) |
| DX Review | `/plan-devex-review` | Developer experience gaps | 0 | skipped | Not a developer tool |

**Voices:** Single-reviewer mode (Codex connection refused, subagent timeout).

**VERDICT:** Plan is sound. 1 taste decision + 3 test gaps to address. Ready for approval.
