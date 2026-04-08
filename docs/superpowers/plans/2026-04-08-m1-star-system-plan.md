# M1: ★ 별 등급 + 승급 리셋 + 전투력 + 업적 v1 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 기존 3스테이지에 ★1-3 별 등급, 승급 레벨 리셋, 전투력, 업적 v1을 추가하여 리플레이 가치 3배 이상 상승

**Architecture:** shared 패키지에 상수/타입 추가 → metaStore 슬라이스 확장 → Phaser Game.ts에서 별 배수 적용 → React UI에서 별 선택/표시. 기존 단방향 의존(shared→phaser→web-shell) + EventBus 통신 패턴 유지.

**Tech Stack:** TypeScript, Phaser 3, React 18, Zustand, Tailwind v4

**Design Spec:** `docs/superpowers/specs/2026-04-08-endgame-content-expansion-design.md`

---

## File Map

### 신규 파일
| 파일 | 역할 |
|------|------|
| `packages/shared/src/constants/starDifficulty.ts` | ★ 배수, 클리어 조건, 보상 배수 상수 |
| `packages/shared/src/utils/combatPower.ts` | 전투력 계산 순수 함수 |
| `packages/shared/src/constants/achievements.ts` | 업적 정의 (24개 v1) |
| `packages/web-shell/src/stores/meta/achievementSlice.ts` | 업적 진행/달성/보상 슬라이스 |
| `packages/web-shell/src/pages/AchievementPage.tsx` | 업적 목록 UI |
| `packages/web-shell/src/components/ui/AchievementToast.tsx` | 업적 달성 토스트 |

### 수정 파일
| 파일 | 변경 내용 |
|------|----------|
| `packages/shared/src/types/save.ts` | OwnedTower.awakening, ProgressData.stageStars/achievements/awakeningStones 추가 |
| `packages/shared/src/constants/meta.ts` | PROMOTION_CONFIG에 resetLevel 추가 |
| `packages/shared/src/constants/scaling.ts` | 기존 scaleUnitStats에 starMultiplier 파라미터 추가 |
| `packages/web-shell/src/stores/gameStore.ts` | selectedStar: 1\|2\|3 상태 추가 |
| `packages/web-shell/src/stores/meta/collectionSlice.ts` | promoteTower() 레벨 리셋 로직 |
| `packages/web-shell/src/stores/meta/profileSlice.ts` | recordStageClear에 별 기록 추가 |
| `packages/web-shell/src/hooks/useGameEvents.tsx` | game-over에 별 보상/기록 로직 |
| `packages/phaser-game/src/scenes/Game.ts` | create()에서 selectedStar 읽어 WaveSystem에 전달 |
| `packages/web-shell/src/pages/StageDetailPage.tsx` | ★ 선택 UI 추가 |
| `packages/web-shell/src/components/lobby/ProfileBar.tsx` | 전투력 표시 추가 |

---

## Task 1: ★ 별 등급 상수 정의

**Files:**
- Create: `packages/shared/src/constants/starDifficulty.ts`

- [ ] **Step 1: starDifficulty.ts 작성**

```typescript
// packages/shared/src/constants/starDifficulty.ts

export const STAR_DIFFICULTY = {
  1: { hp: 1.0, armor: 1.0, speed: 1.0, ccResist: 0, label: '정복' },
  2: { hp: 2.5, armor: 1.5, speed: 1.2, ccResist: 0.2, label: '정예' },
  3: { hp: 5.0, armor: 2.5, speed: 1.4, ccResist: 0.4, label: '지옥' },
} as const;

export type StarRating = 1 | 2 | 3;

export const STAR_CLEAR_CONDITIONS = {
  1: { type: 'survival' as const, hpThreshold: 0 },
  2: { type: 'hp-threshold' as const, hpThreshold: 0.5 },
  3: { type: 'hp-threshold' as const, hpThreshold: 0.8 },
} as const;

export const STAR_REWARD_MULTIPLIERS = {
  1: { gold: 1, xp: 1, awakeningStone: 0 },
  2: { gold: 2.5, xp: 2, awakeningStone: 1 },
  3: { gold: 5, xp: 3, awakeningStone: 3 },
} as const;

/** ★3에서 HP 100% 유지 시 추가 보너스 */
export const PERFECT_CLEAR_BONUS = { awakeningStone: 2 };

export function getStarDifficultyMult(star: StarRating) {
  return STAR_DIFFICULTY[star];
}

export function checkStarClear(
  star: StarRating,
  currentHp: number,
  maxHp: number,
): boolean {
  const condition = STAR_CLEAR_CONDITIONS[star];
  if (condition.type === 'survival') return true;
  return currentHp / maxHp >= condition.hpThreshold;
}
```

- [ ] **Step 2: shared/src/index.ts에서 export 추가**

```typescript
// packages/shared/src/index.ts 하단에 추가
export * from './constants/starDifficulty';
```

- [ ] **Step 3: 빌드 확인**

Run: `cd packages/shared && npx tsc --noEmit`
Expected: 0 errors

- [ ] **Step 4: 커밋**

```bash
git add packages/shared/src/constants/starDifficulty.ts packages/shared/src/index.ts
git commit -m "feat: add star difficulty constants and types"
```

---

## Task 2: SaveData 확장 + 마이그레이션

**Files:**
- Modify: `packages/shared/src/types/save.ts`
- Modify: `packages/web-shell/src/stores/meta/` (persistence 관련)

- [ ] **Step 1: save.ts 타입 확장**

`packages/shared/src/types/save.ts`에 추가:

```typescript
import type { StarRating } from '../constants/starDifficulty';

// OwnedTower에 awakening 필드 추가
export interface OwnedTower {
  defId: string;
  level: number;
  grade: TowerGrade;
  acquiredAt: number;
  awakening: 0 | 1 | 2 | 3; // NEW
  duplicateCount: number;     // NEW — 중복 조각
}

// ProgressData에 별/업적/각성석 추가
export interface ProgressData {
  // ... 기존 필드 유지
  stageStars: Record<string, StarRating>;  // NEW — mapId → 최고 별
  achievements: {                          // NEW
    claimed: string[];
    progress: Record<string, number>;
  };
  awakeningStones: number;                 // NEW
}

// ProfileData에 전투력 추가 (계산값이지만 캐시)
export interface ProfileData {
  // ... 기존 필드 유지
  combatPower: number; // NEW
}
```

- [ ] **Step 2: SAVE_VERSION 범프 + 마이그레이션**

`packages/shared/src/constants/meta.ts`에서:

```typescript
export const SAVE_VERSION = 4; // 3→4

// createDefaultSave()에 새 필드 반영
export function createDefaultSave(): SaveData {
  return {
    version: SAVE_VERSION,
    profile: {
      // ... 기존
      combatPower: 0,
    },
    collection: [],
    progress: {
      // ... 기존
      stageStars: {},
      achievements: { claimed: [], progress: {} },
      awakeningStones: 0,
    },
    settings: { /* 기존 */ },
    selectedDeck: ['laser', 'plasma', 'emp', 'shield'],
  };
}
```

metaStore persistence에서 migration 로직 추가:

```typescript
function migrateSave(data: SaveData): SaveData {
  if (data.version < 4) {
    data.progress.stageStars = data.progress.stageStars ?? {};
    data.progress.achievements = data.progress.achievements ?? { claimed: [], progress: {} };
    data.progress.awakeningStones = data.progress.awakeningStones ?? 0;
    data.profile.combatPower = data.profile.combatPower ?? 0;
    // collection 마이그레이션: 기존 타워에 awakening, duplicateCount 추가
    data.collection = data.collection.map(t => ({
      ...t,
      awakening: t.awakening ?? 0,
      duplicateCount: t.duplicateCount ?? 0,
    }));
    data.version = 4;
  }
  return data;
}
```

- [ ] **Step 3: 빌드 확인**

Run: `npm run build`
Expected: 0 errors (타입 호환성 확인)

- [ ] **Step 4: 커밋**

```bash
git add packages/shared/src/types/save.ts packages/shared/src/constants/meta.ts
git commit -m "feat: extend SaveData v4 — star ratings, achievements, awakening fields"
```

---

## Task 3: gameStore에 selectedStar 추가

**Files:**
- Modify: `packages/web-shell/src/stores/gameStore.ts`

- [ ] **Step 1: 상태 + 액션 추가**

`gameStore.ts`에 추가:

```typescript
import type { StarRating } from '@gld/shared';

// GameStoreState에 추가
selectedStar: StarRating;

// 초기값
selectedStar: 1,

// 액션 추가
setSelectedStar: (star: StarRating) => set({ selectedStar: star }),

// resetRun()에서 리셋
selectedStar: 1,
```

- [ ] **Step 2: PhaserGame.tsx에서 registry 전달**

`packages/web-shell/src/components/game/PhaserGame.tsx`에서 game.registry.set 호출 부분에 추가:

```typescript
game.registry.set('selectedStar', useGameStore.getState().selectedStar);
```

subscribe 패턴으로 실시간 동기화 (StageDetail에서 선택 후 Game 시작 전 설정):

```typescript
const unsubStar = useGameStore.subscribe(
  (s) => s.selectedStar,
  (star) => game.registry.set('selectedStar', star),
);
```

- [ ] **Step 3: 빌드 확인**

Run: `npm run build`
Expected: 0 errors

- [ ] **Step 4: 커밋**

```bash
git add packages/web-shell/src/stores/gameStore.ts packages/web-shell/src/components/game/PhaserGame.tsx
git commit -m "feat: add selectedStar to gameStore with registry sync"
```

---

## Task 4: Game.ts + WaveSystem에 ★ 배수 적용

**Files:**
- Modify: `packages/phaser-game/src/scenes/Game.ts`
- Modify: `packages/phaser-game/src/systems/WaveSystem.ts`

- [ ] **Step 1: Game.ts create()에서 ★ 배수 계산**

Game.ts create() 내 WaveSystem 생성 부분 수정:

```typescript
// 기존: difficultyHpMult: this.currentMap.difficultyHpMult
// 변경:
const selectedStar = (this.game.registry.get('selectedStar') ?? 1) as StarRating;
const starMult = getStarDifficultyMult(selectedStar);
const combinedHpMult = this.currentMap.difficultyHpMult * starMult.hp;

this.playerWaves = new WaveSystem(
  this.unitSystem,
  mapWaves,
  undefined,
  {
    difficultyHpMult: combinedHpMult,
    armorMult: starMult.armor,
    speedMult: starMult.speed,
    ccResist: starMult.ccResist,
  },
);
```

- [ ] **Step 2: WaveSystem 생성자 options 확장**

```typescript
// WaveSystem constructor options 확장
interface WaveSystemOptions {
  difficultyHpMult?: number;
  armorMult?: number;   // NEW
  speedMult?: number;   // NEW
  ccResist?: number;    // NEW
}

// advanceToNextWave()에서 유닛 스폰 시 적용
private advanceToNextWave(): void {
  // ... 기존 코드
  for (const group of wave.groups) {
    const hpMultiplier = (isFinalBoss ? FINAL_BOSS_HP_MULTIPLIER : 1) * this.difficultyHpMult;
    this.unitSystem.queueUnits(group.unitId, group.count, {
      hpMultiplier,
      waveHpMult: waveScaling.hp,
      waveSpeedMult: waveScaling.speed * (this.speedMult ?? 1), // ★ 속도 배수
      armorMult: this.armorMult ?? 1,   // ★ 방어 배수
      ccResist: this.ccResist ?? 0,     // ★ CC 저항
    });
  }
}
```

- [ ] **Step 3: Game.ts에 ★ 클리어 조건 판정 추가**

emitGameOver() 수정:

```typescript
import { checkStarClear, INITIAL_PLAYER_HP } from '@gld/shared';

private emitGameOver(payload: { result, reason, finalSlot }): void {
  const selectedStar = (this.game.registry.get('selectedStar') ?? 1) as StarRating;
  const starCleared = payload.result === 'victory'
    ? checkStarClear(selectedStar, this.playerHp, INITIAL_PLAYER_HP)
    : false;

  EventBus.emit('game-over', {
    ...payload,
    selectedStar,      // NEW
    starCleared,       // NEW
    hpRemaining: this.playerHp, // NEW
    stats: { /* 기존 */ },
  });
}
```

- [ ] **Step 4: 빌드 확인**

Run: `npm run build`
Expected: 0 errors

- [ ] **Step 5: 커밋**

```bash
git add packages/phaser-game/src/scenes/Game.ts packages/phaser-game/src/systems/WaveSystem.ts
git commit -m "feat: apply star difficulty multipliers in WaveSystem and victory check"
```

---

## Task 5: useGameEvents에서 ★ 결과 처리

**Files:**
- Modify: `packages/web-shell/src/hooks/useGameEvents.tsx`
- Modify: `packages/web-shell/src/stores/meta/profileSlice.ts`

- [ ] **Step 1: onGameOver에 별 보상/기록 추가**

```typescript
const onGameOver = (data: {
  result: 'victory' | 'defeat';
  selectedStar: StarRating;   // NEW
  starCleared: boolean;        // NEW
  hpRemaining: number;         // NEW
  stats: GameOverStats;
}) => {
  // ... 기존 코드 (setRunStatus, setBossHp 등)

  // ★ 보상 배수 적용
  const starReward = STAR_REWARD_MULTIPLIERS[data.selectedStar];
  const goldEarned = Math.round(data.stats.goldEarned * starReward.gold);
  const xpEarned = Math.round(
    battleXp(data.stats.wavesCleared, data.result === 'victory') *
    data.stats.rewardMultiplier * starReward.xp,
  );

  setGameOverStats({ ...data.stats, goldEarned, xpEarned, selectedStar: data.selectedStar, starCleared: data.starCleared });

  const meta = useMetaStore.getState();
  meta.addGold(goldEarned);
  meta.addXp(xpEarned);
  meta.recordBattle(data.result);
  meta.updateHighestWave(selectedMapId, data.stats.wavesCleared);

  if (data.result === 'victory') {
    meta.recordStageClear(selectedMapId);

    // ★ 별 기록
    if (data.starCleared) {
      meta.recordStarClear(selectedMapId, data.selectedStar);
    }

    // 각성석 보상
    if (starReward.awakeningStone > 0) {
      meta.addAwakeningStones(starReward.awakeningStone);
    }

    // 퍼펙트 클리어 보너스 (★3에서 HP 100%)
    if (data.selectedStar === 3 && data.hpRemaining === INITIAL_PLAYER_HP) {
      meta.addAwakeningStones(PERFECT_CLEAR_BONUS.awakeningStone);
    }
  }
};
```

- [ ] **Step 2: profileSlice에 recordStarClear, addAwakeningStones 추가**

```typescript
recordStarClear(mapId: string, star: StarRating): void {
  set((state) => {
    const current = state.progress.stageStars[mapId] ?? 0;
    if (star > current) {
      return {
        progress: {
          ...state.progress,
          stageStars: { ...state.progress.stageStars, [mapId]: star },
        },
      };
    }
    return {};
  });
  debouncedSave(get());
},

addAwakeningStones(amount: number): void {
  set((state) => ({
    progress: {
      ...state.progress,
      awakeningStones: state.progress.awakeningStones + amount,
    },
  }));
  debouncedSave(get());
},
```

- [ ] **Step 3: 빌드 확인 + 커밋**

```bash
npm run build
git add packages/web-shell/src/hooks/useGameEvents.tsx packages/web-shell/src/stores/meta/profileSlice.ts
git commit -m "feat: handle star rewards and recording in game-over flow"
```

---

## Task 6: StageDetailPage에 ★ 선택 UI

**Files:**
- Modify: `packages/web-shell/src/pages/StageDetailPage.tsx`

- [ ] **Step 1: ★ 선택 컴포넌트 추가**

StageDetailPage 내부 (게임 시작 버튼 위)에 별 선택 섹션 추가:

```tsx
import { STAR_DIFFICULTY, type StarRating } from '@gld/shared';
import { useGameStore } from '../stores/gameStore';

// 해금 판정 함수
function isStarUnlocked(
  star: StarRating,
  mapId: string,
  stageStars: Record<string, StarRating>,
  stagesCleared: string[],
): boolean {
  if (star === 1) return true;
  // ★2: 해당 맵 ★1 클리어 필요
  if (star === 2) return (stageStars[mapId] ?? 0) >= 1;
  // ★3: 해당 맵 ★2 클리어 필요
  return (stageStars[mapId] ?? 0) >= 2;
}

// JSX
const selectedStar = useGameStore((s) => s.selectedStar);
const setSelectedStar = useGameStore((s) => s.setSelectedStar);
const stageStars = useMetaStore((s) => s.progress.stageStars);

const STAR_COLORS = {
  1: { bg: 'rgba(122,182,72,0.1)', border: '#7ab648', text: '#7ab648' },
  2: { bg: 'rgba(200,160,74,0.1)', border: '#c8a04a', text: '#c8a04a' },
  3: { bg: 'rgba(192,48,32,0.1)', border: '#c03020', text: '#c03020' },
} as const;

<div className="flex gap-2 px-4 mb-3">
  {([1, 2, 3] as StarRating[]).map((star) => {
    const unlocked = isStarUnlocked(star, selectedMapId, stageStars, stagesCleared);
    const active = selectedStar === star;
    const colors = STAR_COLORS[star];
    const diff = STAR_DIFFICULTY[star];

    return (
      <button
        key={star}
        onClick={() => unlocked && setSelectedStar(star)}
        disabled={!unlocked}
        className="flex-1 rounded-lg p-2 text-center transition-transform duration-150"
        style={{
          minHeight: 48,
          background: active ? colors.bg : 'transparent',
          border: `2px solid ${active ? colors.border : unlocked ? '#4a3a20' : '#2a2010'}`,
          opacity: unlocked ? 1 : 0.3,
          transform: active ? 'scale(1.05)' : 'scale(1)',
        }}
      >
        <div style={{ fontFamily: "'Press Start 2P'", fontSize: 10, color: colors.text }}>
          {'★'.repeat(star)} {diff.label}
        </div>
        <div style={{ fontFamily: "'Press Start 2P'", fontSize: 8, color: '#a09070', marginTop: 4 }}>
          {diff.hp}×
        </div>
      </button>
    );
  })}
</div>
```

- [ ] **Step 2: 현재 맵의 최고 별 표시**

클리어 기록 섹션에 별 아이콘 추가:

```tsx
const currentStars = stageStars[selectedMapId] ?? 0;

<div className="flex gap-1 items-center">
  {[1, 2, 3].map((s) => (
    <span
      key={s}
      style={{
        fontSize: 12,
        color: s <= currentStars ? '#f0d060' : '#4a3a20',
      }}
    >
      ★
    </span>
  ))}
</div>
```

- [ ] **Step 3: 수동 테스트**

Run: `npm run dev`
확인: StageDetailPage에서 ★1/★2/★3 선택 가능, ★2는 ★1 클리어 후 해금

- [ ] **Step 4: 커밋**

```bash
git add packages/web-shell/src/pages/StageDetailPage.tsx
git commit -m "feat: add star difficulty selector UI to StageDetailPage"
```

---

## Task 7: 승급 레벨 리셋

**Files:**
- Modify: `packages/shared/src/constants/meta.ts`
- Modify: `packages/web-shell/src/stores/meta/collectionSlice.ts`

- [ ] **Step 1: PROMOTION_CONFIG에 resetLevel 추가**

```typescript
// meta.ts
export const PROMOTION_CONFIG = {
  normal: {
    nextGrade: 'rare' as const,
    goldCost: 500,
    successRate: 0.2,
    statBonus: 0.1,
    requiredLevel: 20,
    resetLevel: true, // NEW
  },
  rare: {
    nextGrade: 'unique' as const,
    goldCost: 2000,
    successRate: 0.1,
    statBonus: 0.15,
    requiredLevel: 30,
    resetLevel: true, // NEW
  },
  unique: {
    nextGrade: 'epic' as const,
    goldCost: 8000,
    successRate: 0.05,
    statBonus: 0.2,
    requiredLevel: 50,
    resetLevel: true, // NEW
  },
  epic: {
    nextGrade: null,
    goldCost: 0,
    successRate: 0,
    statBonus: 0,
    requiredLevel: 0,
    resetLevel: false,
  },
};
```

- [ ] **Step 2: collectionSlice.promoteTower() 수정**

```typescript
// collectionSlice.ts — promoteTower 성공 시
if (roll < config.successRate) {
  tower.grade = config.nextGrade!;
  if (config.resetLevel) {
    tower.level = 1; // ★ NEW — 승급 성공 시 레벨 리셋
  }
  debouncedSave(get());
  return 'success';
}
```

- [ ] **Step 3: 빌드 확인 + 커밋**

```bash
npm run build
git add packages/shared/src/constants/meta.ts packages/web-shell/src/stores/meta/collectionSlice.ts
git commit -m "feat: reset tower level to 1 on successful grade promotion"
```

---

## Task 8: 전투력 계산 + 프로필 표시

**Files:**
- Create: `packages/shared/src/utils/combatPower.ts`
- Modify: `packages/web-shell/src/components/lobby/ProfileBar.tsx`
- Modify: `packages/web-shell/src/stores/meta/collectionSlice.ts`

- [ ] **Step 1: combatPower.ts 작성**

```typescript
// packages/shared/src/utils/combatPower.ts
import type { OwnedTower } from '../types/save';
import { TOWER_REGISTRY } from '../constants/towers';
import { enhancementStatMultiplier } from '../constants/meta';

const GRADE_MULTIPLIER: Record<string, number> = {
  normal: 1.0,
  rare: 1.1,
  unique: 1.25,
  epic: 1.45,
};

const AWAKENING_MULTIPLIER = [1.0, 1.2, 1.5, 2.0] as const;

export function calcTowerPower(tower: OwnedTower): number {
  const def = TOWER_REGISTRY[tower.defId];
  if (!def) return 0;
  const baseDmg = def.stats.damage;
  const levelMult = enhancementStatMultiplier(tower.level);
  const gradeMult = GRADE_MULTIPLIER[tower.grade] ?? 1;
  const awakenMult = AWAKENING_MULTIPLIER[tower.awakening] ?? 1;
  return Math.round(baseDmg * levelMult * gradeMult * awakenMult);
}

export function calcCombatPower(collection: OwnedTower[]): number {
  return collection.reduce((sum, t) => sum + calcTowerPower(t), 0);
}
```

- [ ] **Step 2: collectionSlice에서 전투력 자동 갱신**

enhanceTower, promoteTower 성공 후:

```typescript
// 전투력 재계산
const cp = calcCombatPower(get().collection);
set((s) => ({ profile: { ...s.profile, combatPower: cp } }));
```

- [ ] **Step 3: ProfileBar에 전투력 표시**

```tsx
// ProfileBar.tsx
import { useMetaStore } from '../../stores/metaStore';

const combatPower = useMetaStore((s) => s.profile.combatPower);

// 프레임 색상 결정
function getFrameColor(cp: number): string {
  if (cp >= 50000) return '#ffe870';
  if (cp >= 10000) return '#9060e0';
  if (cp >= 5000) return '#f0d060';
  if (cp >= 1000) return '#c8a04a';
  if (cp >= 500) return '#7ab648';
  return '#4a3a20';
}

// JSX (골드 표시 아래에 추가)
<div className="flex items-center gap-1">
  <span style={{ fontSize: 8, color: '#c8a04a' }}>⚔</span>
  <span
    style={{
      fontFamily: "'Press Start 2P'",
      fontSize: 10,
      color: '#f0d060',
    }}
  >
    {combatPower.toLocaleString()}
  </span>
</div>
```

- [ ] **Step 4: 빌드 확인 + 커밋**

```bash
npm run build
git add packages/shared/src/utils/combatPower.ts packages/web-shell/src/components/lobby/ProfileBar.tsx packages/web-shell/src/stores/meta/collectionSlice.ts
git commit -m "feat: add combat power calculation and profile display"
```

---

## Task 9: 업적 시스템 데이터 레이어

**Files:**
- Create: `packages/shared/src/constants/achievements.ts`

- [ ] **Step 1: 업적 타입 + 정의 작성**

```typescript
// packages/shared/src/constants/achievements.ts

export interface AchievementDef {
  id: string;
  category: 'combat_power' | 'level' | 'tower' | 'progress';
  name: string;
  description: string;
  target: number;
  reward: { diamond: number };
}

export const ACHIEVEMENTS: AchievementDef[] = [
  // 전투력 (~8개)
  { id: 'cp_100', category: 'combat_power', name: '초보 지휘관', description: '전투력 100 달성', target: 100, reward: { diamond: 50 } },
  { id: 'cp_500', category: 'combat_power', name: '숙련 지휘관', description: '전투력 500 달성', target: 500, reward: { diamond: 100 } },
  { id: 'cp_1000', category: 'combat_power', name: '정예 지휘관', description: '전투력 1,000 달성', target: 1000, reward: { diamond: 200 } },
  { id: 'cp_5000', category: 'combat_power', name: '영웅 지휘관', description: '전투력 5,000 달성', target: 5000, reward: { diamond: 500 } },
  { id: 'cp_10000', category: 'combat_power', name: '전설의 지휘관', description: '전투력 10,000 달성', target: 10000, reward: { diamond: 800 } },
  { id: 'cp_50000', category: 'combat_power', name: '신의 지휘관', description: '전투력 50,000 달성', target: 50000, reward: { diamond: 2000 } },

  // 레벨 (~7개)
  { id: 'lv_5', category: 'level', name: '입문자', description: '레벨 5 달성', target: 5, reward: { diamond: 30 } },
  { id: 'lv_10', category: 'level', name: '수련생', description: '레벨 10 달성', target: 10, reward: { diamond: 50 } },
  { id: 'lv_20', category: 'level', name: '기사', description: '레벨 20 달성', target: 20, reward: { diamond: 100 } },
  { id: 'lv_50', category: 'level', name: '대기사', description: '레벨 50 달성', target: 50, reward: { diamond: 300 } },
  { id: 'lv_99', category: 'level', name: '왕의 수호자', description: '레벨 99 달성', target: 99, reward: { diamond: 1000 } },

  // 타워 (~10개)
  { id: 'tower_lv10', category: 'tower', name: '첫 강화', description: '타워 Lv.10 달성', target: 10, reward: { diamond: 30 } },
  { id: 'tower_lv30', category: 'tower', name: '정련의 탑', description: '타워 Lv.30 달성', target: 30, reward: { diamond: 100 } },
  { id: 'tower_lv50', category: 'tower', name: '극한 강화', description: '타워 Lv.50 달성', target: 50, reward: { diamond: 200 } },
  { id: 'tower_rare', category: 'tower', name: '첫 승급', description: '타워 Rare 등급 달성', target: 1, reward: { diamond: 50 } },
  { id: 'tower_unique', category: 'tower', name: '유니크 달성', description: '타워 Unique 등급 달성', target: 1, reward: { diamond: 200 } },
  { id: 'tower_epic', category: 'tower', name: '에픽 달성', description: '타워 Epic 등급 달성', target: 1, reward: { diamond: 500 } },

  // 진행 (~10개)
  { id: 'clear_1', category: 'progress', name: '첫 승리', description: '스테이지 1회 클리어', target: 1, reward: { diamond: 30 } },
  { id: 'clear_10', category: 'progress', name: '숙련 수비대장', description: '스테이지 10회 클리어', target: 10, reward: { diamond: 100 } },
  { id: 'clear_50', category: 'progress', name: '베테랑', description: '스테이지 50회 클리어', target: 50, reward: { diamond: 300 } },
  { id: 'boss_10', category: 'progress', name: '보스 헌터', description: '보스 10회 격파', target: 10, reward: { diamond: 100 } },
  { id: 'boss_100', category: 'progress', name: '보스 슬레이어', description: '보스 100회 격파', target: 100, reward: { diamond: 500 } },
  { id: 'star2_all', category: 'progress', name: '정예 정복자', description: '모든 스테이지 ★2 클리어', target: 3, reward: { diamond: 500 } },
  { id: 'star3_all', category: 'progress', name: '지옥 정복자', description: '모든 스테이지 ★3 클리어', target: 3, reward: { diamond: 2000 } },
];

export const ACHIEVEMENT_MAP = Object.fromEntries(
  ACHIEVEMENTS.map((a) => [a.id, a]),
);
```

- [ ] **Step 2: shared export 추가 + 빌드 + 커밋**

```bash
npm run build
git add packages/shared/src/constants/achievements.ts packages/shared/src/index.ts
git commit -m "feat: define achievement constants (v1 — 41 achievements)"
```

---

## Task 10: 업적 슬라이스 + 추적

**Files:**
- Create: `packages/web-shell/src/stores/meta/achievementSlice.ts`
- Modify: `packages/web-shell/src/stores/meta/profileSlice.ts` (업적 트리거)

- [ ] **Step 1: achievementSlice 작성**

```typescript
// packages/web-shell/src/stores/meta/achievementSlice.ts
import type { SliceCreator } from './types';
import { ACHIEVEMENT_MAP, type AchievementDef } from '@gld/shared';

interface AchievementActions {
  updateAchievementProgress(id: string, value: number): void;
  claimAchievement(id: string): 'success' | 'not_ready' | 'already_claimed';
  checkAchievements(): string[]; // 새로 달성된 업적 ID 리스트 반환
}

export const createAchievementSlice: SliceCreator<AchievementActions> = (set, get) => ({
  updateAchievementProgress(id: string, value: number) {
    set((s) => ({
      progress: {
        ...s.progress,
        achievements: {
          ...s.progress.achievements,
          progress: {
            ...s.progress.achievements.progress,
            [id]: Math.max(s.progress.achievements.progress[id] ?? 0, value),
          },
        },
      },
    }));
    debouncedSave(get());
  },

  claimAchievement(id: string) {
    const state = get();
    if (state.progress.achievements.claimed.includes(id)) return 'already_claimed';
    const def = ACHIEVEMENT_MAP[id];
    if (!def) return 'not_ready';
    const progress = state.progress.achievements.progress[id] ?? 0;
    if (progress < def.target) return 'not_ready';

    set((s) => ({
      profile: { ...s.profile, diamond: s.profile.diamond + def.reward.diamond },
      progress: {
        ...s.progress,
        achievements: {
          ...s.progress.achievements,
          claimed: [...s.progress.achievements.claimed, id],
        },
      },
    }));
    debouncedSave(get());
    return 'success';
  },

  checkAchievements() {
    const state = get();
    const { progress: achProgress, claimed } = state.progress.achievements;
    const newlyAchieved: string[] = [];

    for (const [id, value] of Object.entries(achProgress)) {
      const def = ACHIEVEMENT_MAP[id];
      if (def && value >= def.target && !claimed.includes(id)) {
        newlyAchieved.push(id);
      }
    }
    return newlyAchieved;
  },
});
```

- [ ] **Step 2: profileSlice 트리거 연결**

addXp, enhanceTower, promoteTower, recordStageClear 등에서 관련 업적 progress 업데이트:

```typescript
// addXp 후:
const { level } = get().profile;
get().updateAchievementProgress('lv_5', level);
get().updateAchievementProgress('lv_10', level);
// ... 해당 레벨 업적들

// enhanceTower 후:
get().updateAchievementProgress('tower_lv10', tower.level);
// ...

// promoteTower 성공 후 (등급별):
if (tower.grade === 'rare') get().updateAchievementProgress('tower_rare', 1);
// ...

// recordStageClear 후:
const clearCount = get().progress.stagesCleared.length;
get().updateAchievementProgress('clear_1', clearCount);
// ...
```

- [ ] **Step 3: 전투력 변경 시 업적 업데이트**

```typescript
// collectionSlice에서 전투력 재계산 후:
get().updateAchievementProgress('cp_100', cp);
get().updateAchievementProgress('cp_500', cp);
// ...
```

- [ ] **Step 4: 빌드 + 커밋**

```bash
npm run build
git add packages/web-shell/src/stores/meta/achievementSlice.ts packages/web-shell/src/stores/meta/profileSlice.ts packages/web-shell/src/stores/meta/collectionSlice.ts
git commit -m "feat: achievement slice with progress tracking and claim logic"
```

---

## Task 11: 업적 UI 페이지

**Files:**
- Create: `packages/web-shell/src/pages/AchievementPage.tsx`
- Create: `packages/web-shell/src/components/ui/AchievementToast.tsx`
- Modify: 로비 네비게이션 (업적 탭 추가)

- [ ] **Step 1: AchievementPage.tsx 작성**

디자인 명세 (Plan 파일의 "업적 페이지" UI 명세) 기반으로 구현. 카테고리 탭 + 스크롤 리스트 + 수령 버튼.

- [ ] **Step 2: AchievementToast.tsx 작성**

달성 토스트: 상단 slide-down 0.3s, 3초 후 fade-out.

- [ ] **Step 3: 로비 네비게이션에 업적 탭 추가**

gameStore의 LobbyTab에 'achievements' 추가.

- [ ] **Step 4: 수동 테스트**

Run: `npm run dev`
확인: 업적 페이지 진입, 진행률 바, 수령 버튼, 다이아 지급

- [ ] **Step 5: 커밋**

```bash
git add packages/web-shell/src/pages/AchievementPage.tsx packages/web-shell/src/components/ui/AchievementToast.tsx
git commit -m "feat: achievement page UI with category tabs and claim flow"
```

---

## Task 12: game-spec 문서 업데이트 (DRIFT 11건 해소)

리뷰에서 발견된 DRIFT 11건을 game-spec 문서 업데이트로 해소한다.

**Files:**
- Modify: `docs/game-spec/01-GDD.md`
- Modify: `docs/game-spec/02-balance-sheet.md`
- Modify: `docs/game-spec/04-data-structure.md`
- Modify: `docs/game-spec/08-architecture.md`

### DRIFT 해소 매핑

| # | DRIFT | 대조 문서 | 해소 방법 |
|---|-------|---------|----------|
| 1 | 8 코어 시스템에 기믹 시스템 미포함 | 01-GDD §4 | §4에 "9. GimmickSystem" 추가, 월드별 기믹 처리 역할 명시 |
| 2 | 5적→18적+, 3스테이지→48 미반영 | 01-GDD §5 | §5 콘텐츠 플랜에 "M1: 기존 3스테이지 + ★3 난이도, M2+: 6월드×8스테이지 확장 예정" 추가 |
| 3 | ★3 무피격이 Edge Point과 긴장 | 01-GDD §10 | ★3은 HP 80%로 완화됨. §10에 "★ 시스템은 세션 밀도를 유지하면서 반복 도전 가치를 추가" 주석 |
| 4 | 새 UI의 색상 토큰 미매핑 | 01-GDD §8 | §8 디자인 토큰에 ★ 등급 색상 매핑 추가: ★1=success, ★2=accent, ★3=danger |
| 5 | ★ 배수/전투력 공식 밸런스 시트 미반영 | 02-balance | 신규 섹션 "§9 ★ 별 등급 밸런스" + "§10 전투력 공식" 추가 |
| 6 | GDD 콘텐츠 플랜 미갱신 (중복 #2) | 01-GDD §5 | #2와 동일 해소 |
| 7 | ★ 선택 버튼 44px 미명시 | 01-GDD §8 | UI 명세에 이미 48px 명시됨. §8에 "★ 선택 버튼: 최소 48×48px" 추가 |
| 8 | 기믹 시스템 init 위치 미명시 | 08-arch §2 | §2 초기화 순서에 "GimmickSystem (Energy 뒤, Tutorial 앞)" 추가 |
| 9 | 기믹 update 위치 미명시 | 08-arch §2 | §2 update 순서에 "3. GimmickSystem.update() — Energy 후, Combat 전" 추가 |
| 10 | 새 EventBus 이벤트 미정의 | 08-arch §3 | §3 이벤트 테이블에 gimmick-state-changed, star-selected 추가 |
| 11 | 기믹 VFX depth 미지정 | 08-arch §5 | §5 depth 테이블에 "2-4 | Gimmick VFX | 용암 glow, 역병 안개" 추가 |

- [ ] **Step 1: 01-GDD.md 업데이트**

**§4 Core Systems** 끝에 추가:
```markdown
| GimmickSystem | 월드별 고유 기믹 처리 (용광로 폭발, 마력 폭주, 묘지 부활, 역병 확산, 마왕의 시련). 타일 상태 변경 → 타워 비활성화/버프. ★ 등급에 따라 기믹 강도 차등 | gimmick_id, active_tiles, intensity_by_star |
```

**§5 Content Plan** 에 추가:
```markdown
### ★ 별 등급 시스템 (M1)
- 각 스테이지에 ★1(정복)/★2(정예)/★3(지옥) 3단계 난이도
- ★1: 기본 1.0×, 생존 조건
- ★2: HP 2.5×, 방어 1.5×, 속도 1.2×, CC 저항 20%, HP 50%+ 유지
- ★3: HP 5.0×, 방어 2.5×, 속도 1.4×, CC 저항 40%, HP 80%+ 유지

### 콘텐츠 확장 로드맵
- M1: 기존 3스테이지 × ★3 = 9 클리어 목표 (현재)
- M2+: 6월드 × 8스테이지 = 48스테이지 × ★3 = 144 클리어 목표 (향후)
- 적 타입: 기존 5종 + 월드별 신규 (M2+에서 순차 추가)
```

**§8 UI/UX** 에 추가:
```markdown
### ★ 등급 UI 색상 매핑
| 별 등급 | 배경색 | 테두리색 | 토큰 |
|---------|--------|---------|------|
| ★1 | success/10% | success #7ab648 | success |
| ★2 | accent/10% | accent #c8a04a | accent |
| ★3 | danger/10% | danger #c03020 | danger |

★ 선택 버튼: 최소 48×48px 터치 영역
```

**§10 Edge Point** 에 추가:
```markdown
※ ★ 시스템은 5-7분 세션 밀도를 유지하면서 같은 스테이지의 반복 도전 가치를 추가한다. ★3 조건은 HP 80%로, 무피격이 아닌 "거의 완벽한 플레이"를 요구한다.
```

- [ ] **Step 2: 02-balance-sheet.md 업데이트**

기존 §8 뒤에 신규 섹션 추가:

```markdown
## 9. ★ 별 등급 밸런스

| 항목 | ★1 정복 | ★2 정예 | ★3 지옥 |
|------|---------|---------|---------|
| HP 배수 | 1.0× | 2.5× | 5.0× |
| 방어 배수 | 1.0× | 1.5× | 2.5× |
| 속도 배수 | 1.0× | 1.2× | 1.4× |
| CC 저항 | 0% | 20% | 40% |
| 클리어 조건 | 생존 | HP 50%+ | HP 80%+ |
| 골드 보상 | 1× | 2.5× | 5× |
| XP 보상 | 1× | 2× | 3× |
| 각성석 드롭 | 0 | 1 | 3 |
| 퍼펙트(HP 100%) 보너스 | — | — | 각성석 +2 |

### ★ 해금 조건
- ★1: 월드 진입 시 자동
- ★2: 해당 맵 ★1 클리어
- ★3: 해당 맵 ★2 클리어

## 10. 전투력 공식

> 코드 위치: `packages/shared/src/utils/combatPower.ts`

```
전투력 = Σ (보유 타워별: 기본ATK × 등급배수 × 레벨배수 × 각성배수)

등급배수: normal 1.0 / rare 1.1 / unique 1.25 / epic 1.45
레벨배수: 1 + (level - 1) × 0.03
각성배수: 0각성 1.0 / 1각성 1.2 / 2각성 1.5 / 3각성 2.0
```

### 전투력 마일스톤
| 전투력 | 프로필 프레임 색상 |
|--------|-----------------|
| 0-499 | border #4a3a20 |
| 500-999 | success #7ab648 |
| 1K-4,999 | accent #c8a04a |
| 5K-9,999 | gold #f0d060 + glow |
| 10K-49,999 | gradeUnique #9060e0 + glow |
| 50K+ | tierBright #ffe870 + pulse |

## 11. 승급 레벨 리셋

승급 성공 시 타워 레벨이 1로 리셋된다.

| 현재 → 목표 | 확률 | 필요 레벨 | 골드 비용 | 성공 시 | 실패 시 |
|----------|------|---------|--------|--------|-------|
| 일반 → 레어 | 20% | LV.20 | 500G | Lv.1 리셋 | 골드 소실, 레벨 유지 |
| 레어 → 유니크 | 10% | LV.30 | 2000G | Lv.1 리셋 | 골드 소실, 레벨 유지 |
| 유니크 → 에픽 | 5% | LV.50 | 8000G | Lv.1 리셋 | 골드 소실, 레벨 유지 |
```

- [ ] **Step 3: 04-data-structure.md 업데이트**

§1 SaveData에 v4 필드 추가:
```markdown
### SaveData v4 추가 필드

**OwnedTower 확장:**
- `awakening: 0|1|2|3` — 각성 단계 (기본 0)
- `duplicateCount: number` — 중복 조각 수

**ProgressData 확장:**
- `stageStars: Record<string, 1|2|3>` — 맵별 최고 클리어 별
- `achievements: { claimed: string[], progress: Record<string, number> }` — 업적 진행
- `awakeningStones: number` — 각성석 보유량

**ProfileData 확장:**
- `combatPower: number` — 전투력 (계산 캐시)

**마이그레이션:** v3→v4, 새 필드는 기본값(0, {}, [])으로 초기화
```

§5 Enum에 추가:
```markdown
**StarRating:** `1 | 2 | 3`
**AchievementCategory:** `'combat_power' | 'level' | 'tower' | 'progress'`
```

- [ ] **Step 4: 08-architecture.md 업데이트**

§2 초기화 순서에 추가:
```markdown
EnergySystem  (standalone)
GimmickSystem (scene, gridManager, starRating) — 월드별 기믹 처리 [M2+]
TutorialSystem  (scene) — only if tutorialCompleted is false
```

§2 update() 순서에 추가:
```markdown
1. WaveSystem.update(scaledDelta, activeUnitCount)
2. EnergySystem.update(scaledDelta / 1000)
3. GimmickSystem.update(scaledDelta)  ← [M2+ 추가]
4. processCombatField()
5. DamageNumberSystem.update(_time, delta)
6. Exit processing → defeat check
7. Victory check
```

§3 EventBus에 추가:
```markdown
| `gimmick-state-changed` | GimmickSystem 상태 변경 | useGameEvents → HUD 표시 |
| `request-gimmick-info` | UI에서 기믹 상태 요청 | GimmickSystem |
| `star-selected` | StageDetail에서 별 선택 | game.registry sync |
```

§5 Depth 테이블에 추가:
```markdown
| 2-4 | Gimmick VFX | 용암 glow(2), 역병 안개(3), 마력 폭발(4) |
```

- [ ] **Step 5: doc-validate 실행**

Run: doc-validate 스킬 또는 수동으로 교차참조 확인

- [ ] **Step 6: 커밋**

```bash
git add docs/game-spec/
git commit -m "docs: resolve 11 DRIFT items — star system, combat power, gimmick arch in game-spec"
```

---

## 검증 체크리스트

- [ ] `npm run build` 전체 성공
- [ ] `npm run lint` 전체 통과
- [ ] 수동 플레이: forest_gate ★1 클리어 → ★2 해금 → ★2 클리어 (HP 50%+)
- [ ] 수동 플레이: 타워 레벨 20 → 승급 시도 → 성공 시 Lv.1 리셋 확인
- [ ] 수동 플레이: ProfileBar에 전투력 표시 확인
- [ ] 수동 플레이: 업적 달성 토스트 + 다이아 수령 확인
- [ ] 기존 세이브 데이터 마이그레이션 (v3→v4) 정상 작동