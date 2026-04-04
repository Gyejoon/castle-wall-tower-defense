# Asset Production Roadmap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** PVP 잔재를 제거하고 PVE 핵심 에셋 95개를 6 Batch에 걸쳐 추가하여 234→329개로 확장한다.

**Architecture:** 기존 `@napi-rs/canvas` 절차적 파이프라인을 확장한다. 각 Batch는 기존 생성기 수정 + 신규 생성기 추가로 구성되며, `generate-all.ts`의 `Promise.all` 배열에 등록한다. 모든 에셋은 `ManifestEntry[]`를 반환하고 `asset-manifest.json`에 자동 통합된다.

**Tech Stack:** TypeScript, @napi-rs/canvas, Bun, Vitest, sharp (WebP)

**Spec:** `docs/superpowers/specs/2026-04-04-asset-production-roadmap-design.md`

---

## File Structure Overview

### 수정 대상

| 파일 | Batch | 변경 |
|------|-------|------|
| `scripts/generate-assets/generate-all.ts` | 0,1,2,4 | 생성기 추가/제거 |
| `scripts/generate-assets/generate-towers.ts` | 1 | 속성 색상 악센트 |
| `scripts/generate-assets/generate-units.ts` | 1 | 속성 틴팅, titan 보스 스케일 |
| `scripts/generate-assets/generate-projectiles.ts` | 1 | 속성별 변형 3종 |
| `scripts/generate-assets/generate-vfx.ts` | 1,2,4 | 보스/강화/가챠 FX |
| `scripts/generate-assets/generate-ui.ts` | 1,2,3,5 | PVE UI 확장 |
| `scripts/generate-assets/generate-tiles.ts` | 3 | 멀티 팔레트 |
| `scripts/generate-assets/generate-tileset.ts` | 3 | 테마별 생성 |
| `scripts/generate-assets/generate-map.ts` | 3 | 멀티 스테이지 |
| `scripts/generate-assets/shared.ts` | 1 | 속성 색상 상수 추가 |

### 신규 생성

| 파일 | Batch | 용도 |
|------|-------|------|
| `scripts/generate-assets/generate-result-ui.ts` | 1 | PVE 결과 화면 |
| `scripts/generate-assets/generate-rarity-frames.ts` | 2 | 등급 프레임/카드 |
| `scripts/generate-assets/generate-tutorial-ui.ts` | 4 | 튜토리얼 UI |
| `scripts/generate-assets/generate-gacha-ui.ts` | 4 | 가챠/상자 UI |

### 폐기

| 파일 | Batch | 사유 |
|------|-------|------|
| `scripts/generate-assets/generate-pressure-ui.ts` | 0 | PVP 잔재 |
| `scripts/generate-assets/generate-match-ui.ts` | 1 | result-ui로 대체 |

### 테스트

| 파일 | Batch |
|------|-------|
| `scripts/generate-assets/__tests__/generate-all.test.ts` | 0 (수정) |
| `scripts/generate-assets/__tests__/batch0-pvp-cleanup.test.ts` | 0 |
| `scripts/generate-assets/__tests__/batch1-elements.test.ts` | 1 |
| `scripts/generate-assets/__tests__/batch2-rarity.test.ts` | 2 |
| `scripts/generate-assets/__tests__/batch3-stages.test.ts` | 3 |
| `scripts/generate-assets/__tests__/batch4-tutorial-gacha.test.ts` | 4 |
| `scripts/generate-assets/__tests__/batch5-shop-mission.test.ts` | 5 |

---

## Batch 0: PVP 정리 (−10 에셋)

### Task 1: generate-pressure-ui 제거

**Files:**
- Modify: `scripts/generate-assets/generate-all.ts:8-11,64-66,91-94,117`
- Delete: `scripts/generate-assets/generate-pressure-ui.ts`
- Modify: `scripts/generate-assets/__tests__/generate-all.test.ts`

- [ ] **Step 1: generate-all.ts에서 pressure-ui import 및 호출 제거**

```typescript
// generate-all.ts — 제거할 줄들:
// import { generate as generatePressureUi } from './generate-pressure-ui';
// Promise.all 내부의 generatePressureUi() 호출
// pressureUi 변수 destructuring
// ...pressureUi 스프레드
```

generate-all.ts를 열어서:
1. `import { generate as generatePressureUi }` import 줄 삭제
2. Promise.all 내 `generatePressureUi().then(...)` 블록 삭제
3. destructuring에서 `pressureUi` 제거
4. `allEntries` 스프레드에서 `...pressureUi` 제거

- [ ] **Step 2: generate-pressure-ui.ts 파일 삭제**

```bash
rm scripts/generate-assets/generate-pressure-ui.ts
```

- [ ] **Step 3: 생성 실행 확인**

```bash
bun run scripts/generate-assets/generate-all.ts
```

Expected: 성공. pressure-* 에셋이 더 이상 생성되지 않음.

- [ ] **Step 4: 기존 pressure 에셋 파일 삭제**

```bash
rm -f packages/web-shell/public/assets/ui/pressure-*.png
rm -f packages/web-shell/public/assets/ui/pressure-*.webp
```

- [ ] **Step 5: 테스트 실행**

```bash
bun test
```

Expected: 모든 테스트 통과. (generate-all.test.ts가 pressure 관련 assertion이 없는지 확인, 있으면 제거)

- [ ] **Step 6: 커밋**

```bash
git add -A scripts/generate-assets/ packages/web-shell/public/assets/
git commit -m "refactor(assets): remove PVP pressure-ui generator"
```

### Task 2: generate-match-ui deprecated 태깅 및 PVP 전용 에셋 정리

**Files:**
- Modify: `scripts/generate-assets/generate-match-ui.ts:1-5`
- Modify: `scripts/generate-assets/generate-all.ts`

- [ ] **Step 1: generate-match-ui.ts 상단에 deprecated 주석 추가**

```typescript
/**
 * @deprecated Batch 0 — PVP match UI. Will be replaced by generate-result-ui.ts in Batch 1.
 * PVE에서 재사용 가능한 에셋: victory-confetti
 * 폐기 대상: match-draw, ghost-avatar, stat-icons, pressure-attack-effect, ghost-spawn
 */
```

- [ ] **Step 2: generate-all.ts에서 match-ui를 조건부로 유지**

match-ui 생성기는 아직 유지한다 (Batch 1에서 result-ui로 교체 시 제거).
현재는 deprecated 주석만 추가하고 실행은 유지.

- [ ] **Step 3: 매니페스트에서 PVP 전용 키 식별 및 문서화**

다음 키들이 Batch 1에서 제거/교체 대상임을 확인:
- `ui-match-draw`, `ui-match-defeat`, `ui-ghost-avatar`, `ui-stat-icons`
- `ui-pressure-attack-effect`, `ui-ghost-spawn`

- [ ] **Step 4: 테스트 실행**

```bash
bun test
```

- [ ] **Step 5: 커밋**

```bash
git add scripts/generate-assets/generate-match-ui.ts
git commit -m "chore(assets): tag match-ui generator as deprecated (PVP cleanup)"
```

---

## Batch 1: 속성/보스/결과 (+25 에셋)

### Task 3: shared.ts에 속성 색상 상수 추가

**Files:**
- Modify: `scripts/generate-assets/shared.ts`

- [ ] **Step 1: PALETTE에 element 색상 추가**

`shared.ts`의 PALETTE 객체에 추가:

```typescript
// Element colors (속성 색상)
elementFire:      '#e74c3c',  // 화 속성
elementFireGlow:  '#ff6b4a',  // 화 속성 글로우
elementWater:     '#3498db',  // 수 속성
elementWaterGlow: '#5dade2',  // 수 속성 글로우
elementLightning: '#f39c12',  // 번개 속성
elementLightningGlow: '#f7b731', // 번개 속성 글로우
elementNeutral:   '#c8a04a',  // 무 속성 (기존 laser 색상)
```

- [ ] **Step 2: ELEMENT_COLORS 매핑 상수 export**

```typescript
export const ELEMENT_COLORS = {
  fire:      { primary: PALETTE.elementFire, glow: PALETTE.elementFireGlow },
  water:     { primary: PALETTE.elementWater, glow: PALETTE.elementWaterGlow },
  lightning: { primary: PALETTE.elementLightning, glow: PALETTE.elementLightningGlow },
  neutral:   { primary: PALETTE.elementNeutral, glow: PALETTE.gold },
} as const;

export type ElementType = keyof typeof ELEMENT_COLORS;
```

- [ ] **Step 3: 커밋**

```bash
git add scripts/generate-assets/shared.ts
git commit -m "feat(assets): add element color constants to shared palette"
```

### Task 4: 속성 뱃지 오버레이 (generate-vfx.ts 수정)

**Files:**
- Modify: `scripts/generate-assets/generate-vfx.ts`

- [ ] **Step 1: generate-vfx.ts에 속성 뱃지 생성 함수 추가**

기존 `generate()` 함수 내에서, 현재 VFX 에셋 생성 뒤에 추가:

```typescript
// Element badge overlays (16x16 each)
for (const [element, colors] of Object.entries(ELEMENT_COLORS)) {
  const canvas = makeCanvas(16, 16);
  const ctx = canvas.getContext('2d');
  // 8px 원형 뱃지: 속성 색상 원 + 1px 어두운 테두리
  fillCircle(ctx, 8, 8, 6, colors.primary);
  drawCircle(ctx, 8, 8, 7, PALETTE.shadow);
  // 속성별 심볼: fire=불꽃, water=물방울, lightning=번개, neutral=원
  drawElementSymbol(ctx, element as ElementType, 8, 8);

  const filename = `element-badge-${element}.png`;
  saveCanvas(canvas, `${OUTPUT_DIR}/${filename}`);
  entries.push({
    key: `vfx-element-badge-${element}`,
    type: 'image',
    path: `assets/vfx/${filename}`,
  });
}
```

- [ ] **Step 2: drawElementSymbol 헬퍼 함수 추가**

```typescript
function drawElementSymbol(ctx: SKRSContext2D, element: ElementType, cx: number, cy: number): void {
  const white = PALETTE.white;
  switch (element) {
    case 'fire':
      // 작은 불꽃 (3px)
      setPixel(ctx, cx, cy - 2, white);
      setPixel(ctx, cx - 1, cy - 1, white);
      setPixel(ctx, cx + 1, cy - 1, white);
      setPixel(ctx, cx, cy, white);
      break;
    case 'water':
      // 물방울 (3px)
      setPixel(ctx, cx, cy - 2, white);
      setPixel(ctx, cx - 1, cy, white);
      setPixel(ctx, cx + 1, cy, white);
      setPixel(ctx, cx, cy + 1, white);
      break;
    case 'lightning':
      // 번개 (4px 지그재그)
      setPixel(ctx, cx, cy - 2, white);
      setPixel(ctx, cx + 1, cy - 1, white);
      setPixel(ctx, cx - 1, cy, white);
      setPixel(ctx, cx, cy + 1, white);
      break;
    case 'neutral':
      // 작은 다이아몬드
      setPixel(ctx, cx, cy - 1, white);
      setPixel(ctx, cx - 1, cy, white);
      setPixel(ctx, cx + 1, cy, white);
      setPixel(ctx, cx, cy + 1, white);
      break;
  }
}
```

- [ ] **Step 3: 생성 실행 및 확인**

```bash
bun run scripts/generate-assets/generate-all.ts
ls packages/web-shell/public/assets/vfx/element-badge-*.png
```

Expected: `element-badge-fire.png`, `element-badge-water.png`, `element-badge-lightning.png`, `element-badge-neutral.png` 4개 생성

- [ ] **Step 4: 커밋**

```bash
git add scripts/generate-assets/generate-vfx.ts packages/web-shell/public/assets/
git commit -m "feat(assets): add element badge overlays (4 x 16x16)"
```

### Task 5: 속성별 투사체 변형 (generate-projectiles.ts 수정)

**Files:**
- Modify: `scripts/generate-assets/generate-projectiles.ts`

- [ ] **Step 1: 기존 투사체에 속성 변형 생성 추가**

generate-projectiles.ts의 `generate()` 함수에 추가. 기존 4종 투사체(laser-beam, plasma-bolt, emp-pulse, hit-flash) 생성 후:

```typescript
// Element projectile variants (fire, water, lightning)
const elementVariants: Array<{ element: ElementType; baseName: string }> = [
  { element: 'fire', baseName: 'fire-bolt' },
  { element: 'water', baseName: 'ice-shard' },
  { element: 'lightning', baseName: 'spark-chain' },
];

for (const { element, baseName } of elementVariants) {
  const colors = ELEMENT_COLORS[element];
  const FRAME_W = 16;
  const FRAME_H = 16;
  const FRAMES = 4;
  const canvas = makeCanvas(FRAME_W * FRAMES, FRAME_H);
  const ctx = canvas.getContext('2d');

  for (let f = 0; f < FRAMES; f++) {
    const ox = f * FRAME_W;
    // 속성 색상으로 투사체 드로잉
    fillCircle(ctx, ox + 8, 8, 4 + f, colors.primary);
    addGlow(ctx, ox + 8, 8, 6 + f, colors.glow, 0.3);
  }

  const filename = `${baseName}.png`;
  saveCanvas(canvas, `${OUTPUT_DIR}/${filename}`);
  entries.push({
    key: `projectile-${baseName}`,
    type: 'spritesheet',
    path: `assets/projectiles/${filename}`,
    frameWidth: FRAME_W,
    frameHeight: FRAME_H,
    frameCount: FRAMES,
  });
}
```

- [ ] **Step 2: 속성별 히트 플래시 변형 추가**

```typescript
// Element hit flash variants
for (const [element, colors] of Object.entries(ELEMENT_COLORS)) {
  if (element === 'neutral') continue; // neutral은 기존 hit-flash 사용
  const FRAME_W = 16;
  const FRAME_H = 16;
  const FRAMES = 4;
  const canvas = makeCanvas(FRAME_W * FRAMES, FRAME_H);
  const ctx = canvas.getContext('2d');

  for (let f = 0; f < FRAMES; f++) {
    const ox = f * FRAME_W;
    const radius = 3 + f * 2;
    // 히트 플래시: 확장되는 원
    fillCircle(ctx, ox + 8, 8, radius, colors.primary);
    if (f < 3) addGlow(ctx, ox + 8, 8, radius + 2, colors.glow, 0.4 - f * 0.1);
  }

  const filename = `hit-flash-${element}.png`;
  saveCanvas(canvas, `${OUTPUT_DIR}/${filename}`);
  entries.push({
    key: `projectile-hit-flash-${element}`,
    type: 'spritesheet',
    path: `assets/projectiles/${filename}`,
    frameWidth: FRAME_W,
    frameHeight: FRAME_H,
    frameCount: FRAMES,
  });
}
```

- [ ] **Step 3: shared.ts에서 ELEMENT_COLORS import 추가**

```typescript
import { ELEMENT_COLORS, type ElementType } from './shared';
```

- [ ] **Step 4: 생성 실행 및 확인**

```bash
bun run scripts/generate-assets/generate-all.ts
ls packages/web-shell/public/assets/projectiles/
```

Expected: 기존 4 + 새 6 (fire-bolt, ice-shard, spark-chain, hit-flash-fire, hit-flash-water, hit-flash-lightning) = 10개 파일

- [ ] **Step 5: 커밋**

```bash
git add scripts/generate-assets/generate-projectiles.ts packages/web-shell/public/assets/
git commit -m "feat(assets): add element projectile variants and hit flashes"
```

### Task 6: titan 보스 에셋 (generate-units.ts 수정)

**Files:**
- Modify: `scripts/generate-assets/generate-units.ts`

- [ ] **Step 1: titan 보스 확대 스프라이트 생성 추가**

generate-units.ts의 `generate()` 함수에 추가. 기존 유닛 생성 루프 후:

```typescript
// Boss titan — enlarged sprite (96x96 static + walk cycle)
const BOSS_SIZE = 96;
const bossCanvas = makeCanvas(BOSS_SIZE, BOSS_SIZE);
const bossCtx = bossCanvas.getContext('2d');
// drawAncientDragon을 스케일 업하여 96x96에 그리기
// 기존 drawAncientDragon은 40x48에 그리므로, 2.0x 스케일로 재그리기
drawBossDragon(bossCtx, BOSS_SIZE);
saveCanvas(bossCanvas, `${OUTPUT_DIR}/titan-boss.png`);
entries.push({
  key: 'unit-titan-boss',
  type: 'image',
  path: 'assets/units/titan-boss.png',
});

// Boss titan phase 2 — rage variant (red tint intensified)
const bossP2Canvas = makeCanvas(BOSS_SIZE, BOSS_SIZE);
const bossP2Ctx = bossP2Canvas.getContext('2d');
drawBossDragon(bossP2Ctx, BOSS_SIZE);
// Apply rage tint: overlay red
applyColorTint(bossP2Ctx, BOSS_SIZE, BOSS_SIZE, PALETTE.fireRed, 0.3);
saveCanvas(bossP2Canvas, `${OUTPUT_DIR}/titan-boss-rage.png`);
entries.push({
  key: 'unit-titan-boss-rage',
  type: 'image',
  path: 'assets/units/titan-boss-rage.png',
});
```

- [ ] **Step 2: drawBossDragon 함수 구현**

```typescript
function drawBossDragon(ctx: SKRSContext2D, size: number): void {
  const cx = size / 2;
  const cy = size / 2;
  const scale = size / 48; // 48은 기존 FRAME_H

  // 몸통 (큰 타원)
  const bodyW = Math.floor(16 * scale);
  const bodyH = Math.floor(12 * scale);
  for (let dy = -bodyH; dy <= bodyH; dy++) {
    for (let dx = -bodyW; dx <= bodyW; dx++) {
      if ((dx * dx) / (bodyW * bodyW) + (dy * dy) / (bodyH * bodyH) <= 1) {
        setPixel(ctx, cx + dx, cy + dy, PALETTE.titan);
      }
    }
  }

  // 날개 (좌/우 삼각형)
  const wingSpan = Math.floor(20 * scale);
  for (let i = 0; i < wingSpan; i++) {
    const wingH = Math.floor((wingSpan - i) * 0.6);
    for (let dy = -wingH; dy <= 0; dy++) {
      setPixel(ctx, cx - bodyW - i, cy + dy, '#8b2020');
      setPixel(ctx, cx + bodyW + i, cy + dy, '#8b2020');
    }
  }

  // 머리 (상단 원)
  fillCircle(ctx, cx, cy - bodyH - Math.floor(4 * scale), Math.floor(6 * scale), PALETTE.titan);

  // 눈 (노란색)
  const eyeY = cy - bodyH - Math.floor(4 * scale);
  setPixel(ctx, cx - Math.floor(2 * scale), eyeY, PALETTE.gold);
  setPixel(ctx, cx + Math.floor(2 * scale), eyeY, PALETTE.gold);

  // 화염 오라 (하단 글로우)
  addGlow(ctx, cx, cy + bodyH, Math.floor(10 * scale), PALETTE.fireOrange, 0.2);
}
```

- [ ] **Step 3: applyColorTint 헬퍼 추가**

```typescript
function applyColorTint(ctx: SKRSContext2D, w: number, h: number, color: string, alpha: number): void {
  const imageData = ctx.getImageData(0, 0, w, h);
  const rgba = hexToRgba(color, alpha);
  const r = parseInt(rgba.slice(1, 3), 16);
  const g = parseInt(rgba.slice(3, 5), 16);
  const b = parseInt(rgba.slice(5, 7), 16);

  for (let i = 0; i < imageData.data.length; i += 4) {
    if (imageData.data[i + 3] > 0) { // 투명이 아닌 픽셀만
      imageData.data[i] = Math.min(255, imageData.data[i] + Math.floor(r * alpha));
      imageData.data[i + 1] = Math.min(255, imageData.data[i + 1] + Math.floor(g * alpha));
      imageData.data[i + 2] = Math.min(255, imageData.data[i + 2] + Math.floor(b * alpha));
    }
  }
  ctx.putImageData(imageData, 0, 0);
}
```

- [ ] **Step 4: 생성 실행 확인**

```bash
bun run scripts/generate-assets/generate-all.ts
ls -la packages/web-shell/public/assets/units/titan-boss*.png
```

Expected: `titan-boss.png` (96x96), `titan-boss-rage.png` (96x96)

- [ ] **Step 5: 커밋**

```bash
git add scripts/generate-assets/generate-units.ts packages/web-shell/public/assets/
git commit -m "feat(assets): add titan boss sprites (96x96 normal + rage)"
```

### Task 7: 보스 UI 에셋 (generate-vfx.ts + generate-ui.ts)

**Files:**
- Modify: `scripts/generate-assets/generate-vfx.ts`
- Modify: `scripts/generate-assets/generate-ui.ts`

- [ ] **Step 1: generate-vfx.ts에 보스 FX 추가**

```typescript
// Boss warning text — "WARNING" (256x64)
{
  const canvas = makeCanvas(256, 64);
  const ctx = canvas.getContext('2d');
  // 큰 빨간 글자 "WARNING" — 픽셀 아트로 렌더링
  ctx.fillStyle = PALETTE.fireRed;
  ctx.font = '32px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('WARNING', 128, 42);
  saveCanvas(canvas, `${VFX_DIR}/boss-warning.png`);
  entries.push({ key: 'vfx-boss-warning', type: 'image', path: 'assets/vfx/boss-warning.png' });
}

// "FINAL BOSS" text (256x64)
{
  const canvas = makeCanvas(256, 64);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = PALETTE.gold;
  ctx.font = '28px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('FINAL BOSS', 128, 42);
  saveCanvas(canvas, `${VFX_DIR}/boss-final.png`);
  entries.push({ key: 'vfx-boss-final', type: 'image', path: 'assets/vfx/boss-final.png' });
}

// Boss telegraph marker (64x64, danger zone)
{
  const canvas = makeCanvas(64, 64);
  const ctx = canvas.getContext('2d');
  // 빨간 반투명 원 + X 패턴
  fillCircle(ctx, 32, 32, 28, hexToRgba(PALETTE.fireRed, 0.4));
  drawLine(ctx, 8, 8, 56, 56, PALETTE.fireRed);
  drawLine(ctx, 56, 8, 8, 56, PALETTE.fireRed);
  saveCanvas(canvas, `${VFX_DIR}/boss-telegraph.png`);
  entries.push({ key: 'vfx-boss-telegraph', type: 'image', path: 'assets/vfx/boss-telegraph.png' });
}

// Boss death FX (256x64, 4 frames)
{
  const FW = 64, FH = 64, FRAMES = 4;
  const canvas = makeCanvas(FW * FRAMES, FH);
  const ctx = canvas.getContext('2d');
  for (let f = 0; f < FRAMES; f++) {
    const ox = f * FW;
    const radius = 10 + f * 8;
    fillCircle(ctx, ox + 32, 32, radius, PALETTE.fireOrange);
    addGlow(ctx, ox + 32, 32, radius + 4, PALETTE.gold, 0.5 - f * 0.1);
  }
  saveCanvas(canvas, `${VFX_DIR}/boss-death-fx.png`);
  entries.push({
    key: 'vfx-boss-death-fx', type: 'spritesheet',
    path: 'assets/vfx/boss-death-fx.png',
    frameWidth: FW, frameHeight: FH, frameCount: FRAMES,
  });
}
```

- [ ] **Step 2: generate-ui.ts에 보스 HP바 + 에너지 게이지 추가**

```typescript
// Boss HP bar (256x16)
{
  const canvas = makeCanvas(256, 16);
  const ctx = canvas.getContext('2d');
  // 배경 (어두운)
  drawRect(ctx, 0, 0, 256, 16, PALETTE.shadow);
  // HP 바 (빨간 그라데이션)
  drawRect(ctx, 2, 2, 252, 12, PALETTE.fireRed);
  // 하이라이트
  drawRect(ctx, 2, 2, 252, 4, hexToRgba(PALETTE.white, 0.2));
  saveCanvas(canvas, `${UI_DIR}/boss-hp-bar.png`);
  entries.push({ key: 'ui-boss-hp-bar', type: 'image', path: 'assets/ui/boss-hp-bar.png' });
}

// Energy gauge (128x16)
{
  const canvas = makeCanvas(128, 16);
  const ctx = canvas.getContext('2d');
  drawRect(ctx, 0, 0, 128, 16, PALETTE.shadow);
  drawRect(ctx, 2, 2, 124, 12, PALETTE.magicBlue);
  drawRect(ctx, 2, 2, 124, 4, hexToRgba(PALETTE.white, 0.2));
  saveCanvas(canvas, `${UI_DIR}/energy-gauge.png`);
  entries.push({ key: 'ui-energy-gauge', type: 'image', path: 'assets/ui/energy-gauge.png' });
}
```

- [ ] **Step 3: 생성 실행 확인**

```bash
bun run scripts/generate-assets/generate-all.ts
ls packages/web-shell/public/assets/vfx/boss-*.png
ls packages/web-shell/public/assets/ui/boss-hp-bar.png packages/web-shell/public/assets/ui/energy-gauge.png
```

- [ ] **Step 4: 커밋**

```bash
git add scripts/generate-assets/generate-vfx.ts scripts/generate-assets/generate-ui.ts packages/web-shell/public/assets/
git commit -m "feat(assets): add boss UI (warning, telegraph, death FX, HP bar, energy gauge)"
```

### Task 8: PVE 결과 화면 (generate-result-ui.ts 신규)

**Files:**
- Create: `scripts/generate-assets/generate-result-ui.ts`
- Modify: `scripts/generate-assets/generate-all.ts`

- [ ] **Step 1: generate-result-ui.ts 생성**

```typescript
import { mkdirSync } from 'fs';
import type { ManifestEntry } from './shared';
import { makeCanvas, saveCanvas, drawRect, PALETTE, hexToRgba, addGlow } from './shared';

const OUTPUT_DIR = 'packages/web-shell/public/assets/ui';

export async function generate(): Promise<ManifestEntry[]> {
  mkdirSync(OUTPUT_DIR, { recursive: true });
  const entries: ManifestEntry[] = [];

  // Defense Success — "STAGE CLEAR" (256x128)
  {
    const canvas = makeCanvas(256, 128);
    const ctx = canvas.getContext('2d');
    // 금빛 배경 글로우
    addGlow(ctx, 128, 64, 80, PALETTE.gold, 0.15);
    // 텍스트
    ctx.fillStyle = PALETTE.gold;
    ctx.font = 'bold 36px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('STAGE', 128, 50);
    ctx.fillText('CLEAR', 128, 90);
    saveCanvas(canvas, `${OUTPUT_DIR}/defense-success.png`);
    entries.push({ key: 'ui-defense-success', type: 'image', path: 'assets/ui/defense-success.png' });
  }

  // Defense Failed — "DEFENSE FAILED" (256x128)
  {
    const canvas = makeCanvas(256, 128);
    const ctx = canvas.getContext('2d');
    addGlow(ctx, 128, 64, 80, PALETTE.fireRed, 0.15);
    ctx.fillStyle = PALETTE.fireRed;
    ctx.font = 'bold 32px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('DEFENSE', 128, 50);
    ctx.fillText('FAILED', 128, 90);
    saveCanvas(canvas, `${OUTPUT_DIR}/defense-fail.png`);
    entries.push({ key: 'ui-defense-fail', type: 'image', path: 'assets/ui/defense-fail.png' });
  }

  return entries;
}

if (import.meta.main) {
  generate().then((e) => console.log(JSON.stringify(e, null, 2)));
}
```

- [ ] **Step 2: generate-all.ts에 result-ui 추가, match-ui 제거**

```typescript
// 추가:
import { generate as generateResultUi } from './generate-result-ui';

// Promise.all에 추가:
generateResultUi().then((result) => { console.log('[result-ui] done'); return result; }),

// 제거:
// import { generate as generateMatchUi } from './generate-match-ui';
// generateMatchUi() 호출, matchUi 변수, ...matchUi 스프레드
```

- [ ] **Step 3: generate-match-ui.ts 파일 삭제**

```bash
rm scripts/generate-assets/generate-match-ui.ts
```

- [ ] **Step 4: 기존 match-ui 에셋 중 PVP 전용 파일 삭제**

```bash
rm -f packages/web-shell/public/assets/ui/match-draw.png
rm -f packages/web-shell/public/assets/ui/match-defeat.png
rm -f packages/web-shell/public/assets/ui/ghost-avatar.png
rm -f packages/web-shell/public/assets/ui/stat-icons.png
rm -f packages/web-shell/public/assets/ui/pressure-attack-effect.png
rm -f packages/web-shell/public/assets/ui/ghost-spawn.png
# WebP 파일도 삭제
rm -f packages/web-shell/public/assets/ui/match-draw.webp
rm -f packages/web-shell/public/assets/ui/match-defeat.webp
rm -f packages/web-shell/public/assets/ui/ghost-avatar.webp
rm -f packages/web-shell/public/assets/ui/stat-icons.webp
rm -f packages/web-shell/public/assets/ui/pressure-attack-effect.webp
rm -f packages/web-shell/public/assets/ui/ghost-spawn.webp
```

Note: `match-victory.png`와 `victory-confetti.png`는 PVE에서도 사용 가능하므로 유지하되, 이후 result-ui가 대체하면 삭제.

- [ ] **Step 5: 생성 실행 및 테스트**

```bash
bun run scripts/generate-assets/generate-all.ts
bun test
```

- [ ] **Step 6: 커밋**

```bash
git add -A scripts/generate-assets/ packages/web-shell/public/assets/
git commit -m "feat(assets): add PVE result-ui, remove PVP match-ui generator"
```

### Task 9: Batch 1 통합 테스트

**Files:**
- Create: `scripts/generate-assets/__tests__/batch1-elements.test.ts`

- [ ] **Step 1: Batch 1 에셋 존재 검증 테스트 작성**

```typescript
import { describe, it, expect } from 'vitest';
import { existsSync } from 'fs';

const ASSETS_DIR = 'packages/web-shell/public/assets';

describe('Batch 1: element/boss/result assets', () => {
  it('element badges exist (4 files)', () => {
    for (const element of ['fire', 'water', 'lightning', 'neutral']) {
      expect(existsSync(`${ASSETS_DIR}/vfx/element-badge-${element}.png`)).toBe(true);
    }
  });

  it('element projectile variants exist (3 files)', () => {
    for (const name of ['fire-bolt', 'ice-shard', 'spark-chain']) {
      expect(existsSync(`${ASSETS_DIR}/projectiles/${name}.png`)).toBe(true);
    }
  });

  it('element hit flashes exist (3 files)', () => {
    for (const element of ['fire', 'water', 'lightning']) {
      expect(existsSync(`${ASSETS_DIR}/projectiles/hit-flash-${element}.png`)).toBe(true);
    }
  });

  it('titan boss sprites exist', () => {
    expect(existsSync(`${ASSETS_DIR}/units/titan-boss.png`)).toBe(true);
    expect(existsSync(`${ASSETS_DIR}/units/titan-boss-rage.png`)).toBe(true);
  });

  it('boss VFX exist', () => {
    expect(existsSync(`${ASSETS_DIR}/vfx/boss-warning.png`)).toBe(true);
    expect(existsSync(`${ASSETS_DIR}/vfx/boss-final.png`)).toBe(true);
    expect(existsSync(`${ASSETS_DIR}/vfx/boss-telegraph.png`)).toBe(true);
    expect(existsSync(`${ASSETS_DIR}/vfx/boss-death-fx.png`)).toBe(true);
  });

  it('PVE result screens exist', () => {
    expect(existsSync(`${ASSETS_DIR}/ui/defense-success.png`)).toBe(true);
    expect(existsSync(`${ASSETS_DIR}/ui/defense-fail.png`)).toBe(true);
  });

  it('boss HP bar and energy gauge exist', () => {
    expect(existsSync(`${ASSETS_DIR}/ui/boss-hp-bar.png`)).toBe(true);
    expect(existsSync(`${ASSETS_DIR}/ui/energy-gauge.png`)).toBe(true);
  });

  it('PVP assets are removed', () => {
    expect(existsSync(`${ASSETS_DIR}/ui/match-draw.png`)).toBe(false);
    expect(existsSync(`${ASSETS_DIR}/ui/ghost-avatar.png`)).toBe(false);
    expect(existsSync(`${ASSETS_DIR}/ui/pressure-attack-effect.png`)).toBe(false);
  });
});
```

- [ ] **Step 2: 테스트 실행**

```bash
bun test scripts/generate-assets/__tests__/batch1-elements.test.ts
```

Expected: 모든 테스트 통과

- [ ] **Step 3: 전체 테스트 실행**

```bash
bun test
```

- [ ] **Step 4: 커밋**

```bash
git add scripts/generate-assets/__tests__/batch1-elements.test.ts
git commit -m "test(assets): add Batch 1 element/boss/result asset verification"
```

---

## Batch 2: 등급/강화 UI (+20 에셋)

### Task 10: generate-rarity-frames.ts 신규 생성기

**Files:**
- Create: `scripts/generate-assets/generate-rarity-frames.ts`
- Modify: `scripts/generate-assets/generate-all.ts`

- [ ] **Step 1: generate-rarity-frames.ts 생성**

```typescript
import { mkdirSync } from 'fs';
import type { ManifestEntry } from './shared';
import {
  makeCanvas, saveCanvas, drawRect, drawCircle, fillCircle,
  addGlow, PALETTE, hexToRgba,
} from './shared';

const OUTPUT_DIR = 'packages/web-shell/public/assets/ui';

const TIERS = [
  { name: 'common', color: PALETTE.tierCommon, glow: false },
  { name: 'rare', color: PALETTE.tierRare, glow: true },
  { name: 'heroic', color: PALETTE.tierHeroic, glow: true },
  { name: 'legendary', color: PALETTE.tierLegendary, glow: true },
  { name: 'god', color: PALETTE.tierGod, glow: true },
] as const;

export async function generate(): Promise<ManifestEntry[]> {
  mkdirSync(OUTPUT_DIR, { recursive: true });
  const entries: ManifestEntry[] = [];

  // Rarity frames (72x72 each, 5 tiers)
  for (const tier of TIERS) {
    const canvas = makeCanvas(72, 72);
    const ctx = canvas.getContext('2d');
    // 외곽 프레임 (4px 테두리)
    drawRect(ctx, 0, 0, 72, 72, tier.color);
    drawRect(ctx, 4, 4, 64, 64, PALETTE.shadow); // 내부 어둡게
    // 코너 장식
    for (const [cx, cy] of [[4, 4], [67, 4], [4, 67], [67, 67]]) {
      fillCircle(ctx, cx, cy, 3, tier.color);
    }
    if (tier.glow) {
      addGlow(ctx, 36, 36, 40, tier.color, 0.1);
    }
    saveCanvas(canvas, `${OUTPUT_DIR}/rarity-frame-${tier.name}.png`);
    entries.push({
      key: `ui-rarity-frame-${tier.name}`, type: 'image',
      path: `assets/ui/rarity-frame-${tier.name}.png`,
    });
  }

  // Tower card backgrounds (80x120 each, 5 tiers)
  for (const tier of TIERS) {
    const canvas = makeCanvas(80, 120);
    const ctx = canvas.getContext('2d');
    drawRect(ctx, 0, 0, 80, 120, PALETTE.shadow);
    drawRect(ctx, 2, 2, 76, 116, tier.color);
    drawRect(ctx, 4, 4, 72, 112, hexToRgba(PALETTE.shadow, 0.8));
    if (tier.glow) {
      addGlow(ctx, 40, 60, 50, tier.color, 0.08);
    }
    saveCanvas(canvas, `${OUTPUT_DIR}/tower-card-${tier.name}.png`);
    entries.push({
      key: `ui-tower-card-${tier.name}`, type: 'image',
      path: `assets/ui/tower-card-${tier.name}.png`,
    });
  }

  // Promotion glow overlays (72x72, 3 tiers: rare/heroic/legendary)
  for (const tier of TIERS.filter((t) => ['rare', 'heroic', 'legendary'].includes(t.name))) {
    const canvas = makeCanvas(72, 72);
    const ctx = canvas.getContext('2d');
    addGlow(ctx, 36, 36, 32, tier.color, 0.4);
    addGlow(ctx, 36, 36, 24, PALETTE.white, 0.2);
    saveCanvas(canvas, `${OUTPUT_DIR}/promotion-glow-${tier.name}.png`);
    entries.push({
      key: `ui-promotion-glow-${tier.name}`, type: 'image',
      path: `assets/ui/promotion-glow-${tier.name}.png`,
    });
  }

  // Level badge (24x24)
  {
    const canvas = makeCanvas(24, 24);
    const ctx = canvas.getContext('2d');
    fillCircle(ctx, 12, 12, 10, PALETTE.shadow);
    fillCircle(ctx, 12, 12, 8, PALETTE.gold);
    saveCanvas(canvas, `${OUTPUT_DIR}/level-badge.png`);
    entries.push({ key: 'ui-level-badge', type: 'image', path: 'assets/ui/level-badge.png' });
  }

  return entries;
}

if (import.meta.main) {
  generate().then((e) => console.log(JSON.stringify(e, null, 2)));
}
```

- [ ] **Step 2: generate-all.ts에 rarity-frames 추가**

```typescript
import { generate as generateRarityFrames } from './generate-rarity-frames';
// Promise.all에 추가:
generateRarityFrames().then((result) => { console.log('[rarity-frames] done'); return result; }),
```

- [ ] **Step 3: 생성 실행 확인**

```bash
bun run scripts/generate-assets/generate-all.ts
ls packages/web-shell/public/assets/ui/rarity-frame-*.png
ls packages/web-shell/public/assets/ui/tower-card-*.png
ls packages/web-shell/public/assets/ui/promotion-glow-*.png
```

Expected: rarity-frame 5 + tower-card 5 + promotion-glow 3 + level-badge 1 = 14개

- [ ] **Step 4: 커밋**

```bash
git add scripts/generate-assets/generate-rarity-frames.ts scripts/generate-assets/generate-all.ts packages/web-shell/public/assets/
git commit -m "feat(assets): add rarity frames, tower cards, promotion glows (Batch 2)"
```

### Task 11: 강화/승급 버튼 및 이펙트

**Files:**
- Modify: `scripts/generate-assets/generate-ui.ts`
- Modify: `scripts/generate-assets/generate-vfx.ts`

- [ ] **Step 1: generate-ui.ts에 강화/승급 버튼 추가**

```typescript
// Upgrade button (120x40, 3 states: available/unavailable/complete)
const BUTTON_STATES = [
  { name: 'available', bg: PALETTE.gold, text: PALETTE.shadow },
  { name: 'unavailable', bg: PALETTE.gray, text: PALETTE.shadow },
  { name: 'complete', bg: '#2ecc71', text: PALETTE.white },
];
for (const state of BUTTON_STATES) {
  const canvas = makeCanvas(120, 40);
  const ctx = canvas.getContext('2d');
  drawRect(ctx, 0, 0, 120, 40, PALETTE.shadow);
  drawRect(ctx, 2, 2, 116, 36, state.bg);
  drawRect(ctx, 2, 2, 116, 8, hexToRgba(PALETTE.white, 0.15));
  saveCanvas(canvas, `${UI_DIR}/upgrade-btn-${state.name}.png`);
  entries.push({
    key: `ui-upgrade-btn-${state.name}`, type: 'image',
    path: `assets/ui/upgrade-btn-${state.name}.png`,
  });
}

// Promotion button (120x40, 2 states)
for (const state of [{ name: 'available', bg: PALETTE.tierHeroic }, { name: 'unavailable', bg: PALETTE.gray }]) {
  const canvas = makeCanvas(120, 40);
  const ctx = canvas.getContext('2d');
  drawRect(ctx, 0, 0, 120, 40, PALETTE.shadow);
  drawRect(ctx, 2, 2, 116, 36, state.bg);
  saveCanvas(canvas, `${UI_DIR}/promote-btn-${state.name}.png`);
  entries.push({
    key: `ui-promote-btn-${state.name}`, type: 'image',
    path: `assets/ui/promote-btn-${state.name}.png`,
  });
}
```

- [ ] **Step 2: generate-vfx.ts에 강화/승급 이펙트 추가**

```typescript
// Upgrade success/fail effects (256x64, 4 frames each)
for (const result of ['success', 'fail']) {
  const FW = 64, FH = 64, FRAMES = 4;
  const canvas = makeCanvas(FW * FRAMES, FH);
  const ctx = canvas.getContext('2d');
  const color = result === 'success' ? PALETTE.gold : PALETTE.fireRed;
  for (let f = 0; f < FRAMES; f++) {
    const ox = f * FW;
    const r = 8 + f * 6;
    fillCircle(ctx, ox + 32, 32, r, color);
    addGlow(ctx, ox + 32, 32, r + 4, PALETTE.white, 0.3 - f * 0.07);
  }
  saveCanvas(canvas, `${VFX_DIR}/upgrade-${result}-fx.png`);
  entries.push({
    key: `vfx-upgrade-${result}-fx`, type: 'spritesheet',
    path: `assets/vfx/upgrade-${result}-fx.png`,
    frameWidth: FW, frameHeight: FH, frameCount: FRAMES,
  });
}
```

- [ ] **Step 3: 생성 실행 및 커밋**

```bash
bun run scripts/generate-assets/generate-all.ts
git add scripts/generate-assets/generate-ui.ts scripts/generate-assets/generate-vfx.ts packages/web-shell/public/assets/
git commit -m "feat(assets): add upgrade/promote buttons and effects (Batch 2)"
```

---

## Batch 3: 멀티 스테이지 (+30 에셋)

### Task 12: generate-tiles.ts 멀티 팔레트 확장

**Files:**
- Modify: `scripts/generate-assets/generate-tiles.ts`
- Modify: `scripts/generate-assets/shared.ts`

- [ ] **Step 1: shared.ts에 스테이지 팔레트 추가**

```typescript
export const STAGE_PALETTES = {
  forest_gate: {
    ground: { light: PALETTE.gridLight, dark: PALETTE.gridDark },
    path: { main: PALETTE.dirtPath, dark: PALETTE.dirtDark },
    accent: PALETTE.foliageVibrant,
  },
  lava_fortress: {
    ground: { light: '#5a3020', dark: '#3a1a10' },
    path: { main: '#c04020', dark: '#802010' },
    accent: '#e07020',
  },
  storm_citadel: {
    ground: { light: '#2a2a4a', dark: '#1a1a3a' },
    path: { main: '#4060c0', dark: '#2040a0' },
    accent: '#8060e0',
  },
} as const;

export type StageId = keyof typeof STAGE_PALETTES;
```

- [ ] **Step 2: generate-tiles.ts를 멀티 팔레트로 리팩터**

기존 forest-only 로직을 `generateTilesForStage(stageId)` 함수로 추출하고, 3개 스테이지를 루프:

```typescript
import { STAGE_PALETTES, type StageId } from './shared';

export async function generate(): Promise<ManifestEntry[]> {
  const entries: ManifestEntry[] = [];
  for (const stageId of Object.keys(STAGE_PALETTES) as StageId[]) {
    const stageEntries = await generateTilesForStage(stageId);
    entries.push(...stageEntries);
  }
  return entries;
}

async function generateTilesForStage(stageId: StageId): Promise<ManifestEntry[]> {
  const palette = STAGE_PALETTES[stageId];
  const stageDir = `${OUTPUT_DIR}/${stageId}`;
  mkdirSync(stageDir, { recursive: true });
  const entries: ManifestEntry[] = [];
  // ... 기존 타일 생성 로직을 palette 기반으로 변환 ...
  return entries;
}
```

- [ ] **Step 3: 생성 실행 확인**

```bash
bun run scripts/generate-assets/generate-all.ts
ls packages/web-shell/public/assets/tiles/
```

Expected: forest_gate/, lava_fortress/, storm_citadel/ 3개 디렉토리

- [ ] **Step 4: 커밋**

```bash
git add scripts/generate-assets/generate-tiles.ts scripts/generate-assets/shared.ts packages/web-shell/public/assets/
git commit -m "feat(assets): multi-palette tile generation (forest/lava/storm)"
```

### Task 13: 멀티 스테이지 맵 + 장식 + 선택 UI

**Files:**
- Modify: `scripts/generate-assets/generate-map.ts`
- Modify: `scripts/generate-assets/generate-tileset.ts`
- Modify: `scripts/generate-assets/generate-ui.ts`

- [ ] **Step 1: generate-map.ts에 lava_fortress, storm_citadel 맵 추가**

기존 `generateMap()` 함수를 `generateMapForStage(stageId, config)` 으로 추출. 각 스테이지별 경로 수:
- forest_gate: 1경로 (기존)
- lava_fortress: 2경로
- storm_citadel: 3경로

```typescript
const STAGE_CONFIGS = {
  forest_gate: { pathCount: 1, width: 8, height: 18 },
  lava_fortress: { pathCount: 2, width: 8, height: 18 },
  storm_citadel: { pathCount: 3, width: 8, height: 18 },
} as const;
```

- [ ] **Step 2: generate-ui.ts에 스테이지 선택 썸네일 추가**

```typescript
// Stage select thumbnails (128x96 each, 3 stages)
const STAGES = [
  { id: 'forest_gate', name: 'Forest Gate', color: PALETTE.foliageVibrant },
  { id: 'lava_fortress', name: 'Lava Fortress', color: PALETTE.fireRed },
  { id: 'storm_citadel', name: 'Storm Citadel', color: '#4060c0' },
];
for (const stage of STAGES) {
  const canvas = makeCanvas(128, 96);
  const ctx = canvas.getContext('2d');
  drawRect(ctx, 0, 0, 128, 96, stage.color);
  drawRect(ctx, 4, 4, 120, 88, hexToRgba(PALETTE.shadow, 0.5));
  ctx.fillStyle = PALETTE.white;
  ctx.font = '12px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(stage.name, 64, 54);
  saveCanvas(canvas, `${UI_DIR}/stage-thumb-${stage.id}.png`);
  entries.push({
    key: `ui-stage-thumb-${stage.id}`, type: 'image',
    path: `assets/ui/stage-thumb-${stage.id}.png`,
  });
}

// Lock/unlock icons (32x32 each)
for (const state of ['locked', 'unlocked']) {
  const canvas = makeCanvas(32, 32);
  const ctx = canvas.getContext('2d');
  const color = state === 'locked' ? PALETTE.gray : PALETTE.gold;
  fillCircle(ctx, 16, 16, 12, color);
  // 잠금: X, 해제: 체크
  if (state === 'locked') {
    drawLine(ctx, 10, 10, 22, 22, PALETTE.shadow);
    drawLine(ctx, 22, 10, 10, 22, PALETTE.shadow);
  } else {
    drawLine(ctx, 10, 16, 14, 22, PALETTE.shadow);
    drawLine(ctx, 14, 22, 24, 10, PALETTE.shadow);
  }
  saveCanvas(canvas, `${UI_DIR}/icon-${state}.png`);
  entries.push({ key: `ui-icon-${state}`, type: 'image', path: `assets/ui/icon-${state}.png` });
}
```

- [ ] **Step 3: 생성 실행, 테스트, 커밋**

```bash
bun run scripts/generate-assets/generate-all.ts
bun test
git add -A scripts/generate-assets/ packages/web-shell/public/assets/
git commit -m "feat(assets): multi-stage maps, thumbnails, lock/unlock icons (Batch 3)"
```

---

## Batch 4: 튜토리얼/가챠 (+15 에셋)

### Task 14: generate-tutorial-ui.ts 신규

**Files:**
- Create: `scripts/generate-assets/generate-tutorial-ui.ts`
- Modify: `scripts/generate-assets/generate-all.ts`

- [ ] **Step 1: generate-tutorial-ui.ts 생성**

```typescript
import { mkdirSync } from 'fs';
import type { ManifestEntry } from './shared';
import { makeCanvas, saveCanvas, drawRect, drawLine, fillCircle, PALETTE, hexToRgba } from './shared';

const OUTPUT_DIR = 'packages/web-shell/public/assets/ui';

export async function generate(): Promise<ManifestEntry[]> {
  mkdirSync(OUTPUT_DIR, { recursive: true });
  const entries: ManifestEntry[] = [];

  // Highlight frame (64x64, animated border)
  {
    const canvas = makeCanvas(64, 64);
    const ctx = canvas.getContext('2d');
    // 노란 점선 테두리
    for (let i = 0; i < 64; i += 4) {
      drawRect(ctx, i, 0, 2, 2, PALETTE.gold);
      drawRect(ctx, i, 62, 2, 2, PALETTE.gold);
      drawRect(ctx, 0, i, 2, 2, PALETTE.gold);
      drawRect(ctx, 62, i, 2, 2, PALETTE.gold);
    }
    saveCanvas(canvas, `${OUTPUT_DIR}/tutorial-highlight.png`);
    entries.push({ key: 'ui-tutorial-highlight', type: 'image', path: 'assets/ui/tutorial-highlight.png' });
  }

  // Arrow indicators (4 directions, 32x32 each)
  const DIRS = [
    { name: 'up', dx: 0, dy: -1 },
    { name: 'down', dx: 0, dy: 1 },
    { name: 'left', dx: -1, dy: 0 },
    { name: 'right', dx: 1, dy: 0 },
  ];
  for (const dir of DIRS) {
    const canvas = makeCanvas(32, 32);
    const ctx = canvas.getContext('2d');
    const cx = 16, cy = 16;
    // 화살표 몸통
    fillCircle(ctx, cx, cy, 6, PALETTE.gold);
    // 화살표 머리
    const tipX = cx + dir.dx * 12;
    const tipY = cy + dir.dy * 12;
    drawLine(ctx, cx, cy, tipX, tipY, PALETTE.gold);
    fillCircle(ctx, tipX, tipY, 3, PALETTE.gold);
    saveCanvas(canvas, `${OUTPUT_DIR}/tutorial-arrow-${dir.name}.png`);
    entries.push({
      key: `ui-tutorial-arrow-${dir.name}`, type: 'image',
      path: `assets/ui/tutorial-arrow-${dir.name}.png`,
    });
  }

  // Hint bubble (128x64)
  {
    const canvas = makeCanvas(128, 64);
    const ctx = canvas.getContext('2d');
    // 둥근 배경
    drawRect(ctx, 4, 4, 120, 48, PALETTE.white);
    drawRect(ctx, 2, 2, 124, 52, hexToRgba(PALETTE.shadow, 0.3));
    // 말풍선 꼬리 (하단 중앙)
    for (let i = 0; i < 8; i++) {
      drawRect(ctx, 60 + i, 52 + i, 8 - i * 2, 1, PALETTE.white);
    }
    saveCanvas(canvas, `${OUTPUT_DIR}/tutorial-hint-bubble.png`);
    entries.push({ key: 'ui-tutorial-hint-bubble', type: 'image', path: 'assets/ui/tutorial-hint-bubble.png' });
  }

  return entries;
}

if (import.meta.main) {
  generate().then((e) => console.log(JSON.stringify(e, null, 2)));
}
```

- [ ] **Step 2: generate-all.ts에 tutorial-ui 추가**

- [ ] **Step 3: 생성 실행 확인 및 커밋**

```bash
bun run scripts/generate-assets/generate-all.ts
git add scripts/generate-assets/generate-tutorial-ui.ts scripts/generate-assets/generate-all.ts packages/web-shell/public/assets/
git commit -m "feat(assets): add tutorial UI (highlight, arrows, hint bubble)"
```

### Task 15: generate-gacha-ui.ts 신규

**Files:**
- Create: `scripts/generate-assets/generate-gacha-ui.ts`
- Modify: `scripts/generate-assets/generate-all.ts`
- Modify: `scripts/generate-assets/generate-vfx.ts`

- [ ] **Step 1: generate-gacha-ui.ts 생성**

```typescript
import { mkdirSync } from 'fs';
import type { ManifestEntry } from './shared';
import { makeCanvas, saveCanvas, drawRect, fillCircle, addGlow, PALETTE, hexToRgba } from './shared';

const OUTPUT_DIR = 'packages/web-shell/public/assets/ui';

const BOXES = [
  { name: 'free', color: PALETTE.wood, accent: PALETTE.woodLight },
  { name: 'ad', color: PALETTE.magicBlue, accent: '#6080ff' },
  { name: 'diamond', color: PALETTE.tierRare, accent: PALETTE.white },
  { name: 'premium', color: PALETTE.tierGod, accent: PALETTE.tierGodBright },
];

export async function generate(): Promise<ManifestEntry[]> {
  mkdirSync(OUTPUT_DIR, { recursive: true });
  const entries: ManifestEntry[] = [];

  // Box sprites (64x64 each)
  for (const box of BOXES) {
    const canvas = makeCanvas(64, 64);
    const ctx = canvas.getContext('2d');
    // 상자 본체
    drawRect(ctx, 12, 20, 40, 32, box.color);
    drawRect(ctx, 14, 22, 36, 28, hexToRgba(box.color, 0.8));
    // 뚜껑
    drawRect(ctx, 8, 14, 48, 8, box.accent);
    // 잠금 장식 (중앙)
    fillCircle(ctx, 32, 36, 6, box.accent);
    if (box.name === 'premium') {
      addGlow(ctx, 32, 32, 24, box.accent, 0.15);
    }
    saveCanvas(canvas, `${OUTPUT_DIR}/gacha-box-${box.name}.png`);
    entries.push({
      key: `ui-gacha-box-${box.name}`, type: 'image',
      path: `assets/ui/gacha-box-${box.name}.png`,
    });
  }

  // Box open animation (256x64, 4 frames)
  {
    const FW = 64, FH = 64, FRAMES = 4;
    const canvas = makeCanvas(FW * FRAMES, FH);
    const ctx = canvas.getContext('2d');
    for (let f = 0; f < FRAMES; f++) {
      const ox = f * FW;
      const lidOffset = f * 8; // 뚜껑이 점점 올라감
      // 상자 본체
      drawRect(ctx, ox + 12, 20, 40, 32, PALETTE.wood);
      // 뚜껑 (올라가는 애니메이션)
      drawRect(ctx, ox + 8, 14 - lidOffset, 48, 8, PALETTE.woodLight);
      // 빛 (프레임 2-3에서)
      if (f >= 2) {
        addGlow(ctx, ox + 32, 28, 16 + f * 4, PALETTE.gold, 0.2 + f * 0.1);
      }
    }
    saveCanvas(canvas, `${OUTPUT_DIR}/gacha-box-open.png`);
    entries.push({
      key: 'ui-gacha-box-open', type: 'spritesheet',
      path: 'assets/ui/gacha-box-open.png',
      frameWidth: FW, frameHeight: FH, frameCount: FRAMES,
    });
  }

  // "NEW!" badge (24x24)
  {
    const canvas = makeCanvas(24, 24);
    const ctx = canvas.getContext('2d');
    fillCircle(ctx, 12, 12, 10, PALETTE.fireRed);
    ctx.fillStyle = PALETTE.white;
    ctx.font = 'bold 8px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('NEW', 12, 15);
    saveCanvas(canvas, `${OUTPUT_DIR}/badge-new.png`);
    entries.push({ key: 'ui-badge-new', type: 'image', path: 'assets/ui/badge-new.png' });
  }

  return entries;
}

if (import.meta.main) {
  generate().then((e) => console.log(JSON.stringify(e, null, 2)));
}
```

- [ ] **Step 2: generate-vfx.ts에 등급 공개 FX 추가**

```typescript
// Gacha reveal FX (5 tiers, 256x64, 4 frames each)
const TIER_COLORS_FOR_FX = [
  { name: 'common', color: PALETTE.tierCommon },
  { name: 'rare', color: PALETTE.tierRare },
  { name: 'heroic', color: PALETTE.tierHeroic },
  { name: 'legendary', color: PALETTE.tierLegendary },
  { name: 'god', color: PALETTE.tierGod },
];
for (const tier of TIER_COLORS_FOR_FX) {
  const FW = 64, FH = 64, FRAMES = 4;
  const canvas = makeCanvas(FW * FRAMES, FH);
  const ctx = canvas.getContext('2d');
  for (let f = 0; f < FRAMES; f++) {
    const ox = f * FW;
    const r = 6 + f * 8;
    addGlow(ctx, ox + 32, 32, r, tier.color, 0.5);
    if (f >= 2) addGlow(ctx, ox + 32, 32, r / 2, PALETTE.white, 0.3);
  }
  saveCanvas(canvas, `${VFX_DIR}/gacha-reveal-${tier.name}.png`);
  entries.push({
    key: `vfx-gacha-reveal-${tier.name}`, type: 'spritesheet',
    path: `assets/vfx/gacha-reveal-${tier.name}.png`,
    frameWidth: FW, frameHeight: FH, frameCount: FRAMES,
  });
}
```

- [ ] **Step 3: generate-all.ts에 gacha-ui + tutorial-ui 추가**

- [ ] **Step 4: 생성 실행, 테스트, 커밋**

```bash
bun run scripts/generate-assets/generate-all.ts
bun test
git add -A scripts/generate-assets/ packages/web-shell/public/assets/
git commit -m "feat(assets): add gacha UI (boxes, open anim, reveal FX, NEW badge)"
```

---

## Batch 5: 상점/미션 (+15 에셋)

### Task 16: 상점/미션 UI (generate-ui.ts 확장)

**Files:**
- Modify: `scripts/generate-assets/generate-ui.ts`

- [ ] **Step 1: 화폐 아이콘 추가**

```typescript
// Gold icon (32x32)
{
  const canvas = makeCanvas(32, 32);
  const ctx = canvas.getContext('2d');
  fillCircle(ctx, 16, 16, 12, PALETTE.gold);
  fillCircle(ctx, 16, 16, 8, PALETTE.tierGodBright);
  ctx.fillStyle = PALETTE.shadow;
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('G', 16, 20);
  saveCanvas(canvas, `${UI_DIR}/icon-gold.png`);
  entries.push({ key: 'ui-icon-gold', type: 'image', path: 'assets/ui/icon-gold.png' });
}

// Diamond icon (32x32)
{
  const canvas = makeCanvas(32, 32);
  const ctx = canvas.getContext('2d');
  fillCircle(ctx, 16, 16, 12, PALETTE.tierRare);
  fillCircle(ctx, 16, 16, 8, PALETTE.white);
  ctx.fillStyle = PALETTE.shadow;
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('D', 16, 20);
  saveCanvas(canvas, `${UI_DIR}/icon-diamond.png`);
  entries.push({ key: 'ui-icon-diamond', type: 'image', path: 'assets/ui/icon-diamond.png' });
}
```

- [ ] **Step 2: 오퍼 카드, 버튼, 미션 아이콘 추가**

```typescript
// Offer card backgrounds (160x200, 3 price tiers)
for (const tier of [{ name: 'basic', color: PALETTE.wood }, { name: 'premium', color: PALETTE.tierRare }, { name: 'legendary', color: PALETTE.tierGod }]) {
  const canvas = makeCanvas(160, 200);
  const ctx = canvas.getContext('2d');
  drawRect(ctx, 0, 0, 160, 200, PALETTE.shadow);
  drawRect(ctx, 2, 2, 156, 196, tier.color);
  drawRect(ctx, 4, 4, 152, 192, hexToRgba(PALETTE.shadow, 0.7));
  saveCanvas(canvas, `${UI_DIR}/offer-card-${tier.name}.png`);
  entries.push({ key: `ui-offer-card-${tier.name}`, type: 'image', path: `assets/ui/offer-card-${tier.name}.png` });
}

// Buy button (120x40, 2 states)
for (const state of [{ name: 'available', bg: '#2ecc71' }, { name: 'unavailable', bg: PALETTE.gray }]) {
  const canvas = makeCanvas(120, 40);
  const ctx = canvas.getContext('2d');
  drawRect(ctx, 0, 0, 120, 40, PALETTE.shadow);
  drawRect(ctx, 2, 2, 116, 36, state.bg);
  saveCanvas(canvas, `${UI_DIR}/buy-btn-${state.name}.png`);
  entries.push({ key: `ui-buy-btn-${state.name}`, type: 'image', path: `assets/ui/buy-btn-${state.name}.png` });
}

// Mission icons (32x32 each, 4 types)
const MISSIONS = [
  { name: 'daily', color: PALETTE.gold, symbol: '☀' },
  { name: 'weekly', color: PALETTE.tierRare, symbol: '★' },
  { name: 'kill', color: PALETTE.fireRed, symbol: '⚔' },
  { name: 'build', color: PALETTE.foliageVibrant, symbol: '⚒' },
];
for (const mission of MISSIONS) {
  const canvas = makeCanvas(32, 32);
  const ctx = canvas.getContext('2d');
  fillCircle(ctx, 16, 16, 14, mission.color);
  fillCircle(ctx, 16, 16, 10, hexToRgba(PALETTE.shadow, 0.5));
  ctx.fillStyle = PALETTE.white;
  ctx.font = '14px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(mission.symbol, 16, 21);
  saveCanvas(canvas, `${UI_DIR}/mission-icon-${mission.name}.png`);
  entries.push({ key: `ui-mission-icon-${mission.name}`, type: 'image', path: `assets/ui/mission-icon-${mission.name}.png` });
}

// Complete checkmark (32x32)
{
  const canvas = makeCanvas(32, 32);
  const ctx = canvas.getContext('2d');
  fillCircle(ctx, 16, 16, 14, '#2ecc71');
  drawLine(ctx, 8, 16, 14, 24, PALETTE.white);
  drawLine(ctx, 14, 24, 26, 10, PALETTE.white);
  saveCanvas(canvas, `${UI_DIR}/icon-complete.png`);
  entries.push({ key: 'ui-icon-complete', type: 'image', path: 'assets/ui/icon-complete.png' });
}

// Ad button (120x40)
{
  const canvas = makeCanvas(120, 40);
  const ctx = canvas.getContext('2d');
  drawRect(ctx, 0, 0, 120, 40, PALETTE.shadow);
  drawRect(ctx, 2, 2, 116, 36, PALETTE.magicBlue);
  saveCanvas(canvas, `${UI_DIR}/ad-btn.png`);
  entries.push({ key: 'ui-ad-btn', type: 'image', path: 'assets/ui/ad-btn.png' });
}
```

- [ ] **Step 3: 생성 실행, 테스트, 커밋**

```bash
bun run scripts/generate-assets/generate-all.ts
bun test
git add scripts/generate-assets/generate-ui.ts packages/web-shell/public/assets/
git commit -m "feat(assets): add shop/mission UI — currency, offers, missions, buttons (Batch 5)"
```

---

## Final: 전체 검증

### Task 17: 전체 에셋 검증 및 정리

**Files:**
- Modify: `scripts/generate-assets/__tests__/generate-all.test.ts`

- [ ] **Step 1: 전체 에셋 생성 실행**

```bash
bun run scripts/generate-assets/generate-all.ts
```

Expected: 에러 없이 완료. "Total assets: ~329" 출력 확인.

- [ ] **Step 2: WebP 변환 확인**

```bash
find packages/web-shell/public/assets -name "*.png" | while read f; do [ -f "${f%.png}.webp" ] || echo "MISSING: ${f%.png}.webp"; done
```

Expected: MISSING 출력 없음

- [ ] **Step 3: 매니페스트 키 중복 확인**

```bash
bun -e "
const m = require('./packages/web-shell/public/assets/asset-manifest.json');
const keys = m.assets.map(a => a.key);
const dupes = keys.filter((k, i) => keys.indexOf(k) !== i);
if (dupes.length) { console.error('DUPLICATES:', dupes); process.exit(1); }
console.log('No duplicates. Total:', keys.length);
"
```

- [ ] **Step 4: 전체 테스트 실행**

```bash
bun test
bun lint
```

- [ ] **Step 5: 게임 실행 확인**

```bash
bun dev:web
# 브라우저에서 http://localhost:3000 접속
# 콘솔 에러 없음 확인
# 에셋 로딩 정상 확인
```

- [ ] **Step 6: 최종 커밋**

```bash
git add -A
git commit -m "chore(assets): verify full asset pipeline — 329 assets, no errors"
```
