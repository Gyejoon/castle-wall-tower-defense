# Phase 2: Meta Growth Loop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 전투 후 골드/XP 보상을 영속 저장하고, 타워 컬렉션 강화/승급 + 프로필 성장 메타루프를 구현한다.

**Architecture:** 기존 `gameStore`(세션 런타임)와 분리된 `metaStore`(영속 저장) Zustand 스토어를 신설. localStorage 단일 키(`gld-save-data`)에 모든 메타 데이터 통합. 전투 종료 시 `metaStore`에 골드/XP 적립, 로비 UI는 mock 대신 실제 저장 데이터 표시.

**Tech Stack:** TypeScript, Zustand, localStorage, Vitest (TDD)

---

## Context

Phase 0(기반 교정)과 Phase 1(핵심 전투 완성)이 검증 완료됨. 현재 전투에서 골드를 벌지만 어디에도 영속되지 않고, 로비 UI는 mock 데이터(MOCK_PROFILE, MOCK_TOWERS)를 사용 중. Phase 2는 전투 보상 → 저장 → 성장의 메타루프를 닫아 게임의 리텐션 축을 세우는 단계.

**선행 작업:** GDD 문서(Obsidian)가 현재 구현과 불일치하는 부분이 있으므로, Phase 2 진행 전에 GDD를 현재 구현 기준으로 정정한다 (Task 0).

## Decisions
- GDD를 현재 구현에 맞게 업데이트 후 Phase 2 진행
- 승급 pity 없음 — 단순 확률 기반, pity는 Phase 4 이후 검토
- 시작 골드 500G 유지

---

## File Structure

### New Files
| File | Responsibility |
|------|---------------|
| `packages/shared/src/types/save.ts` | SaveData 스키마, TowerGrade 타입, OwnedTower/ProfileData/ProgressData 인터페이스 |
| `packages/shared/src/constants/meta.ts` | XP 공식, 강화 비용/배율, 승급 설정, 기본 세이브 생성 |
| `packages/shared/tests/meta.test.ts` | 공식 유닛 테스트 |
| `packages/shared/tests/save.test.ts` | 세이브 스키마 검증 테스트 |
| `packages/web-shell/src/stores/metaStore.ts` | Zustand 영속 스토어 (load/save/migration + 모든 메타 액션) |
| `packages/web-shell/src/stores/__tests__/metaStore.test.ts` | 스토어 CRUD, 마이그레이션, 자동저장 테스트 |

### Modified Files
| File | Change |
|------|--------|
| `packages/shared/src/index.ts` | 새 타입/상수 re-export 추가 |
| `packages/web-shell/src/pages/GamePage.tsx:94-106` | onGameOver에 metaStore 골드/XP/전적 적립 추가 |
| `packages/web-shell/src/components/lobby/ProfileBar.tsx` | MOCK_PROFILE → useMetaStore 교체 |
| `packages/web-shell/src/components/lobby/tabs/HomeTab.tsx` | MOCK_PROFILE/MOCK_TOWERS → useMetaStore 교체 |
| `packages/web-shell/src/components/lobby/tabs/CollectionTab.tsx` | MOCK_TOWERS → ALL_TOWERS + useMetaStore 전면 재작성 |
| `packages/web-shell/src/stores/gameStore.ts:16-33,209-212` | 덱 localStorage 직접 관리 제거, metaStore 위임 |
| `packages/web-shell/src/App.tsx` | 앱 마운트 시 metaStore.loadSave() 호출 |
| `packages/phaser-game/src/systems/TowerSystem.ts` | getEffectiveStats로 강화/승급 스탯 적용 |

### Delete
| File | Reason |
|------|--------|
| `packages/web-shell/src/data/mockLobbyData.ts` | 모든 참조가 실제 데이터로 교체된 후 삭제 |

---

## Save Data Schema

```typescript
// packages/shared/src/types/save.ts
export const SAVE_VERSION = 1;
export const SAVE_STORAGE_KEY = 'gld-save-data';

export type TowerGrade = 'normal' | 'rare' | 'unique' | 'epic';

export interface OwnedTower {
  defId: string;       // TowerDef.id 참조
  level: number;       // 1~30
  grade: TowerGrade;
  acquiredAt: number;  // Date.now()
}

export interface ProfileData {
  nickname: string;
  level: number;       // 1~99
  xp: number;
  gold: number;
  totalGoldEarned: number;
  wins: number;
  losses: number;
  winStreak: number;
  bestWinStreak: number;
}

export interface ProgressData {
  highestWave: Record<string, number>;  // mapId → wave
  stagesCleared: string[];
  totalBattles: number;
}

export interface SettingsData {
  soundEnabled: boolean;
  screenShake: boolean;
  showDamageNumbers: boolean;
}

export interface SaveData {
  version: number;
  profile: ProfileData;
  collection: OwnedTower[];
  progress: ProgressData;
  settings: SettingsData;
  selectedDeck: string[];
}
```

## Formulas

```typescript
// packages/shared/src/constants/meta.ts

// XP: 레벨당 필요 경험치 (2차 성장)
function xpToNextLevel(level: number): number {
  return Math.floor(100 + (level - 1) * 50 + (level - 1) ** 2 * 5);
}
// Lv1→2: 100, Lv5→6: 380, Lv10→11: 705

// 전투 XP
function battleXp(wavesCleared: number, victory: boolean): number {
  return wavesCleared * 10 + (victory ? 50 : 0);
}
// 10웨이브 승리=150XP, 5웨이브 패배=50XP

// 강화 비용: 티어 배율 × (50 + level*20)
const TIER_COST_MULT = [0, 1, 1.5, 2, 3, 5]; // index = tier
function enhancementCost(level: number, tier: number): number {
  return Math.floor((50 + level * 20) * TIER_COST_MULT[tier]);
}
// T1 Lv1→2: 70G, T3 Lv1→2: 140G, T5 Lv10→11: 1250G

// 강화 스탯 배율: 레벨당 +3%
function enhancementStatMultiplier(level: number): number {
  return 1 + (level - 1) * 0.03;
}
// Lv1: 1.0, Lv10: 1.27, Lv30: 1.87

const MAX_TOWER_LEVEL = 30;

// 승급 설정
const PROMOTION_CONFIG = {
  normal:  { nextGrade: 'rare',   goldCost: 500,  successRate: 0.80, statBonus: 0.10 },
  rare:    { nextGrade: 'unique', goldCost: 2000, successRate: 0.50, statBonus: 0.15 },
  unique:  { nextGrade: 'epic',   goldCost: 8000, successRate: 0.25, statBonus: 0.20 },
  epic:    { nextGrade: null,     goldCost: 0,    successRate: 0,    statBonus: 0    },
};
// 누적 보너스: normal=0, rare=+10%, unique=+25%, epic=+45%

// 유효 스탯: baseStat × enhancementMult(level) × (1 + gradeBonus)
function getEffectiveStats(baseDamage: number, level: number, grade: TowerGrade): number {
  const gradeBonus = { normal: 0, rare: 0.10, unique: 0.25, epic: 0.45 };
  return baseDamage * enhancementStatMultiplier(level) * (1 + gradeBonus[grade]);
}
```

## Default Save (신규 유저)
- T1 4타워 보유 (laser, plasma, emp, shield) — level 1, grade normal
- 골드 500G
- 덱: ['laser', 'plasma', 'emp', 'shield']

---

## Task 0: GDD 불일치 정정 (docs/ 파생 문서)

**Files:**
- Modify: `docs/2026-04-03-gdd-filled-draft.md`
- Modify: `docs/2026-04-05-planning-progress.md`

> Note: Obsidian vault 원문은 읽기 전용. repo 내 docs/ 파생 문서만 수정.

- [x] **Step 1: GDD 정정 — 웨이브 수**

GDD `1-2 기본 정보 표`와 `6-5 Wave Sheet`에서 20웨이브 → 10웨이브로 정정.
- Win Condition: "20웨이브 생존" → "10웨이브 생존"
- Wave Sheet: 10개 웨이브 기준으로 축소 (현재 구현: wave 1-8 일반, wave 5 보스, wave 10 최종보스)

- [x] **Step 2: GDD 정정 — 속성 체계**

GDD `6-1 Tower Master`에서 속성을 현재 구현과 일치시킨다:
- 기존(GDD): fire/ice/lightning/nature/dark (5속성)
- 현재(구현): fire/water/lightning/neutral (4속성)
- 변경: 전체 GDD에서 ice→water, nature/dark→neutral로 정정

- [x] **Step 3: GDD 정정 — 비용 체계**

GDD `6-1 Tower Master` 비용 필드를 현재 구현과 일치:
- 기존: gold cost 50 (랜덤 롤)
- 현재: energy cost 10/20 (덱 시스템)
- 변경: cost 열을 에너지 비용으로 정정

- [x] **Step 4: GDD 정정 — 그리드**

- 기존: "12×8 그리드"
- 현재: "8×18 세로 모드 그리드"
- 변경: 관련 섹션 전체 정정

- [x] **Step 5: planning-progress.md 업데이트**

`docs/2026-04-05-planning-progress.md`의 "Planning 문서 '완료' 목록 정정" 섹션에 GDD 정정 완료 기록.

- [x] **Step 6: Commit**

```bash
git add docs/2026-04-03-gdd-filled-draft.md docs/2026-04-05-planning-progress.md
git commit -m "docs: align GDD with current implementation (10 waves, 4 elements, energy cost, 8x18 grid)"
```

---

## Task 1: Save Types & Meta Formulas (@gld/shared)

**Files:**
- Create: `packages/shared/src/types/save.ts`
- Create: `packages/shared/src/constants/meta.ts`
- Modify: `packages/shared/src/index.ts`
- Test: `packages/shared/tests/meta.test.ts`

- [x] **Step 1: Write failing tests for meta formulas**

```typescript
// packages/shared/tests/meta.test.ts
import { describe, expect, it } from 'vitest';
import {
  xpToNextLevel, battleXp, enhancementCost,
  enhancementStatMultiplier, MAX_TOWER_LEVEL, PROMOTION_CONFIG,
  getEffectiveStats, createDefaultSave, SAVE_VERSION,
} from '../src';

describe('xpToNextLevel', () => {
  it('level 1 needs 100 XP', () => expect(xpToNextLevel(1)).toBe(100));
  it('level 5 needs 380 XP', () => expect(xpToNextLevel(5)).toBe(380));
  it('level 10 needs 705 XP', () => expect(xpToNextLevel(10)).toBe(705));
});

describe('battleXp', () => {
  it('10 waves victory = 150', () => expect(battleXp(10, true)).toBe(150));
  it('5 waves defeat = 50', () => expect(battleXp(5, false)).toBe(50));
  it('0 waves defeat = 0', () => expect(battleXp(0, false)).toBe(0));
});

describe('enhancementCost', () => {
  it('T1 level 1 costs 70', () => expect(enhancementCost(1, 1)).toBe(70));
  it('T3 level 1 costs 140', () => expect(enhancementCost(1, 3)).toBe(140));
  it('T5 level 10 costs 1250', () => expect(enhancementCost(10, 5)).toBe(1250));
});

describe('enhancementStatMultiplier', () => {
  it('level 1 = 1.0', () => expect(enhancementStatMultiplier(1)).toBe(1));
  it('level 10 = 1.27', () => expect(enhancementStatMultiplier(10)).toBeCloseTo(1.27));
  it('level 30 = 1.87', () => expect(enhancementStatMultiplier(30)).toBeCloseTo(1.87));
});

describe('getEffectiveStats', () => {
  it('base 10, level 1, normal = 10', () => expect(getEffectiveStats(10, 1, 'normal')).toBe(10));
  it('base 10, level 1, rare = 11', () => expect(getEffectiveStats(10, 1, 'rare')).toBeCloseTo(11));
  it('base 10, level 10, epic = 18.42', () => expect(getEffectiveStats(10, 10, 'epic')).toBeCloseTo(18.415, 1));
});

describe('createDefaultSave', () => {
  it('has version = SAVE_VERSION', () => {
    const save = createDefaultSave();
    expect(save.version).toBe(SAVE_VERSION);
  });
  it('starts with 4 T1 towers', () => {
    const save = createDefaultSave();
    expect(save.collection).toHaveLength(4);
    expect(save.collection.every(t => t.level === 1 && t.grade === 'normal')).toBe(true);
  });
  it('starts with 500 gold', () => {
    expect(createDefaultSave().profile.gold).toBe(500);
  });
});
```

- [x] **Step 2: Run tests to verify they fail**

Run: `cd packages/shared && bun test tests/meta.test.ts`
Expected: FAIL — modules not found

- [x] **Step 3: Implement save types**

Create `packages/shared/src/types/save.ts` with the SaveData schema above.

- [x] **Step 4: Implement meta constants and formulas**

Create `packages/shared/src/constants/meta.ts` with all formulas, PROMOTION_CONFIG, createDefaultSave().

- [x] **Step 5: Add re-exports to index.ts**

Add to `packages/shared/src/index.ts`:
```typescript
export type { OwnedTower, ProfileData, ProgressData, SaveData, SettingsData, TowerGrade } from './types/save';
export { SAVE_STORAGE_KEY, SAVE_VERSION } from './types/save';
export {
  battleXp, createDefaultSave, enhancementCost, enhancementStatMultiplier,
  getEffectiveStats, MAX_TOWER_LEVEL, PROMOTION_CONFIG, xpToNextLevel,
} from './constants/meta';
```

- [x] **Step 6: Run tests to verify they pass**

Run: `cd packages/shared && bun test`
Expected: ALL PASS (기존 76 + 신규 ~12)

- [x] **Step 7: Commit**

```bash
git add packages/shared/src/types/save.ts packages/shared/src/constants/meta.ts packages/shared/src/index.ts packages/shared/tests/meta.test.ts
git commit -m "feat: add save data schema and meta growth formulas"
```

---

## Task 2: metaStore (Zustand 영속 스토어)

**Files:**
- Create: `packages/web-shell/src/stores/metaStore.ts`
- Create: `packages/web-shell/src/stores/__tests__/metaStore.test.ts`

- [x] **Step 1: Write failing tests for metaStore**

```typescript
// packages/web-shell/src/stores/__tests__/metaStore.test.ts
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SAVE_STORAGE_KEY, SAVE_VERSION } from '@gld/shared';

// Clear localStorage before each test, then import fresh store
describe('metaStore', () => {
  afterEach(() => localStorage.clear());

  it('loadSave creates default when no data exists', () => { /* ... */ });
  it('loadSave restores existing valid save', () => { /* ... */ });
  it('loadSave recovers from corrupt JSON', () => { /* ... */ });
  it('addGold increases profile.gold', () => { /* ... */ });
  it('addXp triggers level-up when exceeding threshold', () => { /* ... */ });
  it('addXp handles multi-level-up', () => { /* ... */ });
  it('recordBattle increments wins and winStreak on victory', () => { /* ... */ });
  it('recordBattle increments losses and resets winStreak on defeat', () => { /* ... */ });
  it('enhanceTower deducts gold and increments level', () => { /* ... */ });
  it('enhanceTower returns false when gold insufficient', () => { /* ... */ });
  it('enhanceTower returns false at MAX_TOWER_LEVEL', () => { /* ... */ });
  it('promoteTower upgrades grade on success', () => { /* ... */ });
  it('promoteTower deducts gold even on failure', () => { /* ... */ });
  it('promoteTower returns max_grade for epic', () => { /* ... */ });
  it('auto-saves to localStorage on mutation', () => { /* ... */ });
  it('migrates legacy gld-selected-deck key', () => { /* ... */ });
});
```

- [x] **Step 2: Run tests to verify they fail**

Run: `cd packages/web-shell && bun test src/stores/__tests__/metaStore.test.ts`
Expected: FAIL

- [x] **Step 3: Implement metaStore**

```typescript
// packages/web-shell/src/stores/metaStore.ts
import {
  ALL_TOWERS, SAVE_STORAGE_KEY, SAVE_VERSION, createDefaultSave,
  enhancementCost, MAX_TOWER_LEVEL, PROMOTION_CONFIG,
  xpToNextLevel, battleXp, type SaveData, type TowerGrade,
} from '@gld/shared';
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

// State interface matching SaveData + actions
// loadSave: read localStorage, migrate if needed, set state
// subscribe auto-save: on every state change, write to localStorage
// All mutation actions: addGold, addXp, recordBattle, enhanceTower, promoteTower, etc.
```

Key implementation details:
- `loadSave()`: try parse localStorage, validate version, migrate if needed, fallback to default
- Legacy migration: if `gld-save-data` absent but `gld-selected-deck` exists, import deck into default save
- Auto-save via `subscribe` with **500ms debounce** (rapid enhance 클릭 시 sync write 방지)
- localStorage write를 **try/catch**로 감싸서 quota exceeded 시 toast 경고
- `promoteTower` accepts optional `rng?: () => number` for testability (default `Math.random`)

- [x] **Step 4: Run tests to verify they pass**

Run: `cd packages/web-shell && bun test src/stores/__tests__/metaStore.test.ts`
Expected: ALL PASS

- [x] **Step 5: Commit**

```bash
git add packages/web-shell/src/stores/metaStore.ts packages/web-shell/src/stores/__tests__/metaStore.test.ts
git commit -m "feat: create metaStore with localStorage persistence and migration"
```

---

## Task 3: 전투 종료 → 골드/XP 적립 연동

**Files:**
- Modify: `packages/web-shell/src/pages/GamePage.tsx:94-106`
- Modify: `packages/web-shell/src/App.tsx` (loadSave 호출)

- [x] **Step 1: Wire metaStore.loadSave() at app mount**

`App.tsx`에서 앱 초기화 시 `useMetaStore.getState().loadSave()` 호출.

- [x] **Step 2: Modify onGameOver handler in GamePage.tsx**

현재 (라인 94-106):
```typescript
const onGameOver = (data: { result: 'victory' | 'defeat'; stats: { ... } }) => {
  setRunStatus(data.result);
  setBossHp({ hp: 0, maxHp: 0, phase: 1, visible: false });
  setGameOverStats(data.stats);
};
```

변경 후:
```typescript
const onGameOver = (data: { result: 'victory' | 'defeat'; stats: { ... } }) => {
  setRunStatus(data.result);
  setBossHp({ hp: 0, maxHp: 0, phase: 1, visible: false });
  setGameOverStats(data.stats);
  // Phase 2: persist meta progression
  const meta = useMetaStore.getState();
  meta.addGold(data.stats.goldEarned);
  meta.addXp(battleXp(data.stats.wavesCleared, data.result === 'victory'));
  meta.recordBattle(data.result);
  meta.updateHighestWave(selectedMapId, data.stats.wavesCleared);
};
```

- [x] **Step 3: Run existing tests + verify no regressions**

Run: `bun test` (all packages)
Expected: ALL PASS

- [x] **Step 4: Commit**

```bash
git add packages/web-shell/src/pages/GamePage.tsx packages/web-shell/src/App.tsx
git commit -m "feat: wire battle rewards to metaStore persistence"
```

---

## Task 4: ProfileBar를 실제 저장 데이터로 교체

**Files:**
- Modify: `packages/web-shell/src/components/lobby/ProfileBar.tsx`

- [x] **Step 1: Replace MOCK_PROFILE with useMetaStore**

```typescript
// Before: import { MOCK_PROFILE } from '../../data/mockLobbyData';
// After:
import { useMetaStore } from '../../stores/metaStore';
import { xpToNextLevel } from '@gld/shared';

export function ProfileBar() {
  const profile = useMetaStore(s => s.profile);
  const xpProgress = profile.xp / xpToNextLevel(profile.level);
  // Replace all MOCK_PROFILE.xxx → profile.xxx
  // Remove trophies display (GDD에 없음), wins 수로 대체
  // XP 프로그레스 바 추가: 레벨 표시 아래에 작은 바 (gold 색상, width = xpProgress * 100%)
}
```

XP 프로그레스 바 디자인:
```
Lv.1
[████████░░░░░░░] 34%  ← 높이 3px, gold 색상, 레벨 텍스트 아래
```

- [x] **Step 2: Run tests + visual verification**

Run: `bun test` + 브라우저에서 로비 확인
Expected: ProfileBar에 "기사단장 Lv.1 500G" 표시 (초기 저장 값)

- [x] **Step 3: Commit**

```bash
git add packages/web-shell/src/components/lobby/ProfileBar.tsx
git commit -m "feat: ProfileBar reads real save data instead of mock"
```

---

## Task 5: HomeTab을 실제 저장 데이터로 교체

**Files:**
- Modify: `packages/web-shell/src/components/lobby/tabs/HomeTab.tsx`

- [x] **Step 1: Replace mock data references with useMetaStore**

HomeTab에서 MOCK_PROFILE, MOCK_TOWERS 사용 부분을 metaStore로 교체.

- [x] **Step 2: Run tests + verify**

Run: `bun test`

- [x] **Step 3: Commit**

```bash
git add packages/web-shell/src/components/lobby/tabs/HomeTab.tsx
git commit -m "feat: HomeTab reads real save data instead of mock"
```

---

## Task 6: 덱/설정 영속화를 metaStore로 이관

**Files:**
- Modify: `packages/web-shell/src/stores/gameStore.ts`
- Modify: `packages/web-shell/src/components/lobby/tabs/SettingsTab.tsx` (있을 경우)

- [x] **Step 1: Remove DECK_STORAGE_KEY and loadDeck from gameStore**

gameStore의 `setSelectedDeck`를 metaStore 위임으로 변경:
```typescript
setSelectedDeck: (deck) => {
  useMetaStore.getState().setSelectedDeck(deck);
  set({ selectedDeck: deck });
},
```

- [x] **Step 2: Initialize gameStore.selectedDeck from metaStore**

앱 마운트 시 `gameStore`의 `selectedDeck`을 `metaStore`에서 읽어 초기화.

- [x] **Step 3: Settings를 metaStore에서 로드**

`soundEnabled`, `screenShake`, `showDamageNumbers`를 metaStore.settings에서 초기화하고, 변경 시 metaStore.updateSettings 호출.

- [x] **Step 4: Run all tests**

Run: `bun test`
Expected: ALL PASS, `gld-selected-deck` 키 더 이상 사용 안 함

- [x] **Step 5: Commit**

```bash
git add packages/web-shell/src/stores/gameStore.ts
git commit -m "refactor: migrate deck and settings persistence to metaStore"
```

---

## Task 7: CollectionTab 전면 재작성

**Files:**
- Modify: `packages/web-shell/src/components/lobby/tabs/CollectionTab.tsx`

- [x] **Step 1: Replace MOCK_TOWERS with ALL_TOWERS + metaStore**

```typescript
import { ALL_TOWERS, type ElementType } from '@gld/shared';
import { useMetaStore } from '../../../stores/metaStore';

const ELEMENT_COLORS: Record<ElementType, string> = {
  fire: '#c03020',
  water: '#5bc8e8',
  lightning: '#f0d060',
  neutral: '#a09070',
};

export function CollectionTab() {
  const collection = useMetaStore(s => s.collection);
  const ownedIds = new Set(collection.map(t => t.defId));

  const ownedTowers = ALL_TOWERS.filter(t => ownedIds.has(t.id));
  const lockedTowers = ALL_TOWERS.filter(t => !ownedIds.has(t.id));
  // ...render 18 real towers with tier 1-5, real element colors
}
```

- [x] **Step 2: Update TowerGridCard for real data**

- 티어 도트 1-5개로 확장
- 등급(grade) 표시: 보유 타워의 `ownedData.grade`에 따른 보더 색상
- 레벨 배지: `Lv.{ownedData.level}` 표시
- 실제 `tower.color`와 `ElementType` 색상 사용

- [x] **Step 3: Update TowerBottomSheet for real stats**

- `tower.stats.damage`, `tower.stats.attackSpeed`, `tower.stats.range` 표시
- `tower.stats.special` 표시 (있을 경우)
- 보유 타워: 레벨, 등급, 강화/승급 버튼 자리 마련 (Task 8-9에서 연결)
- 미보유 타워: 획득 안내 메시지

- [x] **Step 4: Run tests + visual verification**

Run: `bun test` + 브라우저에서 CollectionTab 확인
Expected: 18타워 그리드, 4타워 보유(밝게), 14타워 미보유(어둡게)

- [x] **Step 5: Commit**

```bash
git add packages/web-shell/src/components/lobby/tabs/CollectionTab.tsx
git commit -m "feat: CollectionTab shows all 18 real towers with ownership from save"
```

---

## Task 8: 타워 강화 (Enhancement) UI

**Files:**
- Modify: `packages/web-shell/src/components/lobby/tabs/CollectionTab.tsx` (TowerBottomSheet 확장)

- [x] **Step 1: Add enhancement section to TowerBottomSheet**

보유 타워 선택 시 바텀시트에 강화 섹션 추가:
```
[현재 스탯]              [강화 후]
공격력: 10               공격력: 10.3 (+0.3)
공속: 1.5               공속: 1.5 (변동 없음)
사거리: 3                사거리: 3

[강화 (70G)]  ← PixelButton gold variant
```

- `enhancementCost(level, tier)` 표시
- 골드 부족 시 버튼 비활성
- MAX_TOWER_LEVEL 도달 시 "최대 레벨" 표시

- [x] **Step 2: Wire button click to metaStore.enhanceTower + gold counter animation**

```typescript
const handleEnhance = () => {
  const prevGold = useMetaStore.getState().profile.gold;
  const result = useMetaStore.getState().enhanceTower(tower.id);
  if (!result) {
    pushToast('골드가 부족합니다', 'warning');
    return;
  }
  // Gold counter animation: prevGold → newGold (tick down over 500ms)
  animateGoldCounter(prevGold, useMetaStore.getState().profile.gold);
};
```

골드 카운터 애니메이션: ProfileBar의 골드 숫자가 `prevGold`에서 `newGold`로 500ms 동안 숫자가 줄어드는 효과. `requestAnimationFrame` + easing으로 구현.

```typescript
function animateGoldCounter(from: number, to: number) {
  const duration = 500;
  const start = performance.now();
  const tick = (now: number) => {
    const t = Math.min((now - start) / duration, 1);
    const eased = 1 - (1 - t) ** 3; // easeOutCubic
    setDisplayGold(Math.round(from + (to - from) * eased));
    if (t < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}
```

- [x] **Step 3: Run tests + visual verification**

Run: `bun test`

- [x] **Step 4: Commit**

```bash
git add packages/web-shell/src/components/lobby/tabs/CollectionTab.tsx
git commit -m "feat: tower enhancement UI with gold cost and stat preview"
```

---

## Task 9: 타워 승급 (Promotion) UI

**Files:**
- Modify: `packages/web-shell/src/components/lobby/tabs/CollectionTab.tsx` (TowerBottomSheet 확장)

- [x] **Step 1: Add promotion section to TowerBottomSheet**

강화 섹션 아래에 승급 섹션 추가:
```
등급: 일반 ★
[승급 시도 (500G) - 성공률 80%]  ← PixelButton

성공: toast "승급 성공! 레어 등급 달성"
실패: toast "승급 실패... 골드만 소모되었습니다"
epic: 버튼 숨김 + "최고 등급" 표시
```

등급별 보더 색상:
- normal: `colors.border` (기본)
- rare: `#5bc8e8` (파랑)
- unique: `#9060e0` (보라)
- epic: `#f0d060` (골드 + 글로우)

- [x] **Step 2: Wire button click to metaStore.promoteTower**

- [x] **Step 3: Add promotion roll animation**

승급 버튼 클릭 시:
1. 버튼 비활성화 + "승급 중..." 텍스트
2. 1초 동안 등급 아이콘 깜빡임 애니메이션 (CSS @keyframes)
3. 결과 표시: ���공 시 등급 색상 전환 + "승급 성공!" 텍스트 + 골드 테두리 펄스 / 실패 시 흔들림 + "승급 실패..." + 빨간 플래시

```css
@keyframes promotionRoll {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}
@keyframes promotionSuccess {
  0% { transform: scale(1); }
  50% { transform: scale(1.2); }
  100% { transform: scale(1); }
}
@keyframes promotionFail {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-4px); }
  75% { transform: translateX(4px); }
}
```

- [x] **Step 4: Run tests + visual verification**

- [x] **Step 5: Commit**

```bash
git add packages/web-shell/src/components/lobby/tabs/CollectionTab.tsx
git commit -m "feat: tower promotion UI with grade display, probability, and roll animation"
```

---

## Task 10: 전투 시 강화/승급 스탯 실적용

**Files:**
- Modify: `packages/phaser-game/src/systems/TowerSystem.ts`
- Modify: `packages/phaser-game/src/scenes/Game.ts`

- [x] **Step 1: Add getEffectiveStats utility to shared**

이미 `meta.ts`에 `getEffectiveStats` 구현됨. TowerSystem에서 타워 배치 시 base stats 대신 effective stats를 사용하도록 변경.

- [x] **Step 2: Pass collection data to Game scene**

Game scene 생성 시 metaStore의 collection 데이터를 전달. EventBus 이벤트 또는 scene data로 전달.

```typescript
// Game.ts create() 시 collection 수신
const collection = this.game.registry.get('collection') as OwnedTower[];
```

- [x] **Step 3: TowerSystem에서 effective stats 적용**

타워 배치(placeTower) 시:
```typescript
const owned = collection.find(t => t.defId === towerDef.id);
const level = owned?.level ?? 1;
const grade = owned?.grade ?? 'normal';
const effectiveDamage = getEffectiveStats(towerDef.stats.damage, level, grade);
```

- [x] **Step 4: Run all tests**

Run: `bun test` (all packages)
Expected: ALL PASS — 기존 테스트는 collection 없이 기본값(level 1, normal) 사용

- [x] **Step 5: Commit**

```bash
git add packages/shared/src/constants/meta.ts packages/phaser-game/src/systems/TowerSystem.ts packages/phaser-game/src/scenes/Game.ts
git commit -m "feat: apply enhancement and promotion stats to combat towers"
```

---

## Task 11: Mock 데이터 정리 + 최종 검증

**Files:**
- Delete: `packages/web-shell/src/data/mockLobbyData.ts`
- Modify: 남은 import 참조 제거

- [x] **Step 1: Delete mockLobbyData.ts**

모든 참조가 이미 교체되었으므로 파일 삭제.

- [x] **Step 2: Run full test suite**

Run: `bun test` (all packages)
Expected: ALL PASS

- [x] **Step 3: Run lint**

Run: `bun run lint` or `biome check`

- [x] **Step 4: E2E 수동 검증**

브라우저에서 전체 플로우 확인:
1. 로비 → ProfileBar에 Lv.1, 500G 표시
2. CollectionTab → 18타워 표시, T1 4타워 보유
3. 타워 선택 → 강화 버튼 → 골드 차감 + 레벨 증가
4. 승급 시도 → 성공/실패 토스트
5. 전투 시작 → 10웨이브 → 패배/승리
6. 결과 화면 → 골드 획득 표시
7. 로비 복귀 → ProfileBar에 골드/XP 반영 확인
8. 새로고침 → 저장 데이터 복원 확인

- [x] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: remove mockLobbyData and finalize Phase 2 meta growth loop"
```

---

## Verification

1. **Unit tests:** `bun test` — shared 88+, phaser-game 127+, web-shell 22+ all PASS
2. **Lint:** `biome check` — no errors
3. **Manual QA:** 위 E2E 수동 검증 8단계 통과
4. **Save persistence:** localStorage에 `gld-save-data` 키로 정상 저장/복원
5. **Legacy migration:** `gld-selected-deck` 키가 있으면 새 save로 마이그레이션 후 삭제

---

## /autoplan Review Findings

### CEO Review (Phase 1) — SELECTIVE EXPANSION mode

**Premises:** All valid. localStorage-only is correct for MVP. Separate metaStore is the right architecture.

**Expansions approved (in blast radius, < 1 day):**
- Add try/catch on localStorage write (quota exceeded handling)
- Add debounced auto-save (500ms) instead of sync on every mutation

**Deferred to TODOS:**
- Cloud save sync
- Pity system for promotions
- Multi-tab save conflict resolution

### Design Review (Phase 2) — UI scope detected

| Dimension | Score | Action |
|-----------|-------|--------|
| Info Hierarchy | 7/10 | Add XP progress bar to ProfileBar |
| Interaction States | 6/10 | Add success/failure feedback beyond toast for promotion |
| Mobile | 8/10 | OK — existing design system carries |
| Accessibility | 5/10 | Add ARIA labels for grade indicators |
| Visual | 7/10 | Grade border colors defined, sufficient for MVP |
| Motion | 5/10 | TASTE: add gold deduction animation or defer |
| Edge States | 6/10 | Add max-level and zero-gold UX states |

### Eng Review (Phase 3)

**Architecture:** Sound. metaStore→gameStore separation is clean. React→Phaser data flow via registry is acceptable.

**Critical integration point:** `TowerSystem.ts:99` hardcodes `level: 1`. Task 10 must modify `placeTower()` to accept collection data and apply `getEffectiveStats`.

**Test gaps to close:**
1. Integration test: `onGameOver → metaStore.addGold → ProfileBar re-render`
2. `getEffectiveStats` applied in TowerSystem test
3. Concrete promotion test code with seeded RNG

**Edge cases to handle:**
1. localStorage write failure (try/catch + user warning)
2. Auto-save debounce (500ms)
3. `zustand/middleware` availability check

### Decision Audit Trail

| # | Phase | Decision | Principle | Rationale | Rejected |
|---|-------|----------|-----------|-----------|----------|
| 1 | CEO | metaStore over extend gameStore | P5 explicit | Clean separation of ephemeral/persistent | Extend gameStore |
| 2 | CEO | SELECTIVE EXPANSION mode | P3 pragmatic | Plan scope is well-calibrated | SCOPE EXPANSION |
| 3 | CEO | Approve debounce expansion | P2 boil lake | In blast radius, prevents jank | Skip debounce |
| 4 | CEO | Approve try/catch expansion | P2 boil lake | 5 min fix, prevents data loss | Skip error handling |
| 5 | Design | Add XP bar to ProfileBar | P1 completeness | User needs level progress visibility | Defer to later |
| 6 | Design | TASTE: promotion failure UX | — | Toast vs visual roll feedback | — |
| 7 | Design | TASTE: gold animation | — | Immediate feedback vs simplicity | — |
| 8 | Eng | Pass collection via scene init() | P5 explicit | Type-safer than registry | game.registry |
| 9 | Eng | Add integration test | P1 completeness | Full flow untested | Skip |
| 10 | Eng | Debounce auto-save 500ms | P3 pragmatic | Prevents rapid sync writes | Sync on every set |

## GSTACK REVIEW REPORT

| Review | Trigger | Why | Runs | Status | Findings |
|--------|---------|-----|------|--------|----------|
| CEO Review | `/plan-ceo-review` | Scope & strategy | 1 | clean | 2 expansions approved, 3 deferred |
| Codex Review | `codex review` | Independent 2nd opinion | 1 | issues_open | 3 critical, 5 high, 4 medium findings |
| Eng Review | `/plan-eng-review` | Architecture & tests | 1 | issues_open | 3 test gaps, 3 edge cases |
| Design Review | `/plan-design-review` | UI/UX gaps | 1 | issues_open | 2 taste decisions, 1 expansion |

### Codex CEO Review (Outside Voice)

**Core thesis:** "이 계획은 저장되는 숫자를 리텐션의 원인으로 착각했다."

Critical findings:
1. 저장 ≠ 리텐션. 재방문 이유는 전술적 새로움에서 나옴
2. 영구 스탯 곱셈 → 계정 파워 인플레 → 장기 밸런스 오염
3. XP/골드/강화/승급은 가장 흔한 F2P 메타, 차별화 없음

High findings:
4. localStorage 손실 = 신뢰 붕괴
5. 경제 수치 검증 계획 부재
6. 다층 그라인드 동시 도입 → A/B 분리 불가
7. 타워 행동 해금/맵 modifier 등 대안 메타 미검토
8. GDD 정정 = 임시 타협의 제품 방향 승격

**대응 판단:**
- Finding 1-3 (전략적): 정당한 지적이지만, Phase 2는 GDD 로드맵의 순차 구현. "전술적 새로움"은 Phase 3(멀티스테이지)와 Phase 4(가챠/미션)에서 다룸. Phase 2 없이는 Phase 3-4가 불가.
- Finding 2 (스탯 곱셈): 실질적 리스크. getEffectiveStats의 배율을 보수적으로 유지하되, 향후 캡 조정이 용이하도록 constants에 분리 (이미 반영됨).
- Finding 5 (경제 수치): 수용. 계획에 "플레이테스트 후 수치 조정" 단계 명시 필요.
- Finding 7 (대안 메타): Phase 3에서 맵 modifier, Phase 4에서 해금 시퀀스 예정. 현 Phase 2 스코프 변경 불필요.

**VERDICT:** REVIEWED — Codex raised valid strategic concerns. Plan proceeds as infrastructure for Phases 3-5, with economy tuning flagged for post-implementation playtesting.

---

## Implementation Status: COMPLETE

**All tasks (0-11) implemented and verified.**

### Post-Plan Additions (리뷰 및 QA 후 추가 구현)

| 항목 | 상태 | 설명 |
|------|------|------|
| Gold counter tick-down | ✅ | ProfileBar에 useAnimatedGold 훅 (rAF + easeOutCubic 500ms) |
| enhanceTower reason string | ✅ | boolean → 'success' \| 'max_level' \| 'no_gold' \| 'not_found' |
| Save migration pipeline | ✅ | SAVE_MIGRATIONS 레지스트리 + migrateSave 체인 |
| Quota exceeded 통보 | ✅ | gld-save-error CustomEvent + App.tsx toast 수신 |
| PhaserGame deps 수정 | ✅ | selectedDeck를 useMetaStore.getState()로 직접 읽기 |
| PVP 잔재 제거 | ✅ | 승패 스트립, AI연습/전적 버튼, 우편/공지, trophy 아이콘 제거 |
| UI 텍스트 한글화 | ✅ | PVE생존→성벽 막기, 즉시 시작→게임 시작, 속성/특수 한글 번역 |
| 폰트 크기 전역 +4px | ✅ | 모든 fontSize +4px, body 기본 17px |
| 실제 에셋 이미지 적용 | ✅ | CollectionTab, HomeTab 덱 프리뷰, DeckEditSheet — tower asset .webp |
| 덱 편집 보유 타워만 표시 | ✅ | 미보유 타워 목록 제외, 꼬인 데이터(미보유 ID) 자동 필터링 |
| 덱 편집 전체화면 수정 | ✅ | 불투명 배경 + maxWidth 430px |
| DESIGN.md UX Writing | ✅ | 사용자 대면 텍스트 영어 금지 룰 추가 |
| 바텀시트 스탯 즉시 반영 | ✅ | QA ISSUE-001 — owned를 metaStore에서 직접 구독 |

### QA 결과

- **Health Score:** 95/100
- **이슈 발견:** 1건 (바텀시트 스탯 미갱신) → 수정 완료
- **콘솔 에러:** 0
- **검증 플로우:** 13개 전체 통과
- **리포트:** `.gstack/qa-reports/qa-report-localhost-2026-04-05.md`

### RAL Review 결과

```
Runtime Stability:   10/10
Spec Alignment:       9/10
Test Coverage:       10/10
Independent Review:   8/10
Adversarial Review:   8/10
Total:              45/50
Status:             PASS
```

### 테스트 현황

- shared: 94 tests passing
- web-shell: 50 tests passing
- **총 144 tests**
