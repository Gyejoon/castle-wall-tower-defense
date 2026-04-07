# MVP 1차 개선 사항 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Obsidian 이슈 노트(MVP 1차 개선 사항)의 즉시 구현 가능한 5가지 개선 사항을 반영한다.

**Architecture:** 공유 상수(`@gld/shared`) → Phaser 시스템 → EventBus → React HUD 순으로 변경이 흐른다. 각 태스크는 독립적이며 순서와 무관하게 실행 가능하다.

**Tech Stack:** TypeScript, Phaser 3, React 18, Zustand, Tailwind CSS, Vitest

---

## 스코프

| 포함 | 제외 |
|------|------|
| 시작 에너지 10으로 증가 | 게임 프리즈/메모리 누수 (별도 디버깅) |
| 보스 HP바 위치 수정 | 에셋 전체 개선 (별도 에셋 계획) |
| 몬스터 처치 시 에너지 획득 | 밸런스 스프레드시트 시각화 |
| 2배속 토글 버튼 | 맵 지형 전략 요소 (디자인 스펙 필요) |
| 게임 종료 화면 개선 | 난이도 밸런스 재조정 (플레이테스팅 필요) |

---

## File Map

| 파일 | 변경 내용 |
|------|-----------|
| `packages/shared/src/constants/energy.ts` | `INITIAL_ENERGY=10`, `ENERGY_PER_KILL=2` 추가 |
| `packages/phaser-game/src/systems/EnergySystem.ts` | `add(amount)` 메서드 추가 |
| `packages/phaser-game/src/EventBus.ts` | `request-set-speed` 이벤트 추가 |
| `packages/phaser-game/src/scenes/Game.ts` | 에너지 처치 보상, 속도 배율 적용 |
| `packages/web-shell/src/stores/gameStore.ts` | `gameSpeed: 1 | 2`, `setGameSpeed` 추가 |
| `packages/web-shell/src/pages/GamePage.tsx` | 속도 버튼, 보스바 이동, 종료 화면 개선 |
| `packages/web-shell/src/components/game/BossHpBar.tsx` | 절대 위치 제거 → 인라인 |
| `packages/phaser-game/tests/EnergySystem.test.ts` | 초기값 + add() 테스트 수정 |
| `packages/shared/src/types/map.ts` | `rewardMultiplier`, `difficultyHpMult` 필드 추가 |
| `packages/shared/src/constants/maps.ts` | 맵별 보상/난이도 배율 설정 |
| `packages/phaser-game/src/systems/WaveSystem.ts` | difficultyHpMult 옵션 추가 |

---

## Task 0: Bug Fix — wavesCleared 웨이브 클리어 기준으로 수정

> **버그:** `Game.ts:491` `wavesCleared: payload.finalSlot` — 웨이브 진입 순간 카운트가 증가함.
> 패배 시 wave N을 클리어 못했어도 N으로 표시됨.
> **올바른 동작:** 패배 = finalSlot-1 (진행 중 웨이브는 미클리어), 승리 = finalSlot (전부 클리어)

**Files:**
- Modify: `packages/phaser-game/src/scenes/Game.ts`

- [ ] **Step 1: 버그 수정**

`packages/phaser-game/src/scenes/Game.ts` line ~491 교체:
```typescript
stats: {
  wavesCleared: payload.result === 'victory'
    ? payload.finalSlot
    : Math.max(0, payload.finalSlot - 1),
  towersPlaced,
  timeSurvivedSec: Math.round(this.playerWaves.getElapsedMs() / 1000),
  goldEarned: this.goldEarned,
},
```

> Edge case: wave 1에서 패배 시 `max(0, 1-1) = 0` ✓

- [ ] **Step 2: 빌드 확인**

```bash
bun run build 2>&1 | tail -5
```
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add packages/phaser-game/src/scenes/Game.ts
git commit -m "fix: wavesCleared — count cleared waves (finalSlot-1 on defeat)"
```

---

## Task 1: 시작 에너지 10 & ENERGY_PER_KILL 상수

**Files:**
- Modify: `packages/shared/src/constants/energy.ts`
- Modify: `packages/phaser-game/tests/EnergySystem.test.ts`

- [ ] **Step 1: 기존 테스트 실패 확인**

```bash
cd packages/phaser-game && bun run test tests/EnergySystem.test.ts 2>&1 | grep "starts with"
```
Expected: PASS (현재 0 기대값과 일치)

- [ ] **Step 2: 상수 변경**

`packages/shared/src/constants/energy.ts`:
```typescript
export const INITIAL_ENERGY = 10;
export const ENERGY_PER_SEC = 1;
export const ENERGY_CAP = 100;
export const ENERGY_PER_KILL = 2;
```

- [ ] **Step 3: 테스트 업데이트**

`packages/phaser-game/tests/EnergySystem.test.ts` line 33-36 교체:
```typescript
it('starts with INITIAL_ENERGY (10)', () => {
  const system = new EnergySystem();
  expect(system.getEnergy()).toBe(10);
});
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
cd packages/phaser-game && bun run test tests/EnergySystem.test.ts
```
Expected: all PASS

- [ ] **Step 5: Commit**

```bash
git add packages/shared/src/constants/energy.ts packages/phaser-game/tests/EnergySystem.test.ts
git commit -m "feat: starting energy 10, add ENERGY_PER_KILL=2 constant"
```

---

## Task 2: EnergySystem.add() + 처치 시 에너지 보상 (차등)

> **밸런스 결정 (premise gate):** 일반 유닛 처치 +2, 보스 처치 +5
>
> **밸런스 시트:**
> | 상황 | 에너지 획득 |
> |------|------------|
> | 자연 회복 | +1/sec |
> | 시작 에너지 | 10 |
> | 일반 유닛 처치 | +2 |
> | 보스 처치 | +5 |
> | 상한 | 100 |
>
> Wave 1 시뮬레이션: 스카우트 6마리 처치 → +12 에너지. 10초 패시브(10) + 12 = 22 에너지 (타워 2개 배치 가능)

**Files:**
- Modify: `packages/shared/src/constants/energy.ts`
- Modify: `packages/phaser-game/src/systems/EnergySystem.ts`
- Modify: `packages/phaser-game/src/systems/UnitSystem.ts` (applyDamage 반환값에 isBoss 추가)
- Modify: `packages/phaser-game/src/scenes/Game.ts`
- Modify: `packages/phaser-game/tests/EnergySystem.test.ts`

- [ ] **Step 1: 상수 업데이트**

`packages/shared/src/constants/energy.ts`:
```typescript
export const INITIAL_ENERGY = 10;
export const ENERGY_PER_SEC = 1;
export const ENERGY_CAP = 100;
export const ENERGY_PER_KILL = 2;       // 일반 유닛 처치
export const ENERGY_PER_BOSS_KILL = 5;  // 보스 처치
```

- [ ] **Step 2: 실패하는 테스트 작성**

`packages/phaser-game/tests/EnergySystem.test.ts` 끝에 추가:
```typescript
it('add() increases energy up to cap', () => {
  const system = new EnergySystem(0);
  system.add(5);
  expect(system.getEnergy()).toBe(5);
});

it('add() does not exceed ENERGY_CAP', () => {
  const system = new EnergySystem(99);
  system.add(10);
  expect(system.getEnergy()).toBe(100);
});
```

- [ ] **Step 3: 테스트 실패 확인**

```bash
cd packages/phaser-game && bun run test tests/EnergySystem.test.ts 2>&1 | grep -E "add\(\)|FAIL"
```
Expected: FAIL "system.add is not a function"

- [ ] **Step 4: EnergySystem.add() 구현**

`packages/phaser-game/src/systems/EnergySystem.ts` — `spend()` 메서드 아래에 추가:
```typescript
add(amount: number): void {
  this.energy = Math.min(this.energy + amount, ENERGY_CAP);
  this.emitIfChanged();
}
```

- [ ] **Step 5: 테스트 통과 확인**

```bash
cd packages/phaser-game && bun run test tests/EnergySystem.test.ts
```
Expected: all PASS

- [ ] **Step 6: UnitSystem.applyDamage에 isBoss 반환 추가**

`packages/phaser-game/src/systems/UnitSystem.ts` — `applyDamage()` 반환 타입 변경:
```typescript
applyDamage(
  unitId: string,
  rawDamage: number,
  armorPierce = false,
): {
  killed: boolean;
  bounty: number;
  unitDefId: string;
  countsTowardClear: boolean;
  source: UnitSpawnSource;
  isBoss: boolean;        // ← 추가
} | null {
```

killed: true 반환 블록 (line ~342):
```typescript
return {
  killed: true,
  bounty: unit.bounty,
  unitDefId: unit.def.id,
  countsTowardClear: unit.countsTowardClear,
  source: unit.source,
  isBoss: unit.isBoss,  // ← 추가
};
```

killed: false 반환 블록 (line ~366):
```typescript
return {
  killed: false,
  bounty: 0,
  unitDefId: unit.def.id,
  countsTowardClear: unit.countsTowardClear,
  source: unit.source,
  isBoss: unit.isBoss,  // ← 추가
};
```

invulnerable 반환 블록 (line ~284):
```typescript
return {
  killed: false,
  bounty: 0,
  unitDefId: unit.def.id,
  countsTowardClear: unit.countsTowardClear,
  source: unit.source,
  isBoss: unit.isBoss,  // ← 추가
};
```

- [ ] **Step 7: Game.ts에서 차등 에너지 지급**

`packages/phaser-game/src/scenes/Game.ts` 상단 import에 추가:
```typescript
import {
  // ... 기존 imports ...
  ENERGY_PER_KILL,
  ENERGY_PER_BOSS_KILL,
} from '@gld/shared';
```

`packages/phaser-game/src/scenes/Game.ts` line 583-586 교체:
```typescript
if (result?.killed) {
  this.goldEarned += result.bounty;
  const energyReward = result.isBoss ? ENERGY_PER_BOSS_KILL : ENERGY_PER_KILL;
  this.energySystem.add(energyReward);
  onKill();
}
```

- [ ] **Step 8: UnitSystem isBoss 반환 테스트 추가**

`packages/phaser-game/tests/UnitSystem.test.ts` — 기존 applyDamage 테스트 옆에 추가:
```typescript
it('applyDamage returns isBoss=true for titan', () => {
  // 기존 titan 스폰 + kill 코드 참고하여 isBoss 필드 검증
  const unitSystem = createUnitSystemWithUnit({ def: UNITS.find(u => u.id === 'titan')!, isBoss: true });
  const result = unitSystem.applyDamage(unitId, 9999);
  expect(result?.isBoss).toBe(true);
});

it('applyDamage returns isBoss=false for normal unit', () => {
  const unitSystem = createUnitSystemWithUnit({ def: UNITS.find(u => u.id === 'scout_drone')!, isBoss: false });
  const result = unitSystem.applyDamage(unitId, 9999);
  expect(result?.isBoss).toBe(false);
});
```

> **Note:** 기존 UnitSystem.test.ts의 헬퍼 패턴을 참조하여 실제 테스트 구조에 맞게 조정할 것.

- [ ] **Step 9: 전체 테스트 통과 확인**

```bash
cd packages/phaser-game && bun run test
```
Expected: all PASS

- [ ] **Step 10: Commit**

```bash
git add packages/shared/src/constants/energy.ts packages/phaser-game/src/systems/EnergySystem.ts packages/phaser-game/src/systems/UnitSystem.ts packages/phaser-game/src/scenes/Game.ts packages/phaser-game/tests/EnergySystem.test.ts packages/phaser-game/tests/UnitSystem.test.ts
git commit -m "feat: energy +2 per kill, +5 per boss kill (differentiated reward)"
```

---

## Task 3: 보스 HP바 위치 수정

보스 HP바(`top-1.5` 절대 위치)가 게임 캔버스 상단 유닛 이동 경로를 가리는 문제.
해결: 컴포넌트를 게임 캔버스 밖 전투 HUD 영역으로 이동한다.

**Files:**
- Modify: `packages/web-shell/src/components/game/BossHpBar.tsx`
- Modify: `packages/web-shell/src/pages/GamePage.tsx`

- [ ] **Step 1: BossHpBar 절대 위치 제거**

`packages/web-shell/src/components/game/BossHpBar.tsx`의 최상위 div 클래스:

기존:
```typescript
className="absolute top-1.5 left-1/2 -translate-x-1/2 z-[3] w-[min(80vw,300px)] border border-border shadow-[2px_2px_0px_rgba(0,0,0,0.4)] px-2 py-1.5 flex flex-col gap-[3px]"
```

변경:
```typescript
className="w-full border border-border shadow-[2px_2px_0px_rgba(0,0,0,0.4)] px-2 py-1.5 flex flex-col gap-[3px]"
```

- [ ] **Step 2: GamePage.tsx에서 BossHpBar 위치 이동**

`packages/web-shell/src/pages/GamePage.tsx`에서 게임 영역 내부의 `<BossHpBar />`를 제거하고, 게임 영역 **위** 전투 HUD 섹션 끝에 조건부 렌더링으로 추가한다.

현재 게임 영역 내 BossHpBar (line ~315) 제거:
```typescript
// 삭제
<BossHpBar />
```

전투 HUD 섹션 (wave/timer 표시 div 바로 아래)에 추가:
```typescript
{bossHp.visible && <BossHpBar />}
```

단, `bossHp` 상태를 GamePage에서 읽어야 한다:
```typescript
const bossHp = useGameStore((s) => s.bossHp);
```

- [ ] **Step 3: 빌드 확인**

```bash
bun run build 2>&1 | tail -5
```
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add packages/web-shell/src/components/game/BossHpBar.tsx packages/web-shell/src/pages/GamePage.tsx
git commit -m "fix: move boss HP bar above game canvas to prevent unit overlap"
```

---

## Task 4: 2배속 토글

**Files:**
- Modify: `packages/phaser-game/src/EventBus.ts`
- Modify: `packages/web-shell/src/stores/gameStore.ts`
- Modify: `packages/web-shell/src/pages/GamePage.tsx`
- Modify: `packages/phaser-game/src/scenes/Game.ts`

- [ ] **Step 1: EventBus에 이벤트 추가**

`packages/phaser-game/src/EventBus.ts`의 `GameEventMap` — `// React → Game` 섹션에 추가:
```typescript
'request-set-speed': { multiplier: 1 | 2 };
```

- [ ] **Step 2: gameStore에 상태 추가**

`packages/web-shell/src/stores/gameStore.ts`:

상태 인터페이스에 추가:
```typescript
gameSpeed: 1 | 2;
setGameSpeed: (speed: 1 | 2) => void;
```

초기값에 추가:
```typescript
gameSpeed: 1,
```

액션에 추가:
```typescript
setGameSpeed: (speed) => {
  set({ gameSpeed: speed });
  EventBus.emit('request-set-speed', { multiplier: speed });
},
```

- [ ] **Step 3: GamePage HUD에 속도 버튼 추가**

`packages/web-shell/src/pages/GamePage.tsx` — 기존 wave/timer 정보가 있는 전투 HUD 섹션에 추가.

컴포넌트 상단에 구독 추가:
```typescript
const gameSpeed = useGameStore((s) => s.gameSpeed);
const setGameSpeed = useGameStore((s) => s.setGameSpeed);
```

컴포넌트 상단에 추가 (2배속 잠금 조건 확인):
```typescript
const selectedMapId = useGameStore((s) => s.selectedMapId);
const stagesCleared = useMetaStore((s) => s.progress.stagesCleared);
const speed2xUnlocked = stagesCleared.includes(selectedMapId);
```

`useMetaStore` import 추가 (`../../stores/metaStore` 또는 현재 import 경로 참조).

전투 HUD 내 우측 끝에 버튼 추가 (runStatus === 'running' + 최초 클리어 완료 시):
```typescript
{runStatus === 'running' && speed2xUnlocked && (
  <button
    className="font-pixel text-[11px] px-2 py-0.5 border border-border text-text-secondary"
    style={{ background: gameSpeed === 2 ? 'rgba(200,112,32,0.3)' : 'rgba(26,18,8,0.7)' }}
    onClick={() => setGameSpeed(gameSpeed === 1 ? 2 : 1)}
  >
    {gameSpeed === 2 ? '2x ▶▶' : '1x ▶'}
  </button>
)}
```

> **Note:** `stagesCleared`가 아직 metaStore에서 업데이트되지 않음 → Task 4에서 함께 처리 필요.

- [ ] **Step 4: Game.ts에서 이벤트 수신 및 배율 적용**

`packages/phaser-game/src/scenes/Game.ts` — 클래스 필드에 추가:
```typescript
private speedMultiplier: 1 | 2 = 1;
```

`create()` 메서드 내 이벤트 리스너 등록 (다른 request-* 리스너 옆):
```typescript
private onSetSpeed!: (data: { multiplier: 1 | 2 }) => void;
```

`create()` 내:
```typescript
this.onSetSpeed = ({ multiplier }) => {
  this.speedMultiplier = multiplier;
  // 스프라이트 애니메이션도 같이 스케일 (walk, death VFX 등)
  this.anims.globalTimeScale = multiplier;
};
EventBus.on('request-set-speed', this.onSetSpeed, this);
```

`cleanup()` 내:
```typescript
EventBus.off('request-set-speed', this.onSetSpeed);
```

`update()` 메서드 상단에 scaledDelta 계산 추가:
```typescript
update(time: number, delta: number) {
  if (this.gameOver) return;
  const scaledDelta = delta * this.speedMultiplier;

  this.playerWaves.update(scaledDelta, this.playerUnits.getActiveCount());
  this.energySystem.update(scaledDelta / 1000);

  const playerExits = this.processCombatField(
    this.playerTowers,
    this.playerUnits,
    time,
    scaledDelta,    // delta → scaledDelta
    () => { soundGenerator.playUnitDeath(); },
  );
  // ... 이하 동일
```

> **Note (CEO review):** `scene.anims.globalTimeScale` 로 스프라이트 애니메이션도 동기화. WaveSystem은 delta-time 기반이라 scaledDelta로 자동 처리됨.

- [ ] **Step 4b: metaStore에 스테이지 클리어 기록 추가**

`packages/web-shell/src/stores/metaStore.ts`:

인터페이스에 추가:
```typescript
recordStageClear: (mapId: string) => void;
```

구현 추가 (recordBattle 옆):
```typescript
recordStageClear: (mapId) => {
  set((s) => {
    if (s.progress.stagesCleared.includes(mapId)) return s; // 중복 방지
    return {
      progress: {
        ...s.progress,
        stagesCleared: [...s.progress.stagesCleared, mapId],
      },
    };
  });
  debouncedSave(get());
},
```

`packages/web-shell/src/pages/GamePage.tsx` — game-over 핸들러 (line ~92 근처)에서 승리 시 recordStageClear 호출:
```typescript
if (data.result === 'victory') {
  const mapId = useGameStore.getState().selectedMapId;
  meta.recordStageClear(mapId);
}
```

- [ ] **Step 5: gameStore 테스트 추가**

`packages/web-shell/tests/gameStore.test.ts` — 기존 테스트 끝에 추가:
```typescript
it('setGameSpeed updates gameSpeed state', () => {
  const { setGameSpeed } = useGameStore.getState();
  setGameSpeed(2);
  expect(useGameStore.getState().gameSpeed).toBe(2);
});

it('resetRun resets gameSpeed to 1', () => {
  const { setGameSpeed, resetRun } = useGameStore.getState();
  setGameSpeed(2);
  resetRun();
  expect(useGameStore.getState().gameSpeed).toBe(1);
});
```

- [ ] **Step 6: 빌드 + 테스트 통과 확인**

```bash
bun run build 2>&1 | tail -5 && cd packages/phaser-game && bun run test 2>&1 | tail -10
```
Expected: 빌드/테스트 모두 통과

- [ ] **Step 7: Commit**

```bash
git add packages/phaser-game/src/EventBus.ts packages/web-shell/src/stores/gameStore.ts packages/web-shell/src/stores/metaStore.ts packages/web-shell/src/pages/GamePage.tsx packages/phaser-game/src/scenes/Game.ts packages/web-shell/tests/gameStore.test.ts
git commit -m "feat: 2x speed toggle (unlocked after first clear per map)"
```

---

## Task 5: 게임 종료 화면 개선

현재: 이미지(`defense-success.png`, `defense-fail.png`)에 의존하는 단순 레이아웃.
개선: 이미지를 픽셀 텍스트 배너로 교체 + 스탯 카드 레이아웃 정비.

**Files:**
- Modify: `packages/web-shell/src/pages/GamePage.tsx`

- [ ] **Step 1: 종료 화면 JSX 교체**

`packages/web-shell/src/pages/GamePage.tsx` line 350-421의 결과 화면 div 내부를 교체:

```tsx
{(runStatus === 'victory' || runStatus === 'defeat') && (
  <div
    className="absolute inset-0 z-[3] flex items-center justify-center p-5"
    style={{ background: 'rgba(10, 8, 4, 0.88)' }}
  >
    <div
      className="flex w-[min(100%,360px)] flex-col gap-4 p-5 text-center"
      style={{
        background: 'rgba(26, 14, 6, 0.98)',
        border: `2px solid ${runStatus === 'victory' ? colors.success : colors.danger}`,
        boxShadow: `0 0 24px ${runStatus === 'victory' ? 'rgba(80,200,80,0.3)' : 'rgba(200,60,60,0.3)'}, 6px 6px 0px ${colors.border}`,
      }}
    >
      {/* 배너 */}
      <div
        className="py-3 -mx-5 -mt-5 flex flex-col items-center gap-1"
        style={{
          background: runStatus === 'victory' ? 'rgba(40,80,40,0.8)' : 'rgba(80,20,20,0.8)',
          borderBottom: `1px solid ${runStatus === 'victory' ? colors.success : colors.danger}`,
        }}
      >
        <span className="font-pixel text-2xl" style={{ color: runStatus === 'victory' ? colors.success : colors.danger }}>
          {runStatus === 'victory' ? '⚔ 방어 성공 ⚔' : '✕ 방어 실패 ✕'}
        </span>
        <span className="font-pixel text-[11px] text-text-secondary">
          {runStatus === 'defeat'
            ? `웨이브 ${gameOverStats?.wavesCleared ?? '?'}에서 돌파당했습니다`
            : '왕국을 성공적으로 지켜냈습니다!'}
        </span>
      </div>

      {/* 스탯 그리드 */}
      <div className="grid grid-cols-1 min-[340px]:grid-cols-2 gap-2 text-left">
        <div className="flex flex-col gap-0.5 px-3 py-2" style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <span className="font-pixel text-[10px] text-text-secondary">클리어 웨이브</span>
          <span className="font-pixel text-sm text-text">{gameOverStats?.wavesCleared ?? 0} / 10</span>
        </div>
        <div className="flex flex-col gap-0.5 px-3 py-2" style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <span className="font-pixel text-[10px] text-text-secondary">배치한 타워</span>
          <span className="font-pixel text-sm text-text">{gameOverStats?.towersPlaced ?? 0}</span>
        </div>
        <div className="flex flex-col gap-0.5 px-3 py-2" style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <span className="font-pixel text-[10px] text-text-secondary">생존 시간</span>
          <span className="font-pixel text-sm text-text">
            {(() => {
              const s = gameOverStats?.timeSurvivedSec ?? 0;
              const h = Math.floor(s / 3600);
              const m = Math.floor((s % 3600) / 60);
              const sec = s % 60;
              return h > 0
                ? `${h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`
                : `${m}:${String(sec).padStart(2,'0')}`;
            })()}
          </span>
        </div>
        <div className="flex flex-col gap-0.5 px-3 py-2" style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <span className="font-pixel text-[10px] text-text-secondary">획득 골드</span>
          <span className="font-pixel text-sm text-gold">{gameOverStats?.goldEarned ?? 0}G</span>
        </div>
      </div>

      {/* XP */}
      <div className="flex items-center justify-center gap-2 py-1.5" style={{ background: 'rgba(20,30,80,0.5)', border: '1px solid rgba(100,150,255,0.2)' }}>
        <span className="font-pixel text-[11px] text-text-secondary">획득 XP</span>
        <span className="font-pixel text-base text-info">+{gameOverStats?.xpEarned ?? 0}</span>
      </div>

      {/* 버튼 */}
      <PixelButton variant="gold" style={{ width: '100%' }} onClick={resetRun}>
        다시 시작
      </PixelButton>
      <PixelButton variant="secondary" style={{ width: '100%' }} onClick={enterLobby}>
        로비로 돌아가기
      </PixelButton>
    </div>
  </div>
)}
```

Task 5 전체 JSX에서 승리 배너 부분에 애니메이션 추가:

```tsx
{/* 배너 */}
<div
  className={`py-3 -mx-5 -mt-5 flex flex-col items-center gap-1${runStatus === 'victory' ? ' animate-bounce' : ''}`}
  style={{
    background: runStatus === 'victory' ? 'rgba(40,80,40,0.8)' : 'rgba(80,20,20,0.8)',
    borderBottom: `1px solid ${runStatus === 'victory' ? colors.success : colors.danger}`,
  }}
>
  <span className="font-pixel text-2xl" style={{ color: runStatus === 'victory' ? colors.success : colors.danger }}>
    {runStatus === 'victory' ? '⚔ 방어 성공 ⚔' : '✕ 방어 실패 ✕'}
  </span>
  <span className="font-pixel text-[11px] text-text-secondary">
    {runStatus === 'defeat'
      ? `웨이브 ${gameOverStats?.wavesCleared ?? '?'}에서 돌파당했습니다`
      : gameOverStats?.wavesCleared === 10
        ? '✨ 완벽한 방어! 왕국을 성공적으로 지켜냈습니다!'
        : '왕국을 성공적으로 지켜냈습니다!'}
  </span>
</div>
```

> wave 10 완전 클리어 시 '✨ 완벽한 방어!' 특별 메시지 표시.

- [ ] **Step 2: 빌드 확인**

```bash
bun run build 2>&1 | tail -5
```
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add packages/web-shell/src/pages/GamePage.tsx
git commit -m "feat: redesign game end screen — text banner, stat grid, bounce animation"
```

---

---

## Task 6: 사냥터별 골드/XP 보상 차등 (초록 1x, 빨강 2x, 파랑 3x)

> **유저 결정 (Final Gate):** 초록(forest_gate) 1x, 빨강(lava_fortress) 2x, 파랑(storm_citadel) 3x

**Files:**
- Modify: `packages/shared/src/types/map.ts`
- Modify: `packages/shared/src/constants/maps.ts`
- Modify: `packages/phaser-game/src/EventBus.ts`
- Modify: `packages/phaser-game/src/scenes/Game.ts`
- Modify: `packages/web-shell/src/pages/GamePage.tsx`

- [ ] **Step 1: MapLayout 타입에 rewardMultiplier 추가**

`packages/shared/src/types/map.ts`:
```typescript
export interface MapLayout {
  // ... 기존 필드 ...
  /** Gold and XP reward multiplier. forest_gate=1, lava_fortress=2, storm_citadel=3 */
  rewardMultiplier: number;
}
```

- [ ] **Step 2: 각 맵에 rewardMultiplier 설정**

`packages/shared/src/constants/maps.ts`:

FOREST_GATE_MAP에 추가: `rewardMultiplier: 1,`
LAVA_FORTRESS_MAP에 추가: `rewardMultiplier: 2,`
STORM_CITADEL_MAP에 추가: `rewardMultiplier: 3,`

- [ ] **Step 3: EventBus game-over에 rewardMultiplier 추가**

`packages/phaser-game/src/EventBus.ts` — `'game-over'` 이벤트 stats 타입에 추가:
```typescript
'game-over': {
  result: 'victory' | 'defeat';
  reason: 'all_waves_cleared' | 'base_hp_depleted';
  finalSlot: number;
  stats: {
    wavesCleared: number;
    towersPlaced: number;
    timeSurvivedSec: number;
    goldEarned: number;
    rewardMultiplier: number;  // ← 추가
  };
};
```

- [ ] **Step 4: Game.ts에서 rewardMultiplier 적용**

`packages/phaser-game/src/scenes/Game.ts`:

클래스 필드에 추가:
```typescript
private rewardMultiplier = 1;
```

`create()` 에서 맵 로드 시 설정 (currentMap 로드 직후):
```typescript
this.rewardMultiplier = this.currentMap.rewardMultiplier;
```

`emitGameOver()` 에서 stats에 포함:
```typescript
stats: {
  wavesCleared: ...,
  towersPlaced: ...,
  timeSurvivedSec: ...,
  goldEarned: this.goldEarned * this.rewardMultiplier,  // 골드에 배율 적용
  rewardMultiplier: this.rewardMultiplier,
},
```

> Note: `goldEarned`에 `rewardMultiplier`를 곱해서 실제 획득 골드를 배율 적용함.
> 유닛 처치 시 bounty는 원래대로 적립하고, 최종 합계에만 배율 적용.

- [ ] **Step 5: GamePage.tsx에서 XP에 배율 적용**

`packages/web-shell/src/pages/GamePage.tsx`:

`game-over` 이벤트 핸들러(line ~84):
```typescript
const xpEarned = Math.round(
  battleXp(data.stats.wavesCleared, data.result === 'victory')
  * data.stats.rewardMultiplier  // ← XP에 배율 적용
);
```

- [ ] **Step 6: 빌드 확인**

```bash
bun run build 2>&1 | tail -5
```
Expected: no TypeScript errors (MapLayout 타입 변경으로 인한 missing field 검사)

- [ ] **Step 7: Commit**

```bash
git add packages/shared/src/types/map.ts packages/shared/src/constants/maps.ts packages/phaser-game/src/EventBus.ts packages/phaser-game/src/scenes/Game.ts packages/web-shell/src/pages/GamePage.tsx
git commit -m "feat: map reward multiplier — forest 1x, lava 2x, citadel 3x gold/XP"
```

---

## Task 7: 모든 맵 난이도 5배 증가

> **유저 결정 (Final Gate):** 현재 대비 유닛 HP 5배

**Files:**
- Modify: `packages/shared/src/types/map.ts`
- Modify: `packages/shared/src/constants/maps.ts`
- Modify: `packages/phaser-game/src/systems/WaveSystem.ts`
- Modify: `packages/phaser-game/src/scenes/Game.ts`

- [ ] **Step 1: MapLayout 타입에 difficultyHpMult 추가**

`packages/shared/src/types/map.ts`:
```typescript
export interface MapLayout {
  // ... 기존 필드 ...
  /** HP multiplier applied to all spawned units. Default 1. */
  difficultyHpMult: number;
}
```

- [ ] **Step 2: 각 맵에 difficultyHpMult=5 설정**

`packages/shared/src/constants/maps.ts`:

FOREST_GATE_MAP에 추가: `difficultyHpMult: 5,`
LAVA_FORTRESS_MAP에 추가: `difficultyHpMult: 5,`
STORM_CITADEL_MAP에 추가: `difficultyHpMult: 5,`

- [ ] **Step 3: WaveSystem에 difficultyHpMult 적용**

`packages/phaser-game/src/systems/WaveSystem.ts` — 생성자에 옵션 추가:
```typescript
export class WaveSystem {
  private difficultyHpMult: number;

  constructor(
    unitSystem: UnitSystem,
    waves: WaveDef[],
    maxWaves?: number,
    options?: { difficultyHpMult?: number },
  ) {
    // ... 기존 ...
    this.difficultyHpMult = options?.difficultyHpMult ?? 1;
  }
```

Wave 스폰 시 적용 (line ~157):
```typescript
const hpMultiplier =
  (isBoss && wave.slotIndex === 10 ? FINAL_BOSS_HP_MULTIPLIER : 1)
  * this.difficultyHpMult;  // ← 난이도 배율 곱하기
```

- [ ] **Step 4: Game.ts에서 WaveSystem 생성 시 difficultyHpMult 전달**

`packages/phaser-game/src/scenes/Game.ts`:
```typescript
this.playerWaves = new WaveSystem(
  this.playerUnits,
  mapWaves,
  undefined,
  { difficultyHpMult: this.currentMap.difficultyHpMult },
);
```

- [ ] **Step 5: 빌드 확인**

```bash
bun run build 2>&1 | tail -5
```
Expected: no errors

- [ ] **Step 6: Commit**

```bash
git add packages/shared/src/types/map.ts packages/shared/src/constants/maps.ts packages/phaser-game/src/systems/WaveSystem.ts packages/phaser-game/src/scenes/Game.ts
git commit -m "feat: 5x difficulty — all map units spawn with 5x HP"
```

---

## CEO Review Additions (autoplan Phase 1)

### Task 4 Additions

**4a. gameSpeed reset on run restart**

`packages/phaser-game/src/scenes/Game.ts` — `cleanup()` 이후 새 게임 시작 시 `speedMultiplier` 는 자동으로 1 로 초기화됨 (클래스 필드 기본값). 단, React 쪽 `gameStore.gameSpeed` 는 run 간에 유지됨. 게임 종료 후 로비 복귀 시 리셋해야 함.

`packages/web-shell/src/stores/gameStore.ts` — `setGameOverStats` 액션 또는 `resetRun` 액션에서 `gameSpeed: 1` 로 리셋 추가:
```typescript
resetRun: () => {
  set({ gameSpeed: 1, runStatus: 'building', /* ... 기존 */ });
},
```

`packages/web-shell/src/pages/GamePage.tsx` — resetRun / enterLobby 호출 전 speed 리셋이 불필요 (store에서 처리).

**4b. 2배속 애니메이션 동기화 확인 스텝 (Task 4에 추가)**

- [ ] **Step 4b: 애니메이션 동기화 확인**

Phaser 스프라이트 애니메이션은 `scene.time.timeScale` 이 아닌 프레임 기반이므로 `scaledDelta` 로만 속도를 올리면 유닛 이동은 빨라지지만 walk 애니메이션은 원래 속도로 재생됨. 확인 방법:

```bash
grep -r "anims.play\|play.*animation\|frameRate\|animationRate" packages/phaser-game/src/ --include="*.ts"
```

If 유닛에 `anims.play()` 호출이 있고 `timeScale` 미연동 시 → `scene.time.timeScale = this.speedMultiplier` 추가 필요. Game.ts `update()` 에서 `scaledDelta` 적용과 동시에:
```typescript
this.time.timeScale = this.speedMultiplier;
```

이렇게 하면 scene.time 기반 타이머(WaveSystem의 보스 경고 등)와 애니메이션이 함께 스케일됨.

---

## Verification & Completion Flow

### Step 1: 자동 검증

```bash
# 전체 테스트
cd packages/phaser-game && bun run test 2>&1 | tail -15

# 전체 빌드
bun run build 2>&1 | tail -10

# 개발 서버 실행 후 수동 확인
bun run dev
```

**수동 검증 체크리스트:**
- [ ] 게임 시작 → 에너지 표시가 10으로 시작
- [ ] 유닛 처치 → 에너지 +2 확인 (보스 처치 시 +5)
- [ ] 보스 등장 → HP바가 전투 HUD에 표시 (게임 캔버스 밖)
- [ ] 최초 클리어 전 → 2x 버튼 안 보임
- [ ] 최초 클리어 후 → 1x/2x 버튼 동작, 애니메이션 동기화
- [ ] 게임 승리 → bounce 배너 + wave 10 완벽 방어 메시지
- [ ] 게임 패배 → wavesCleared가 진입이 아닌 클리어 기준
- [ ] 빨강 사냥터 → 골드/XP 2배, 파랑 → 3배
- [ ] 전체 유닛 HP 5배 체감 확인

### Step 2: /ralreview

모든 Task 구현 완료 후 `/ralreview` 실행. 코드 품질, 컨벤션, 누락 검수.

### Step 3: /qa

`/qa` 실행. 실기기 또는 브라우저에서 전체 플로우 QA.

### Step 4: Obsidian 원본 이슈 체크 표시

**최종 완료 후** Obsidian 원본 노트에 체크 표시 반영:

파일: `/Users/lio/Documents/obsidian/game-planning/towerDefense/human/issues/MVP 1차 개선 사항.md`

반영 항목:
- [x] 보스 등장시, HP바가 맵이랑 몹을 가리는 현상
- [x] 게임 끝나고 났을 때, STAGE CLEAR (Game Over 등) 이미지 너무 구림
- [x] 에너지 10정도 줘야하나? → 10으로 결정
- [x] 몬스터 이동속도가 느린거에 대해서 꼼수 → 처치 에너지 보상으로 해결
- [x] 2배속이 있으면 어떨지? → 최초 클리어 잠금 포함 구현
- [x] 사냥터별로 XP, 골드 차별점 → 1x/2x/3x 적용

그리고 ai/issues 추적 파일(`MVP 1차 개선 진행상황.md`)도 ✅ 로 업데이트.

> **중요:** /ralreview + /qa 까지 통과해야 Obsidian에 체크 표시. 구현만으로는 완료 아님.

---

## GSTACK REVIEW REPORT

| Review | Trigger | Why | Runs | Status | Findings |
|--------|---------|-----|------|--------|----------|
| CEO Review | `/autoplan` | 스코프·전략 | 1 | issues_open | 2 fixes (anim sync, gameSpeed reset), 1 premise correction (boss +5) |
| Codex Review | — | 독립 의견 | 0 | — | unavailable (no API key) |
| Eng Review | `/autoplan` | 아키텍처·테스트 | 1 | issues_open | P0: bun test→vitest, 2 missing tests added, failure modes mapped |
| Design Review | `/autoplan` | UI/UX 갭 | 1 | issues_open | 2 auto-fix (time format, responsive), 1 taste decision pending |

**VERDICT:** autoplan 완료 — 12개 결정 로그, 5개 플랜 수정, 1개 취향 결정 (승리 애니메이션). 구현 준비됨.

---

<!-- AUTONOMOUS DECISION LOG -->
## Decision Audit Trail

| # | Phase | Decision | Principle | Rationale | Rejected |
|---|-------|----------|-----------|-----------|----------|
| 1 | CEO | 스코프 유지 (5 tasks) | P1 완결성 | 5개 항목 모두 플레이테스트 직접 검증 | 튜토리얼/진행 시스템 추가 (ocean scope) |
| 2 | CEO | Task 4에 `scene.anims.globalTimeScale` 추가 | P1+P2 | UnitSystem:172 `sprite.play()` 는 own frame rate → globalTimeScale 없으면 walk 애니메이션 desync | 미처리 시 2배속 비주얼 깨짐 |
| 3 | CEO | `resetRun`에 `gameSpeed:1` 리셋 추가 | P2 Blast Radius | Phaser 클래스 필드는 재초기화되지만 Zustand store는 run 간 유지 | 미처리 시 2x가 다음 run에도 지속 |
| 4 | CEO | A/B 테스트 계획 defer | P3 Pragmatic | 별도 analytics 관심사, 코드 blast radius 밖 | — |
| 5 | CEO | XP 잠금해제/보상 루프 defer | P3 Pragmatic | 게임 디자인 스펙 필요, 코드 scope 밖 | — |
| 6 | CEO-GATE | 보스 처치 +5 에너지 (일반 +2 차등화) | 유저 결정 (premise gate) | 보스는 희귀+전략적 → 높은 보상. UnitSystem.applyDamage에 isBoss 추가 | 일괄 +2 |
| 7 | Design | 생존 시간 HH:MM:SS 포맷 수정 | P1 완결성 | `timeSurvivedSec >= 3600` 시 시간 표시 누락. `61:01` → `1:01:01` 버그 | 미처리 (>1h 런에서 잘못된 표시) |
| 8 | Design | grid-cols-1 min-[340px]:grid-cols-2 추가 | P2 Blast Radius | iPhone SE 320px에서 2-col 레이아웃 깨짐 | 미처리 (320px에서 truncation) |
| 9 | Final Gate | 승리 배너 bounce 애니메이션 + wave 10 특별 메시지 추가 | 유저 결정 | 재플레이 동기 향상, 15분 구현, CSS animate-bounce 사용 | 정적 유지 |
| 13 | Final Gate | 사냥터별 골드/XP: 초록1x/빨강2x/파랑3x | 유저 결정 | 각 맵 난이도 차이에 따른 보상 차등. rewardMultiplier via MapLayout | 동일 보상 유지 |
| 14 | Final Gate | 모든 맵 난이도 5배 (difficultyHpMult=5) | 유저 결정 | 유닛 HP × 5. WaveSystem constructor option으로 주입 | 현행 유지 |
| 15 | Final Gate | wavesCleared 버그 수정 | 유저 결정 | 패배 시 finalSlot → finalSlot-1. 웨이브 진입이 아닌 클리어 기준 | 미수정 |
| 16 | Final Gate | 2배속 최초 클리어 잠금 | 유저 결정 | `stagesCleared.includes(selectedMapId)` 확인. metaStore.recordStageClear() 추가 | 항상 표시 |
| 10 | Eng-P0 | 모든 `bun test` → `bun run test` 수정 | P1 완결성 | phaser-game 패키지의 테스트 러너는 vitest. `bun test`로 실행 시 Phaser window mock 에러로 모든 테스트 실패 | 미수정 시 계획의 모든 검증 스텝 실패 |
| 11 | Eng | UnitSystem isBoss 반환 테스트 추가 | P1 완결성 | `isBoss` 필드 추가는 타입 변경 — 3개 return site 모두 커버하는 회귀 테스트 필요 | 미추가 시 isBoss=undefined 조용히 통과 가능 |
| 12 | Eng | gameStore 속도 리셋 테스트 추가 | P2 Blast Radius | `setGameSpeed` + `resetRun` 두 액션이 올바르게 동작하는지 단위 검증 필요 | 미추가 시 2x 지속 버그 미발견 |
