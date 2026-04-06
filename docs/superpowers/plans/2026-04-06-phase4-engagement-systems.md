<!-- /autoplan restore point: /Users/lio/.gstack/projects/Gyejoon-grid-line-defense-pvp/feature-bow-kilogram-autoplan-restore-20260406-025702.md -->
# Phase 4: 참여 시스템 (온보딩 + 수집) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 튜토리얼, 가챠/상자, 일일/주간 미션, 설정 확장(색각이상+볼륨)을 구현하여 온보딩과 수집 루프를 완성한다.

**Architecture:** Save schema v1→v2 마이그레이션을 기반으로, shared 패키지에 순수 함수(가챠 롤, 미션 정의)를 두고, metaStore가 영속화, React UI가 표현, EventBus가 Phaser↔React 통신을 담당한다. 튜토리얼만 Phaser+React 하이브리드(Phaser가 타일 펄스, React가 오버레이/텍스트).

**Tech Stack:** TypeScript, Zustand, Phaser 3, React, localStorage, TailwindCSS

---

## 구현 순서 및 근거

**F1 (Save Migration) → F2 (Settings) → F3 (Missions) → F4 (Gacha) → F5 (Tutorial)**

- F1: 모든 기능이 새 SaveData 필드에 의존
- F2: 마이그레이션 검증 + 자체 완결 (가장 작은 범위)
- F3: 미션이 다이아몬드 수입원 → 가챠의 화폐 공급
- F4: 다이아몬드 소비 + 컬렉션 확장
- F5: 가장 크로스커팅 (EventBus + gameStore + Phaser + React 오버레이), 나머지 안정 후 작업

---

## File Structure

### 새로 생성

| 파일 | 책임 |
|------|------|
| `packages/shared/src/constants/gacha.ts` | 가챠 확률 테이블, rollGacha(), pity 계산 (순수 함수) |
| `packages/shared/src/constants/missions.ts` | 미션 정의, 타입, 리셋 로직 (순수 함수) |
| `packages/web-shell/src/hooks/useMissionTracker.ts` | EventBus 구독 → 미션 진행도 업데이트 |
| `packages/web-shell/src/components/lobby/tabs/MissionsTab.tsx` | 미션 목록 + 보상 수령 UI |
| `packages/web-shell/src/components/game/TutorialOverlay.tsx` | 튜토리얼 React 오버레이 (스포트라이트, 텍스트, 포인터 블록) |

### 수정

| 파일 | 변경 내용 |
|------|----------|
| `packages/shared/src/types/save.ts` | v2 스키마: diamond, 미션, 가챠 pity, 튜토리얼, 색각이상, 볼륨 필드 |
| `packages/shared/src/constants/meta.ts` | createDefaultSave() v2 기본값 |
| `packages/shared/src/index.ts` | 새 export 추가 |
| `packages/web-shell/src/stores/metaStore.ts` | v1→v2 마이그레이션, 미션/가챠/다이아몬드 액션 |
| `packages/web-shell/src/stores/gameStore.ts` | soundEnabled→볼륨, 색각이상, 튜토리얼 상태 |
| `packages/web-shell/src/components/lobby/tabs/SettingsTab.tsx` | SliderRow, SelectRow 추가 |
| `packages/web-shell/src/components/GachaScreen.tsx` | 확률 수정, pity, 비용 검증, 컬렉션 연동 |
| `packages/phaser-game/src/EventBus.ts` | 튜토리얼 이벤트 추가 |
| `packages/phaser-game/src/systems/TutorialSystem.ts` | 액션 기반 진행, EventBus 연동 |

---

## Task 1: Save Schema v2 타입 정의

**Files:**
- Modify: `packages/shared/src/types/save.ts`

- [ ] **Step 1: SettingsData 확장**

```typescript
export interface SettingsData {
  bgmVolume: number;       // 0~1, default 0.7
  sfxVolume: number;       // 0~1, default 0.8
  screenShake: boolean;
  showDamageNumbers: boolean;
  colorblindMode: 'off' | 'protan' | 'deutan' | 'tritan';
}
```

`soundEnabled` 제거 → `bgmVolume`/`sfxVolume`로 대체.

- [ ] **Step 2: ProfileData에 diamond 추가**

```typescript
export interface ProfileData {
  nickname: string;
  level: number;
  xp: number;
  gold: number;
  diamond: number;          // 추가
  totalGoldEarned: number;
  wins: number;
  losses: number;
  winStreak: number;
  bestWinStreak: number;
}
```

- [ ] **Step 3: MissionProgress 타입 + ProgressData 확장**

```typescript
export type MissionType =
  | 'reach_wave'
  | 'place_towers'
  | 'defeat_boss'
  | 'clear_stage'
  | 'use_element';

export interface MissionProgress {
  id: string;
  type: MissionType;
  target: number;
  current: number;
  reward: { type: 'diamond' | 'gold'; amount: number };
  claimed: boolean;
}

export interface ProgressData {
  highestWave: Record<string, number>;
  stagesCleared: string[];
  totalBattles: number;
  tutorialCompleted: boolean;                // 추가
  gachaPityCount: number;                    // 추가: 연속 tier4 이하 카운트
  dailyFreeBoxClaimedAt: string | null;      // 추가: ISO8601
  dailyAdBoxCount: number;                   // 추가: 오늘 광고 상자 오픈 수
  dailyResetAt: string | null;               // 추가
  dailyMissions: MissionProgress[];          // 추가
  weeklyMissions: MissionProgress[];         // 추가
  lastDailyMissionResetAt: string | null;    // 추가
  lastWeeklyMissionResetAt: string | null;   // 추가
}
```

- [ ] **Step 4: SAVE_VERSION 2로 변경 + 새 타입 export**

```typescript
export const SAVE_VERSION = 2;
```

`packages/shared/src/index.ts`에 `MissionType`, `MissionProgress` export 추가.

- [ ] **Step 5: 빌드 확인**

Run: `cd packages/shared && npx tsc --noEmit`
Expected: 타입 에러 발생 (meta.ts의 createDefaultSave가 v2 스키마 미충족). 이 에러는 Task 2에서 해결.

---

## Task 2: createDefaultSave() v2 + 마이그레이션 함수

**Files:**
- Modify: `packages/shared/src/constants/meta.ts`
- Modify: `packages/web-shell/src/stores/metaStore.ts`

- [ ] **Step 1: createDefaultSave() v2 기본값 반영**

`packages/shared/src/constants/meta.ts`의 `createDefaultSave()`:

```typescript
export function createDefaultSave(): SaveData {
  const now = Date.now();
  return {
    version: SAVE_VERSION,
    profile: {
      nickname: 'Commander',
      level: 1,
      xp: 0,
      gold: 500,
      diamond: 0,
      totalGoldEarned: 0,
      wins: 0,
      losses: 0,
      winStreak: 0,
      bestWinStreak: 0,
    },
    collection: DEFAULT_STARTER_IDS.map<OwnedTower>((defId) => ({
      defId,
      level: 1,
      grade: 'normal',
      acquiredAt: now,
    })),
    progress: {
      highestWave: {},
      stagesCleared: [],
      totalBattles: 0,
      tutorialCompleted: false,
      gachaPityCount: 0,
      dailyFreeBoxClaimedAt: null,
      dailyAdBoxCount: 0,
      dailyResetAt: null,
      dailyMissions: [],
      weeklyMissions: [],
      lastDailyMissionResetAt: null,
      lastWeeklyMissionResetAt: null,
    },
    settings: {
      bgmVolume: 0.7,
      sfxVolume: 0.8,
      screenShake: true,
      showDamageNumbers: true,
      colorblindMode: 'off',
    },
    selectedDeck: [...DEFAULT_STARTER_IDS],
  };
}
```

- [ ] **Step 2: SAVE_MIGRATIONS[1] 작성 (v1→v2)**

`packages/web-shell/src/stores/metaStore.ts`의 `SAVE_MIGRATIONS`:

```typescript
const SAVE_MIGRATIONS: Record<number, SaveMigration> = {
  1: (data) => {
    const settings = (data.settings ?? {}) as Record<string, unknown>;
    const soundWasEnabled = settings.soundEnabled !== false;
    const progress = (data.progress ?? {}) as Record<string, unknown>;

    return {
      ...data,
      version: 2,
      profile: {
        ...(data.profile as Record<string, unknown>),
        diamond: 0,
      },
      progress: {
        ...progress,
        tutorialCompleted: localStorage.getItem('tutorial_completed') === 'true',
        gachaPityCount: 0,
        dailyFreeBoxClaimedAt: null,
        dailyAdBoxCount: 0,
        dailyResetAt: null,
        dailyMissions: [],
        weeklyMissions: [],
        lastDailyMissionResetAt: null,
        lastWeeklyMissionResetAt: null,
      },
      settings: {
        bgmVolume: soundWasEnabled ? 0.7 : 0,
        sfxVolume: soundWasEnabled ? 0.8 : 0,
        screenShake: settings.screenShake ?? true,
        showDamageNumbers: settings.showDamageNumbers ?? true,
        colorblindMode: 'off',
      },
    };
  },
};
```

핵심: `soundEnabled: true` → `bgmVolume: 0.7, sfxVolume: 0.8` / `false` → 둘 다 `0`. 튜토리얼 별도 localStorage 키 흡수.

- [ ] **Step 3: metaStore writeSave에 새 필드 직렬화 확인**

`writeSave()` 함수는 이미 전체 SaveData를 직렬화하므로 변경 불필요. 다만 `loadSave()` 후 레거시 `tutorial_completed` localStorage 키 정리 추가:

```typescript
loadSave: () => {
  let save = parseSave();
  if (!save) {
    save = createDefaultSave();
    save = migrateLegacyDeck(save);
  }
  // 레거시 튜토리얼 키 정리
  try { localStorage.removeItem('tutorial_completed'); } catch {}
  set({ ...save 필드들 });
  writeSave(save);
},
```

기존 `set()` 호출에 새 필드들이 자동 포함되도록 spread 패턴 사용.

- [ ] **Step 4: 빌드 확인**

Run: `cd packages/shared && npx tsc --noEmit && cd ../web-shell && npx tsc --noEmit`
Expected: PASS (gameStore.ts에서 soundEnabled 관련 에러 가능 → Task 3에서 해결)

- [ ] **Step 5: 커밋**

```bash
git add packages/shared/src/types/save.ts packages/shared/src/constants/meta.ts packages/shared/src/index.ts packages/web-shell/src/stores/metaStore.ts
git commit -m "feat: SaveData v2 schema + v1→v2 migration (diamond, missions, gacha pity, volume, colorblind)"
```

---

## Task 3: Settings 확장 — gameStore 리팩토링

**Files:**
- Modify: `packages/web-shell/src/stores/gameStore.ts`

- [ ] **Step 1: soundEnabled → bgmVolume/sfxVolume 전환**

gameStore에서 `soundEnabled: boolean` 제거, `bgmVolume: number`, `sfxVolume: number`, `colorblindMode` 추가:

```typescript
// 상태 필드 변경
bgmVolume: number;       // soundEnabled 대체
sfxVolume: number;
colorblindMode: 'off' | 'protan' | 'deutan' | 'tritan';

// 액션 변경
setBgmVolume: (v: number) => void;    // toggleSound 대체
setSfxVolume: (v: number) => void;
setColorblindMode: (mode: 'off' | 'protan' | 'deutan' | 'tritan') => void;
```

초기값은 `useMetaStore.getState().settings`에서 읽기:

```typescript
bgmVolume: useMetaStore.getState().settings?.bgmVolume ?? 0.7,
sfxVolume: useMetaStore.getState().settings?.sfxVolume ?? 0.8,
colorblindMode: useMetaStore.getState().settings?.colorblindMode ?? 'off',
```

각 setter에서 `useMetaStore.getState().updateSettings(...)` 호출하여 영속화.

- [ ] **Step 2: toggleSound 참조 제거**

`toggleSound` 참조하는 모든 컴포넌트 찾아서 업데이트. 주요 대상: `SettingsTab.tsx` (Task 4에서 처리).

- [ ] **Step 3: 빌드 확인**

Run: `npx tsc --noEmit` (web-shell)
Expected: SettingsTab에서 soundEnabled/toggleSound 참조 에러 → Task 4에서 해결.

- [ ] **Step 4: 커밋**

```bash
git add packages/web-shell/src/stores/gameStore.ts
git commit -m "refactor: gameStore soundEnabled→volume sliders + colorblindMode"
```

---

## Task 4: Settings UI — SliderRow + SelectRow + SettingsTab 재작성

**Files:**
- Modify: `packages/web-shell/src/components/lobby/tabs/SettingsTab.tsx`

- [ ] **Step 1: SliderRow 컴포넌트 추가 (SettingsTab 파일 내부)**

```typescript
function SliderRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div
      className="flex justify-between items-center px-3 py-2.5 gap-3"
      style={{ background: 'rgba(26, 18, 8, 0.8)' }}
    >
      <span className="font-pixel text-xs text-text shrink-0">{label}</span>
      <input
        type="range"
        min={0}
        max={100}
        value={Math.round(value * 100)}
        onChange={(e) => onChange(Number(e.target.value) / 100)}
        className="flex-1 h-2 appearance-none bg-border accent-gold cursor-pointer"
        aria-label={label}
      />
      <span className="font-pixel text-[11px] text-text-secondary w-8 text-right">
        {Math.round(value * 100)}
      </span>
    </div>
  );
}
```

- [ ] **Step 2: SelectRow 컴포넌트 추가 (SettingsTab 파일 내부)**

```typescript
function SelectRow<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div
      className="flex justify-between items-center px-3 py-2.5"
      style={{ background: 'rgba(26, 18, 8, 0.8)' }}
    >
      <span className="font-pixel text-xs text-text">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="font-pixel text-[11px] text-text bg-panel border border-border px-2 py-1 cursor-pointer"
        aria-label={label}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}
```

- [ ] **Step 3: SettingsTab 본체 재작성**

사운드 섹션: SliderRow(BGM) + SliderRow(SFX)
화면 섹션: ToggleRow(화면 흔들림) + ToggleRow(데미지 숫자)
접근성 섹션: SelectRow(색각이상 모드 — off/protan/deutan/tritan)
정보 섹션: 기존 유지

gameStore에서 `bgmVolume`, `sfxVolume`, `colorblindMode`, `setBgmVolume`, `setSfxVolume`, `setColorblindMode` 사용.

- [ ] **Step 4: 색각이상 CSS 필터 적용**

`packages/web-shell/src/App.tsx` (또는 루트 컴포넌트)에서 colorblindMode에 따라 root div에 CSS filter 적용:

```typescript
const COLORBLIND_FILTERS: Record<string, string> = {
  off: 'none',
  protan: 'url(#protan-filter)',   // SVG filter
  deutan: 'url(#deutan-filter)',
  tritan: 'url(#tritan-filter)',
};
```

SVG 색각 보정 필터를 `index.html` 또는 App.tsx의 hidden SVG로 추가. 정확한 색각이상 행렬은 구현 시 참조.

- [ ] **Step 5: 빌드 + 수동 확인**

Run: `npx tsc --noEmit` (web-shell)
Expected: PASS. 로비 > 설정 탭에서 볼륨 슬라이더, 색각이상 드롭다운 확인.

- [ ] **Step 6: 커밋**

```bash
git add packages/web-shell/src/components/lobby/tabs/SettingsTab.tsx packages/web-shell/src/App.tsx
git commit -m "feat: Settings UI — volume sliders + colorblind mode selector"
```

---

## Task 5: 미션 정의 (shared 순��� 함수)

**Files:**
- Create: `packages/shared/src/constants/missions.ts`
- Modify: `packages/shared/src/index.ts`

- [ ] **Step 1: 미션 템플릿 + 일일/주간 생성 함수**

```typescript
import type { MissionProgress, MissionType } from '../types/save';

interface MissionTemplate {
  type: MissionType;
  targetRange: [number, number]; // min~max에서 랜덤 선택
  reward: { type: 'diamond' | 'gold'; amount: number };
}

const DAILY_TEMPLATES: MissionTemplate[] = [
  { type: 'reach_wave', targetRange: [5, 8], reward: { type: 'diamond', amount: 15 } },
  { type: 'place_towers', targetRange: [10, 20], reward: { type: 'diamond', amount: 10 } },
  { type: 'defeat_boss', targetRange: [1, 1], reward: { type: 'diamond', amount: 30 } },
];

const WEEKLY_TEMPLATES: MissionTemplate[] = [
  { type: 'clear_stage', targetRange: [3, 5], reward: { type: 'diamond', amount: 80 } },
  { type: 'place_towers', targetRange: [50, 100], reward: { type: 'diamond', amount: 50 } },
  { type: 'defeat_boss', targetRange: [3, 5], reward: { type: 'diamond', amount: 100 } },
];

export function generateDailyMissions(rng = Math.random): MissionProgress[] {
  return DAILY_TEMPLATES.map((t, i) => ({
    id: `daily-${i}`,
    type: t.type,
    target: t.targetRange[0] + Math.floor(rng() * (t.targetRange[1] - t.targetRange[0] + 1)),
    current: 0,
    reward: t.reward,
    claimed: false,
  }));
}

export function generateWeeklyMissions(rng = Math.random): MissionProgress[] {
  return WEEKLY_TEMPLATES.map((t, i) => ({
    id: `weekly-${i}`,
    type: t.type,
    target: t.targetRange[0] + Math.floor(rng() * (t.targetRange[1] - t.targetRange[0] + 1)),
    current: 0,
    reward: t.reward,
    claimed: false,
  }));
}

export function shouldResetDaily(lastResetAt: string | null, now: Date): boolean {
  if (!lastResetAt) return true;
  const last = new Date(lastResetAt);
  const lastUTCDay = Date.UTC(last.getUTCFullYear(), last.getUTCMonth(), last.getUTCDate());
  const nowUTCDay = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return nowUTCDay > lastUTCDay;
}

export function shouldResetWeekly(lastResetAt: string | null, now: Date): boolean {
  if (!lastResetAt) return true;
  const last = new Date(lastResetAt);
  // 월요일 0시 UTC 기준
  const getMonday = (d: Date) => {
    const day = d.getUTCDay();
    const diff = day === 0 ? 6 : day - 1;
    return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - diff);
  };
  return getMonday(now) > getMonday(last);
}

export const MISSION_LABELS: Record<MissionType, string> = {
  reach_wave: '웨이브 도달',
  place_towers: '타워 배치',
  defeat_boss: '보스 처치',
  clear_stage: '스테이지 클리어',
  use_element: '속성 타워 사용',
};
```

- [ ] **Step 2: shared/src/index.ts에 export 추가**

```typescript
export {
  generateDailyMissions,
  generateWeeklyMissions,
  shouldResetDaily,
  shouldResetWeekly,
  MISSION_LABELS,
} from './constants/missions';
```

- [ ] **Step 3: 빌드 확인**

Run: `cd packages/shared && npx tsc --noEmit`
Expected: PASS

- [ ] **Step 4: 커밋**

```bash
git add packages/shared/src/constants/missions.ts packages/shared/src/index.ts
git commit -m "feat: mission definitions — daily/weekly templates + reset logic"
```

---

## Task 6: 미션 — metaStore 액션 + useMissionTracker ��

**Files:**
- Modify: `packages/web-shell/src/stores/metaStore.ts`
- Create: `packages/web-shell/src/hooks/useMissionTracker.ts`

- [ ] **Step 1: metaStore에 미션/다이아몬드 액션 추가**

MetaActions 인터페이스에 추가:

```typescript
addDiamond: (amount: number) => void;
refreshMissions: () => void;    // 리셋 체크 + 재생성
progressMission: (type: MissionType, amount: number) => void;
claimMission: (missionId: string, period: 'daily' | 'weekly') => 'success' | 'not_ready' | 'not_found';
```

`refreshMissions`: `shouldResetDaily()`/`shouldResetWeekly()` 호출 → 필요 시 `generateDailyMissions()`/`generateWeeklyMissions()` 호출 + timestamp 갱신.

`progressMission`: `dailyMissions` + `weeklyMissions` 중 일치 type 찾아서 `current = min(current + amount, target)`.

`claimMission`: `claimed: false && current >= target` 검증 → `addDiamond(reward.amount)` → `claimed: true`.

- [ ] **Step 2: useMissionTracker 훅 — EventBus 구독**

```typescript
import { useEffect } from 'react';
import { EventBus } from '@gld/phaser-game';
import { useMetaStore } from '../stores/metaStore';

export function useMissionTracker() {
  const progressMission = useMetaStore((s) => s.progressMission);

  useEffect(() => {
    const onTowerPlaced = () => progressMission('place_towers', 1);
    const onWaveCompleted = (d: { wave: number }) => progressMission('reach_wave', 1);
    const onBossDefeated = () => progressMission('defeat_boss', 1);
    const onGameOver = (d: { result: string }) => {
      if (d.result === 'victory') progressMission('clear_stage', 1);
    };

    EventBus.on('tower-placed', onTowerPlaced);
    EventBus.on('wave-completed', onWaveCompleted);
    EventBus.on('boss-defeated', onBossDefeated);
    EventBus.on('game-over', onGameOver);

    return () => {
      EventBus.off('tower-placed', onTowerPlaced);
      EventBus.off('wave-completed', onWaveCompleted);
      EventBus.off('boss-defeated', onBossDefeated);
      EventBus.off('game-over', onGameOver);
    };
  }, [progressMission]);
}
```

App.tsx 또는 게임 진행 중 컴포넌트에서 `useMissionTracker()` 호출.

- [ ] **Step 3: App 초기화 시 refreshMissions 호출**

App.tsx의 `useEffect` (loadSave 직후)에서 `useMetaStore.getState().refreshMissions()` 호출.

- [ ] **Step 4: 빌드 확인**

Run: `npx tsc --noEmit` (web-shell)
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add packages/web-shell/src/stores/metaStore.ts packages/web-shell/src/hooks/useMissionTracker.ts
git commit -m "feat: mission tracking — metaStore actions + EventBus-based progress hook"
```

---

## Task 7: 미션 UI — MissionsTab (로비 탭 추가)

**Files:**
- Create: `packages/web-shell/src/components/lobby/tabs/MissionsTab.tsx`
- Modify: `packages/web-shell/src/stores/gameStore.ts` (LobbyTab에 'missions' 추가)
- Modify: 로비 탭 네비게이션 컴포넌트 (탭 바에 미션 탭 추가)

- [ ] **Step 1: LobbyTab 타입에 'missions' 추가**

`gameStore.ts`:
```typescript
export type LobbyTab = 'home' | 'collection' | 'missions' | 'settings';
```

- [ ] **Step 2: MissionsTab 구현**

일일/주간 미션 목록, 각 미션의 진행 바, 보상 아이콘, 수령 버튼. 기존 PixelPanel/PixelButton/TabBackground 재사용.

```typescript
export function MissionsTab() {
  const dailyMissions = useMetaStore((s) => s.progress.dailyMissions);
  const weeklyMissions = useMetaStore((s) => s.progress.weeklyMissions);
  const claimMission = useMetaStore((s) => s.claimMission);

  return (
    <div id="tabpanel-missions" role="tabpanel" aria-label="임무" className="relative flex-1 overflow-hidden flex flex-col">
      <TabBackground ... />
      <div className="relative z-[1] flex-1 overflow-auto p-4 flex flex-col gap-4">
        <span className="font-pixel text-sm text-text">임���</span>
        <MissionSection title="일일 임무" missions={dailyMissions} period="daily" onClaim={claimMission} />
        <MissionSection title="주간 임무" missions={weeklyMissions} period="weekly" onClaim={claimMission} />
      </div>
    </div>
  );
}
```

MissionSection: 미션 카드 리스트. 각 카드에 MISSION_LABELS[type], 프로그레스바 (current/target), 보상 (다이아 아이콘 + amount), 수령 버튼 (claimed면 비활성).

- [ ] **Step 3: 로비 탭 바에 미션 탭 추가**

기존 탭 네비게이션에 '임무' 탭 버튼 추가. 탭 렌더링 분기에 `case 'missions': return <MissionsTab />` 추가.

- [ ] **Step 4: 빌드 + 수동 확인**

Run: `npx tsc --noEmit`
Expected: PASS. 로비에서 임무 탭 진입, 미션 목록 표시 확��.

- [ ] **Step 5: 커밋**

```bash
git add packages/web-shell/src/components/lobby/tabs/MissionsTab.tsx packages/web-shell/src/stores/gameStore.ts [탭 네비게이션 파일]
git commit -m "feat: Missions tab — daily/weekly mission list with claim UI"
```

---

## Task 8: 가챠 로직 (shared 순수 ��수)

**Files:**
- Create: `packages/shared/src/constants/gacha.ts`
- Modify: `packages/shared/src/index.ts`

- [ ] **Step 1: 가챠 확률 + rollGacha 함수**

```typescript
import { ALL_TOWERS } from './towers';

/** GDD 11-3 확률 테이블 */
const TIER_WEIGHTS = [
  { tier: 1, weight: 40, name: '일반' },
  { tier: 2, weight: 35, name: '레어' },
  { tier: 3, weight: 18, name: '유니크' },
  { tier: 4, weight: 6, name: '에픽' },
  { tier: 5, weight: 1, name: '전설' },
];

const TOTAL_WEIGHT = TIER_WEIGHTS.reduce((s, w) => s + w.weight, 0);

export const PITY_THRESHOLD = 50;

export interface GachaResult {
  towerId: string;
  towerName: string;
  tier: number;
  isPityReward: boolean;
}

export function rollGacha(
  pityCount: number,
  ownedTowerIds: string[],
  rng = Math.random,
): { result: GachaResult; newPityCount: number } {
  // 천장: 50연속 tier4 이하 → tier5 확정
  const forceTier5 = pityCount >= PITY_THRESHOLD;

  let targetTier: number;
  if (forceTier5) {
    targetTier = 5;
  } else {
    const roll = rng() * TOTAL_WEIGHT;
    let cumulative = 0;
    targetTier = 1;
    for (const w of TIER_WEIGHTS) {
      cumulative += w.weight;
      if (roll < cumulative) {
        targetTier = w.tier;
        break;
      }
    }
  }

  const candidates = ALL_TOWERS.filter((t) => t.tier === targetTier);
  const tower = candidates[Math.floor(rng() * candidates.length)];

  const newPityCount = targetTier >= 5 ? 0 : pityCount + 1;

  return {
    result: {
      towerId: tower.id,
      towerName: tower.name,
      tier: tower.tier,
      isPityReward: forceTier5,
    },
    newPityCount,
  };
}

/** 10연차: tier3+ 1개 보장 */
export function rollGacha10(
  pityCount: number,
  ownedTowerIds: string[],
  rng = Math.random,
): { results: GachaResult[]; newPityCount: number } {
  const results: GachaResult[] = [];
  let currentPity = pityCount;

  for (let i = 0; i < 10; i++) {
    const { result, newPityCount } = rollGacha(currentPity, ownedTowerIds, rng);
    results.push(result);
    currentPity = newPityCount;
  }

  // 10연차 보장: tier3+ 없으면 마지막을 tier3로 재롤
  const hasTier3Plus = results.some((r) => r.tier >= 3);
  if (!hasTier3Plus) {
    const tier3Candidates = ALL_TOWERS.filter((t) => t.tier === 3);
    const replacement = tier3Candidates[Math.floor(rng() * tier3Candidates.length)];
    results[9] = {
      towerId: replacement.id,
      towerName: replacement.name,
      tier: replacement.tier,
      isPityReward: false,
    };
  }

  return { results, newPityCount: currentPity };
}

export const GACHA_COSTS = {
  free: { diamond: 0, cooldownMs: 24 * 60 * 60 * 1000 },
  ad: { diamond: 0, cooldownMs: 8 * 60 * 60 * 1000, dailyLimit: 3 },
  diamond_single: { diamond: 100 },
  diamond_ten: { diamond: 900 },
} as const;
```

- [ ] **Step 2: shared/src/index.ts에 export 추가**

```typescript
export {
  rollGacha,
  rollGacha10,
  GACHA_COSTS,
  PITY_THRESHOLD,
  type GachaResult,
} from './constants/gacha';
```

- [ ] **Step 3: 빌드 확인**

Run: `cd packages/shared && npx tsc --noEmit`
Expected: PASS

- [ ] **Step 4: 커��**

```bash
git add packages/shared/src/constants/gacha.ts packages/shared/src/index.ts
git commit -m "feat: gacha roll logic — tier probabilities, pity, 10-pull guarantee"
```

---

## Task 9: 가챠 — metaStore 액션 + GachaScreen 재작성

**Files:**
- Modify: `packages/web-shell/src/stores/metaStore.ts`
- Modify: `packages/web-shell/src/components/GachaScreen.tsx`

- [ ] **Step 1: metaStore에 가챠 액션 추가**

```typescript
openGacha: (boxType: 'free' | 'ad' | 'diamond_single' | 'diamond_ten', rng?: () => number) =>
  GachaResult[] | 'no_diamond' | 'cooldown' | 'daily_limit';
```

로직:
1. 비용 검증 (diamond_single: 100, diamond_ten: 900)
2. 쿨다운 검증 (free: dailyFreeBoxClaimedAt, ad: dailyAdBoxCount)
3. `rollGacha()` 또는 `rollGacha10()` 호출
4. 결과 타워를 `collection`에 추가 (이미 보유 시 스킵 — 중복 타워는 경험치/재화로 전환 가능하나 MVP에서는 무시)
5. `gachaPityCount` 업데이트
6. 다이아몬드 차감
7. `debouncedSave()`

- [ ] **Step 2: GachaScreen 재작성**

기존 `rollRandomTower()` 제거, metaStore의 `openGacha` 사용. 확률 테이블 GDD 기준 (40/35/18/6/1). 10연차 버튼 추가. pity 카운터 표시 (50까지 진행도). 비용 부족 시 비활성 + 안내. 쿨다운 타이머 표시.

3단계 연출 유지 (select → opening → reveal), 10연차 시 순차 공개 또는 일괄 공개.

컬렉션 등록: `handleCollect` 시 이미 `openGacha`에서 처리 완료, UI만 닫기.

- [ ] **Step 3: 빌드 + 수동 확인**

Run: `npx tsc --noEmit`
Expected: PASS. 가챠 화면에서 상자 열기 → 타워 획득 → 컬렉션 반영 확인.

- [ ] **Step 4: 커밋**

```bash
git add packages/web-shell/src/stores/metaStore.ts packages/web-shell/src/components/GachaScreen.tsx
git commit -m "feat: gacha system — cost validation, pity, collection integration, 10-pull"
```

---

## Task 10: 튜토리얼 — EventBus 이벤트 + gameStore 상태

**Files:**
- Modify: `packages/phaser-game/src/EventBus.ts`
- Modify: `packages/web-shell/src/stores/gameStore.ts`

- [ ] **Step 1: GameEventMap에 튜토리얼 이벤트 추가**

```typescript
// Game → React (튜토리얼)
'tutorial-step': { step: number; message: string };
'tutorial-highlight-tiles': { tiles: Array<{ col: number; row: number }> };
'tutorial-action-completed': { step: number };
'tutorial-completed': undefined;

// React → Game (튜토리얼)
'request-tutorial-advance': undefined;
```

- [ ] **Step 2: gameStore에 튜토리얼 상태 추가**

```typescript
tutorialStep: number | null;       // null = 비활성, 0~4 = 현재 스텝
tutorialMessage: string | null;
setTutorialStep: (step: number | null) => void;
setTutorialMessage: (msg: string | null) => void;
```

- [ ] **Step 3: 커밋**

```bash
git add packages/phaser-game/src/EventBus.ts packages/web-shell/src/stores/gameStore.ts
git commit -m "feat: tutorial EventBus events + gameStore tutorial state"
```

---

## Task 11: ��토리얼 — TutorialSystem 재작성

**Files:**
- Modify: `packages/phaser-game/src/systems/TutorialSystem.ts`

- [ ] **Step 1: 액션 기반 진행으로 전환**

기존 3초 자동 진행 제거. 각 스텝별 완료 조건:

| step | 트리거 | 완료 조건 | 강제 여부 |
|------|--------|----------|----------|
| 0 | 첫 게임 시작 | `request-select-tower` 이벤트 감지 | 강제 |
| 1 | 타워 선택 직후 | `tower-placed` 이벤트 (success: true) | 강제 |
| 2 | 배치 완료 | `wave-started` 이벤트 (wave 1) | 힌트 |
| 3 | 웨이브 1 중 | `tower-placed` 두 번째 감지 | 힌트 |
| 4 | 웨이브 3 도달 | `wave-started` (wave >= 3) | 자동 해제 |

EventBus로 `tutorial-step`과 `tutorial-highlight-tiles` emit → React 오버레이가 받아서 렌더링.

- [ ] **Step 2: 튜토리얼 완료 시 SaveData에 기록**

`complete()` 메서드에서 `EventBus.emit('tutorial-completed')` emit. React 측에서 `useMetaStore.getState().updateProgress({ tutorialCompleted: true })` 호출.

별도 localStorage 키(`tutorial_completed`) 제거, SaveData.progress.tutorialCompleted 사용.

- [ ] **Step 3: shouldShowTutorial을 metaStore 기반으로 변경**

```typescript
static shouldShowTutorial(): boolean {
  // metaStore에서 직접 읽기 대신, 게임 시작 시 React가 판단하여
  // request-start-tutorial 이벤트를 보내는 방식으로 변경
  return true; // 항상 start() 호출 가능, React가 게이트킵
}
```

React 측 (게임 시작 훅)에서:
```typescript
if (!metaStore.progress.tutorialCompleted) {
  EventBus.emit('request-tutorial-advance');
}
```

- [ ] **Step 4: 커밋**

```bash
git add packages/phaser-game/src/systems/TutorialSystem.ts
git commit -m "feat: TutorialSystem rewrite — action-based progression + EventBus integration"
```

---

## Task 12: 튜토리얼 — React TutorialOverlay 컴포넌트

**Files:**
- Create: `packages/web-shell/src/components/game/TutorialOverlay.tsx`
- Modify: 게임 화면 레이아웃 컴포넌트 (오버레이 마운트)

- [ ] **Step 1: TutorialOverlay 구현**

EventBus의 `tutorial-step` 이벤트 구독. 스텝별:
- 메시지 텍스트 (하단 중앙, 금색 배경 패널)
- 스텝 0~1: `pointer-events: none` 해제 영역만 하이라이트 (CSS clip-path로 스포트라이트)
- 스텝 2~4: 반투명 힌트 텍스트만 표시, 포인터 이벤트 차단 없음

```typescript
export function TutorialOverlay() {
  const tutorialStep = useGameStore((s) => s.tutorialStep);
  const tutorialMessage = useGameStore((s) => s.tutorialMessage);

  useEffect(() => {
    const onStep = (data: { step: number; message: string }) => {
      useGameStore.getState().setTutorialStep(data.step);
      useGameStore.getState().setTutorialMessage(data.message);
    };
    const onComplete = () => {
      useGameStore.getState().setTutorialStep(null);
      useGameStore.getState().setTutorialMessage(null);
    };
    EventBus.on('tutorial-step', onStep);
    EventBus.on('tutorial-completed', onComplete);
    return () => {
      EventBus.off('tutorial-step', onStep);
      EventBus.off('tutorial-completed', onComplete);
    };
  }, []);

  if (tutorialStep === null) return null;

  const isForced = tutorialStep <= 1;

  return (
    <div className={cn(
      'fixed inset-0 z-20',
      isForced && 'bg-[rgba(0,0,0,0.5)]'
    )}>
      {/* 하단 메시지 패널 */}
      <div className="absolute bottom-24 left-1/2 -translate-x-1/2 px-4 py-3 bg-panel border border-gold max-w-[280px]">
        <p className="font-pixel text-xs text-gold text-center">{tutorialMessage}</p>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 게임 화면에 TutorialOverlay 마운트**

게임 진행 중 렌더링되는 최상위 컴포넌트에 `<TutorialOverlay />` 추가.

- [ ] **Step 3: 빌드 + 수동 확인**

Run: `npx tsc --noEmit`
Expected: PASS. 첫 게임 진입 시 튜토리얼 오버레이 → 카드 선택 → 배치 → 자동 진행 확인.

- [ ] **Step 4: 커밋**

```bash
git add packages/web-shell/src/components/game/TutorialOverlay.tsx [게임 화면 파일]
git commit -m "feat: TutorialOverlay — React spotlight overlay with step messages"
```

---

## Verification

### 빌드 검증
```bash
cd packages/shared && npx tsc --noEmit
cd ../phaser-game && npx tsc --noEmit
cd ../web-shell && npx tsc --noEmit
```

### 기능별 수동 테스트

1. **Save Migration**: 기존 v1 세이브로 앱 시작 → v2 마이그레이션 자동 적용 확인. `localStorage`에서 `gld-save-data` 확인 시 `version: 2`, `diamond: 0`, `bgmVolume: 0.7` 등 존재.

2. **Settings**: 로비 > 설정 > BGM/SFX 슬라이더 조작 → 값 반영 확인. 색각이상 모드 전환 → 화면 필터 ���용.

3. **Missions**: 전투 진입 → 타워 배치/웨이브 클리어 → 로비 > 임무 탭 → 진행도 증가 확인. 조건 충족 → 수령 → 다이아몬드 증가.

4. **Gacha**: 다이아몬드 보유 상태에서 가챠 → 타워 획득 → 컬렉션 확인. 무료 상자 쿨다운 확인. 10연차 tier3+ 보장 확인 (콘솔 로그).

5. **Tutorial**: 새 세이브 (localStorage 초기화) → 게임 시작 → 5스텝 튜토리얼 → 완료 후 재시작 시 미표시 확인.

---

## /autoplan Review Amendments

아래는 CEO/Design/Eng 리뷰에서 발견된 사항을 반영한 플랜 수정 목록입니다.
**구현 시 각 태스크의 원본 코드와 함께 이 수정사항�� 반드시 적용하세요.**

### Amendment A: Migration에서 localStorage 직접 호출 제거 (Task 2)
`SAVE_MIGRATIONS[1]`에서 `localStorage.getItem('tutorial_completed')` 호출 제거.
대신 `loadSave()` 내에서 ���이그레이션 전에 읽어서 `migrateSave`에 context 파��미터로 전달.

### Amendment B: rollGacha 빈 candidates 가드 (Task 8)
```typescript
const candidates = ALL_TOWERS.filter((t) => t.tier === targetTier);
if (candidates.length === 0) {
  // fallback: tier 1
  const fallback = ALL_TOWERS.filter((t) => t.tier === 1);
  return { result: { towerId: fallback[0].id, ... }, newPityCount: pityCount + 1 };
}
```

### Amendment C: rollGacha10 교체 후 pity 보정 (Task 8)
10연차 보장 교체 후, 교체된 타워의 tier가 5 이상이면 `currentPity = 0`.

### Amendment D: 중복 타워 → 골드 전환 (Task 9)
`openGacha` 액션에서 이미 보유한 타워 획득 시 50 골드로 전환.
GachaScreen reveal 단계에서 "보유 중 → 골드 50 전환" 텍스트 표시.

### Amendment E: soundEnabled 소비자 감사 스텝 (Task 3)
Task 3 Step 1 전에 `grep -r "soundEnabled" packages/` 실행하여 모든 참조 확인 후 일괄 교체.

### Amendment F: 튜토리얼 건너뛰기 버튼 (Task 12)
강제 스텝(0-1)에서 5초 경과 후 "건너뛰기" 버튼 표시. 탭 시 tutorialCompleted=true + 오버레이 해제.

### Amendment G: Pity 카운터 UI (Task 9)
GachaScreen 상단에 pity 프로그레스 바 고정 (`{pityCount}/50 → 전설 확정`).

### Amendment H: 미션 일일/주간 시각 구분 (Task 7)
- 일일: accent 색상 헤더 + "리셋까지 HH:MM" 카운트다운
- 주간: 넓은 카드 레이아웃 + 큰 보상 표시
- "전부 수령" 상태: "오늘의 임무 완료!" 메시지 + 체크마크

### Amendment I: reach_wave 시맨틱 (Task 5-6)
`reach_wave`는 "단일 런에서 도달한 최고 웨이브" (누적 아님).
`useMissionTracker`에서 `wave-completed` 대신 `wave-started`의 wave 값으로 max 추적.

### Amendment J: 10연차 연출 — 일�� 공개 (Task 9)
10장 카드 뒷면 일괄 표시 → 탭하여 하나씩 뒤집기. 교체는 reveal 전에 완료.

### Amendment K: Canvas 스포트라이트는 Phaser 측 (Task 11-12)
`TutorialOverlay` (React)는 텍스트/메시지만. 타일 하이라이트/어둡게는 `TutorialSystem` (Phaser Graphics overlay)에서 처리.
CSS clip-path 사용하지 않음.

### Amendment L: 가챠 no_diamond 상태 (Task 9)
다이아 부족 시 열기 버튼 비활성 + "다이아몬드 부족" 텍스트 + "임무에서 획득 →" 링크.

### Amendment M: Migration 테스트 추가 (Task 2)
Step 3 이후에 테스트 스텝 추가:
```bash
# 테스트 파일: packages/web-shell/src/stores/__tests__/metaStore-migration.test.ts
# 케이스: v1 정상, 필드 누락, corrupt JSON, soundEnabled=false→volume 0
```

---

## Decision Audit Trail

| # | Phase | Decision | Principle | Rationale | Rejected |
|---|-------|----------|-----------|-----------|----------|
| 1 | CEO | 구현 순서 A (순차) 선택 | P1+P5 | save.ts 동시 수정 충돌 방지 | B(병렬), C(임팩트 순) |
| 2 | CEO | SELECTIVE EXPANSION 모드 | P2 | blast radius 내 확장만 수용 | SCOPE EXPANSION |
| 3 | CEO | 중복 타워→골드 전환 수용 | P1 | 가챠 풀 소진 방어 필수 | "MVP에서 무시" |
| 4 | CEO | 미션 알림 뱃지 수용 | P2 | 탭 바 수정 범위 내 | — |
| 5 | CEO | 가챠 ��스토리 보류 | P3 | 스코프 밖 새 UI | 포함 |
| 6 | Design | Pity 바 GachaScreen 상단 고정 | P5 | 불안 감소 요소, 위치 명시 필요 | 미지정 |
| 7 | Design | 일일/주간 시각 구분 | P5 | 긴급도 차이 표��� 필요 | 동일 리스트 |
| 8 | Design | "전부 수령" 빈 상태 추가 | P1 | 감정 절벽 방지 | 미처리 |
| 9 | Design | reach_wave = 단일 런 최고 웨이브 | P5 | 시맨틱 혼동 방지 | 누적 |
| 10 | Design | 10연차 일괄 공개 | P3 | 순차 공개는 교체 타이밍 문제 | 순차 |
| 11 | Design | Canvas 스포트라이트 Phaser 측 | P5 | CSS clip-path는 canvas 위 불가 | React clip-path |
| 12 | Design | no_diamond 상태 명시 | P1 | 전환 포인트 미정의 해결 | 미처리 |
| 13 | Design | 튜토리얼 중단→재시작 | P3 | 가장 단순, 상태 저장 불필요 | 이어하기 |
| 14 | Design | 네이티브 range + accent-color | P3 | 커스텀 슬라이더 과도 | 커스텀 슬라이더 |
| 15 | Eng | Migration localStorage 분리 | P5 | 순수 함수 계약 유지 | 인라인 호출 |
| 16 | Eng | rollGacha 빈 candidates 가드 | P1 | pity 경로에서 크래시 방지 | 미처리 |
| 17 | Eng | 10연차 pity 보정 | P5 | 교체 후 카운터 정합성 | 미처리 |
| 18 | Eng | Migration 테스트 추가 | P1 | 8필드 마이그레이션 무검증 방지 | 테스트 없음 |
| 19 | Eng | 클라이언트 시계 조작 수용 | P6 | 싱글플레이어, 서버 없음 | 서버 검증 |
| 20 | Eng | soundEnabled grep 스텝 | P5 | 숨은 참조 누락 방지 | SettingsTab만 |
| 21 | Eng | 튜토리얼 건너뛰기 버튼 | P1 | 소프트락 방지 | 없음 |
| T1 | Design | UTC vs KST 리셋 → TASTE | — | 유저에게 확인 필요 | — |

---

## GSTACK REVIEW REPORT

| Review | Trigger | Why | Runs | Status | Findings |
|--------|---------|-----|------|--------|----------|
| CEO Review | `/plan-ceo-review` | Scope & strategy | 1 | issues_open | 6 (1 critical, 2 high) |
| CEO Voices | dual | Independent challenge | 1 | subagent-only | Codex truncated |
| Design Review | `/plan-design-review` | UI/UX gaps | 1 | issues_open | 12 (2 critical, 4 high) |
| Design Voices | dual | Independent review | 1 | subagent-only | Codex skipped |
| Eng Review | `/plan-eng-review` | Architecture & tests | 1 | issues_open | 7 (2 critical, 2 high) |
| Eng Voices | dual | Independent review | 1 | subagent-only | Codex skipped |

**VERDICT:** All findings auto-resolved via 21 decisions + 1 taste decision (KST vs UTC). Amendments A-M applied to plan.
