# Archer Tower Arrow Projectile Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 궁수탑의 레이저 빔 공격을 화살 투사체(낮은 포물선 비행)로 전환하고, 내부 타입명을 `laser` → `archer`로 전면 리네이밍한다.

**Architecture:** 기존 `attackLines`의 `style` 타입에 `'arrow'`를 추가하여 arc(캐터펄트 40px)보다 낮은 포물선(15px)으로 화살 스프라이트를 이동시킨다. 화살 오브젝트 풀(16개)로 매 프레임 sprite 생성/파괴를 방지한다. TTL은 120ms로 설정하여 비행이 시각적으로 인지되도록 한다. 리네이밍은 sed 기반 일괄 치환 + grep 검증으로 진행한다.

**Tech Stack:** Phaser 3, TypeScript, @napi-rs/canvas (에셋 생성), Zustand (상태 관리)

**Spec:** `docs/superpowers/specs/2026-04-08-archer-tower-arrow-projectile-design.md`

**Review Amendments:**
1. Arrow TTL: 80ms → **120ms** (Design review — 80ms는 ~5프레임, 비행이 거의 안 보임)
2. Arrow trail line 추가 (Design review — 24x6px 스프라이트 보강)
3. 마이그레이션 v3→v4 테스트 추가 (Eng review)
4. 각 rename 커밋 후 grep 검증 (CEO review)
5. sed 기반 일괄 치환 사용 (CEO review — hardcoded line numbers 회피)

---

## File Structure

**수정 파일:**
- `packages/shared/src/types/tower.ts` — TowerType, FusionTowerType
- `packages/shared/src/types/save.ts` — SAVE_VERSION 3→4
- `packages/shared/src/constants/towers.ts` — id/type 변경
- `packages/shared/src/constants/meta.ts` — DEFAULT_STARTER_IDS
- `packages/shared/src/constants/deck.ts` — 기본 덱
- `packages/phaser-game/src/systems/TowerSystem.ts` — arrow 스타일, 풀
- `packages/phaser-game/src/audio/SoundGenerator.ts` — 사운드 레시피
- `packages/web-shell/src/stores/gameStore.ts` — DEFAULT_DECK_IDS
- `packages/web-shell/src/stores/meta/persistence.ts` — v3→v4 migration
- `packages/web-shell/public/assets/asset-manifest.json` — 키/경로
- `scripts/generate-assets/shared.ts` — PALETTE
- `scripts/generate-assets/generate-projectiles.ts` — 파일명/키
- `scripts/generate-assets/generate-towers.ts` — twin_laser case
- `scripts/generate-assets/generate-ui.ts` — PALETTE 참조
- `scripts/generate-assets/generate-stage-icons.ts` — PALETTE 참조
- `scripts/generate-assets/generate-castle-wall.ts` — PALETTE 참조
- `scripts/generate-assets/ai-config.ts` — 타워 설명
- 테스트 파일 전부 (각 Task에서 상세 기술)

**리네이밍 에셋 파일 (10개):**
- `towers/laser.png` → `towers/archer.png` (+ .webp)
- `towers/laser-fire.png` → `towers/archer-fire.png` (+ .webp)
- `towers/twin_laser.png` → `towers/twin_archer.png` (+ .webp)
- `towers/twin_laser-fire.png` → `towers/twin_archer-fire.png` (+ .webp)
- `projectiles/laser-beam.png` → `projectiles/arrow.png` (+ .webp)

---

### Task 1: laser → archer 전면 리네이밍 (sed 기반)

**Files:**
- Modify: 모든 `*.ts`, `*.tsx`, `*.json` 파일에서 laser 참조 변경
- Rename: 에셋 파일 10개

- [ ] **Step 1: 에셋 파일 리네이밍**

```bash
cd packages/web-shell/public/assets
mv towers/laser.png towers/archer.png
mv towers/laser.webp towers/archer.webp
mv towers/laser-fire.png towers/archer-fire.png
mv towers/laser-fire.webp towers/archer-fire.webp
mv towers/twin_laser.png towers/twin_archer.png
mv towers/twin_laser.webp towers/twin_archer.webp
mv towers/twin_laser-fire.png towers/twin_archer-fire.png
mv towers/twin_laser-fire.webp towers/twin_archer-fire.webp
mv projectiles/laser-beam.png projectiles/arrow.png
mv projectiles/laser-beam.webp projectiles/arrow.webp
```

- [ ] **Step 2: sed로 소스 코드 일괄 치환**

주의: 순서가 중요하다. `twin_laser`를 먼저 치환해야 `laser` 치환 시 이중 변환을 방지한다.

```bash
# twin_laser → twin_archer (모든 ts/tsx/json)
find packages/ scripts/ -type f \( -name '*.ts' -o -name '*.tsx' -o -name '*.json' \) \
  -exec sed -i '' 's/twin_laser/twin_archer/g' {} +

# laser-beam → arrow (에셋 키/경로 — 더 구체적인 패턴 먼저)
find packages/ scripts/ -type f \( -name '*.ts' -o -name '*.tsx' -o -name '*.json' \) \
  -exec sed -i '' 's/laser-beam/arrow/g' {} +

# laser-fire → archer-fire (에셋 키)
find packages/ scripts/ -type f \( -name '*.ts' -o -name '*.tsx' -o -name '*.json' \) \
  -exec sed -i '' 's/laser-fire/archer-fire/g' {} +

# tower-laser → tower-archer (에셋 키)
find packages/ scripts/ -type f \( -name '*.ts' -o -name '*.tsx' -o -name '*.json' \) \
  -exec sed -i '' 's/tower-laser/tower-archer/g' {} +

# projectile-laser → projectile-archer (에셋 키)
find packages/ scripts/ -type f \( -name '*.ts' -o -name '*.tsx' -o -name '*.json' \) \
  -exec sed -i '' 's/projectile-laser/projectile-archer/g' {} +

# PALETTE.laser → PALETTE.archer
find scripts/ -type f -name '*.ts' \
  -exec sed -i '' 's/PALETTE\.laser/PALETTE.archer/g' {} +

# 남은 독립 laser → archer (타입명, id, 타워 참조)
# 주의: 이미 변환된 archer-fire, twin_archer 등은 건드리지 않음
find packages/ scripts/ -type f \( -name '*.ts' -o -name '*.tsx' -o -name '*.json' \) \
  -exec sed -i '' "s/'laser'/'archer'/g" {} +

# 에셋 경로 내 laser → archer (따옴표 없는 경로)
find packages/ scripts/ -type f \( -name '*.ts' -o -name '*.tsx' -o -name '*.json' \) \
  -exec sed -i '' 's|/laser\.|/archer.|g' {} +
find packages/ scripts/ -type f \( -name '*.ts' -o -name '*.tsx' -o -name '*.json' \) \
  -exec sed -i '' 's|/laser-|/archer-|g' {} +

# PALETTE 키 정의 (따옴표 없는 객체 키)
find scripts/ -type f -name '*.ts' \
  -exec sed -i '' 's/^  laser:/  archer:/g' {} +
```

- [ ] **Step 3: 수동 확인이 필요한 특수 케이스**

`scripts/generate-assets/shared.ts`의 PALETTE 객체 키:
```typescript
// 확인: laser:  →  archer:  (들여쓰기 포함)
archer:         '#c8a04a',  // 궁수 탑 (황금 갈색)
```

`scripts/generate-assets/shared.ts`의 주석:
```typescript
elementNeutral:   '#c8a04a',  // 무 속성 (기존 archer 색상)
```

`scripts/generate-assets/generate-ui.ts`의 주석:
```typescript
// 궁수 탑 (archer) — 돌 탑 실루엣
```

- [ ] **Step 4: grep 검증 — laser 잔여 참조 확인**

```bash
grep -rn "laser" packages/ scripts/ --include="*.ts" --include="*.tsx" --include="*.json" | grep -v node_modules | grep -v dist
```

Expected: **0 결과**. 주석 내 "laser" 설명이 남아있다면 수동 수정.

- [ ] **Step 5: 타입 체크**

Run: `cd packages/shared && npx tsc --noEmit`
Expected: 에러 없음 (shared 내부는 self-contained)

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "refactor: rename laser→archer, twin_laser→twin_archer across entire codebase"
```

---

### Task 2: SAVE_VERSION 증가 + 마이그레이션 추가

**Files:**
- Modify: `packages/shared/src/types/save.ts:1`
- Modify: `packages/web-shell/src/stores/meta/persistence.ts`
- Test: `packages/web-shell/src/stores/__tests__/metaStore-migration.test.ts`

- [ ] **Step 1: 마이그레이션 테스트 작성**

`packages/web-shell/src/stores/__tests__/metaStore-migration.test.ts`에 추가:

```typescript
it('migrates v3 save: laser→archer, twin_laser→twin_archer', () => {
  const v3Save = {
    version: 3,
    profile: { nickname: 'test', level: 1, xp: 0, gold: 100, diamond: 0, totalGoldEarned: 0, wins: 0, losses: 0, winStreak: 0, bestWinStreak: 0 },
    collection: [
      { defId: 'laser', level: 5, grade: 'rare', acquiredAt: 1000 },
      { defId: 'twin_laser', level: 10, grade: 'epic', acquiredAt: 2000 },
      { defId: 'plasma', level: 3, grade: 'normal', acquiredAt: 500 },
    ],
    progress: { highestWave: {}, stagesCleared: [], totalBattles: 0, tutorialCompleted: true, gachaPityCount: 0, dailyFreeBoxClaimedAt: null, dailyAdBoxCount: 0, dailyResetAt: null, dailyMissions: [], weeklyMissions: [], lastDailyMissionResetAt: null, lastWeeklyMissionResetAt: null, lastAttendanceDate: null },
    settings: { bgmVolume: 0.7, sfxVolume: 0.8, screenShake: true, showDamageNumbers: true, colorblindMode: 'off' },
    selectedDeck: ['laser', 'plasma', 'emp', 'shield'],
  };

  localStorage.setItem('gld-save-data', JSON.stringify(v3Save));
  const result = parseSave();

  expect(result).not.toBeNull();
  expect(result!.version).toBe(4);
  expect(result!.selectedDeck).toEqual(['archer', 'plasma', 'emp', 'shield']);
  expect(result!.collection[0].defId).toBe('archer');
  expect(result!.collection[1].defId).toBe('twin_archer');
  expect(result!.collection[2].defId).toBe('plasma'); // unchanged
});
```

- [ ] **Step 2: 테스트 실행 확인 (실패)**

Run: `cd packages/web-shell && npx vitest run src/stores/__tests__/metaStore-migration.test.ts`
Expected: FAIL — version 3에 대한 migration 없음

- [ ] **Step 3: SAVE_VERSION 증가**

`packages/shared/src/types/save.ts` line 1:
```typescript
export const SAVE_VERSION = 4;
```

- [ ] **Step 4: 마이그레이션 함수 추가**

`packages/web-shell/src/stores/meta/persistence.ts`의 `SAVE_MIGRATIONS` 객체에 추가:

```typescript
3: (data) => {
  const selectedDeck = (data.selectedDeck ?? []) as string[];
  const collection = (data.collection ?? []) as Array<Record<string, unknown>>;

  const renameId = (id: string) =>
    id === 'laser' ? 'archer' : id === 'twin_laser' ? 'twin_archer' : id;

  return {
    ...data,
    version: 4,
    selectedDeck: selectedDeck.map(renameId),
    collection: collection.map((t) => ({
      ...t,
      defId: renameId(t.defId as string),
    })),
  };
},
```

- [ ] **Step 5: 테스트 재실행 (통과)**

Run: `cd packages/web-shell && npx vitest run src/stores/__tests__/metaStore-migration.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add packages/shared/src/types/save.ts packages/web-shell/src/stores/meta/persistence.ts packages/web-shell/src/stores/__tests__/metaStore-migration.test.ts
git commit -m "feat: add save migration v3→v4 for laser→archer tower ID rename"
```

---

### Task 3: 전체 빌드 + 테스트 통과 확인

- [ ] **Step 1: 전체 빌드**

Run: `pnpm build`
Expected: 빌드 성공

- [ ] **Step 2: 전체 테스트**

Run: `pnpm test`
Expected: 모든 테스트 통과. 실패하는 테스트가 있으면 sed가 놓친 참조를 수동 수정.

- [ ] **Step 3: 실패 테스트 수정 (있을 경우)**

grep으로 실패 원인 파악:
```bash
grep -rn "laser" packages/ scripts/ --include="*.ts" --include="*.tsx" --include="*.json" | grep -v node_modules | grep -v dist
```

수동으로 남은 참조 수정 후 재테스트.

- [ ] **Step 4: 에셋 생성 검증**

Run: `pnpm generate-assets`
Expected: 모든 에셋이 archer/arrow 이름으로 생성

- [ ] **Step 5: Commit (수정 있을 경우)**

```bash
git add -A
git commit -m "fix: resolve remaining laser references after sed rename"
```

---

### Task 4: 화살 투사체 렌더링 구현

**Files:**
- Modify: `packages/phaser-game/src/systems/TowerSystem.ts`
- Test: `packages/phaser-game/tests/TowerSystemCombat.test.ts`

- [ ] **Step 1: 테스트 작성 — archer 타워가 'arrow' 스타일을 생성하는지 확인**

`packages/phaser-game/tests/TowerSystemCombat.test.ts`에 추가:

```typescript
it('archer tower produces arrow-style attack lines', () => {
  const pos = placeTowerAndGetWorld(towerSystem, gridManager, 'archer');
  const unitPositions = [
    { instanceId: 'u1', x: pos.worldX + 32, y: pos.worldY, hp: 100, element: 'neutral' as const },
  ];

  towerSystem.update(2000, 16, unitPositions);

  const lines = (towerSystem as any).attackLines;
  expect(lines.length).toBe(1);
  expect(lines[0].style).toBe('arrow');
});
```

- [ ] **Step 2: 테스트 실행 (실패)**

Run: `cd packages/phaser-game && npx vitest run tests/TowerSystemCombat.test.ts`
Expected: FAIL — style은 'beam' 반환

- [ ] **Step 3: attackLines 타입에 'arrow' 추가 + maxTtl 필드**

`TowerSystem.ts` line 48-56 (attackLines 타입 전체 교체):
```typescript
private attackLines: Array<{
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: number;
  ttl: number;
  maxTtl: number;
  style: 'beam' | 'arc' | 'arrow';
  arrowIndex?: number;
}> = [];
```

`maxTtl`을 추가하여 alpha 계산 시 style별 분기를 제거한다.

- [ ] **Step 4: 스타일 결정 로직 변경**

`TowerSystem.ts`의 attackLines.push 부분 (현재 line 358):

```typescript
// Before:
const style = this.hasSplash(special) ? 'arc' as const : 'beam' as const;

// After:
const style = this.hasSplash(special)
  ? 'arc' as const
  : (def.type === 'archer' || def.type === 'twin_archer')
    ? 'arrow' as const
    : 'beam' as const;
```

- [ ] **Step 5: 화살 오브젝트 풀 추가**

클래스 필드 추가 (line 47 부근):
```typescript
private arrowPool: Phaser.GameObjects.Image[] = [];
private static readonly ARROW_POOL_SIZE = 16;
```

constructor 말미에 풀 초기화 호출 추가:
```typescript
this.initArrowPool();
```

새 메서드:
```typescript
private initArrowPool(): void {
  const textureKey = 'projectile-arrow';
  if (!this.scene.textures.exists(textureKey)) return;
  for (let i = 0; i < TowerSystem.ARROW_POOL_SIZE; i++) {
    const arrow = this.scene.add.image(0, 0, textureKey);
    arrow.setVisible(false);
    arrow.setDepth(25);
    arrow.setDisplaySize(24, 6);
    this.arrowPool.push(arrow);
  }
}
```

- [ ] **Step 6: 발사 시 풀에서 화살 할당**

attackLines.push 코드를 변경:
```typescript
let arrowIndex: number | undefined;
if (style === 'arrow') {
  const idx = this.arrowPool.findIndex((a) => !a.visible);
  if (idx >= 0) arrowIndex = idx;
}
const maxTtl = style === 'arrow' ? 120 : 80;
this.attackLines.push({
  x1: towerWorld.x,
  y1: towerWorld.y,
  x2: closestUnit.x,
  y2: closestUnit.y,
  color,
  ttl: maxTtl,
  maxTtl,
  style,
  arrowIndex,
});
```

- [ ] **Step 7: arrow 렌더링 분기 구현**

렌더링 루프 (현재 line 454-502)에서, TTL 만료 체크 직후에 arrow 반환 로직 추가, 그리고 기존 `if (line.style === 'arc')` 앞에 arrow 분기 추가:

TTL 만료 시 화살 반환 (line 459 직후):
```typescript
if (line.ttl <= 0) {
  if (line.arrowIndex != null && this.arrowPool[line.arrowIndex]) {
    this.arrowPool[line.arrowIndex].setVisible(false);
  }
  continue;
}
```

alpha 계산도 `maxTtl`을 사용하도록 변경 (기존 `line.ttl / 80`):
```typescript
const alpha = line.ttl / line.maxTtl;
```

arrow 렌더링 (arc 분기 앞에 추가):
```typescript
if (line.style === 'arrow') {
  const t = 1 - line.ttl / line.maxTtl; // 0→1 as arrow flies
  const dx = line.x2 - line.x1;
  const dy = line.y2 - line.y1;
  const px = line.x1 + dx * t;
  const py = line.y1 + dy * t - Math.sin(t * Math.PI) * 15; // low arc (15px)

  // Rotation angle (tangent direction)
  const nextT = Math.min(t + 0.05, 1);
  const nx = line.x1 + dx * nextT;
  const ny = line.y1 + dy * nextT - Math.sin(nextT * Math.PI) * 15;
  const angle = Math.atan2(ny - py, nx - px);

  if (line.arrowIndex != null && this.arrowPool[line.arrowIndex]) {
    const arrow = this.arrowPool[line.arrowIndex];
    arrow.setPosition(px, py);
    arrow.setRotation(angle);
    arrow.setAlpha(alpha);
    arrow.setVisible(true);
  } else {
    // Fallback: draw arrow with graphics if pool exhausted
    this.attackGraphics.fillStyle(line.color, alpha);
    this.attackGraphics.fillCircle(px, py, 3);
  }

  // Trail line behind arrow
  if (t > 0.08) {
    const trailT = t - 0.08;
    const trailX = line.x1 + dx * trailT;
    const trailY = line.y1 + dy * trailT - Math.sin(trailT * Math.PI) * 15;
    this.attackGraphics.lineStyle(1, line.color, alpha * 0.3);
    this.attackGraphics.beginPath();
    this.attackGraphics.moveTo(trailX, trailY);
    this.attackGraphics.lineTo(px, py);
    this.attackGraphics.strokePath();
  }
} else if (line.style === 'arc') {
```

- [ ] **Step 8: impact flash 조건 수정**

현재 코드 (line 496):
```typescript
// Before:
if (line.style !== 'arc' && line.ttl > 50) {

// After:
if (line.style === 'beam' && line.ttl > 50) {
```

화살은 자체 impact VFX(`projectile-hit-flash` sprite)를 이미 사용하므로 beam의 white circle은 불필요.

- [ ] **Step 9: destroy 시 attackLines 정리 + 풀 파괴**

`destroy()` 메서드 (line 614)에 추가. attackLines를 먼저 비워서 풀 참조를 해제한 뒤 풀을 파괴:
```typescript
// Release all in-flight arrows before destroying pool
for (const line of this.attackLines) {
  if (line.arrowIndex != null && this.arrowPool[line.arrowIndex]) {
    this.arrowPool[line.arrowIndex].setVisible(false);
  }
}
this.attackLines.length = 0;
for (const arrow of this.arrowPool) arrow.destroy();
this.arrowPool.length = 0;
```

- [ ] **Step 10: 테스트 재실행 (통과)**

Run: `cd packages/phaser-game && npx vitest run tests/TowerSystemCombat.test.ts`
Expected: PASS

- [ ] **Step 11: Commit**

```bash
git add packages/phaser-game/src/systems/TowerSystem.ts packages/phaser-game/tests/TowerSystemCombat.test.ts
git commit -m "feat: add arrow projectile style with low-arc flight, sprite pool, and trail line"
```

---

### Task 5: 사운드 레시피 변경

**Files:**
- Modify: `packages/phaser-game/src/audio/SoundGenerator.ts`

- [ ] **Step 1: archer 사운드 레시피 변경**

`SoundGenerator.ts`의 `playTowerAttack` recipes 객체 (현재 archer 키):

```typescript
archer: {
  frequency: 400,
  endFrequency: 200,
  duration: 80,
  type: 'triangle',
  volume: 0.12,
},
twin_archer: {
  frequency: 500,
  endFrequency: 250,
  duration: 70,
  type: 'triangle',
  volume: 0.14,
},
```

- [ ] **Step 2: noise sub-layer 변경**

```typescript
} else if (towerType === 'archer' || towerType === 'twin_archer') {
  // Bowstring snap + arrow whoosh
  this.playNoise({
    noiseType: 'white',
    duration: 15,
    volume: 0.04,
    filterType: 'bandpass',
    filterFreq: 2000,
    filterQ: 3,
  });
}
```

- [ ] **Step 3: Commit**

```bash
git add packages/phaser-game/src/audio/SoundGenerator.ts
git commit -m "feat: change archer tower sound from laser synth to bowstring snap"
```

---

### Task 6: 발사 애니메이션 개선

**Files:**
- Modify: `scripts/generate-assets/generate-towers.ts`

- [ ] **Step 1: archer fire 프레임 개선**

`generate-towers.ts`의 `drawFireFrame` → `case 'archer':` 분기를 교체:

```typescript
case 'archer': {
  // 0: idle → 1: bow draw → 2: release flash → 3-5: arrow flies → 6: impact glow → 7: settle
  const bowX = cx - 4;
  const bowY = 38;

  if (frame >= 1 && frame <= 2) {
    // Bow body (curved line)
    drawLine(ctx, bowX, bowY - 8, bowX, bowY + 8, PALETTE.wood);
    drawLine(ctx, bowX - 1, bowY - 6, bowX - 1, bowY + 6, PALETTE.woodDark);
    // Bowstring
    const pullBack = frame === 1 ? 4 : 0;
    drawLine(ctx, bowX, bowY - 8, bowX + pullBack + 2, bowY, hexToRgba(PALETTE.white, 0.6));
    drawLine(ctx, bowX, bowY + 8, bowX + pullBack + 2, bowY, hexToRgba(PALETTE.white, 0.6));
    // Arrow nocked (frame 1 only)
    if (frame === 1) {
      drawLine(ctx, bowX + 2, bowY, bowX + 12, bowY, PALETTE.wood);
      setPixel(ctx, bowX + 12, bowY - 1, PALETTE.stoneLight);
      setPixel(ctx, bowX + 12, bowY + 1, PALETTE.stoneLight);
    }
  }
  if (frame === 2) {
    addGlow(ctx, bowX + 6, bowY, 6, tower.color, 0.5);
  }
  if (frame >= 3 && frame <= 5) {
    const dist = (frame - 2) * 7;
    drawLine(ctx, cx + dist, bowY, cx + dist + 6, bowY, tower.color);
    setPixel(ctx, cx + dist + 6, bowY - 1, PALETTE.stoneLight);
    setPixel(ctx, cx + dist + 6, bowY + 1, PALETTE.stoneLight);
    if (frame === 3) addGlow(ctx, cx + dist, bowY, 3, tower.color, 0.3);
  }
  if (frame === 6) addGlow(ctx, cx + 28, bowY, 5, tower.color, 0.2);
  // frame 7: settle back to idle
  break;
}
```

- [ ] **Step 2: 에셋 재생성**

Run: `pnpm generate-assets`
Expected: `archer-fire.png` 스프라이트시트에 활 동작 반영

- [ ] **Step 3: 생성 에셋 시각 확인**

Read tool로 `packages/web-shell/public/assets/towers/archer-fire.png` 확인.

- [ ] **Step 4: Commit**

```bash
git add scripts/generate-assets/generate-towers.ts packages/web-shell/public/assets/
git commit -m "feat: improve archer tower fire animation with bow-drawing motion"
```

---

### Task 7: 전체 검증

- [ ] **Step 1: 전체 빌드**

Run: `pnpm build`
Expected: 성공

- [ ] **Step 2: 전체 테스트**

Run: `pnpm test`
Expected: 모든 테스트 통과

- [ ] **Step 3: laser 잔여 참조 최종 확인**

```bash
grep -rn "laser" packages/ scripts/ --include="*.ts" --include="*.tsx" --include="*.json" | grep -v node_modules | grep -v dist
```
Expected: 0 결과

- [ ] **Step 4: 브라우저 확인**

게임 실행 후:
1. 궁수탑 배치
2. 적이 범위 내 진입 시 화살이 낮은 포물선으로 날아가는지 확인
3. 화살 뒤에 trail line이 보이는지 확인
4. 화살이 진행 방향으로 회전하는지 확인
5. 발사 시 활시위 소리 재생 확인
6. 발사 애니메이션에 활 동작이 보이는지 확인
