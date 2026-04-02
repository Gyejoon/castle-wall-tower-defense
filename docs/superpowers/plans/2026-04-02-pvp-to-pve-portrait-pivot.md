<!-- /autoplan restore point: /Users/lio/.gstack/projects/Gyejoon-grid-line-defense-pvp/feature-occipital-sofa-autoplan-restore-20260402-164344.md -->
# PVP to PVE Portrait Pivot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** fake matchmaking과 dual-field PvP 흔적을 걷어내고, 세로 화면에서 바로 시작되는 single-player portrait survival tower defense로 메인 루프를 전환한다.

**Architecture:** 먼저 로비 진입을 direct PVE start로 바꾸고, 그 다음 shared geometry contract를 portrait single-field 기준으로 다시 잠근다. 그 위에서 `GameScene`의 mirrored PvP loop를 완전히 제거하고, 마지막에 `GamePage`와 Zustand store를 single-player HUD 계약으로 재조립해서 테스트와 빌드까지 전부 green으로 만든다.

**Tech Stack:** bun workspaces, TypeScript, React, Zustand, Phaser 3, Vitest, PWA manifest

---

## Context Lock

- 이번 작업의 shipping 기준은 `즉시 시작 가능한 portrait PVE`다.
- `WaveSystem`, `TowerSystem`, `UnitSystem`, `RandomTowerSystem`은 유지한다.
- 타워 합성 개념과 `MergeSystem` 기반 전투 루프는 이번 pivot에서 제거한다.
- 인게임 랜덤 타워는 사용자가 보유한 타워 풀에서 카드 형태로 생성한다.
- 타워는 drag로 원하는 buildable tile에 배치하고, spawn/path/special terrain tile은 배치 불가로 처리한다.
- 몬스터는 타워를 직접 공격하지 않고 경로를 따라 성문/생존 목표만 위협한다.
- `AIOpponent`, `KillTransferSystem`, pressure inventory, opponent mirror HUD, combat emote send/receive surface는 이번 pivot에서 제거한다.
- `packages/phaser-game/src/EventBus.ts`가 실제 런타임 계약 source of truth다.
- `game-over` 계약은 `winnerId`가 아니라 `result + reason + finalSlot` rich payload로 전환한다.
- `packages/shared/src/types/events.ts` 기반 shared event union/export는 이번 pivot에서 제거한다.
- `GamePage`의 나가기 confirmation과 bottom panel dead-space regression은 반드시 유지한다.

## File Structure

- `packages/web-shell/src/components/lobby/tabs/HomeTab.tsx`
  fake matchmaking을 제거하고 direct PVE entry CTA로 바꾸는 홈 탭.
- `packages/web-shell/src/pages/LobbyPage.tsx`
  `isMatchmaking` 로컬 상태와 하단 탭 disable을 제거하는 로비 페이지.
- `packages/web-shell/tests/LobbyPage.test.tsx`
  로비가 즉시 PVE 진입으로 동작하는지 잠그는 테스트.
- `packages/shared/src/constants/grid.ts`
  portrait single-field board 크기와 canvas contract의 source of truth.
- `packages/shared/src/constants/maps.ts`
  세로형 lane path, spawn/exit, buildable placement rules, blocked terrain의 source of truth.
- `packages/shared/src/index.ts`
  새 geometry export surface를 정리하는 shared barrel.
- `packages/shared/tests/maps.test.ts`
  새 세로형 맵 shape와 placement 분포를 잠그는 테스트.
- `packages/shared/src/types/game-state.ts`
  `CombatHudState`를 PVE HUD 기준으로 정리하는 타입 파일.
- `packages/shared/tests/types.test.ts`
  shared exported contracts가 새 HUD surface와 barrel cleanup과 맞는지 검증.
- `packages/phaser-game/src/systems/GridManager.ts`
  단일 portrait board 중심 정렬과 좌표 변환을 담당.
- `packages/phaser-game/src/config.ts`
  Phaser canvas size를 portrait contract와 맞추는 파일.
- `packages/phaser-game/src/EventBus.ts`
  live runtime event surface를 PVE 기준으로 정리하는 파일.
- `packages/phaser-game/src/scenes/Game.ts`
  mirrored combat loop를 single-field survival loop로 바꾸는 핵심 런타임 파일.
- `packages/phaser-game/src/index.ts`
  dead PvP exports 제거.
- `packages/phaser-game/tests/config.test.ts`
  Phaser canvas contract를 잠그는 테스트.
- `packages/phaser-game/tests/GridManager.test.ts`
  portrait offset과 좌표 변환을 잠그는 테스트.
- `packages/phaser-game/tests/fieldRuntime.test.ts`
  single-field raw asset runtime을 검증.
- `packages/phaser-game/tests/GameScene.test.ts`
  pure PVE runtime 승패/cleanup contract를 검증.
- `packages/phaser-game/tests/runtimeSafety.test.ts`
  boss warning / boss slot scheduler가 pivot 뒤에도 유지되는지 검증.
- `packages/phaser-game/tests/TowerDragController.test.ts`
  geometry 변경 뒤 drag preview/drop contract를 재확인.
- `packages/phaser-game/src/systems/AIOpponent.ts`
  삭제 대상. pivot 뒤 main path에서 완전히 제외.
- `packages/phaser-game/src/systems/KillTransferSystem.ts`
  삭제 대상. pivot 뒤 main path에서 완전히 제외.
- `packages/phaser-game/tests/AIOpponent.test.ts`
  삭제 대상.
- `packages/phaser-game/tests/KillTransferSystem.test.ts`
  삭제 대상.
- `packages/web-shell/src/stores/gameStore.ts`
  opponent/activeTab 없는 single-player run state source of truth.
- `packages/web-shell/src/pages/GamePage.tsx`
  portrait single-player HUD, result overlay, bottom status panel을 담당.
- `packages/web-shell/tests/GamePage.test.tsx`
  single-player HUD와 toast/result behavior를 검증.
- `packages/web-shell/tests/GamePage.regression-1.test.tsx`
  leave confirmation과 bottom-panel regression을 잠그는 테스트.
- `packages/web-shell/tests/gameStore.test.ts`
  new run store contract를 검증.
- `packages/web-shell/public/manifest.json`
  portrait orientation lock과 PWA manifest를 맞추는 파일.

## Task 1: Replace Fake Matchmaking With Direct PVE Entry

**Files:**
- Modify: `packages/web-shell/src/components/lobby/tabs/HomeTab.tsx`
- Modify: `packages/web-shell/src/pages/LobbyPage.tsx`
- Test: `packages/web-shell/tests/LobbyPage.test.tsx`

- [ ] **Step 1: Write the failing lobby tests first**

```ts
it('renders the home tab as a single-player PVE start screen', () => {
  const view = render(<LobbyPage />);

  expect(view.getByText('PVE 생존')).toBeTruthy();
  expect(view.getByText('즉시 시작')).toBeTruthy();
  expect(view.queryByText('PVP 대전')).toBeNull();
  expect(view.queryByText('상대를 찾는 중...')).toBeNull();
});

it('starts the run immediately and clears stale emotes', () => {
  useEmoteStore.getState().sendEmote('gg');
  useEmoteStore.getState().receiveEmote('angry');
  useEmoteStore.getState().toggleEmotePanel();

  const view = render(<LobbyPage />);
  fireEvent.click(view.getByText('즉시 시작'));

  expect(useGameStore.getState().runStatus).toBe('building');
  expect(useEmoteStore.getState().myEmote).toBeNull();
  expect(useEmoteStore.getState().opponentEmote).toBeNull();
  expect(useEmoteStore.getState().showEmotePanel).toBe(false);
});
```

- [ ] **Step 2: Run the focused lobby test and watch it fail on old PvP copy**

Run: `bun run --filter web-shell test -- tests/LobbyPage.test.tsx`

Expected:
- FAIL because `PVP 대전`, `매칭 중...`, `상대를 찾는 중...` still exist
- FAIL because the run still starts after a timer instead of immediately

- [ ] **Step 3: Remove matchmaking state and switch HomeTab to an immediate start CTA**

```ts
export function HomeTab() {
  const resetRun = useGameStore((s) => s.resetRun);
  const resetEmotes = useEmoteStore((s) => s.reset);

  const handleStart = () => {
    resetEmotes();
    resetRun();
  };

  return (
    <div id="tabpanel-home" role="tabpanel" aria-label="마당">
      <div>
        <span>PVE 생존</span>
        <span>혼자 바로 시작</span>
      </div>

      <PixelButton variant="gold" onClick={handleStart}>
        즉시 시작
      </PixelButton>
    </div>
  );
}
```

```ts
export function LobbyPage() {
  const lobbyTab = useGameStore((s) => s.lobbyTab);

  return (
    <div>
      <ProfileBar />
      <div>
        {lobbyTab === 'home' && <HomeTab />}
        {lobbyTab === 'collection' && <CollectionTab />}
        {lobbyTab === 'settings' && <SettingsTab />}
      </div>
      <BottomTabBar />
    </div>
  );
}
```

- [ ] **Step 4: Re-run the focused lobby test until it passes**

Run: `bun run --filter web-shell test -- tests/LobbyPage.test.tsx`

Expected:
- PASS `packages/web-shell/tests/LobbyPage.test.tsx`

- [ ] **Step 5: Commit**

```bash
git add packages/web-shell/src/components/lobby/tabs/HomeTab.tsx packages/web-shell/src/pages/LobbyPage.tsx packages/web-shell/tests/LobbyPage.test.tsx
git commit -m "feat: start pve runs directly from the lobby"
```

## Task 2: Redefine The Shared Portrait Board Contract

**Files:**
- Modify: `packages/shared/src/constants/grid.ts`
- Modify: `packages/shared/src/constants/maps.ts`
- Modify: `packages/shared/src/index.ts`
- Modify: `packages/shared/tests/maps.test.ts`
- Modify: `packages/web-shell/public/manifest.json`

- [ ] **Step 1: Write the failing shared map and orientation assertions first**

```ts
it('uses the portrait lane map bounds and endpoints', () => {
  expect(FOREST_GATE_MAP.width).toBe(8);
  expect(FOREST_GATE_MAP.height).toBe(18);
  expect(FOREST_GATE_MAP.spawnPoint).toEqual({ x: 3, y: 0 });
  expect(FOREST_GATE_MAP.exitPoint).toEqual({ x: 4, y: 17 });
});

it('marks path and special terrain tiles as blocked for tower placement', () => {
  expect(FOREST_GATE_MAP.blockedPlacementPoints).toContainEqual({ x: 3, y: 0 });
  expect(FOREST_GATE_MAP.blockedPlacementPoints).toContainEqual({ x: 4, y: 17 });
});

it('keeps buildable tiles available outside the lane and blocked terrain', () => {
  expect(FOREST_GATE_MAP.buildablePoints.length).toBeGreaterThan(16);
});
```

```json
{
  "orientation": "portrait"
}
```

- [ ] **Step 2: Run the shared map test and confirm the old 12x8 contract fails**

Run: `bun run --filter @gld/shared test -- tests/maps.test.ts`

Expected:
- FAIL on width/height, spawn/exit, and buildable/blocked placement assertions

- [ ] **Step 3: Replace the grid constants with a portrait single-field contract**

```ts
export const GRID_WIDTH = 8;
export const GRID_HEIGHT = 18;
export const TILE_SIZE = 32;

export const ISO_TILE_W = 64;
export const ISO_TILE_H = 32;
export const ISO_TILE_DEPTH = 8;
export const ISO_CANVAS_W = (GRID_WIDTH + GRID_HEIGHT) * (ISO_TILE_W / 2); // 832
export const ISO_CANVAS_H = (GRID_WIDTH + GRID_HEIGHT) * (ISO_TILE_H / 2); // 416
export const BOARD_TOP_PADDING = 96;
export const GAME_CANVAS_H = 960;

export const DEFAULT_GRID_CONFIG: GridConfig = {
  width: GRID_WIDTH,
  height: GRID_HEIGHT,
  spawnPoint: { x: 3, y: 0 },
  exitPoint: { x: 4, y: 17 },
};
```

- [ ] **Step 4: Replace `FOREST_GATE_MAP` with the new portrait lane path and buildable/blocked placement contract**

```ts
function buildForestGatePortraitPath(): Array<{ x: number; y: number }> {
  return [
    { x: 3, y: 0 },
    { x: 3, y: 1 },
    { x: 4, y: 1 },
    { x: 4, y: 2 },
    { x: 3, y: 2 },
    { x: 2, y: 2 },
    { x: 2, y: 3 },
    { x: 3, y: 3 },
    { x: 4, y: 3 },
    { x: 5, y: 3 },
    { x: 5, y: 4 },
    { x: 4, y: 4 },
    { x: 3, y: 4 },
    { x: 2, y: 4 },
    { x: 1, y: 4 },
    { x: 1, y: 5 },
    { x: 2, y: 5 },
    { x: 3, y: 5 },
    { x: 4, y: 5 },
    { x: 5, y: 5 },
    { x: 6, y: 5 },
    { x: 6, y: 6 },
    { x: 5, y: 6 },
    { x: 4, y: 6 },
    { x: 3, y: 6 },
    { x: 2, y: 6 },
    { x: 2, y: 7 },
    { x: 3, y: 7 },
    { x: 4, y: 7 },
    { x: 5, y: 7 },
    { x: 5, y: 8 },
    { x: 4, y: 8 },
    { x: 3, y: 8 },
    { x: 2, y: 8 },
    { x: 1, y: 8 },
    { x: 1, y: 9 },
    { x: 2, y: 9 },
    { x: 3, y: 9 },
    { x: 4, y: 9 },
    { x: 5, y: 9 },
    { x: 6, y: 9 },
    { x: 6, y: 10 },
    { x: 5, y: 10 },
    { x: 4, y: 10 },
    { x: 3, y: 10 },
    { x: 2, y: 10 },
    { x: 2, y: 11 },
    { x: 3, y: 11 },
    { x: 4, y: 11 },
    { x: 5, y: 11 },
    { x: 5, y: 12 },
    { x: 4, y: 12 },
    { x: 3, y: 12 },
    { x: 2, y: 12 },
    { x: 1, y: 12 },
    { x: 1, y: 13 },
    { x: 2, y: 13 },
    { x: 3, y: 13 },
    { x: 4, y: 13 },
    { x: 5, y: 13 },
    { x: 6, y: 13 },
    { x: 6, y: 14 },
    { x: 5, y: 14 },
    { x: 4, y: 14 },
    { x: 3, y: 14 },
    { x: 3, y: 15 },
    { x: 4, y: 15 },
    { x: 4, y: 16 },
    { x: 4, y: 17 },
  ];
}

const blockedPlacementPoints = [
  { x: 3, y: 0 },
  { x: 4, y: 17 },
  { x: 0, y: 0 },
  { x: 7, y: 17 },
];

const buildablePoints = buildBuildablePoints({
  width: 8,
  height: 18,
  path: buildForestGatePortraitPath(),
  blockedPlacementPoints,
});
```

- [ ] **Step 5: Update shared exports and the PWA manifest**

```ts
export {
  BOARD_TOP_PADDING,
  DEFAULT_GRID_CONFIG,
  GAME_CANVAS_H,
  GRID_HEIGHT,
  GRID_WIDTH,
  INITIAL_GOLD,
  INITIAL_PLAYER_HP,
  ISO_CANVAS_H,
  ISO_CANVAS_W,
  ISO_TILE_DEPTH,
  ISO_TILE_H,
  ISO_TILE_W,
  TILE_SIZE,
  UNIT_SEND_COUNT,
} from './constants/grid';
```

```json
{
  "orientation": "portrait"
}
```

- [ ] **Step 6: Re-run the shared map test and keep the manifest diff staged**

Run:
- `bun run --filter @gld/shared test -- tests/maps.test.ts`
- `bun run --filter @gld/shared test -- tests/types.test.ts`

Expected:
- PASS `packages/shared/tests/maps.test.ts`
- `packages/web-shell/public/manifest.json` now says `portrait`

- [ ] **Step 7: Commit**

```bash
git add packages/shared/src/constants/grid.ts packages/shared/src/constants/maps.ts packages/shared/src/index.ts packages/shared/tests/maps.test.ts packages/web-shell/public/manifest.json
git commit -m "feat: define portrait board and map contracts"
```

## Task 3: Plumb Portrait Geometry Into Phaser Runtime

**Files:**
- Modify: `packages/phaser-game/src/systems/GridManager.ts`
- Modify: `packages/phaser-game/src/config.ts`
- Test: `packages/phaser-game/tests/GridManager.test.ts`
- Test: `packages/phaser-game/tests/config.test.ts`
- Test: `packages/phaser-game/tests/fieldRuntime.test.ts`
- Test: `packages/phaser-game/tests/TowerDragController.test.ts`

- [ ] **Step 1: Write the failing Phaser geometry tests first**

```ts
it('centers the board inside the portrait playfield', () => {
  const gm = new GridManager(TEST_CONFIG);
  const p00 = gm.gridToWorld(0, 0);
  expect(p00.x).toBe(ISO_CANVAS_W / 2);
  expect(p00.y).toBe(
    BOARD_TOP_PADDING +
      (ISO_CANVAS_H - (TEST_CONFIG.width - 1 + TEST_CONFIG.height - 1) * (ISO_TILE_H / 2)) / 2,
  );
});

it('uses the portrait Phaser canvas size', async () => {
  const { gameConfig } = await import('../src/config');
  expect(gameConfig.width).toBe(ISO_CANVAS_W);
  expect(gameConfig.height).toBe(GAME_CANVAS_H);
  expect(gameConfig.plugins?.global).toBeUndefined();
});

it('renders a single portrait field from raw Tiny Swords assets', async () => {
  expect(floorCount).toBe(FOREST_GATE_MAP.width * FOREST_GATE_MAP.height);
  expect(decorationCount).toBe(1);
});
```

- [ ] **Step 2: Run the focused Phaser tests and confirm the old dual-field assumptions fail**

Run:
- `bun run --filter @gld/phaser-game test -- tests/GridManager.test.ts`
- `bun run --filter @gld/phaser-game test -- tests/config.test.ts`
- `bun run --filter @gld/phaser-game test -- tests/fieldRuntime.test.ts`

Expected:
- FAIL because `DUAL_CANVAS_H` and dual-field render assumptions still exist

- [ ] **Step 3: Update GridManager and Phaser config to use one centered board in a portrait canvas**

```ts
import {
  BOARD_TOP_PADDING,
  DEFAULT_GRID_CONFIG,
  ISO_CANVAS_H,
  ISO_CANVAS_W,
  ISO_TILE_H,
  ISO_TILE_W,
  TILE_SIZE,
} from '@gld/shared';

export class GridManager {
  constructor(config: GridConfig = DEFAULT_GRID_CONFIG) {
    const maxGx = this.width - 1;
    const maxGy = this.height - 1;
    const xMin = -maxGy * (ISO_TILE_W / 2);
    const xMax = maxGx * (ISO_TILE_W / 2);
    const yMax = (maxGx + maxGy) * (ISO_TILE_H / 2);

    this.offsetX = (ISO_CANVAS_W - (xMin + xMax)) / 2;
    this.offsetY = BOARD_TOP_PADDING + (ISO_CANVAS_H - yMax) / 2;
  }
}
```

```ts
import { GAME_CANVAS_H, ISO_CANVAS_W } from '@gld/shared';

export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: ISO_CANVAS_W,
  height: GAME_CANVAS_H,
  parent: 'game-container',
  backgroundColor: '#1a1a2e',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_HORIZONTALLY,
  },
  scene: [Boot, Preloader, GameScene],
};
```

- [ ] **Step 4: Rewrite the field runtime test around a single board and rerun drag coverage**

```ts
it('renders a single portrait field from raw Tiny Swords assets', async () => {
  scene.create();

  const spriteKeys = addSprite.mock.calls.map((call) => call[2]);
  const floorCount = spriteKeys.filter(
    (k) => k === TINY_SWORDS_PRIMARY_TILESET.key,
  ).length;
  expect(floorCount).toBe(FOREST_GATE_MAP.width * FOREST_GATE_MAP.height);

  const decorationCount = spriteKeys.filter(
    (k) => k === TINY_SWORDS_DECORATION_ASSETS[0].key,
  ).length;
  expect(decorationCount).toBe(1);
});
```

Run:
- `bun run --filter @gld/phaser-game test -- tests/GridManager.test.ts`
- `bun run --filter @gld/phaser-game test -- tests/config.test.ts`
- `bun run --filter @gld/phaser-game test -- tests/fieldRuntime.test.ts`
- `bun run --filter @gld/phaser-game test -- tests/TowerDragController.test.ts`

Expected:
- all four focused tests pass

- [ ] **Step 5: Commit**

```bash
git add packages/phaser-game/src/systems/GridManager.ts packages/phaser-game/src/config.ts packages/phaser-game/tests/GridManager.test.ts packages/phaser-game/tests/config.test.ts packages/phaser-game/tests/fieldRuntime.test.ts packages/phaser-game/tests/TowerDragController.test.ts
 git commit -m "feat: wire portrait board geometry into phaser runtime"
```

## Task 4: Convert `GameScene` To A Pure PVE Survival Runtime

**Decision lock:** keep the new portrait map (`8x18`), remove pressure systems, remove combat emote send/receive, and replace `winnerId` with a rich `game-over` payload: `{ result: 'victory' | 'defeat'; reason: 'all_waves_cleared' | 'base_hp_depleted'; finalSlot: number }`.

**Files:**
- Modify: `packages/phaser-game/src/EventBus.ts`
- Modify: `packages/phaser-game/src/scenes/Game.ts`
- Test: `packages/phaser-game/tests/GameScene.test.ts`
- Test: `packages/phaser-game/tests/runtimeSafety.test.ts`

- [ ] **Step 1: Replace the old PvP GameScene tests with pure PVE expectations**

```ts
it('wins when the final slot ends and no enemy units remain', () => {
  const scene = createScene();
  scene.playerWaves = {
    getPhase: vi.fn(() => 'ended'),
    update: vi.fn(),
    getElapsedMs: vi.fn(() => 600000),
  };
  scene.currentSlotDef = { slotIndex: 20 };
  scene.playerUnits = {
    hasActiveUnits: vi.fn(() => false),
    hasQueuedUnits: vi.fn(() => false),
    getUnitPositions: vi.fn(() => []),
    update: vi.fn(() => []),
  };
  scene.playerTowers = { update: vi.fn(() => []) };

  scene.update(0, 16);

  expect(EventBus.emit).toHaveBeenCalledWith('game-over', {
    result: 'victory',
    reason: 'all_waves_cleared',
    finalSlot: 20,
  });
});

it('never emits opponent-state or kill-transfer in the PVE loop', () => {
  const scene = createScene();
  scene.playerWaves = {
    getPhase: vi.fn(() => 'running'),
    update: vi.fn(),
    getElapsedMs: vi.fn(() => 3000),
  };
  scene.playerUnits = {
    hasActiveUnits: vi.fn(() => true),
    hasQueuedUnits: vi.fn(() => false),
    getUnitPositions: vi.fn(() => []),
    update: vi.fn(() => []),
  };
  scene.playerTowers = { update: vi.fn(() => []) };

  scene.update(0, 16);

  expect(EventBus.emit).not.toHaveBeenCalledWith('opponent-state', expect.anything());
  expect(EventBus.emit).not.toHaveBeenCalledWith('kill-transfer', expect.anything());
});
```

- [ ] **Step 2: Run the focused GameScene tests and confirm the old mirrored loop fails**

Run:
- `bun run --filter @gld/phaser-game test -- tests/GameScene.test.ts`
- `bun run --filter @gld/phaser-game test -- tests/runtimeSafety.test.ts`

Expected:
- FAIL because `Game.ts` still creates AI grids, emits opponent state, and resolves hard-end by comparing sides

- [ ] **Step 3: Strip `EventBus` down to the PVE runtime surface**

```ts
export interface GameEventMap {
  'game-ready': undefined;
  'tower-placed': {
    col: number;
    row: number;
    towerId: string;
    success: boolean;
    reason?: PlacementFailureReason;
  };
  'unit-spawned': { unitType: UnitType; count: number };
  'player-damaged': { playerId: string; damage: number; remainingHp: number };
  'path-updated': { path: Position[] };
  'game-over': {
    result: 'victory' | 'defeat';
    reason: 'all_waves_cleared' | 'base_hp_depleted';
    finalSlot: number;
  };
  'gold-changed': { gold: number };
  'wave-started': {
    wave: number;
    totalWaves: number;
    slotIndex: number;
    phase: WavePhase;
    kind: WaveSlotKind;
    startAtSec: number;
  };
  'wave-completed': { wave: number; totalWaves: number; slotIndex: number };
  'boss-warning': { slotIndex: number; bossSlotIndex: number; startAtSec: number };
  'sudden-death-started': { slotIndex: number; startAtSec: number };
  'buy-cooldown-updated': { remainingMs: number };
  'player-tower-count': { count: number };
  'wave-preview': {
    wave: number;
    groups: Array<{ unitId: string; unitName: string; count: number }>;
  };
  'random-tower-rolled': {
    towerId: string;
    towerDef: TowerDef;
    source: 'owned_pool';
    asCard: true;
  };
  'request-buy-random-tower': undefined;
  'request-select-tower': { towerDefId: string };
  'request-clear-tower-selection': undefined;
  'request-place-tower': { col: number; row: number; towerDefId: string };
  'request-sell-tower': { col: number; row: number };
  'request-start-game': undefined;
  'request-reset-run': undefined;
  'request-pause': undefined;
  'request-resume': undefined;
  'current-scene-ready': Phaser.Scene;
}
```

- [ ] **Step 4: Remove the mirrored AI loop from `Game.ts` and keep only one field, one enemy stream, one victory rule**

```ts
create() {
  this.isCleaningUp = false;
  this.optionalAssetManifest = getCachedAssetManifest(this);
  this.playerGrid = new GridManager(FOREST_GATE_MAP);
  this.playerPathfinding = new PathfindingSystem();
  this.playerTowers = new TowerSystem(this, this.playerGrid, this.playerPathfinding);
  this.playerUnits = new UnitSystem(this, this.playerGrid);
  this.playerWaves = new WaveSystem(this.playerUnits);
  this.playerRandomTower = new RandomTowerSystem({ source: 'owned_pool' });

  this.events.on('shutdown', this.cleanup, this);
  this.cacheDecorationData();
  this.renderField(this.playerGrid, false);
  this.playerUnits.setPath(FOREST_GATE_MAP.path);
  this.renderPath(this.playerGrid, false);
  this.setupInput();
  this.setupTowerDragController();
  this.createHUD();

  EventBus.on('request-select-tower', this.onSelectTower);
  EventBus.on('request-clear-tower-selection', this.onClearTowerSelection);
  EventBus.on('wave-started', this.onWaveStartedLifecycle);

  EventBus.emit('game-ready');
  EventBus.emit('gold-changed', { gold: this.gold });
  EventBus.emit('current-scene-ready', this);
  void this.prefetchOptionalAssets();
  this.playerWaves.start();
}
```

```ts
update(time: number, delta: number) {
  if (this.gameOver) return;

  this.playerWaves.update(delta);
  this.tickBuyCooldown(delta);

  const exits = this.processCombatField(
    this.playerTowers,
    this.playerUnits,
    time,
    delta,
    (info) => {
      this.earnGold(info.bounty);
      soundGenerator.playUnitDeath();
    },
  );

  for (const _uid of exits) {
    this.playerHp = Math.max(0, this.playerHp - 1);
    EventBus.emit('player-damaged', {
      playerId: 'local',
      damage: 1,
      remainingHp: this.playerHp,
    });
    if (this.playerHp <= 0) {
      this.endGame({
        result: 'defeat',
        reason: 'base_hp_depleted',
        finalSlot: this.currentSlotDef.slotIndex,
      });
      return;
    }
  }

  if (
    this.playerWaves.getPhase() === 'ended' &&
    !this.playerUnits.hasActiveUnits() &&
    !this.playerUnits.hasQueuedUnits()
  ) {
    this.endGame({
      result: 'victory',
      reason: 'all_waves_cleared',
      finalSlot: this.currentSlotDef.slotIndex,
    });
  }
}
```

- [ ] **Step 5: Re-run the GameScene tests and keep scheduler safety green**

Run:
- `bun run --filter @gld/phaser-game test -- tests/GameScene.test.ts`
- `bun run --filter @gld/phaser-game test -- tests/runtimeSafety.test.ts`

Expected:
- PASS `packages/phaser-game/tests/GameScene.test.ts`
- PASS `packages/phaser-game/tests/runtimeSafety.test.ts`

- [ ] **Step 6: Commit**

```bash
git add packages/phaser-game/src/EventBus.ts packages/phaser-game/src/scenes/Game.ts packages/phaser-game/tests/GameScene.test.ts packages/phaser-game/tests/runtimeSafety.test.ts
git commit -m "refactor: convert the combat scene to pure pve"
```

## Task 5: Clean Shared Contracts And Remove Dead PvP Modules

**Files:**
- Modify: `packages/shared/src/types/game-state.ts`
- Modify: `packages/shared/src/index.ts`
- Modify: `packages/phaser-game/src/index.ts`
- Test: `packages/shared/tests/types.test.ts`
- Delete: `packages/shared/src/types/events.ts`
- Delete: `packages/phaser-game/src/systems/AIOpponent.ts`
- Delete: `packages/phaser-game/src/systems/KillTransferSystem.ts`
- Delete: `packages/phaser-game/tests/AIOpponent.test.ts`
- Delete: `packages/phaser-game/tests/KillTransferSystem.test.ts`

- [ ] **Step 1: Rewrite the shared contract test around the PVE HUD and barrel cleanup**

```ts
it('uses the portrait pve HUD contract', () => {
  const hud: CombatHudState = {
    currentSlot: 10,
    phase: 'boss',
    buyCooldownMs: 900,
    bossWarning: true,
    suddenDeath: false,
    timerLabel: 'Boss 00:30',
  };

  expect(hud.phase).toBe('boss');
  expect(hud.buyCooldownMs).toBe(900);
  expect(hud.timerLabel).toContain('Boss');
});

it('stops exporting stale versus event unions from the shared barrel', async () => {
  const shared = await import('../src');

  expect('GameToReactEvent' in shared).toBe(false);
  expect('ReactToGameEvent' in shared).toBe(false);
  expect('WaveStartedEventPayload' in shared).toBe(false);
});
```

- [ ] **Step 2: Run the shared contract test and confirm stale versus exports are still leaking through**

Run: `bun run --filter @gld/shared test -- tests/types.test.ts`

Expected:
- FAIL because `CombatHudState` still requires `pressureTokens` and `queuedPressureEffect`
- FAIL because the shared barrel still exports stale event-union types

- [ ] **Step 3: Remove pressure/opponent shape from shared HUD types, and delete the stale event-union file + exports**

```ts
export interface CombatHudState {
  currentSlot: number;
  phase: WavePhase;
  buyCooldownMs: number;
  bossWarning: boolean;
  suddenDeath: boolean;
  timerLabel: string;
}
```

```ts
export {
  BOARD_TOP_PADDING,
  DEFAULT_GRID_CONFIG,
  GAME_CANVAS_H,
  GRID_HEIGHT,
  GRID_WIDTH,
  INITIAL_GOLD,
  INITIAL_PLAYER_HP,
  ISO_CANVAS_H,
  ISO_CANVAS_W,
  ISO_TILE_DEPTH,
  ISO_TILE_H,
  ISO_TILE_W,
  TILE_SIZE,
  UNIT_SEND_COUNT,
} from './constants/grid';

export type {
  CombatHudState,
  GameState,
  WavePhase,
} from './types/game-state';
```

```bash
git rm packages/shared/src/types/events.ts
```

- [ ] **Step 4: Delete the stale shared event file and the PvP-only systems/tests**

Run:

```bash
git rm packages/shared/src/types/events.ts packages/phaser-game/src/systems/AIOpponent.ts packages/phaser-game/src/systems/KillTransferSystem.ts packages/phaser-game/tests/AIOpponent.test.ts packages/phaser-game/tests/KillTransferSystem.test.ts
```

- [ ] **Step 5: Re-run the shared contract test and the full Phaser package test suite**

Run:
- `bun run --filter @gld/shared test -- tests/types.test.ts`
- `bun run --filter @gld/phaser-game test`

Expected:
- PASS `packages/shared/tests/types.test.ts`
- PASS `bun run --filter @gld/phaser-game test`

- [ ] **Step 6: Commit**

```bash
git add packages/shared/src/types/game-state.ts packages/shared/src/index.ts packages/shared/tests/types.test.ts packages/phaser-game/src/index.ts
git commit -m "refactor: remove stale versus contracts and exports"
```

## Task 6: Rebuild `GamePage` And `gameStore` Around Single-Player HUD State

**Files:**
- Modify: `packages/web-shell/src/stores/gameStore.ts`
- Modify: `packages/web-shell/src/pages/GamePage.tsx`
- Test: `packages/web-shell/tests/GamePage.test.tsx`
- Test: `packages/web-shell/tests/GamePage.regression-1.test.tsx`
- Test: `packages/web-shell/tests/gameStore.test.ts`

- [ ] **Step 1: Rewrite the failing web tests around the new HUD contract**

```ts
it('shows hp, gold, slot, and buy cooldown in the portrait HUD', () => {
  const { emitSpy } = getEventBusHarness();
  const view = render(<GamePage />);

  act(() => {
    emitSpy('gold-changed', { gold: 60 });
    emitSpy('wave-started', {
      slotIndex: 10,
      phase: 'boss',
      kind: 'boss',
      startAtSec: 270,
    });
    emitSpy('buy-cooldown-updated', { remainingMs: 900 });
  });

  expect(view.getByText('HP 20')).toBeTruthy();
  expect(view.getByText('G 60')).toBeTruthy();
  expect(view.getByTestId('hud-slot').textContent).toContain('슬롯 10');
  expect(view.getByTestId('hud-buy-cooldown').textContent).toContain('0.9s');
  expect(view.queryByTestId('hud-pressure')).toBeNull();
});

it('drops opponent mirror state from the store contract', () => {
  const state = useGameStore.getState();
  expect('opponentHp' in state).toBe(false);
  expect('opponentGold' in state).toBe(false);
  expect('opponentTowerCount' in state).toBe(false);
  expect('activeTab' in state).toBe(false);
});
```

- [ ] **Step 2: Run the focused web tests and confirm the old HUD/store contract fails**

Run:
- `bun run --filter web-shell test -- tests/GamePage.test.tsx`
- `bun run --filter web-shell test -- tests/gameStore.test.ts`
- `bun run --filter web-shell test -- tests/GamePage.regression-1.test.tsx`

Expected:
- FAIL because `hud-pressure`, opponent state, `activeTab`, and old emote/result assumptions still exist
- regression file should still pass or only need copy-neutral updates

- [ ] **Step 3: Remove opponent state from the store and keep only the PVE combat HUD fields**

```ts
interface GameStoreState {
  runId: number;
  runStatus: RunStatus;
  gameReady: boolean;
  gold: number;
  lives: number;
  selectedTowerId: string | null;
  rolledTower: TowerDef | null;
  wave: number;
  wavePhase: WavePhase;
  countdown: number;
  placementFeedback: PlacementFailureReason | null;
  wavePreview: WavePreviewGroup[] | null;
  lobbyTab: LobbyTab;
  soundEnabled: boolean;
  screenShake: boolean;
  showDamageNumbers: boolean;
  playerTowerCount: number;
  combatHud: CombatHudState;
  toast: UiToast | null;
}

const createCombatHud = (): CombatHudState => ({
  currentSlot: 1,
  phase: 'running',
  buyCooldownMs: 0,
  bossWarning: false,
  suddenDeath: false,
  timerLabel: 'Slot 1',
});
```

- [ ] **Step 4: Rebuild the top HUD, result copy, and bottom panel around single-player progression, with no combat emote surface**

```ts
function formatBuyCooldownLabel(ms: number) {
  if (ms <= 0) return '구매 가능';
  return `구매 ${(Math.ceil(ms / 100) / 10).toFixed(1)}s`;
}
```

```tsx
<div data-testid="top-hud">
  <div>HP {lives}</div>
  <div>G {gold}</div>
  <div data-testid="hud-slot">슬롯 {combatHud.currentSlot}</div>
  <div data-testid="hud-timer">{formatTimerLabel(combatHud.timerLabel)}</div>
  <div data-testid="hud-buy-cooldown">
    {formatBuyCooldownLabel(combatHud.buyCooldownMs)}
  </div>
  <PixelButton variant="danger" onClick={handleLeaveMatch}>
    나가기
  </PixelButton>
</div>
```

```tsx
<div
  style={{
    width: '100%',
    aspectRatio: '832 / 960',
    maxHeight: 'calc(100vh - 188px)',
    minHeight: '52vh',
    position: 'relative',
    overflow: 'hidden',
    flexShrink: 1,
  }}
>
  <PhaserGame key={runId} />
</div>
```

```tsx
<p>
  {runStatus === 'victory'
    ? '모든 슬롯을 버티고 성문을 지켜냈습니다.'
    : '기지 HP가 0이 되어 방어선이 무너졌습니다.'}
</p>
```

```tsx
<div
  data-testid="bottom-panel"
  style={{
    flex: '0 0 auto',
    justifyContent: 'flex-start',
    minHeight: '80px',
  }}
>
  <div data-testid="run-summary">타워 {playerTowerCount} · 슬롯 {combatHud.currentSlot}</div>
  <div data-testid="run-status">
    {combatHud.suddenDeath
      ? '서든데스 진행 중'
      : combatHud.bossWarning
        ? '보스 웨이브 준비'
        : '웨이브 생존 중'}
  </div>
</div>
```

- [ ] **Step 5: Re-run the focused web tests and keep the regression file unchanged in spirit**

Run:
- `bun run --filter web-shell test -- tests/GamePage.test.tsx`
- `bun run --filter web-shell test -- tests/gameStore.test.ts`
- `bun run --filter web-shell test -- tests/GamePage.regression-1.test.tsx`

Expected:
- PASS `packages/web-shell/tests/GamePage.test.tsx`
- PASS `packages/web-shell/tests/gameStore.test.ts`
- PASS `packages/web-shell/tests/GamePage.regression-1.test.tsx`

- [ ] **Step 6: Commit**

```bash
git add packages/web-shell/src/stores/gameStore.ts packages/web-shell/src/pages/GamePage.tsx packages/web-shell/tests/GamePage.test.tsx packages/web-shell/tests/GamePage.regression-1.test.tsx packages/web-shell/tests/gameStore.test.ts
git commit -m "feat: rebuild the game page for portrait pve"
```

## Task 7: Run Full Verification And Manual Portrait Smoke

**Files:**
- Modify only if test/build output exposes real bugs during this pass

- [ ] **Step 1: Run the package-level test suites**

Run:
- `bun run test:shared`
- `bun run test:phaser`
- `bun run test:web`

Expected:
- all three commands pass

- [ ] **Step 2: Run the web production build**

Run: `bun run build:web`

Expected:
- PASS `web-shell` production build

- [ ] **Step 3: Run the repo-wide test umbrella once**

Run: `bun run test`

Expected:
- PASS monorepo test run

- [ ] **Step 4: Do the manual 390x844 portrait smoke pass**

Run: `bun run dev:web`

Manual checklist:
- 로비에서 `즉시 시작` 클릭 즉시 전투가 열린다
- `PVP 대전`, `1 vs 1`, `매칭 중...`, `상대를 찾는 중...`, `취소` 문구가 메인 경로에 없다
- single-field board가 기존 dual-field보다 더 많은 세로 공간을 차지한다
- 내가 보유한 타워 풀에서 랜덤 카드가 생성되고, card drag로 원하는 buildable tile에 자연스럽게 배치된다
- spawn/path/special terrain tile에는 배치되지 않는다
- 몬스터는 타워를 직접 공격하지 않고 성문/생존 목표만 위협한다
- boss warning, boss slot, sudden death, victory, defeat가 끝까지 동작한다
- `나가기` confirmation이 유지된다
- bottom panel이 남는 높이를 전부 먹지 않는다
- 설치형 PWA에서 portrait orientation이 유지된다

- [ ] **Step 5: Commit only if the verification pass required follow-up fixes**

```bash
git add <verification-fix-files>
git commit -m "test: lock portrait pve verification fixes"
```

## Self-Review

- **Spec coverage:**
  - direct PVE start, Task 1
  - portrait board contract, Tasks 2-3
  - pure PVE runtime, Task 4
  - shared runtime contract cleanup, Task 5
  - single-player GamePage/store/HUD, Task 6
  - regression coverage and build validation, Task 7
- **Placeholder scan:** no `TBD`, `TODO`, `implement later`, or “write tests for the above” placeholders remain.
- **Type consistency:** `CombatHudState`, `GameToReactEvent`, `GameEventMap`, `gameStore`, and `GamePage` all converge on the same PVE HUD shape: `currentSlot`, `phase`, `buyCooldownMs`, `bossWarning`, `suddenDeath`, `timerLabel`. No task reintroduces `pressureTokens`, `queuedPressureEffect`, `opponentHp`, `opponentGold`, `opponentTowerCount`, `FieldTab`, `AIOpponent`, `KillTransferSystem`, or merge-driven combat loops.

## AUTOPLAN REVIEW

### Review Readiness Dashboard

- Base branch: `main`
- UI scope: `yes`
- Restore point: `/Users/lio/.gstack/projects/Gyejoon-grid-line-defense-pvp/feature-occipital-sofa-autoplan-restore-20260402-164344.md`
- Review mode: `SELECTIVE_EXPANSION`
- DESIGN.md: present at `DESIGN.md`
- Existing design doc: historical doc found on another branch (`feature-enchanted-tuck`), treated as non-authoritative for this pivot

### Phase 1 — CEO Review

#### 0A. Premise Challenge

The user outcome is not “delete fake matchmaking and PvP traces.” The user outcome is “make the first 30 seconds instantly understandable, thumb-friendly, zero-wait, and replayable on a phone.”

**Premise 1 — fake matchmaking and dual-field confusion are a primary cause of drop-off**
- Evidence now: `packages/web-shell/src/components/lobby/tabs/HomeTab.tsx` still delays start by 1500ms and shows fake opponent-search copy.
- Risk: if combat readability or replay motivation is the bigger problem, this pivot cleans the codebase without fixing retention.

**Premise 2 — portrait single-field is better than the current shell**
- Evidence now: `packages/web-shell/src/main.tsx` already tries to lock portrait, while `packages/web-shell/public/manifest.json` still says `landscape`, and `packages/web-shell/src/pages/GamePage.tsx` still uses the `640 / 688` dual-field frame.
- Risk: `12x8 -> 8x18` changes path length, tower reach efficiency, merge adjacency, pacing, and finger occlusion. This is a game-design decision, not just a geometry contract swap.

**Premise 3 — removing competitive residue is worth the loss of differentiation**
- Evidence now: `packages/phaser-game/src/scenes/Game.ts`, `packages/phaser-game/src/EventBus.ts`, `packages/web-shell/src/stores/gameStore.ts`, and `packages/web-shell/src/pages/GamePage.tsx` are all still strongly shaped by opponent-state, pressure, transfer, and mirrored HUD assumptions.
- Risk: pure single-player TD is clearer, but also more generic, unless async competition or another replay driver replaces the removed identity.

**Premise 4 — the survival loop is already strong enough once entry friction disappears**
- Evidence now: `WaveSystem`, `TowerSystem`, `UnitSystem`, `MergeSystem`, and `RandomTowerSystem` are reusable and already power immediate runtime start.
- Risk: the plan validates internal quality only, not whether players actually want run two, run five, or tomorrow’s run.

**Premise 5 — emote/social residue still belongs after the pivot**
- Evidence now: the plan keeps emote reset, emote receiving, and an emote zone in the single-player HUD path.
- Risk: orphaned social affordances make the product thesis feel unresolved.

#### 0B. Existing Code Leverage

| Sub-problem | Existing code to reuse | Why this matters |
|---|---|---|
| Start a run immediately | `packages/web-shell/src/stores/gameStore.ts`, `packages/web-shell/src/App.tsx`, `packages/phaser-game/src/scenes/Game.ts` | `resetRun()` already routes from lobby to live runtime; no new route system is needed |
| Preserve core combat | `WaveSystem`, `TowerSystem`, `UnitSystem`, `MergeSystem`, `RandomTowerSystem`, `PathfindingSystem` | The combat spine exists already; the pivot is mostly about field count, HUD contract, and product framing |
| Keep boss/sudden-death scheduler | `packages/phaser-game/src/systems/WaveSystem.ts`, `packages/phaser-game/tests/runtimeSafety.test.ts` | The timed survival arc is already implemented and tested |
| Preserve leave/dead-space regressions | `packages/web-shell/tests/GamePage.regression-1.test.tsx` | Existing QA regressions are cheap and important to keep in blast radius |
| Reuse mobile fantasy visual language | `DESIGN.md`, `packages/web-shell/src/pages/LobbyPage.tsx`, `packages/web-shell/src/components/lobby/tabs/HomeTab.tsx`, `packages/web-shell/src/components/ui/PixelButton.tsx` | The new shell should inherit the warm fantasy mobile look instead of inventing a new UI vocabulary |
| Anchor runtime contract on live code | `packages/phaser-game/src/EventBus.ts` and `packages/phaser-game/src/scenes/Game.ts` | Shared `events.ts` already drifts from the live contract; review should start from what actually runs |

#### 0C. Dream State Mapping

```text
CURRENT STATE                         THIS PLAN                                  12-MONTH IDEAL
------------------------------        --------------------------------------      ----------------------------------------------
Fake PvP front door, delayed start    Honest instant-start portrait PVE shell     One-thumb zero-wait survival that is replayable
Dual-field mirrored runtime           Single-field survival runtime               Portrait core plus async competition or score chase
Landscape manifest, portrait drift    Portrait-safe geometry + HUD               Product metrics and replay hooks prove the loop
Opponent/pressure residue everywhere  Cleaner solo contract                       Clear core fantasy without losing differentiation
```

**Dream state delta:** this plan now deliberately optimizes for clarity, honesty, and a clean solo wave+boss loop. It is not trying to preserve competitive residue or sneak in a second-loop bet.

#### 0C-bis. Implementation Alternatives (MANDATORY)

**APPROACH A: Thin front-door experiment**
- Summary: remove fake matchmaking, start immediately, keep most runtime structure intact, and learn whether funnel friction was the real problem.
- Effort: S
- Risk: Low
- Pros:
  - fastest reversible test of the core hypothesis
  - preserves current runtime complexity until the user outcome is proven
  - cheapest path to real user learning
- Cons:
  - leaves dual-field and opponent residue in the live game loop
  - does not deliver the full honest portrait experience
  - may under-fix confusion after the first 10 seconds
- Reuses: `LobbyPage`, `HomeTab`, `gameStore.resetRun()`, current `GameScene`

**APPROACH B: Staged honest-PVE pivot with reversible competitive spine**
- Summary: ship direct-start portrait PVE and single-field runtime now, but do not hard-delete every competitive seam until the new loop proves itself.
- Effort: M
- Risk: Medium
- Pros:
  - delivers the intended user-facing clarity
  - keeps reversibility if async competition, daily defense, ghost runs, or score race become the better differentiator
  - avoids turning a product experiment into a one-way code purge too early
- Cons:
  - slightly messier codebase than a hard delete sweep
  - requires explicit “deprecated but preserved” seams for a while
  - asks for stronger product validation after ship
- Reuses: current combat systems, current route flow, `WaveSystem`, regression locks, live `EventBus`

**APPROACH C: Full hard pivot and deletion sweep**
- Summary: execute the current plan as written, remove PvP residue end-to-end, delete stale modules, and fully re-anchor on portrait PVE contracts.
- Effort: L
- Risk: High
- Pros:
  - most internally coherent codebase outcome
  - removes ambiguous product messaging quickly
  - simplest long-term maintenance if the bet is correct
- Cons:
  - highest one-way product bet
  - easiest path to shipping a clean but generic game
  - highest rollback cost if the retention hypothesis is wrong
- Reuses: current combat systems, but rewrites most surrounding contracts

**RECOMMENDATION:** Choose **Approach B** because it delivers the full player-facing clarity while preserving reversibility if the real long-term differentiator becomes async competition instead of pure isolation.

**USER DECISION:** Choose **Approach C**. The plan will be reviewed as a hard PVE pivot with broad competitive deletion, and the remaining sections should treat replay-value loss and one-way-door risk as first-class concerns.

#### 0D. Mode-Specific Analysis — SELECTIVE_EXPANSION

- Complexity smell: this plan touches web-shell, shared contracts, phaser runtime, public manifest, and many tests. It is much larger than a single tactical experiment.
- Minimum set of changes that achieves the stated goal:
  1. direct-start lobby and honest copy
  2. portrait-safe playfield and shell sizing
  3. single-field runtime and PVE HUD
  4. preserved regression locks for leave confirmation and bottom-panel height
- Work that is valuable but not load-bearing for the first user outcome:
  - hard deletion of all stale PvP exports/modules before the new loop proves out
  - keeping emote/social affordances without a clear new job
  - treating geometry cleanup as proof of product success
- 10x version: zero-wait portrait survival with daily defense, retry-forward fail screen, and async ghost/score competition.
- Delight opportunities:
  1. cold open straight into run with a one-line “tap to defend” banner
  2. retry-first result overlay with score/slot summary
  3. boss/sudden-death copy that matches the fantasy shell
  4. readable buy-cooldown feedback in the top HUD
  5. a reserved seam for async daily-defense or ghost-run follow-up
- Platform potential: a clean single-field runtime seam can support solo survival now and async competitive modes later.

#### 0E. Temporal Interrogation

- **HOUR 1 (foundations):** decide whether `8x18` is truly the board to lock now, or a prototype to validate before turning it into shared source of truth.
- **HOUR 2-3 (core logic):** delete opponent/pressure/emote semantics outright and re-anchor runtime, store, and UI on a pure solo contract.
- **HOUR 4-5 (integration):** decide whether the lobby shell remains the main front door, or whether the product should cold-open into gameplay and move meta to result/pause surfaces.
- **HOUR 6+ (polish/tests):** decide how success is measured after ship, not just whether tests/builds are green.

#### 0F. Mode Selection

- Auto-selected mode: `SELECTIVE_EXPANSION`
- Why: this is an existing-system pivot with clear baseline scope, but it has adjacent product opportunities and irreversibility risks that deserve explicit judgment rather than blind expansion.
- Working approach under this mode: **Approach C**

#### CODEX SAYS (CEO — strategy challenge)

1. The plan jumps straight to the solution without a falsifiable user-retention hypothesis.
2. It risks removing the game’s differentiating competitive spine and replacing it with a more generic solo TD position.
3. It behaves like a codebase migration more than a product experiment.
4. The `12x8 -> 8x18` board shift is a game-design reset, not a mere contract cleanup.
5. It says “instant start” while still preserving a lobby shell that may no longer be the highest-value front door.
6. It claims pure PVE while keeping emote/social residue and opponent-flavored naming.
7. It lacks a replay loop or return motivation after the first session.
8. Its final verification proves internal quality, not product success.

#### CLAUDE SUBAGENT (CEO — strategic independence)

1. **Critical:** the top of the plan is framed as code cleanup instead of user outcome.
2. **High:** key premises are assumed rather than defended with a validation path.
3. **High:** the plan burns the PvP bridge before proving that the new loop wins.
4. **Critical:** the obvious 6-month regret is shipping a cleaner codebase without solving replay value.
5. **High:** alternatives are underexplored; there is no serious thin experiment or hybrid path comparison.
6. **Critical:** competitive/product differentiation risk is not addressed.
7. **Medium:** emotes and similar leftovers signal an unresolved product thesis.
8. **High:** launch validation is engineering-heavy and product-light.

#### CEO DUAL VOICES — CONSENSUS TABLE

```text
═══════════════════════════════════════════════════════════════
  Dimension                           Claude  Codex  Consensus
  ──────────────────────────────────── ─────── ─────── ─────────
  1. Premises valid?                  NO      NO      CONFIRMED
  2. Right problem to solve?          NO      NO      CONFIRMED
  3. Scope calibration correct?       NO      NO      CONFIRMED
  4. Alternatives sufficiently explored?
                                      NO      NO      CONFIRMED
  5. Competitive/product risks covered?
                                      NO      NO      CONFIRMED
  6. 6-month trajectory sound?        NO      NO      CONFIRMED
═══════════════════════════════════════════════════════════════
```

**Consensus:** both outside voices agree that the current document is stronger as a technical migration than as a product bet. The gap is not implementation detail. The gap is strategic framing, reversibility, and replay value.

<!-- AUTONOMOUS DECISION LOG -->
## Decision Audit Trail

| # | Phase | Decision | Principle | Rationale | Rejected |
|---|-------|----------|-----------|-----------|----------|
| 1 | Intake | Use `SELECTIVE_EXPANSION` mode | P3 + P5 | This is a large pivot on an existing system, so baseline scope should stay visible while adjacent product opportunities are judged explicitly | `SCOPE_EXPANSION`, `HOLD_SCOPE` |
| 2 | CEO | Reframe the real user outcome as instant-start clarity plus replayability, not code cleanup | P1 + P6 | Users feel friction and confusion, not architecture nouns | Treating fake-matchmaking cleanup as the mission |
| 3 | CEO | Anchor runtime review on `packages/phaser-game/src/EventBus.ts` and live `GameScene` behavior | P4 + P5 | Shared `events.ts` already drifts from the live contract, so the review should start from what actually runs | Shared-type-first redesign |
| 4 | CEO | Classify `12x8 -> 8x18` as a game-design bet, not a constants-only refactor | P1 + P5 | Board geometry changes pacing, touchability, path length, and tower value | Treating geometry as a neutral contract swap |
| 5 | CEO | Preserve existing QA regression locks inside the blast radius | P1 + P2 | Leave-confirmation and dead-space regressions are already known bugs and cheap to keep protected | Rewriting the flow without carrying the regression locks |
| 6 | CEO | Treat retention as a second-loop problem, not a front-door-copy problem | P1 + P8 | Honest PVE entry helps clarity, but a mobile TD still needs a reason to replay after the first clear | Declaring the pivot complete once the codebase is cleaner |

#### Pre-Review System Audit

- Base branch is `main`.
- Current diff vs `main` already reopens `packages/phaser-game/src/scenes/Game.ts`, `packages/web-shell/src/pages/GamePage.tsx`, `packages/phaser-game/src/config.ts`, `packages/phaser-game/tests/fieldRuntime.test.ts`, and `packages/web-shell/tests/GamePage.regression-1.test.tsx`. This pivot is not entering cold code. It is re-entering the repo's hottest surfaces.
- 30-day churn hotspots are exactly the same seams this plan wants to rewrite: `packages/phaser-game/src/scenes/Game.ts` (38 touches), `packages/web-shell/src/pages/GamePage.tsx` (25), `packages/phaser-game/src/EventBus.ts` (18), `packages/shared/src/index.ts` (16), `packages/web-shell/src/stores/gameStore.ts` (14), `packages/web-shell/src/pages/LobbyPage.tsx` (13).
- `git stash list` shows unrelated work in flight on other branches. Nothing here is blocked by it, but it is evidence that this repo is mid-iteration, not a quiet platform rewrite window.
- No package-level `TODO`, `FIXME`, `HACK`, or `XXX` markers were found in the touched code. Hidden debt is not documented in code comments, so any deferrals from this review must be written explicitly in the plan.
- No `TODOS.md` exists right now. Until one exists, this document must carry all explicit deferments.
- Historical design context exists on another branch at `/Users/lio/.gstack/projects/Gyejoon-grid-line-defense-pvp/lio-feature-enchanted-tuck-design-20260331-233848.md`. It is not authoritative for this pivot, but it does prove that `pressure`, boss cadence, and competitive tempo were previously treated as the game's differentiating layer.

#### Taste Calibration

**Style references worth copying**
- `DESIGN.md` is disciplined about one-thumb hierarchy, warm fantasy chrome, and subtraction. Good taste.
- `packages/web-shell/tests/GamePage.regression-1.test.tsx` locks real bugs with plain-language intent instead of vague snapshot noise. Good testing taste.
- `packages/phaser-game/tests/runtimeSafety.test.ts` keeps the boss-warning and scheduler behavior concrete. Good systems taste.

**Anti-patterns to avoid repeating**
- `packages/shared/src/types/events.ts` and `packages/phaser-game/src/EventBus.ts` already drift. A second contract story would make this worse.
- `packages/phaser-game/src/scenes/Game.ts`, `packages/web-shell/src/stores/gameStore.ts`, and `packages/web-shell/src/pages/GamePage.tsx` duplicate opponent/pressure state across runtime, store, and UI. The pivot should delete or isolate, not rename and spread it.
- `packages/shared/src/constants/grid.ts`, `packages/phaser-game/src/config.ts`, and `packages/web-shell/src/pages/GamePage.tsx` currently disagree about orientation and aspect ratio. Another partial contract will recreate today's bug in a new costume.

#### Landscape Check

**[Layer 1] Tried and true**
Most sticky tower-defense products add a second loop on top of core combat: daily challenge, leaderboard, PvP ladder, collection/live-ops cadence, or community content. Pure wave survival rarely carries retention alone on mobile.

**[Layer 2] Search results**
- Genre benchmark material points to tower-defense retention being strongest when competitions, daily challenges, difficulty variants, or PvP-like comparison loops extend the core loop.
- The 2026 mobile backdrop is harsher than the old default assumptions: acquisition is pricier, retention is flatter, and LiveOps pressure is heavier.
- Current winners split three ways: solo replay/content loop (`Bloons TD 6`), competitive PvP/tournament loop (`Rush Royale`), and solo collector/live-ops loop (`Arknights`).

**[Layer 3] First principles**
The real product question is not “PvP or PVE.” The real product question is “what is the second loop after instant-start survival?” Live PvP may have been the wrong first implementation, but removing every comparative/status surface without replacing it creates a cleaner codebase and a weaker market position.

**Eureka**
The fake-matchmaking front door should die. The differentiating loop probably should not. The right move is honest instant-start PVE now, with explicit seams for async competition, daily defense, or score chase later.

### What already exists

| Existing asset | Exists now | Reuse in this pivot | Note |
|---|---|---|---|
| Immediate run bootstrap via `resetRun()` | Yes | Yes | Already routes lobby -> live runtime without backend or new navigation |
| Real-time wave, boss, and sudden-death scheduler | Yes | Yes | Strongest reusable combat spine in the repo |
| Warm fantasy mobile shell | Yes | Yes | Must stay the visual anchor |
| Regression locks for accidental exit and dead space | Yes | Yes | Must remain inside blast radius |
| Pressure / opponent / mirrored HUD loop | Yes | No | Delete as PvP residue that conflicts with the target solo loop |
| Shared event surface | Drifted | No | Replace with the live runtime contract only |
| AI opponent / kill transfer subsystems | Yes | No | Delete from ship path and test surface |

### NOT in scope

- Live network PvP or real matchmaking
  - Why: this pivot is about honesty and clarity, not backend competition.
- Full cold-open removal of the lobby shell
  - Why: possible future improvement, but not required to validate instant-start portrait PVE.
- New meta progression, account system, or collection backend
  - Why: there is no evidence yet that progression is the missing lever.
- Async leaderboard, ghost, or daily-defense implementation
  - Why: likely valuable, but it should be the next retention bet, not silently bundled into this pivot.
- Emote/social redesign
  - Why: the current plan can keep or remove visible residue, but it should not pretend this resolves the social/product story.

### Error & Rescue Registry

| Method / codepath | What can go wrong | Named failure |
|---|---|---|
| `HomeTab` instant start CTA | double-tap starts multiple resets before transition settles | `RunStartDoubleTap` |
| `useGameStore.resetRun()` | stale opponent/pressure fields survive the new solo run | `PvPResidueLeak` |
| `packages/shared/src/constants/grid.ts` + `maps.ts` | portrait dimensions, path length, and placements disagree | `PortraitContractDrift` |
| `GridManager` world/grid transforms | touch position and rendered tile centers diverge | `GridProjectionMismatch` |
| `packages/phaser-game/src/config.ts` + `GamePage.tsx` shell | canvas remains dual-field sized after single-field pivot | `CanvasAspectDrift` |
| `GameScene#create` | AI field, AI scheduler, or queued pressure still boot inside solo runtime | `DualRuntimeLeak` |
| `EventBus.ts` vs `shared/types/events.ts` vs `GamePage.tsx` | UI silently subscribes to dead or renamed events | `EventSurfaceDrift` |
| `GamePage` leave/result/retry flow | user leaves active run without confirmation or lands on stale HUD state | `RunExitGuardRegression` |
| `manifest.json` vs `main.tsx` | installed app still opens in landscape while runtime expects portrait | `OrientationLockMismatch` |
| preserved emote zone | solo run keeps social chrome with no gameplay job | `OrphanedSocialSurface` |

| Named failure | Rescued? | Rescue action | User sees |
|---|---|---|---|
| `RunStartDoubleTap` | Y | disable or consume CTA after first tap, plus focused `LobbyPage` coverage | one clean transition instead of duplicate boot |
| `PvPResidueLeak` | Y | rebuild store defaults around PVE-only state, remove stale fields, add store coverage | no opponent bars or pressure tokens leaking into solo run |
| `PortraitContractDrift` | Y | lock constants and map shape with shared tests before runtime edits | build/test failure, not a silent gameplay mismatch |
| `GridProjectionMismatch` | Y | `GridManager` transform tests plus drag/drop regression coverage | taps map to the visible tile the player intended |
| `CanvasAspectDrift` | Y | config test, `GamePage` layout assertions, and portrait smoke | no clipped board or giant dead region |
| `DualRuntimeLeak` | Y | `GameScene` and field-runtime tests assert single-field boot and no AI overlay | one board, one HUD, one ruleset |
| `EventSurfaceDrift` | **N ← GAP** | converge on one event source of truth and add contract tests between live bus and shared exports | stale HUD, missing updates, or silent no-op UI |
| `RunExitGuardRegression` | Y | keep the existing regression file in scope and extend result-flow assertions | safe leave confirmation |
| `OrientationLockMismatch` | Y | align manifest with runtime and add manifest assertion | app opens portrait consistently |
| `OrphanedSocialSurface` | **N ← GAP** | either remove emote UI from first ship or state its explicit solo job in the plan | confusing leftover social chrome |

### Failure Modes Registry

| Codepath | Failure mode | Rescued? | Test? | User sees? | Logged? |
|---|---|---|---|---|---|
| Lobby -> run start | duplicate taps start overlapping boots | Y | planned | prevented | No |
| shared portrait contract | board, path, and placements disagree | Y | planned | blocked by test failure | No |
| config + `GamePage` shell | single board rendered inside dual-field frame | Y | planned | clipped board or dead space if missed | No |
| `GameScene` bootstrap | AI field or pressure logic still boots in solo mode | Y | planned | phantom opponent behavior | No |
| event contract convergence | React listens to removed or drifted event shapes | **N** | partial only | **Silent stale HUD** | No |
| result / leave flow | accidental exit or stale post-game controls | Y | yes | explicit confirm or stable overlay | No |
| manifest orientation | installed PWA opens landscape | Y | planned | rotated or awkward layout | No |
| emote/social carryover | solo product thesis still looks half-PvP | **N** | no | confusing surface-level promise | No |

**CRITICAL GAP:** `EventSurfaceDrift` still allows a silent failure class where runtime emits one shape, shared exports promise another, and React compiles against the wrong story.

**WARNING:** `OrphanedSocialSurface` is not a crash bug, but it is a product-trust bug. Users notice when the UI hints at a missing opponent.

### CEO Assessment Before Premise Gate

- This plan is now clearly stronger on honesty, orientation consistency, and runtime simplification.
- It is still weak on the question “what is the second loop after the first clear?”
- The best version of this pivot is not “delete PvP.” It is “remove fake PvP now, preserve the seam for async or status competition later, and measure whether instant-start solo survival earns replay on its own.”
