# Phase 1: 프로토타입 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 20x20 그리드에서 타워 배치 + A* 패스파인딩이 동작하는 Unity WebGL 프로토타입을 React 쉘에 임베드하여 브라우저에서 플레이 가능한 상태까지 구현

**Architecture:** pnpm 모노레포에 shared(타입), web-shell(React+Vite), unity-game(Unity 6 WebGL) 3개 패키지 구성. JSON 기반 `.jslib` 브릿지로 Unity↔React 양방향 통신 (Phase 2 이후 protobuf 전환 검토). 게임 서버는 Phase 2에서 추가.

**Tech Stack:** Unity 6 (C#, 2D WebGL), React 18 + Vite + TypeScript, Zustand, pnpm workspace, JSON bridge (.jslib)

---

## Scope Note

이 플랜은 **Phase 1: 프로토타입**만 다룹니다. 후속 Phase는 별도 플랜으로 작성:
- Phase 2: 네트워킹 (WebSocket 서버, 실시간 동기화)
- Phase 3: 토스 연동 (인증, 결제, 광고)
- Phase 4: 게임 완성 (전체 타워/유닛, 밸런싱, 매치메이킹)

---

## File Structure

### 모노레포 루트
```
grid-line-defense-pvp/
├── package.json                    # pnpm workspace root
├── pnpm-workspace.yaml             # workspace 패키지 정의
├── tsconfig.base.json              # 공유 TS 설정
├── .gitignore
├── .nvmrc
└── packages/
    ├── shared/                     # 공유 타입/상수
    ├── web-shell/                  # React + Vite
    └── unity-game/                 # Unity 6 프로젝트
```

### packages/shared/
```
shared/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts                    # 배럴 export
│   ├── types/
│   │   ├── grid.ts                 # 그리드/타일 타입
│   │   ├── tower.ts                # 타워 타입, 스탯, 합성 레시피
│   │   ├── unit.ts                 # 유닛 타입, 스탯
│   │   ├── game-state.ts           # 게임 상태 타입
│   │   └── bridge.ts               # Unity↔React 브릿지 메시지 타입
│   └── constants/
│       ├── grid.ts                 # 그리드 크기, 타일 크기
│       ├── towers.ts               # 타워 기본 스탯 데이터
│       └── units.ts                # 유닛 기본 스탯 데이터
└── tests/
    └── types.test.ts               # 타입 유효성 테스트
```

### packages/web-shell/
```
web-shell/
├── package.json
├── tsconfig.json
├── vite.config.ts
├── index.html
├── public/
│   └── unity-build/                # Unity WebGL 빌드 산출물 (gitignored)
├── src/
│   ├── main.tsx                    # 엔트리포인트
│   ├── App.tsx                     # 라우팅
│   ├── pages/
│   │   ├── LobbyPage.tsx           # 로비 (매치 시작 버튼)
│   │   └── GamePage.tsx            # Unity WebGL 임베드
│   ├── components/
│   │   ├── UnityCanvas.tsx         # Unity WebGL 로더/캔버스
│   │   └── ui/
│   │       ├── PixelButton.tsx     # Minimal Pixel 스타일 버튼
│   │       └── PixelPanel.tsx      # Minimal Pixel 스타일 패널
│   ├── bridge/
│   │   ├── useUnityBridge.ts       # Unity↔React 훅
│   │   └── bridge-types.ts        # 브릿지 이벤트 매핑
│   ├── stores/
│   │   └── gameStore.ts            # Zustand 게임 상태
│   └── styles/
│       ├── global.css              # 글로벌 + Minimal Pixel 테마
│       └── tokens.ts               # 디자인 토큰 (컬러, 폰트)
└── tests/
    ├── UnityCanvas.test.tsx
    └── gameStore.test.ts
```

### packages/unity-game/ (Unity 6 프로젝트)
```
unity-game/
├── Assets/
│   ├── Scenes/
│   │   └── GameScene.unity         # 메인 게임 씬
│   ├── Scripts/
│   │   ├── Core/
│   │   │   ├── GridManager.cs      # 20x20 그리드 관리
│   │   │   ├── Tile.cs             # 타일 데이터 (walkable, occupied)
│   │   │   ├── TowerPlacer.cs      # 타워 배치 + 유효성 검증
│   │   │   ├── Tower.cs            # 타워 컴포넌트 (타입, 레벨, 스탯)
│   │   │   ├── TowerData.cs        # ScriptableObject 타워 데이터
│   │   │   ├── Pathfinding.cs      # A* 패스파인딩
│   │   │   ├── Unit.cs             # 유닛 컴포넌트 (이동, HP)
│   │   │   ├── UnitSpawner.cs      # 유닛 생성 + 경로 따라 이동
│   │   │   └── GLD.Core.asmdef     # 런타임 어셈블리 정의
│   │   ├── Bridge/
│   │   │   ├── WebBridge.cs        # React↔Unity 통신 (.jslib 래퍼)
│   │   │   └── Plugins/
│   │   │       └── WebBridge.jslib # JavaScript 플러그인
│   │   └── Visual/
│   │       ├── GridVisualizer.cs   # 그리드 렌더링 (Minimal Pixel)
│   │       └── TowerVisualizer.cs  # 타워 렌더링 (도형+색상)
│   ├── Sprites/
│   │   └── (placeholder 스프라이트)
│   ├── ScriptableObjects/
│   │   └── Towers/                 # 타워별 SO 에셋
│   ├── Prefabs/
│   │   ├── Tower.prefab
│   │   └── Unit.prefab
│   └── Tests/
│       ├── EditMode/
│       │   ├── PathfindingTests.cs
│       │   └── GridManagerTests.cs
│       └── PlayMode/
├── Packages/manifest.json
├── ProjectSettings/
│   └── ProjectSettings.asset
└── WebGLTemplates/
    └── Minimal/
        └── index.html              # 최소 WebGL 템플릿
```

---

## Task 1: 모노레포 + Git 초기 설정

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `tsconfig.base.json`
- Create: `.gitignore`
- Create: `.nvmrc`

- [ ] **Step 1: Git 저장소 초기화**

```bash
cd /Users/lio/Documents/personal/github/gird-line-defense-pvp
git init
```

- [ ] **Step 2: .nvmrc 생성**

```
22
```

- [ ] **Step 3: .gitignore 생성**

```gitignore
# Dependencies
node_modules/
.pnpm-store/

# Build
dist/
build/
*.tgz

# Unity
packages/unity-game/Library/
packages/unity-game/Temp/
packages/unity-game/Obj/
packages/unity-game/Build/
packages/unity-game/Builds/
packages/unity-game/Logs/
packages/unity-game/UserSettings/
packages/unity-game/MemoryCaptures/
packages/unity-game/Recordings/
packages/unity-game/Assets/Plugins/Editor/JetBrains*
*.csproj
*.sln
*.suo
*.tmp
*.user
*.userprefs
*.pidb
*.booproj
*.unityproj

# WebGL build in web-shell (빌드 산출물)
packages/web-shell/public/unity-build/

# IDE
.idea/
.vs/
.vscode/
*.swp

# OS
.DS_Store
Thumbs.db

# Environment
.env
.env.local
.env.*.local
```

- [ ] **Step 4: pnpm-workspace.yaml 생성**

```yaml
packages:
  - 'packages/*'
```

- [ ] **Step 5: 루트 package.json 생성**

```json
{
  "name": "grid-line-defense-pvp",
  "private": true,
  "packageManager": "pnpm@9.15.0",
  "scripts": {
    "dev:web": "pnpm --filter web-shell dev",
    "build:web": "pnpm --filter web-shell build",
    "test": "pnpm -r test",
    "test:shared": "pnpm --filter @gld/shared test",
    "test:web": "pnpm --filter web-shell test",
    "lint": "pnpm -r lint"
  },
  "engines": {
    "node": ">=22"
  }
}
```

- [ ] **Step 6: tsconfig.base.json 생성**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  }
}
```

- [ ] **Step 7: 커밋**

```bash
git add -A
git commit -m "chore: init monorepo with pnpm workspace"
```

---

## Task 2: shared 패키지 — 타입 정의

**Files:**
- Create: `packages/shared/package.json`
- Create: `packages/shared/tsconfig.json`
- Create: `packages/shared/src/index.ts`
- Create: `packages/shared/src/types/grid.ts`
- Create: `packages/shared/src/types/tower.ts`
- Create: `packages/shared/src/types/unit.ts`
- Create: `packages/shared/src/types/game-state.ts`
- Create: `packages/shared/src/types/bridge.ts`
- Create: `packages/shared/src/constants/grid.ts`
- Create: `packages/shared/src/constants/towers.ts`
- Create: `packages/shared/src/constants/units.ts`
- Test: `packages/shared/tests/types.test.ts`

- [ ] **Step 1: shared/package.json 생성**

```json
{
  "name": "@gld/shared",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "devDependencies": {
    "vitest": "^3.0.0",
    "typescript": "^5.7.0"
  }
}
```

- [ ] **Step 2: shared/tsconfig.json 생성**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*", "tests/**/*"]
}
```

- [ ] **Step 3: 그리드 타입 정의 — src/types/grid.ts**

```typescript
export interface Position {
  x: number;
  y: number;
}

export interface Tile {
  position: Position;
  walkable: boolean;
  occupied: boolean;
  towerId: string | null;
}

export type Grid = Tile[][];

export interface GridConfig {
  width: number;
  height: number;
  spawnPoint: Position;
  exitPoint: Position;
}
```

- [ ] **Step 4: 타워 타입 정의 — src/types/tower.ts**

```typescript
export type TowerType = 'laser' | 'plasma' | 'emp' | 'shield';

export type FusionTowerType =
  | 'twin_laser'
  | 'disruptor'
  | 'nova_cannon'
  | 'fortress'
  | 'stasis_field'
  | 'hidden';

export interface TowerStats {
  damage: number;
  range: number;
  attackSpeed: number; // attacks per second
  special?: string;
}

export interface TowerDef {
  id: string;
  name: string;
  type: TowerType | FusionTowerType;
  tier: number; // 1=base, 2=fusion
  stats: TowerStats;
  cost: number;
  fusionRecipe?: TowerType[]; // required base towers for fusion
  isPremium: boolean;
  color: string; // hex color for visual
  shape: 'diamond' | 'circle' | 'hexagon' | 'shield' | 'star';
}

export interface PlacedTower {
  instanceId: string;
  defId: string;
  position: { x: number; y: number };
  level: number;
}
```

- [ ] **Step 5: 유닛 타입 정의 — src/types/unit.ts**

```typescript
export type UnitType = 'scout_drone' | 'battle_robot' | 'heavy_walker' | 'stealth_drone' | 'titan';

export interface UnitStats {
  hp: number;
  speed: number; // tiles per second
  armor: number;
  special?: string;
}

export interface UnitDef {
  id: string;
  name: string;
  type: UnitType;
  stats: UnitStats;
  sendCost: number; // cost to send to opponent
  bounty: number;   // gold opponent gets for killing
  isPremium: boolean;
}

export interface ActiveUnit {
  instanceId: string;
  defId: string;
  position: { x: number; y: number };
  hp: number;
  pathIndex: number;
}
```

- [ ] **Step 6: 게임 상태 타입 — src/types/game-state.ts**

```typescript
import type { PlacedTower } from './tower';
import type { ActiveUnit } from './unit';
import type { Position } from './grid';

export interface PlayerState {
  id: string;
  hp: number;
  gold: number;
  towers: PlacedTower[];
  units: ActiveUnit[]; // units currently on THIS player's field (enemies)
  path: Position[];    // current computed path
}

export interface GameState {
  tick: number;
  phase: 'waiting' | 'building' | 'combat' | 'ended';
  players: [PlayerState, PlayerState];
  winnerId: string | null;
  timeRemaining: number; // seconds
}
```

- [ ] **Step 7: 브릿지 메시지 타입 — src/types/bridge.ts**

```typescript
import type { Position } from './grid';

// React → Unity
export type ReactToUnityMessage =
  | { type: 'START_GAME'; config: { gridWidth: number; gridHeight: number } }
  | { type: 'PLACE_TOWER'; towerId: string; position: Position }
  | { type: 'SEND_UNIT'; unitId: string; count: number }
  | { type: 'PAUSE_GAME' }
  | { type: 'RESUME_GAME' };

// Unity → React
export type UnityToReactMessage =
  | { type: 'GAME_READY' }
  | { type: 'TOWER_PLACED'; towerId: string; position: Position; success: boolean }
  | { type: 'UNIT_SPAWNED'; unitId: string; count: number }
  | { type: 'PLAYER_DAMAGED'; playerId: string; damage: number; remainingHp: number }
  | { type: 'PATH_UPDATED'; path: Position[] }
  | { type: 'GAME_OVER'; winnerId: string };
```

- [ ] **Step 8: 그리드 상수 — src/constants/grid.ts**

```typescript
import type { GridConfig } from '../types/grid';

export const GRID_WIDTH = 20;
export const GRID_HEIGHT = 20;
export const TILE_SIZE = 32; // pixels

export const DEFAULT_GRID_CONFIG: GridConfig = {
  width: GRID_WIDTH,
  height: GRID_HEIGHT,
  spawnPoint: { x: 0, y: 10 },
  exitPoint: { x: 19, y: 10 },
};
```

- [ ] **Step 9: 타워 상수 — src/constants/towers.ts**

```typescript
import type { TowerDef } from '../types/tower';

export const BASE_TOWERS: TowerDef[] = [
  {
    id: 'laser',
    name: 'Laser Turret',
    type: 'laser',
    tier: 1,
    stats: { damage: 10, range: 3, attackSpeed: 1.5 },
    cost: 50,
    isPremium: false,
    color: '#e2b714',
    shape: 'diamond',
  },
  {
    id: 'plasma',
    name: 'Plasma Cannon',
    type: 'plasma',
    tier: 1,
    stats: { damage: 25, range: 2, attackSpeed: 0.8, special: 'splash' },
    cost: 80,
    isPremium: false,
    color: '#2cb67d',
    shape: 'hexagon',
  },
  {
    id: 'emp',
    name: 'EMP Discharger',
    type: 'emp',
    tier: 1,
    stats: { damage: 5, range: 4, attackSpeed: 1.0, special: 'slow_30%' },
    cost: 60,
    isPremium: false,
    color: '#7f5af0',
    shape: 'circle',
  },
  {
    id: 'shield',
    name: 'Shield Generator',
    type: 'shield',
    tier: 1,
    stats: { damage: 0, range: 2, attackSpeed: 0, special: 'boost_adjacent_20%' },
    cost: 70,
    isPremium: false,
    color: '#00ccff',
    shape: 'shield',
  },
];

export const FUSION_TOWERS: TowerDef[] = [
  {
    id: 'twin_laser',
    name: 'Twin Laser',
    type: 'twin_laser',
    tier: 2,
    stats: { damage: 25, range: 4, attackSpeed: 2.0 },
    cost: 0,
    fusionRecipe: ['laser', 'laser'],
    isPremium: false,
    color: '#e2b714',
    shape: 'star',
  },
  {
    id: 'disruptor',
    name: 'Disruptor',
    type: 'disruptor',
    tier: 2,
    stats: { damage: 15, range: 5, attackSpeed: 1.2, special: 'slow_50%_splash' },
    cost: 0,
    fusionRecipe: ['emp', 'plasma'],
    isPremium: false,
    color: '#7f5af0',
    shape: 'star',
  },
  {
    id: 'nova_cannon',
    name: 'Nova Cannon',
    type: 'nova_cannon',
    tier: 2,
    stats: { damage: 60, range: 3, attackSpeed: 0.4, special: 'aoe_2tile' },
    cost: 0,
    fusionRecipe: ['plasma', 'plasma'],
    isPremium: false,
    color: '#2cb67d',
    shape: 'star',
  },
  {
    id: 'fortress',
    name: 'Fortress',
    type: 'fortress',
    tier: 2,
    stats: { damage: 15, range: 3, attackSpeed: 1.0, special: 'boost_adjacent_40%' },
    cost: 0,
    fusionRecipe: ['shield', 'laser'],
    isPremium: false,
    color: '#00ccff',
    shape: 'star',
  },
  {
    id: 'stasis_field',
    name: 'Stasis Field',
    type: 'stasis_field',
    tier: 2,
    stats: { damage: 0, range: 3, attackSpeed: 0, special: 'freeze_2s_cooldown_8s' },
    cost: 0,
    fusionRecipe: ['emp', 'shield'],
    isPremium: false,
    color: '#94a1b2',
    shape: 'star',
  },
];

export const ALL_TOWERS: TowerDef[] = [...BASE_TOWERS, ...FUSION_TOWERS];
```

- [ ] **Step 10: 유닛 상수 — src/constants/units.ts**

```typescript
import type { UnitDef } from '../types/unit';

export const UNITS: UnitDef[] = [
  {
    id: 'scout_drone',
    name: 'Scout Drone',
    type: 'scout_drone',
    stats: { hp: 30, speed: 3.0, armor: 0 },
    sendCost: 20,
    bounty: 5,
    isPremium: false,
  },
  {
    id: 'battle_robot',
    name: 'Battle Robot',
    type: 'battle_robot',
    stats: { hp: 80, speed: 1.5, armor: 2 },
    sendCost: 50,
    bounty: 12,
    isPremium: false,
  },
  {
    id: 'heavy_walker',
    name: 'Heavy Walker',
    type: 'heavy_walker',
    stats: { hp: 200, speed: 0.8, armor: 5 },
    sendCost: 100,
    bounty: 25,
    isPremium: false,
  },
  {
    id: 'stealth_drone',
    name: 'Stealth Drone',
    type: 'stealth_drone',
    stats: { hp: 50, speed: 2.5, armor: 0, special: 'invisible_until_attacked' },
    sendCost: 70,
    bounty: 18,
    isPremium: false,
  },
  {
    id: 'titan',
    name: 'Titan',
    type: 'titan',
    stats: { hp: 500, speed: 0.5, armor: 10, special: 'boss_regen_2hp_s' },
    sendCost: 250,
    bounty: 60,
    isPremium: false,
  },
];
```

- [ ] **Step 11: 배럴 export — src/index.ts**

```typescript
// Types
export type { Position, Tile, Grid, GridConfig } from './types/grid';
export type { TowerType, FusionTowerType, TowerStats, TowerDef, PlacedTower } from './types/tower';
export type { UnitType, UnitStats, UnitDef, ActiveUnit } from './types/unit';
export type { PlayerState, GameState } from './types/game-state';
export type { ReactToUnityMessage, UnityToReactMessage } from './types/bridge';

// Constants
export { GRID_WIDTH, GRID_HEIGHT, TILE_SIZE, DEFAULT_GRID_CONFIG } from './constants/grid';
export { BASE_TOWERS, FUSION_TOWERS, ALL_TOWERS } from './constants/towers';
export { UNITS } from './constants/units';
```

- [ ] **Step 12: 테스트 작성 — tests/types.test.ts**

```typescript
import { describe, it, expect } from 'vitest';
import {
  BASE_TOWERS,
  FUSION_TOWERS,
  ALL_TOWERS,
  UNITS,
  GRID_WIDTH,
  GRID_HEIGHT,
  DEFAULT_GRID_CONFIG,
} from '../src/index';

describe('Grid constants', () => {
  it('has valid grid dimensions', () => {
    expect(GRID_WIDTH).toBe(20);
    expect(GRID_HEIGHT).toBe(20);
  });

  it('has spawn and exit within grid bounds', () => {
    const { spawnPoint, exitPoint } = DEFAULT_GRID_CONFIG;
    expect(spawnPoint.x).toBeGreaterThanOrEqual(0);
    expect(spawnPoint.x).toBeLessThan(GRID_WIDTH);
    expect(exitPoint.x).toBeGreaterThanOrEqual(0);
    expect(exitPoint.x).toBeLessThan(GRID_WIDTH);
  });
});

describe('Tower definitions', () => {
  it('has 4 base towers', () => {
    expect(BASE_TOWERS).toHaveLength(4);
  });

  it('base towers have unique ids', () => {
    const ids = BASE_TOWERS.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('base towers are tier 1, fusion towers are tier 2', () => {
    BASE_TOWERS.forEach((t) => expect(t.tier).toBe(1));
    FUSION_TOWERS.forEach((t) => expect(t.tier).toBe(2));
  });

  it('fusion towers have valid recipes referencing base tower types', () => {
    const baseTypes = new Set(BASE_TOWERS.map((t) => t.type));
    FUSION_TOWERS.forEach((t) => {
      expect(t.fusionRecipe).toBeDefined();
      t.fusionRecipe!.forEach((ingredient) => {
        expect(baseTypes.has(ingredient)).toBe(true);
      });
    });
  });

  it('ALL_TOWERS contains all base + fusion', () => {
    expect(ALL_TOWERS).toHaveLength(BASE_TOWERS.length + FUSION_TOWERS.length);
  });
});

describe('Unit definitions', () => {
  it('has 5 unit types', () => {
    expect(UNITS).toHaveLength(5);
  });

  it('units have unique ids', () => {
    const ids = UNITS.map((u) => u.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('titan is the most expensive to send', () => {
    const titan = UNITS.find((u) => u.type === 'titan')!;
    const otherMaxCost = Math.max(...UNITS.filter((u) => u.type !== 'titan').map((u) => u.sendCost));
    expect(titan.sendCost).toBeGreaterThan(otherMaxCost);
  });
});
```

- [ ] **Step 13: pnpm install + 테스트 실행**

```bash
cd /Users/lio/Documents/personal/github/gird-line-defense-pvp
pnpm install
pnpm test:shared
```
Expected: 모든 테스트 PASS

- [ ] **Step 14: 커밋**

```bash
git add packages/shared/
git commit -m "feat: add shared types and constants package"
```

---

## Task 3: React + Vite 웹 쉘 — 프로젝트 설정

**Files:**
- Create: `packages/web-shell/package.json`
- Create: `packages/web-shell/tsconfig.json`
- Create: `packages/web-shell/vite.config.ts`
- Create: `packages/web-shell/index.html`
- Create: `packages/web-shell/src/main.tsx`
- Create: `packages/web-shell/src/App.tsx` (placeholder)
- Create: `packages/web-shell/src/styles/tokens.ts`
- Create: `packages/web-shell/src/styles/global.css`

- [ ] **Step 1: web-shell/package.json 생성**

```json
{
  "name": "web-shell",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "react-unity-webgl": "^9.6.0",
    "zustand": "^5.0.0",
    "@gld/shared": "workspace:*"
  },
  "devDependencies": {
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.0",
    "typescript": "^5.7.0",
    "vite": "^6.0.0",
    "vitest": "^3.0.0",
    "@testing-library/react": "^16.0.0",
    "@testing-library/jest-dom": "^6.0.0",
    "jsdom": "^25.0.0"
  }
}
```

- [ ] **Step 2: web-shell/tsconfig.json 생성**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "jsx": "react-jsx",
    "outDir": "./dist",
    "rootDir": "./src",
    "types": ["vitest/globals"]
  },
  "include": ["src/**/*", "tests/**/*"],
  "references": [{ "path": "../shared" }]
}
```

- [ ] **Step 3: vite.config.ts 생성**

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
  },
  build: {
    outDir: 'dist',
  },
  test: {
    environment: 'jsdom',
    globals: true,
  },
});
```

- [ ] **Step 4: 디자인 토큰 — src/styles/tokens.ts**

```typescript
export const colors = {
  bg: '#16161a',
  panel: '#1a1a24',
  border: '#2e2e3a',
  accent: '#7f5af0',
  success: '#2cb67d',
  danger: '#e53170',
  gold: '#e2b714',
  info: '#00ccff',
  text: '#fffffe',
  textSecondary: '#94a1b2',
} as const;

export const fonts = {
  pixel: "'Press Start 2P', cursive",
} as const;
```

- [ ] **Step 5: 글로벌 CSS — src/styles/global.css**

```css
@import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body, #root {
  width: 100%;
  height: 100%;
  overflow: hidden;
}

body {
  background-color: #16161a;
  color: #fffffe;
  font-family: 'Press Start 2P', cursive;
  font-size: 12px;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* Pixel-style scrollbar */
::-webkit-scrollbar {
  width: 8px;
}
::-webkit-scrollbar-track {
  background: #1a1a24;
}
::-webkit-scrollbar-thumb {
  background: #2e2e3a;
}
```

- [ ] **Step 6: index.html 생성**

```html
<!DOCTYPE html>
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no" />
    <title>Grid Line Defense</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 7: main.tsx 엔트리 생성**

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles/global.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
```

- [ ] **Step 8: placeholder App.tsx 생성**

```tsx
export function App() {
  return <div>Grid Line Defense - Loading...</div>;
}
```

- [ ] **Step 9: pnpm install + dev 서버 실행 확인**

```bash
pnpm install
pnpm dev:web
```
Expected: localhost:3000에서 "Grid Line Defense - Loading..." 텍스트 렌더링, 에러 없음. 확인 후 Ctrl+C로 서버 종료.

- [ ] **Step 10: 커밋**

```bash
git add packages/web-shell/
git commit -m "feat: scaffold React+Vite web shell with Minimal Pixel theme"
```

---

## Task 4: 웹 쉘 — UI 컴포넌트 + 페이지

**Files:**
- Modify: `packages/web-shell/src/App.tsx` (placeholder → 실제 구현)
- Create: `packages/web-shell/src/components/ui/PixelButton.tsx`
- Create: `packages/web-shell/src/components/ui/PixelPanel.tsx`
- Create: `packages/web-shell/src/pages/LobbyPage.tsx`
- Create: `packages/web-shell/src/pages/GamePage.tsx`
- Create: `packages/web-shell/src/stores/gameStore.ts`
- Test: `packages/web-shell/tests/gameStore.test.ts`

- [ ] **Step 1: 게임 스토어 테스트 작성 — tests/gameStore.test.ts**

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore } from '../src/stores/gameStore';

describe('gameStore', () => {
  beforeEach(() => {
    useGameStore.setState(useGameStore.getInitialState());
  });

  it('starts in lobby screen', () => {
    expect(useGameStore.getState().screen).toBe('lobby');
  });

  it('navigates to game screen', () => {
    useGameStore.getState().setScreen('game');
    expect(useGameStore.getState().screen).toBe('game');
  });

  it('tracks unity loaded state', () => {
    expect(useGameStore.getState().unityLoaded).toBe(false);
    useGameStore.getState().setUnityLoaded(true);
    expect(useGameStore.getState().unityLoaded).toBe(true);
  });
});
```

- [ ] **Step 2: 테스트 실행 — 실패 확인**

```bash
pnpm test:web
```
Expected: FAIL — gameStore 모듈 없음

- [ ] **Step 3: 게임 스토어 구현 — src/stores/gameStore.ts**

```typescript
import { create } from 'zustand';

type Screen = 'lobby' | 'game';

interface GameStoreState {
  screen: Screen;
  unityLoaded: boolean;
  setScreen: (screen: Screen) => void;
  setUnityLoaded: (loaded: boolean) => void;
}

export const useGameStore = create<GameStoreState>()((set) => ({
  screen: 'lobby',
  unityLoaded: false,
  setScreen: (screen) => set({ screen }),
  setUnityLoaded: (loaded) => set({ unityLoaded: loaded }),
}));
```

- [ ] **Step 4: 테스트 실행 — 통과 확인**

```bash
pnpm test:web
```
Expected: PASS

- [ ] **Step 5: PixelButton 컴포넌트 — src/components/ui/PixelButton.tsx**

```tsx
import type { ButtonHTMLAttributes } from 'react';
import { colors } from '../../styles/tokens';

interface PixelButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'danger' | 'gold';
}

const variantColors = {
  primary: colors.accent,
  danger: colors.danger,
  gold: colors.gold,
} as const;

export function PixelButton({ variant = 'primary', style, children, ...props }: PixelButtonProps) {
  const color = variantColors[variant];

  return (
    <button
      style={{
        fontFamily: "'Press Start 2P', cursive",
        fontSize: '10px',
        padding: '12px 24px',
        background: colors.panel,
        color: colors.text,
        border: `2px solid ${color}`,
        boxShadow: `4px 4px 0px ${color}`,
        cursor: 'pointer',
        transition: 'transform 0.1s, box-shadow 0.1s',
        ...style,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translate(2px, 2px)';
        e.currentTarget.style.boxShadow = `2px 2px 0px ${color}`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translate(0, 0)';
        e.currentTarget.style.boxShadow = `4px 4px 0px ${color}`;
      }}
      {...props}
    >
      {children}
    </button>
  );
}
```

- [ ] **Step 6: PixelPanel 컴포넌트 — src/components/ui/PixelPanel.tsx**

```tsx
import type { HTMLAttributes } from 'react';
import { colors } from '../../styles/tokens';

export function PixelPanel({ style, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      style={{
        background: colors.panel,
        border: `2px solid ${colors.border}`,
        boxShadow: `4px 4px 0px ${colors.border}`,
        padding: '16px',
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
}
```

- [ ] **Step 7: LobbyPage — src/pages/LobbyPage.tsx**

```tsx
import { PixelButton } from '../components/ui/PixelButton';
import { PixelPanel } from '../components/ui/PixelPanel';
import { useGameStore } from '../stores/gameStore';
import { colors } from '../styles/tokens';

export function LobbyPage() {
  const setScreen = useGameStore((s) => s.setScreen);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        gap: '32px',
      }}
    >
      <h1
        style={{
          fontSize: '20px',
          color: colors.accent,
          textShadow: `2px 2px 0px ${colors.border}`,
        }}
      >
        GRID LINE DEFENSE
      </h1>

      <PixelPanel style={{ textAlign: 'center', maxWidth: '400px' }}>
        <p style={{ color: colors.textSecondary, marginBottom: '24px', lineHeight: '1.8' }}>
          SF PvP Tower Defense
        </p>
        <PixelButton onClick={() => setScreen('game')}>
          START GAME
        </PixelButton>
      </PixelPanel>

      <p style={{ color: colors.textSecondary, fontSize: '8px' }}>
        Phase 1 Prototype
      </p>
    </div>
  );
}
```

- [ ] **Step 8: GamePage (Unity 임베드 준비) — src/pages/GamePage.tsx**

```tsx
import { PixelButton } from '../components/ui/PixelButton';
import { useGameStore } from '../stores/gameStore';
import { colors } from '../styles/tokens';

export function GamePage() {
  const setScreen = useGameStore((s) => s.setScreen);
  const unityLoaded = useGameStore((s) => s.unityLoaded);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Top bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '8px 16px',
          borderBottom: `2px solid ${colors.border}`,
        }}
      >
        <span style={{ fontSize: '10px', color: colors.accent }}>GRID LINE DEFENSE</span>
        <PixelButton
          variant="danger"
          style={{ fontSize: '8px', padding: '6px 12px' }}
          onClick={() => setScreen('lobby')}
        >
          EXIT
        </PixelButton>
      </div>

      {/* Unity canvas area */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: colors.bg,
        }}
      >
        {!unityLoaded && (
          <p style={{ color: colors.textSecondary, fontSize: '10px' }}>
            Unity WebGL 로딩 대기중...
          </p>
        )}
        {/* UnityCanvas will be mounted here in Task 6 */}
        <div id="unity-container" style={{ width: '100%', height: '100%' }} />
      </div>
    </div>
  );
}
```

- [ ] **Step 9: App.tsx — 라우팅**

```tsx
import { useGameStore } from './stores/gameStore';
import { LobbyPage } from './pages/LobbyPage';
import { GamePage } from './pages/GamePage';

export function App() {
  const screen = useGameStore((s) => s.screen);

  return screen === 'lobby' ? <LobbyPage /> : <GamePage />;
}
```

- [ ] **Step 10: 테스트 재실행 + dev 서버 확인**

```bash
pnpm test:web
pnpm dev:web
```
Expected: 테스트 PASS, 로비 페이지 렌더링 확인

- [ ] **Step 11: 커밋**

```bash
git add packages/web-shell/src/ packages/web-shell/tests/
git commit -m "feat: add lobby/game pages with Minimal Pixel UI components"
```

---

## Task 5: Unity 프로젝트 — 그리드 + 패스파인딩

> **주의:** 이 태스크는 Unity Editor에서 프로젝트를 생성한 후 진행. Unity Hub에서 Unity 6 (6000.4.0f1) 2D 프로젝트를 `packages/unity-game/` 경로에 생성.

**Files:**
- Create: `packages/unity-game/Assets/Scripts/Core/GridManager.cs`
- Create: `packages/unity-game/Assets/Scripts/Core/Tile.cs`
- Create: `packages/unity-game/Assets/Scripts/Core/Pathfinding.cs`
- Create: `packages/unity-game/Assets/Scripts/Core/TowerData.cs`
- Create: `packages/unity-game/Assets/Scripts/Core/Tower.cs`
- Create: `packages/unity-game/Assets/Scripts/Core/TowerPlacer.cs`
- Test: `packages/unity-game/Assets/Tests/EditMode/GridManagerTests.cs`
- Test: `packages/unity-game/Assets/Tests/EditMode/PathfindingTests.cs`

- [ ] **Step 1: Unity 프로젝트 생성**

Unity Hub에서:
1. New Project → 2D (Built-in Render Pipeline)
2. Editor Version: Unity 6 (6000.4.0f1)
3. Project Name: `unity-game`
4. Location: `/Users/lio/Documents/personal/github/gird-line-defense-pvp/packages/`

- [ ] **Step 2: 런타임 어셈블리 정의 생성**

`Assets/Scripts/Core/GLD.Core.asmdef`:
```json
{
  "name": "GLD.Core",
  "rootNamespace": "GLD.Core",
  "references": [],
  "includePlatforms": [],
  "excludePlatforms": [],
  "autoReferenced": true
}
```

- [ ] **Step 3: 에디터 테스트 어셈블리 설정**

`Assets/Tests/EditMode/` 폴더 생성 후 Assembly Definition:

`Assets/Tests/EditMode/EditModeTests.asmdef`:
```json
{
  "name": "EditModeTests",
  "rootNamespace": "GLD.Tests",
  "references": ["UnityEngine.TestRunner", "UnityEditor.TestRunner", "GLD.Core"],
  "includePlatforms": ["Editor"],
  "defineConstraints": ["UNITY_INCLUDE_TESTS"],
  "autoReferenced": false
}
```

- [ ] **Step 4: Tile 데이터 클래스 — Scripts/Core/Tile.cs**

```csharp
namespace GLD.Core
{
    [System.Serializable]
    public class Tile
    {
        public int X { get; }
        public int Y { get; }
        public bool Walkable { get; set; }
        public bool Occupied { get; set; }
        public string TowerId { get; set; }

        public Tile(int x, int y, bool walkable = true)
        {
            X = x;
            Y = y;
            Walkable = walkable;
            Occupied = false;
            TowerId = null;
        }

        public bool IsPassable => Walkable && !Occupied;
    }
}
```

- [ ] **Step 5: GridManager — Scripts/Core/GridManager.cs**

```csharp
using UnityEngine;

namespace GLD.Core
{
    public class GridManager : MonoBehaviour
    {
        public const int Width = 20;
        public const int Height = 20;

        public Vector2Int SpawnPoint = new(0, 10);
        public Vector2Int ExitPoint = new(19, 10);

        private Tile[,] _grid;

        public Tile[,] Grid => _grid;

        private void Awake()
        {
            InitializeGrid();
        }

        public void InitializeGrid()
        {
            _grid = new Tile[Width, Height];
            for (int x = 0; x < Width; x++)
            {
                for (int y = 0; y < Height; y++)
                {
                    _grid[x, y] = new Tile(x, y);
                }
            }
        }

        public Tile GetTile(int x, int y)
        {
            if (x < 0 || x >= Width || y < 0 || y >= Height) return null;
            return _grid[x, y];
        }

        public bool CanPlaceTower(int x, int y)
        {
            var tile = GetTile(x, y);
            if (tile == null || !tile.IsPassable) return false;

            // Cannot place on spawn or exit
            if (x == SpawnPoint.x && y == SpawnPoint.y) return false;
            if (x == ExitPoint.x && y == ExitPoint.y) return false;

            // Temporarily mark as occupied to check if path still exists
            tile.Occupied = true;
            bool pathExists = Pathfinding.FindPath(_grid, SpawnPoint, ExitPoint) != null;
            tile.Occupied = false;

            return pathExists;
        }

        public bool PlaceTower(int x, int y, string towerId)
        {
            if (!CanPlaceTower(x, y)) return false;

            var tile = GetTile(x, y);
            tile.Occupied = true;
            tile.TowerId = towerId;
            return true;
        }

        public void RemoveTower(int x, int y)
        {
            var tile = GetTile(x, y);
            if (tile == null) return;
            tile.Occupied = false;
            tile.TowerId = null;
        }

        public Vector3 GridToWorld(int x, int y)
        {
            // Each tile is 1 unit, grid centered
            float offsetX = -Width / 2f + 0.5f;
            float offsetY = -Height / 2f + 0.5f;
            return new Vector3(x + offsetX, y + offsetY, 0);
        }

        public Vector2Int WorldToGrid(Vector3 worldPos)
        {
            float offsetX = -Width / 2f + 0.5f;
            float offsetY = -Height / 2f + 0.5f;
            int x = Mathf.RoundToInt(worldPos.x - offsetX);
            int y = Mathf.RoundToInt(worldPos.y - offsetY);
            return new Vector2Int(x, y);
        }
    }
}
```

- [ ] **Step 6: A* 패스파인딩 — Scripts/Core/Pathfinding.cs**

```csharp
using System.Collections.Generic;
using UnityEngine;

namespace GLD.Core
{
    public static class Pathfinding
    {
        private class Node
        {
            public int X, Y;
            public float G, H;
            public float F => G + H;
            public Node Parent;

            public Node(int x, int y) { X = x; Y = y; }
        }

        private static readonly Vector2Int[] Directions = {
            new(0, 1), new(0, -1), new(1, 0), new(-1, 0)
        };

        public static List<Vector2Int> FindPath(Tile[,] grid, Vector2Int start, Vector2Int end)
        {
            int width = grid.GetLength(0);
            int height = grid.GetLength(1);

            var openSet = new List<Node>();
            var closedSet = new HashSet<(int, int)>();

            var startNode = new Node(start.x, start.y) { G = 0, H = Heuristic(start, end) };
            openSet.Add(startNode);

            while (openSet.Count > 0)
            {
                // Find node with lowest F
                int bestIndex = 0;
                for (int i = 1; i < openSet.Count; i++)
                {
                    if (openSet[i].F < openSet[bestIndex].F)
                        bestIndex = i;
                }

                var current = openSet[bestIndex];
                openSet.RemoveAt(bestIndex);

                if (current.X == end.x && current.Y == end.y)
                    return ReconstructPath(current);

                closedSet.Add((current.X, current.Y));

                foreach (var dir in Directions)
                {
                    int nx = current.X + dir.x;
                    int ny = current.Y + dir.y;

                    if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
                    if (closedSet.Contains((nx, ny))) continue;
                    if (!grid[nx, ny].IsPassable && !(nx == end.x && ny == end.y)) continue;

                    float tentativeG = current.G + 1;

                    var existing = openSet.Find(n => n.X == nx && n.Y == ny);
                    if (existing != null)
                    {
                        if (tentativeG < existing.G)
                        {
                            existing.G = tentativeG;
                            existing.Parent = current;
                        }
                    }
                    else
                    {
                        var neighbor = new Node(nx, ny)
                        {
                            G = tentativeG,
                            H = Heuristic(new Vector2Int(nx, ny), end),
                            Parent = current
                        };
                        openSet.Add(neighbor);
                    }
                }
            }

            return null; // No path found
        }

        private static float Heuristic(Vector2Int a, Vector2Int b)
        {
            return Mathf.Abs(a.x - b.x) + Mathf.Abs(a.y - b.y);
        }

        private static List<Vector2Int> ReconstructPath(Node node)
        {
            var path = new List<Vector2Int>();
            while (node != null)
            {
                path.Add(new Vector2Int(node.X, node.Y));
                node = node.Parent;
            }
            path.Reverse();
            return path;
        }
    }
}
```

- [ ] **Step 7: GridManager 에디터 테스트 — Tests/EditMode/GridManagerTests.cs**

```csharp
using NUnit.Framework;
using GLD.Core;
using UnityEngine;

namespace GLD.Tests
{
    public class GridManagerTests
    {
        private Tile[,] CreateGrid(int width = 20, int height = 20)
        {
            var grid = new Tile[width, height];
            for (int x = 0; x < width; x++)
                for (int y = 0; y < height; y++)
                    grid[x, y] = new Tile(x, y);
            return grid;
        }

        [Test]
        public void Grid_Initializes_With_Correct_Dimensions()
        {
            var grid = CreateGrid();
            Assert.AreEqual(20, grid.GetLength(0));
            Assert.AreEqual(20, grid.GetLength(1));
        }

        [Test]
        public void All_Tiles_Start_Walkable_And_Unoccupied()
        {
            var grid = CreateGrid();
            for (int x = 0; x < 20; x++)
            {
                for (int y = 0; y < 20; y++)
                {
                    Assert.IsTrue(grid[x, y].Walkable);
                    Assert.IsFalse(grid[x, y].Occupied);
                    Assert.IsTrue(grid[x, y].IsPassable);
                }
            }
        }

        [Test]
        public void Occupied_Tile_Is_Not_Passable()
        {
            var tile = new Tile(5, 5);
            tile.Occupied = true;
            Assert.IsFalse(tile.IsPassable);
        }

        [Test]
        public void Unwalkable_Tile_Is_Not_Passable()
        {
            var tile = new Tile(5, 5, walkable: false);
            Assert.IsFalse(tile.IsPassable);
        }
    }
}
```

- [ ] **Step 8: 테스트 실행 — Unity Test Runner**

Unity Editor → Window → General → Test Runner → EditMode → Run All
Expected: 모든 테스트 PASS

- [ ] **Step 9: 패스파인딩 테스트 — Tests/EditMode/PathfindingTests.cs**

```csharp
using NUnit.Framework;
using System.Collections.Generic;
using GLD.Core;
using UnityEngine;

namespace GLD.Tests
{
    public class PathfindingTests
    {
        private Tile[,] CreateGrid(int width = 20, int height = 20)
        {
            var grid = new Tile[width, height];
            for (int x = 0; x < width; x++)
                for (int y = 0; y < height; y++)
                    grid[x, y] = new Tile(x, y);
            return grid;
        }

        [Test]
        public void FindPath_Returns_Path_On_Open_Grid()
        {
            var grid = CreateGrid();
            var start = new Vector2Int(0, 10);
            var end = new Vector2Int(19, 10);

            var path = Pathfinding.FindPath(grid, start, end);

            Assert.IsNotNull(path);
            Assert.AreEqual(start, path[0]);
            Assert.AreEqual(end, path[path.Count - 1]);
        }

        [Test]
        public void FindPath_Shortest_Path_On_Open_Grid_Is_Straight_Line()
        {
            var grid = CreateGrid();
            var start = new Vector2Int(0, 10);
            var end = new Vector2Int(19, 10);

            var path = Pathfinding.FindPath(grid, start, end);

            // Manhattan distance for straight horizontal line = 20 tiles
            Assert.AreEqual(20, path.Count);
        }

        [Test]
        public void FindPath_Routes_Around_Obstacles()
        {
            var grid = CreateGrid(5, 5);
            var start = new Vector2Int(0, 2);
            var end = new Vector2Int(4, 2);

            // Block middle column except top
            grid[2, 0].Occupied = true;
            grid[2, 1].Occupied = true;
            grid[2, 2].Occupied = true;
            grid[2, 3].Occupied = true;
            // grid[2, 4] remains open

            var path = Pathfinding.FindPath(grid, start, end);

            Assert.IsNotNull(path);
            Assert.AreEqual(start, path[0]);
            Assert.AreEqual(end, path[path.Count - 1]);
            // Path should be longer than straight line (5)
            Assert.Greater(path.Count, 5);
        }

        [Test]
        public void FindPath_Returns_Null_When_Fully_Blocked()
        {
            var grid = CreateGrid(5, 5);
            var start = new Vector2Int(0, 2);
            var end = new Vector2Int(4, 2);

            // Fully block column 2
            for (int y = 0; y < 5; y++)
                grid[2, y].Occupied = true;

            var path = Pathfinding.FindPath(grid, start, end);

            Assert.IsNull(path);
        }

        [Test]
        public void FindPath_Adjacent_Tiles_Returns_Two_Point_Path()
        {
            var grid = CreateGrid(5, 5);
            var start = new Vector2Int(1, 1);
            var end = new Vector2Int(2, 1);

            var path = Pathfinding.FindPath(grid, start, end);

            Assert.IsNotNull(path);
            Assert.AreEqual(2, path.Count);
        }
    }
}
```

- [ ] **Step 10: 패스파인딩 테스트 실행**

Unity Editor → Test Runner → EditMode → Run All
Expected: 모든 테스트 PASS

- [ ] **Step 11: 커밋**

```bash
git add packages/unity-game/Assets/Scripts/ packages/unity-game/Assets/Tests/
git commit -m "feat: add grid system and A* pathfinding with tests"
```

---

## Task 6: Unity — 유닛 + 타워 시스템

> **주의:** Unit.cs를 먼저 생성해야 Tower.cs에서 참조할 수 있음.

**Files:**
- Create: `packages/unity-game/Assets/Scripts/Core/Unit.cs`
- Create: `packages/unity-game/Assets/Scripts/Core/UnitSpawner.cs`
- Create: `packages/unity-game/Assets/Scripts/Core/TowerData.cs`
- Create: `packages/unity-game/Assets/Scripts/Core/Tower.cs`
- Create: `packages/unity-game/Assets/Scripts/Core/TowerPlacer.cs`

- [ ] **Step 1: Unit 컴포넌트 — Scripts/Core/Unit.cs**

```csharp
using UnityEngine;
using System.Collections.Generic;

namespace GLD.Core
{
    public class Unit : MonoBehaviour
    {
        public float MaxHp { get; private set; }
        public float CurrentHp { get; private set; }
        public float Speed { get; private set; }
        public float Armor { get; private set; }

        private List<Vector2Int> _path;
        private int _pathIndex;
        private GridManager _gridManager;

        public event System.Action<Unit> OnReachedExit;
        public event System.Action<Unit> OnDied;

        public void Initialize(float hp, float speed, float armor, List<Vector2Int> path, GridManager gridManager)
        {
            MaxHp = hp;
            CurrentHp = hp;
            Speed = speed;
            Armor = armor;
            _path = path;
            _pathIndex = 0;
            _gridManager = gridManager;

            if (_path != null && _path.Count > 0)
            {
                transform.position = _gridManager.GridToWorld(_path[0].x, _path[0].y);
            }
        }

        private void Update()
        {
            if (_path == null || _pathIndex >= _path.Count) return;

            Vector3 target = _gridManager.GridToWorld(_path[_pathIndex].x, _path[_pathIndex].y);
            transform.position = Vector3.MoveTowards(transform.position, target, Speed * Time.deltaTime);

            if (Vector3.Distance(transform.position, target) < 0.05f)
            {
                _pathIndex++;

                if (_pathIndex >= _path.Count)
                {
                    OnReachedExit?.Invoke(this);
                    Destroy(gameObject);
                }
            }
        }

        public void TakeDamage(float damage)
        {
            float effectiveDamage = Mathf.Max(damage - Armor, 1f);
            CurrentHp -= effectiveDamage;

            if (CurrentHp <= 0)
            {
                OnDied?.Invoke(this);
                Destroy(gameObject);
            }
        }
    }
}
```

- [ ] **Step 2: UnitSpawner — Scripts/Core/UnitSpawner.cs**

```csharp
using UnityEngine;
using System.Collections;
using System.Collections.Generic;

namespace GLD.Core
{
    public class UnitSpawner : MonoBehaviour
    {
        [SerializeField] private GridManager _gridManager;
        [SerializeField] private GameObject _unitPrefab;

        [Header("Spawn Settings")]
        [SerializeField] private float _spawnInterval = 0.3f;

        public event System.Action<Unit> OnUnitReachedExit;
        public event System.Action<Unit> OnUnitDied;

        public void SpawnWave(float hp, float speed, float armor, int count)
        {
            var path = Pathfinding.FindPath(
                _gridManager.Grid,
                _gridManager.SpawnPoint,
                _gridManager.ExitPoint
            );

            if (path == null)
            {
                Debug.LogWarning("No path available for unit spawning");
                return;
            }

            StartCoroutine(SpawnCoroutine(hp, speed, armor, count, path));
        }

        private IEnumerator SpawnCoroutine(float hp, float speed, float armor, int count, List<Vector2Int> path)
        {
            for (int i = 0; i < count; i++)
            {
                var go = Instantiate(
                    _unitPrefab,
                    _gridManager.GridToWorld(path[0].x, path[0].y),
                    Quaternion.identity,
                    transform
                );

                var unit = go.GetComponent<Unit>();
                unit.Initialize(hp, speed, armor, new List<Vector2Int>(path), _gridManager);
                unit.OnReachedExit += (u) => OnUnitReachedExit?.Invoke(u);
                unit.OnDied += (u) => OnUnitDied?.Invoke(u);

                yield return new WaitForSeconds(_spawnInterval);
            }
        }
    }
}
```

- [ ] **Step 3: TowerData ScriptableObject — Scripts/Core/TowerData.cs**

```csharp
using UnityEngine;

namespace GLD.Core
{
    [CreateAssetMenu(fileName = "NewTower", menuName = "GLD/Tower Data")]
    public class TowerData : ScriptableObject
    {
        public string Id;
        public string DisplayName;
        public int Tier;
        public float Damage;
        public float Range;
        public float AttackSpeed;
        public int Cost;
        public Color TowerColor = Color.white;

        [Header("Visual")]
        public Sprite Icon;
    }
}
```

- [ ] **Step 4: Tower 컴포넌트 — Scripts/Core/Tower.cs**

```csharp
using UnityEngine;
using System.Collections.Generic;

namespace GLD.Core
{
    public class Tower : MonoBehaviour
    {
        public TowerData Data { get; private set; }
        public int GridX { get; private set; }
        public int GridY { get; private set; }

        private float _attackTimer;
        private GridManager _gridManager;

        public void Initialize(TowerData data, int gridX, int gridY, GridManager gridManager)
        {
            Data = data;
            GridX = gridX;
            GridY = gridY;
            _gridManager = gridManager;
        }

        private void Update()
        {
            if (Data == null || Data.AttackSpeed <= 0) return;

            _attackTimer += Time.deltaTime;
            if (_attackTimer >= 1f / Data.AttackSpeed)
            {
                _attackTimer = 0f;
                TryAttack();
            }
        }

        private void TryAttack()
        {
            // Find nearest unit within range
            var units = FindObjectsByType<Unit>(FindObjectsSortMode.None);
            Unit closest = null;
            float closestDist = float.MaxValue;

            foreach (var unit in units)
            {
                float dist = Vector3.Distance(transform.position, unit.transform.position);
                if (dist <= Data.Range && dist < closestDist)
                {
                    closest = unit;
                    closestDist = dist;
                }
            }

            if (closest != null)
            {
                closest.TakeDamage(Data.Damage);
            }
        }
    }
}
```

- [ ] **Step 5: TowerPlacer 입력 처리 — Scripts/Core/TowerPlacer.cs**

```csharp
using UnityEngine;

namespace GLD.Core
{
    public class TowerPlacer : MonoBehaviour
    {
        [SerializeField] private GridManager _gridManager;
        [SerializeField] private GameObject _towerPrefab;
        [SerializeField] private TowerData[] _availableTowers;

        private int _selectedTowerIndex = 0;
        private Camera _mainCamera;

        public TowerData SelectedTower => _availableTowers.Length > 0
            ? _availableTowers[_selectedTowerIndex]
            : null;

        private void Awake()
        {
            _mainCamera = Camera.main;
        }

        private void Update()
        {
            HandleTowerSelection();
            HandlePlacement();
        }

        private void HandleTowerSelection()
        {
            // Number keys 1-4 to select tower
            for (int i = 0; i < Mathf.Min(_availableTowers.Length, 4); i++)
            {
                if (Input.GetKeyDown(KeyCode.Alpha1 + i))
                {
                    _selectedTowerIndex = i;
                }
            }
        }

        private void HandlePlacement()
        {
            if (!Input.GetMouseButtonDown(0)) return;
            if (SelectedTower == null) return;

            Vector3 worldPos = _mainCamera.ScreenToWorldPoint(Input.mousePosition);
            Vector2Int gridPos = _gridManager.WorldToGrid(worldPos);

            if (_gridManager.PlaceTower(gridPos.x, gridPos.y, SelectedTower.Id))
            {
                SpawnTowerVisual(gridPos.x, gridPos.y, SelectedTower);
            }
        }

        private void SpawnTowerVisual(int x, int y, TowerData data)
        {
            Vector3 worldPos = _gridManager.GridToWorld(x, y);
            var go = Instantiate(_towerPrefab, worldPos, Quaternion.identity, transform);

            var tower = go.GetComponent<Tower>();
            tower.Initialize(data, x, y, _gridManager);

            // Apply color
            var sr = go.GetComponent<SpriteRenderer>();
            if (sr != null)
            {
                sr.color = data.TowerColor;
            }
        }
    }
}
```

- [ ] **Step 6: 커밋**

```bash
git add packages/unity-game/Assets/Scripts/Core/
git commit -m "feat: add unit, tower, and placer systems"
```

---

## Task 7: Unity — 비주얼 렌더링 (Minimal Pixel)

**Files:**
- Create: `packages/unity-game/Assets/Scripts/Visual/GridVisualizer.cs`
- Create: `packages/unity-game/Assets/Scripts/Visual/TowerVisualizer.cs`

- [ ] **Step 1: GridVisualizer — Scripts/Visual/GridVisualizer.cs**

```csharp
using UnityEngine;

namespace GLD.Visual
{
    public class GridVisualizer : MonoBehaviour
    {
        [SerializeField] private Core.GridManager _gridManager;

        // Minimal Pixel palette
        private readonly Color _bgColor = new Color32(0x16, 0x16, 0x1a, 0xFF);
        private readonly Color _gridLineColor = new Color32(0x2e, 0x2e, 0x3a, 0xFF);
        private readonly Color _spawnColor = new Color32(0x2c, 0xb6, 0x7d, 0xFF);
        private readonly Color _exitColor = new Color32(0xe5, 0x31, 0x70, 0xFF);
        private readonly Color _pathColor = new Color32(0x7f, 0x5a, 0xf0, 0x44);

        private void Start()
        {
            Camera.main.backgroundColor = _bgColor;
            DrawGrid();
        }

        private void DrawGrid()
        {
            for (int x = 0; x < Core.GridManager.Width; x++)
            {
                for (int y = 0; y < Core.GridManager.Height; y++)
                {
                    Vector3 pos = _gridManager.GridToWorld(x, y);
                    CreateTileVisual(pos, x, y);
                }
            }
        }

        private void CreateTileVisual(Vector3 pos, int x, int y)
        {
            var go = new GameObject($"Tile_{x}_{y}");
            go.transform.parent = transform;
            go.transform.position = pos;

            var sr = go.AddComponent<SpriteRenderer>();
            sr.sprite = CreatePixelSprite();
            sr.color = _gridLineColor;
            sr.sortingOrder = -10;

            // Scale slightly smaller than 1 to show grid lines
            go.transform.localScale = new Vector3(0.95f, 0.95f, 1f);

            // Highlight spawn and exit
            if (x == _gridManager.SpawnPoint.x && y == _gridManager.SpawnPoint.y)
                sr.color = _spawnColor;
            else if (x == _gridManager.ExitPoint.x && y == _gridManager.ExitPoint.y)
                sr.color = _exitColor;
        }

        private static Sprite _cachedPixelSprite;
        private static Sprite CreatePixelSprite()
        {
            if (_cachedPixelSprite != null) return _cachedPixelSprite;

            var tex = new Texture2D(1, 1);
            tex.SetPixel(0, 0, Color.white);
            tex.Apply();
            tex.filterMode = FilterMode.Point;

            _cachedPixelSprite = Sprite.Create(tex, new Rect(0, 0, 1, 1), new Vector2(0.5f, 0.5f), 1f);
            return _cachedPixelSprite;
        }
    }
}
```

- [ ] **Step 2: TowerVisualizer (도형 기반) — Scripts/Visual/TowerVisualizer.cs**

```csharp
using UnityEngine;

namespace GLD.Visual
{
    /// <summary>
    /// Generates simple geometric tower visuals procedurally.
    /// Uses colored pixel sprites — no external art assets needed for prototype.
    /// </summary>
    public static class TowerVisualizer
    {
        public static Sprite CreateDiamond(int size = 8)
        {
            var tex = new Texture2D(size, size);
            tex.filterMode = FilterMode.Point;
            ClearTexture(tex);

            int half = size / 2;
            for (int y = 0; y < size; y++)
            {
                int width = y <= half ? y : size - 1 - y;
                for (int x = half - width; x <= half + width; x++)
                {
                    if (x >= 0 && x < size)
                        tex.SetPixel(x, y, Color.white);
                }
            }

            tex.Apply();
            return Sprite.Create(tex, new Rect(0, 0, size, size), new Vector2(0.5f, 0.5f), size);
        }

        public static Sprite CreateCircle(int size = 8)
        {
            var tex = new Texture2D(size, size);
            tex.filterMode = FilterMode.Point;
            ClearTexture(tex);

            float center = size / 2f - 0.5f;
            float radius = size / 2f - 0.5f;

            for (int y = 0; y < size; y++)
            {
                for (int x = 0; x < size; x++)
                {
                    float dist = Mathf.Sqrt((x - center) * (x - center) + (y - center) * (y - center));
                    if (dist <= radius)
                        tex.SetPixel(x, y, Color.white);
                }
            }

            tex.Apply();
            return Sprite.Create(tex, new Rect(0, 0, size, size), new Vector2(0.5f, 0.5f), size);
        }

        public static Sprite CreateHexagon(int size = 8)
        {
            var tex = new Texture2D(size, size);
            tex.filterMode = FilterMode.Point;
            ClearTexture(tex);

            // Simplified hexagon as wide diamond
            int half = size / 2;
            for (int y = 0; y < size; y++)
            {
                int indent;
                if (y < size / 4) indent = half - y * 2;
                else if (y > size * 3 / 4) indent = half - (size - 1 - y) * 2;
                else indent = 0;

                indent = Mathf.Max(indent, 0);

                for (int x = indent; x < size - indent; x++)
                    tex.SetPixel(x, y, Color.white);
            }

            tex.Apply();
            return Sprite.Create(tex, new Rect(0, 0, size, size), new Vector2(0.5f, 0.5f), size);
        }

        private static void ClearTexture(Texture2D tex)
        {
            var clear = new Color(0, 0, 0, 0);
            for (int x = 0; x < tex.width; x++)
                for (int y = 0; y < tex.height; y++)
                    tex.SetPixel(x, y, clear);
        }
    }
}
```

- [ ] **Step 3: 커밋**

```bash
git add packages/unity-game/Assets/Scripts/Visual/
git commit -m "feat: add grid and tower visualizers with Minimal Pixel style"
```

---

## Task 8: Unity — 씬 조립 + WebGL 빌드

**Files:**
- Modify: `packages/unity-game/Assets/Scenes/GameScene.unity` (Unity Editor에서)
- Create: `packages/unity-game/WebGLTemplates/Minimal/index.html`

- [ ] **Step 1: 씬 설정 (Unity Editor)**

GameScene.unity를 열고 다음 GameObject들을 생성/배치:

1. **GameManager** (Empty)
   - `GridManager` 컴포넌트 추가
   - SpawnPoint: (0, 10), ExitPoint: (19, 10)

2. **GridVisual** (Empty)
   - `GridVisualizer` 컴포넌트 추가
   - GridManager 레퍼런스 연결

3. **TowerPlacer** (Empty)
   - `TowerPlacer` 컴포넌트 추가
   - GridManager 레퍼런스 연결
   - TowerPrefab 레퍼런스 연결

4. **UnitSpawner** (Empty)
   - `UnitSpawner` 컴포넌트 추가
   - GridManager 레퍼런스 연결
   - UnitPrefab 레퍼런스 연결

5. **Tower Prefab** (Assets/Prefabs/)
   - SpriteRenderer (white pixel)
   - `Tower` 컴포넌트
   - Scale: (0.8, 0.8, 1)

6. **Unit Prefab** (Assets/Prefabs/)
   - SpriteRenderer (white pixel, red tint)
   - `Unit` 컴포넌트
   - Scale: (0.4, 0.4, 1)

7. **Main Camera**
   - Orthographic Size: 12
   - Position: (0, 0, -10)
   - Background: #16161a

- [ ] **Step 2: TowerData SO 에셋 생성**

Assets/ScriptableObjects/Towers/ 폴더에서 Create → GLD → Tower Data:
- `Laser.asset`: Id=laser, Damage=10, Range=3, AttackSpeed=1.5, Cost=50, Color=#e2b714
- `Plasma.asset`: Id=plasma, Damage=25, Range=2, AttackSpeed=0.8, Cost=80, Color=#2cb67d
- `EMP.asset`: Id=emp, Damage=5, Range=4, AttackSpeed=1.0, Cost=60, Color=#7f5af0
- `Shield.asset`: Id=shield, Damage=0, Range=2, AttackSpeed=0, Cost=70, Color=#00ccff

TowerPlacer의 AvailableTowers 배열에 4개 SO 연결.

- [ ] **Step 3: 최소 WebGL 템플릿 — WebGLTemplates/Minimal/index.html**

```html
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
  <title>{{{ PRODUCT_NAME }}}</title>
  <style>
    * { margin: 0; padding: 0; }
    html, body { width: 100%; height: 100%; overflow: hidden; background: #16161a; }
    #unity-canvas { width: 100%; height: 100%; }
  </style>
</head>
<body>
  <canvas id="unity-canvas" tabindex="-1"></canvas>
  <script src="Build/{{{ LOADER_FILENAME }}}"></script>
  <script>
    createUnityInstance(document.getElementById("unity-canvas"), {
      dataUrl: "Build/{{{ DATA_FILENAME }}}",
      frameworkUrl: "Build/{{{ FRAMEWORK_FILENAME }}}",
      codeUrl: "Build/{{{ CODE_FILENAME }}}",
      companyName: "{{{ COMPANY_NAME }}}",
      productName: "{{{ PRODUCT_NAME }}}",
      productVersion: "{{{ PRODUCT_VERSION }}}",
    }).then((instance) => {
      window.unityInstance = instance;
    });
  </script>
</body>
</html>
```

- [ ] **Step 4: WebGL 빌드 설정 (Unity Editor)**

1. File → Build Settings → WebGL 선택 → Switch Platform
2. Player Settings:
   - WebGL Template: Minimal
   - Compression Format: Disabled (개발 편의)
   - Exception Support: Full
3. Build → 출력 경로: `packages/web-shell/public/unity-build/`

- [ ] **Step 5: Unity Editor에서 Play → 그리드 렌더링 + 타워 배치 + 유닛 이동 확인**

Expected:
- 20x20 그리드가 다크 배경에 렌더링
- 초록 타일(스폰), 핑크 타일(출구) 표시
- 클릭으로 타워 배치, 경로 차단 불가 확인
- 1-4 키로 타워 선택 변경

- [ ] **Step 6: 커밋**

```bash
git add packages/unity-game/Assets/ packages/unity-game/WebGLTemplates/ packages/unity-game/ProjectSettings/
git commit -m "feat: assemble game scene with grid, towers, units and WebGL template"
```

---

## Task 9: Unity↔React 브릿지

**Files:**
- Create: `packages/unity-game/Assets/Scripts/Bridge/Plugins/WebBridge.jslib`
- Create: `packages/unity-game/Assets/Scripts/Bridge/WebBridge.cs`
- Create: `packages/web-shell/src/bridge/useUnityBridge.ts`
- Create: `packages/web-shell/src/bridge/bridge-types.ts`
- Create: `packages/web-shell/src/components/UnityCanvas.tsx`
- Modify: `packages/web-shell/src/pages/GamePage.tsx`

- [ ] **Step 1: WebBridge.jslib — JavaScript 플러그인**

```javascript
// packages/unity-game/Assets/Scripts/Bridge/Plugins/WebBridge.jslib
mergeInto(LibraryManager.library, {
  SendToReact: function(messagePtr) {
    var message = UTF8ToString(messagePtr);
    if (window.dispatchUnityMessage) {
      window.dispatchUnityMessage(message);
    }
  },
});
```

- [ ] **Step 2: WebBridge.cs — Unity 측 브릿지**

```csharp
using System.Runtime.InteropServices;
using UnityEngine;

namespace GLD.Bridge
{
    public class WebBridge : MonoBehaviour
    {
        public static WebBridge Instance { get; private set; }

        [DllImport("__Internal")]
        private static extern void SendToReact(string message);

        public event System.Action<string> OnMessageFromReact;

        private void Awake()
        {
            if (Instance != null)
            {
                Destroy(gameObject);
                return;
            }
            Instance = this;
            DontDestroyOnLoad(gameObject);
        }

        private void Start()
        {
            // Notify React that Unity is ready
            EmitToReact("GAME_READY", "{}");
        }

        /// <summary>
        /// Send JSON message to React shell.
        /// </summary>
        public void EmitToReact(string type, string payload)
        {
            string json = $"{{\"type\":\"{type}\",\"payload\":{payload}}}";

            #if UNITY_WEBGL && !UNITY_EDITOR
            SendToReact(json);
            #else
            Debug.Log($"[WebBridge→React] {json}");
            #endif
        }

        /// <summary>
        /// Called from React via unityInstance.SendMessage("WebBridge", "ReceiveFromReact", jsonString)
        /// </summary>
        public void ReceiveFromReact(string json)
        {
            Debug.Log($"[React→WebBridge] {json}");
            OnMessageFromReact?.Invoke(json);
        }
    }
}
```

- [ ] **Step 3: 브릿지 타입 — src/bridge/bridge-types.ts**

```typescript
export interface UnityMessage {
  type: string;
  payload: Record<string, unknown>;
}

export type UnityMessageHandler = (message: UnityMessage) => void;
```

- [ ] **Step 4: useUnityBridge 훅 — src/bridge/useUnityBridge.ts**

```typescript
import { useCallback, useEffect, useRef } from 'react';
import type { UnityMessage, UnityMessageHandler } from './bridge-types';

declare global {
  interface Window {
    dispatchUnityMessage?: (raw: string) => void;
    unityInstance?: {
      SendMessage: (objectName: string, methodName: string, value: string) => void;
    };
  }
}

export function useUnityBridge(onMessage: UnityMessageHandler) {
  const handlerRef = useRef(onMessage);
  handlerRef.current = onMessage;

  useEffect(() => {
    window.dispatchUnityMessage = (raw: string) => {
      try {
        const msg: UnityMessage = JSON.parse(raw);
        handlerRef.current(msg);
      } catch (e) {
        console.error('[Bridge] Failed to parse Unity message:', raw, e);
      }
    };

    return () => {
      delete window.dispatchUnityMessage;
    };
  }, []);

  const sendToUnity = useCallback((type: string, payload: Record<string, unknown> = {}) => {
    const json = JSON.stringify({ type, payload });
    window.unityInstance?.SendMessage('WebBridge', 'ReceiveFromReact', json);
  }, []);

  return { sendToUnity };
}
```

- [ ] **Step 5: UnityCanvas 컴포넌트 — src/components/UnityCanvas.tsx**

```tsx
import { useEffect, useRef, useState } from 'react';
import { useUnityBridge } from '../bridge/useUnityBridge';
import { useGameStore } from '../stores/gameStore';
import type { UnityMessage } from '../bridge/bridge-types';
import { colors } from '../styles/tokens';

declare global {
  function createUnityInstance(
    canvas: HTMLCanvasElement,
    config: Record<string, string>,
    onProgress?: (progress: number) => void,
  ): Promise<{ SendMessage: (obj: string, method: string, value: string) => void }>;
}

export function UnityCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const setUnityLoaded = useGameStore((s) => s.setUnityLoaded);

  const handleUnityMessage = (msg: UnityMessage) => {
    console.log('[React] Unity message:', msg);
    if (msg.type === 'GAME_READY') {
      setUnityLoaded(true);
    }
  };

  const { sendToUnity } = useUnityBridge(handleUnityMessage);

  useEffect(() => {
    if (!canvasRef.current) return;

    const script = document.createElement('script');
    script.src = '/unity-build/Build/unity-build.loader.js';
    script.onload = () => {
      createUnityInstance(canvasRef.current!, {
        dataUrl: '/unity-build/Build/unity-build.data',
        frameworkUrl: '/unity-build/Build/unity-build.framework.js',
        codeUrl: '/unity-build/Build/unity-build.wasm',
      }, (p) => setProgress(p)).then((instance) => {
        window.unityInstance = instance;
        setLoading(false);
      });
    };
    document.body.appendChild(script);

    return () => {
      script.remove();
    };
  }, []);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {loading && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: colors.bg,
            zIndex: 1,
          }}
        >
          <p style={{ color: colors.textSecondary, fontSize: '10px' }}>
            Loading Unity... {Math.round(progress * 100)}%
          </p>
        </div>
      )}
      <canvas
        ref={canvasRef}
        id="unity-canvas"
        style={{ width: '100%', height: '100%' }}
        tabIndex={-1}
      />
    </div>
  );
}
```

- [ ] **Step 6: GamePage에 UnityCanvas 통합**

`packages/web-shell/src/pages/GamePage.tsx`를 수정:

```tsx
import { PixelButton } from '../components/ui/PixelButton';
import { UnityCanvas } from '../components/UnityCanvas';
import { useGameStore } from '../stores/gameStore';
import { colors } from '../styles/tokens';

export function GamePage() {
  const setScreen = useGameStore((s) => s.setScreen);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Top bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '8px 16px',
          borderBottom: `2px solid ${colors.border}`,
        }}
      >
        <span style={{ fontSize: '10px', color: colors.accent }}>GRID LINE DEFENSE</span>
        <PixelButton
          variant="danger"
          style={{ fontSize: '8px', padding: '6px 12px' }}
          onClick={() => setScreen('lobby')}
        >
          EXIT
        </PixelButton>
      </div>

      {/* Unity canvas */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <UnityCanvas />
      </div>
    </div>
  );
}
```

- [ ] **Step 7: 커밋**

```bash
git add packages/unity-game/Assets/Scripts/Bridge/ packages/web-shell/src/bridge/ packages/web-shell/src/components/UnityCanvas.tsx packages/web-shell/src/pages/GamePage.tsx
git commit -m "feat: add Unity↔React bridge with jslib plugin and React hooks"
```

---

## Task 10: 통합 검증

- [ ] **Step 1: Unity 에디터에서 Play 테스트**

Expected:
- 20x20 그리드 렌더링 (다크 배경 + 보라 격자)
- 스폰(초록) / 출구(핑크) 하이라이트
- 1-4 키로 타워 선택, 클릭으로 배치
- 타워 배치 시 경로 차단 방지 확인 (스폰→출구 경로 유지)
- 콘솔에 `[WebBridge→React]` 로그 출력

- [ ] **Step 2: Unity WebGL 빌드 → web-shell/public/unity-build/에 복사**

```bash
# Unity Editor에서 Build → packages/web-shell/public/unity-build/
```

- [ ] **Step 3: React dev 서버에서 통합 확인**

```bash
pnpm dev:web
```

1. localhost:3000 → 로비 페이지 렌더링 확인
2. "START GAME" 클릭 → GamePage로 전환
3. Unity WebGL 로딩 → 게임 캔버스 표시
4. 타워 배치 동작 확인
5. EXIT 버튼 → 로비로 복귀

- [ ] **Step 4: Unity 에디터 테스트 전체 실행**

Unity → Window → Test Runner → EditMode → Run All
Expected: GridManagerTests + PathfindingTests 모두 PASS

- [ ] **Step 5: shared + web-shell 테스트 실행**

```bash
pnpm test
```
Expected: 모든 테스트 PASS

- [ ] **Step 6: 최종 커밋**

```bash
git add -A
git commit -m "chore: phase 1 prototype integration complete"
```

---

## Next Steps

Phase 1 완료 후 별도 플랜으로 진행:
- **Phase 2: 네트워킹** — `packages/game-server/` 추가, WebSocket 서버, 타워 배치/유닛 이동 동기화, 2 클라이언트 연결 테스트
- **Phase 3: 토스 연동** — Toss SDK 인증, `granite.config.ts`, 보상형 광고, 결제 플로우
- **Phase 4: 게임 완성** — 전체 타워/유닛/합성, 매치메이킹, ELO, 프리미엄 해금
