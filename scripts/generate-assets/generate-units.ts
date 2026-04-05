import { makeCanvas, saveCanvas, PALETTE, hexToRgba, drawRect, fillCircle, drawCircle, setPixel, drawLine, drawPolygon, addGlow, drawIsoShadow, type ManifestEntry } from './shared';
import { mkdirSync, existsSync } from 'fs';

const OUTPUT_DIR = 'packages/web-shell/public/assets/units';

const FRAME_W = 40;
const FRAME_H = 48;
const REQUIRED_FILES = [
  'scout_drone.png',
  'battle_robot.png',
  'heavy_walker.png',
  'stealth_drone.png',
  'titan.png',
  'unit-death.png',
];

function drawShadow(ctx: ReturnType<typeof makeCanvas>['ctx'], ox: number): void {
  const cx = ox + 20;
  drawIsoShadow(ctx, cx, 43, 10, 5, 0.3);
}

function assertRequiredOutputs(): void {
  const missing = REQUIRED_FILES.filter((file) => !existsSync(`${OUTPUT_DIR}/${file}`));
  if (missing.length > 0) {
    throw new Error(`[units] missing required outputs: ${missing.join(', ')}`);
  }
}

function countOpaqueCoverage(canvas: ReturnType<typeof makeCanvas>['canvas'], x: number, y: number, w: number, h: number): number {
  const ctx = canvas.getContext('2d');
  const data = ctx.getImageData(x, y, w, h).data;
  let opaque = 0;
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] > 0) opaque++;
  }
  return opaque / (w * h);
}

function renderSheetWithGate(
  drawPrimary: (ctx: ReturnType<typeof makeCanvas>['ctx']) => void,
  drawFallback: (ctx: ReturnType<typeof makeCanvas>['ctx']) => void,
  canvas: ReturnType<typeof makeCanvas>['canvas'],
  ctx: ReturnType<typeof makeCanvas>['ctx'],
  gateLabel: string,
): boolean {
  drawPrimary(ctx);
  const coverage = countOpaqueCoverage(canvas, 0, 0, FRAME_W, FRAME_H);
  if (coverage >= 0.13 && coverage <= 0.52) {
    return false;
  }

  console.warn(`  [${gateLabel}] readability gate failed (${coverage.toFixed(2)}), using fallback silhouette`);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawFallback(ctx);
  return true;
}

// 고블린 정찰병: 초록 피부, 뾰족 귀, 가죽 갑옷, 단검
function drawGoblinScout(ctx: ReturnType<typeof makeCanvas>['ctx'], ox: number, frame: number): void {
  const cx = ox + 20;
  const bobY = frame === 1 ? -1 : frame === 3 ? 1 : 0;
  const legOff = frame % 2 === 0 ? 1 : -1;

  // Cloak and torso read as a hunched silhouette.
  drawRect(ctx, cx - 6, 17 + bobY, 12, 11, '#4c3f24');
  drawRect(ctx, cx - 4, 19 + bobY, 8, 5, '#6a5a3a');

  // Head (green) — wide enough to read at a glance.
  drawRect(ctx, cx - 4, 10 + bobY, 8, 8, PALETTE.scoutDrone);
  drawRect(ctx, cx - 4, 10 + bobY, 8, 1, '#5a8a3a');
  setPixel(ctx, cx - 5, 12 + bobY, PALETTE.scoutDrone);
  setPixel(ctx, cx + 5, 12 + bobY, PALETTE.scoutDrone);
  setPixel(ctx, cx - 6, 13 + bobY, PALETTE.scoutDrone);
  setPixel(ctx, cx + 6, 13 + bobY, PALETTE.scoutDrone);
  // Eyes
  setPixel(ctx, cx - 1, 13 + bobY, '#ff2020');
  setPixel(ctx, cx + 1, 13 + bobY, '#ff2020');

  // Legs — y 28..38
  drawRect(ctx, cx - 4, 28 + bobY, 4, 6 + legOff, '#5a4a2a');
  drawRect(ctx, cx + 1, 28 + bobY, 4, 6 - legOff, '#5a4a2a');

  // Dagger
  drawLine(ctx, cx + 6, 20 + bobY, cx + 10, 17 + bobY, '#b0b0b0');
  setPixel(ctx, cx + 10, 16 + bobY, PALETTE.white);
}

function drawGoblinScoutFallback(ctx: ReturnType<typeof makeCanvas>['ctx'], ox: number, frame: number): void {
  const cx = ox + 20;
  const bobY = frame === 1 ? -1 : frame === 3 ? 1 : 0;
  drawRect(ctx, cx - 5, 12 + bobY, 10, 11, PALETTE.scoutDrone);
  drawRect(ctx, cx - 4, 22 + bobY, 8, 8, '#4c3f24');
  drawRect(ctx, cx - 3, 30 + bobY, 3, 7, '#5a4a2a');
  drawRect(ctx, cx + 0, 30 + bobY, 3, 7, '#5a4a2a');
  setPixel(ctx, cx - 2, 16 + bobY, '#ff2020');
  setPixel(ctx, cx + 2, 16 + bobY, '#ff2020');
}

// 오크 전사: 회색 피부, 뿔 투구, 방패+도끼
function drawOrcWarrior(ctx: ReturnType<typeof makeCanvas>['ctx'], ox: number, frame: number): void {
  const cx = ox + 20;
  const bobY = frame === 1 ? -1 : frame === 3 ? 1 : 0;
  const legOff = frame % 2 === 0 ? 1 : -1;

  // Broad armor silhouette.
  drawRect(ctx, cx - 7, 18 + bobY, 14, 14, '#5a5a4a');
  drawRect(ctx, cx - 6, 19 + bobY, 12, 3, '#6a6a5a');

  // Head (gray-green) with horned helmet.
  drawRect(ctx, cx - 4, 9 + bobY, 8, 9, PALETTE.battleRobot);
  drawRect(ctx, cx - 6, 8 + bobY, 12, 3, '#4a4a3a');
  setPixel(ctx, cx - 6, 6 + bobY, '#4a4a3a');
  setPixel(ctx, cx + 6, 6 + bobY, '#4a4a3a');
  // Eyes
  setPixel(ctx, cx - 1, 13 + bobY, '#e0e000');
  setPixel(ctx, cx + 1, 13 + bobY, '#e0e000');

  // Shield (left)
  drawRect(ctx, cx - 11, 17 + bobY, 5, 12, '#6a4a2a');
  drawRect(ctx, cx - 11, 17 + bobY, 5, 1, '#8a6a4a');

  // Axe (right)
  drawLine(ctx, cx + 8, 14 + bobY, cx + 8, 29 + bobY, '#5a3a1a');
  drawRect(ctx, cx + 7, 13 + bobY, 5, 5, '#b0b0b0');
  setPixel(ctx, cx + 11, 13 + bobY, PALETTE.stoneLight);

  // Legs — y 32..41
  drawRect(ctx, cx - 5, 32 + bobY, 5, 7 + legOff, '#4a4a3a');
  drawRect(ctx, cx + 1, 32 + bobY, 5, 7 - legOff, '#4a4a3a');
}

function drawOrcWarriorFallback(ctx: ReturnType<typeof makeCanvas>['ctx'], ox: number, frame: number): void {
  const cx = ox + 20;
  const bobY = frame === 1 ? -1 : frame === 3 ? 1 : 0;
  drawRect(ctx, cx - 7, 16 + bobY, 14, 16, PALETTE.battleRobot);
  drawRect(ctx, cx - 10, 18 + bobY, 5, 12, '#6a4a2a');
  drawRect(ctx, cx + 6, 14 + bobY, 5, 14, '#b0b0b0');
  drawRect(ctx, cx - 4, 8 + bobY, 8, 8, '#4a4a3a');
  drawRect(ctx, cx - 5, 32 + bobY, 5, 8, '#4a4a3a');
  drawRect(ctx, cx + 1, 32 + bobY, 5, 8, '#4a4a3a');
}

// 돌 트롤: 육중한 몸, 돌 피부, 거대 곤봉
function drawStoneTroll(ctx: ReturnType<typeof makeCanvas>['ctx'], ox: number, frame: number): void {
  const cx = ox + 20;
  const bounceY = (frame === 1 || frame === 3) ? 1 : 0;

  // Massive stone torso.
  drawRect(ctx, cx - 9, 17 + bounceY, 18, 18, PALETTE.heavyWalker);
  drawRect(ctx, cx - 9, 17 + bounceY, 18, 2, PALETTE.stoneLight);
  drawRect(ctx, cx - 9, 33 + bounceY, 18, 2, PALETTE.stoneDark);

  // Head — broader and squat.
  drawRect(ctx, cx - 6, 8 + bounceY, 12, 10, PALETTE.heavyWalker);
  drawRect(ctx, cx - 6, 8 + bounceY, 12, 1, PALETTE.stoneLight);
  // Eyes (small, angry)
  setPixel(ctx, cx - 2, 12 + bounceY, '#e04020');
  setPixel(ctx, cx + 2, 12 + bounceY, '#e04020');
  // Underbite jaw
  drawRect(ctx, cx - 5, 17 + bounceY, 10, 2, '#6a6a5a');

  // Giant club (right hand)
  drawRect(ctx, cx + 10, 10 + bounceY, 4, 22, '#5a3a1a');
  drawRect(ctx, cx + 8, 8 + bounceY, 8, 6, '#4a3a1e');
  setPixel(ctx, cx + 10, 8 + bounceY, PALETTE.stoneDark);

  // Thick legs
  const leftOff = frame === 1 ? 1 : 0;
  const rightOff = frame === 3 ? 1 : 0;
  drawRect(ctx, cx - 7, 36 + bounceY, 6, 8 + leftOff, '#6a6a5a');
  drawRect(ctx, cx + 2, 36 + bounceY, 6, 8 + rightOff, '#6a6a5a');
}

function drawStoneTrollFallback(ctx: ReturnType<typeof makeCanvas>['ctx'], ox: number, frame: number): void {
  const cx = ox + 20;
  const bounceY = (frame === 1 || frame === 3) ? 1 : 0;
  drawRect(ctx, cx - 8, 16 + bounceY, 16, 18, PALETTE.heavyWalker);
  drawRect(ctx, cx - 5, 8 + bounceY, 10, 8, PALETTE.heavyWalker);
  drawRect(ctx, cx + 9, 9 + bounceY, 5, 20, '#5a3a1a');
  drawRect(ctx, cx - 6, 35 + bounceY, 5, 8, '#6a6a5a');
  drawRect(ctx, cx + 1, 35 + bounceY, 5, 8, '#6a6a5a');
}

// 그림자 암살자: 검은 망토, 빛나는 눈, 단검 2개
function drawShadowAssassin(ctx: ReturnType<typeof makeCanvas>['ctx'], ox: number, frame: number): void {
  const cx = ox + 20;
  const baseCy = 26;
  const alpha = (frame === 1 || frame === 3) ? 0.5 : 0.85;

  // Cloak (sharp triangular silhouette for instant recognition)
  for (let dy = -10; dy <= 10; dy++) {
    const w = dy < 0 ? 3 + Math.floor((dy + 10) * 0.6) : 7 - Math.floor(dy * 0.5);
    for (let dx = -w; dx <= w; dx++) {
      setPixel(ctx, cx + dx, baseCy + dy, hexToRgba(PALETTE.stealthDrone, alpha));
    }
  }
  // Inner cloak highlight
  for (let dy = -4; dy <= 4; dy++) {
    const w = 2 - Math.abs(Math.floor(dy * 0.5));
    for (let dx = -w; dx <= w; dx++) {
      setPixel(ctx, cx + dx, baseCy + dy, hexToRgba('#403060', alpha));
    }
  }

  // Glowing eyes
  setPixel(ctx, cx - 1, baseCy - 5, hexToRgba('#ff40ff', alpha));
  setPixel(ctx, cx + 1, baseCy - 5, hexToRgba('#ff40ff', alpha));

  // Twin daggers
  drawLine(ctx, cx - 6, baseCy + 4, cx - 10, baseCy + 0, hexToRgba('#c0c0c0', alpha));
  drawLine(ctx, cx + 6, baseCy + 4, cx + 10, baseCy + 0, hexToRgba('#c0c0c0', alpha));
  setPixel(ctx, cx - 10, baseCy - 1, hexToRgba(PALETTE.white, alpha));
  setPixel(ctx, cx + 10, baseCy - 1, hexToRgba(PALETTE.white, alpha));
}

function drawShadowAssassinFallback(ctx: ReturnType<typeof makeCanvas>['ctx'], ox: number, frame: number): void {
  const cx = ox + 20;
  const baseCy = 26;
  const alpha = (frame === 1 || frame === 3) ? 0.55 : 0.9;
  drawRect(ctx, cx - 6, baseCy - 9, 12, 20, hexToRgba(PALETTE.stealthDrone, alpha));
  drawRect(ctx, cx - 3, baseCy - 3, 6, 5, hexToRgba('#403060', alpha));
  setPixel(ctx, cx - 1, baseCy - 4, hexToRgba('#ff40ff', alpha));
  setPixel(ctx, cx + 1, baseCy - 4, hexToRgba('#ff40ff', alpha));
  drawLine(ctx, cx - 7, baseCy + 3, cx - 11, baseCy + 0, hexToRgba('#c0c0c0', alpha));
  drawLine(ctx, cx + 7, baseCy + 3, cx + 11, baseCy + 0, hexToRgba('#c0c0c0', alpha));
}

// 고대 드래곤: 큰 몸, 날개, 비늘, 불꽃 오라
function drawAncientDragon(ctx: ReturnType<typeof makeCanvas>['ctx'], ox: number, frame: number): void {
  const cx = ox + 20;
  const bodyCy = 26;
  const wingFlap = frame % 2 === 0 ? -3 : 3;

  // Wings (spread)
  // Left wing
  drawLine(ctx, cx - 5, bodyCy - 3, cx - 17, bodyCy - 10 + wingFlap, PALETTE.titan);
  drawLine(ctx, cx - 17, bodyCy - 10 + wingFlap, cx - 14, bodyCy - 1 + wingFlap, hexToRgba(PALETTE.titan, 0.6));
  drawLine(ctx, cx - 14, bodyCy - 1 + wingFlap, cx - 5, bodyCy + 4, hexToRgba(PALETTE.titan, 0.4));
  // Right wing
  drawLine(ctx, cx + 5, bodyCy - 3, cx + 17, bodyCy - 10 + wingFlap, PALETTE.titan);
  drawLine(ctx, cx + 17, bodyCy - 10 + wingFlap, cx + 14, bodyCy - 1 + wingFlap, hexToRgba(PALETTE.titan, 0.6));
  drawLine(ctx, cx + 14, bodyCy - 1 + wingFlap, cx + 5, bodyCy + 4, hexToRgba(PALETTE.titan, 0.4));

  // Body (large, scaled)
  fillCircle(ctx, cx, bodyCy, 9, hexToRgba(PALETTE.titan, 0.72));
  drawCircle(ctx, cx, bodyCy, 9, PALETTE.titan);
  // Scale pattern
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2;
    setPixel(ctx, cx + Math.round(5 * Math.cos(angle)), bodyCy + Math.round(5 * Math.sin(angle)), '#e06040');
  }

  // Head — y 10..18
  drawRect(ctx, cx - 5, 10, 10, 8, PALETTE.titan);
  drawRect(ctx, cx - 5, 10, 10, 1, '#e06040');
  // Horns
  setPixel(ctx, cx - 4, 8, '#4a3a1e');
  setPixel(ctx, cx + 4, 8, '#4a3a1e');
  setPixel(ctx, cx - 5, 7, '#4a3a1e');
  setPixel(ctx, cx + 5, 7, '#4a3a1e');
  // Eyes
  setPixel(ctx, cx - 1, 13, '#ffe040');
  setPixel(ctx, cx + 1, 13, '#ffe040');

  // Fire aura
  addGlow(ctx, cx, bodyCy, 10, PALETTE.fireOrange, 0.2);
  // Fire breath particles
  if (frame === 2) {
    setPixel(ctx, cx, 7, PALETTE.fireOrange);
    setPixel(ctx, cx + 1, 6, PALETTE.gold);
  }

  // Legs
  drawRect(ctx, cx - 5, bodyCy + 8, 4, 7, hexToRgba(PALETTE.titan, 0.8));
  drawRect(ctx, cx + 2, bodyCy + 8, 4, 7, hexToRgba(PALETTE.titan, 0.8));
  // Tail
  drawLine(ctx, cx - 4, bodyCy + 6, cx - 11, bodyCy + 13, hexToRgba(PALETTE.titan, 0.6));
}

function drawAncientDragonFallback(ctx: ReturnType<typeof makeCanvas>['ctx'], ox: number, frame: number): void {
  const cx = ox + 20;
  const bodyCy = 26;
  const wingFlap = frame % 2 === 0 ? -2 : 2;
  drawLine(ctx, cx - 5, bodyCy - 2, cx - 15, bodyCy - 8 + wingFlap, PALETTE.titan);
  drawLine(ctx, cx + 5, bodyCy - 2, cx + 15, bodyCy - 8 + wingFlap, PALETTE.titan);
  fillCircle(ctx, cx, bodyCy, 8, hexToRgba(PALETTE.titan, 0.7));
  drawRect(ctx, cx - 4, 10, 8, 7, PALETTE.titan);
  drawRect(ctx, cx - 4, bodyCy + 8, 4, 7, hexToRgba(PALETTE.titan, 0.8));
  drawRect(ctx, cx + 1, bodyCy + 8, 4, 7, hexToRgba(PALETTE.titan, 0.8));
}

function drawBossDragon(ctx: import('@napi-rs/canvas').SKRSContext2D, size: number): void {
  const cx = size / 2;
  const cy = size / 2;
  const scale = size / 48; // 48 is existing FRAME_H

  // Body (large oval)
  const bodyW = Math.floor(16 * scale);
  const bodyH = Math.floor(12 * scale);
  for (let dy = -bodyH; dy <= bodyH; dy++) {
    for (let dx = -bodyW; dx <= bodyW; dx++) {
      if ((dx * dx) / (bodyW * bodyW) + (dy * dy) / (bodyH * bodyH) <= 1) {
        setPixel(ctx, cx + dx, cy + dy, PALETTE.titan);
      }
    }
  }

  // Wings (left/right triangles)
  const wingSpan = Math.floor(20 * scale);
  for (let i = 0; i < wingSpan; i++) {
    const wingH = Math.floor((wingSpan - i) * 0.6);
    for (let dy = -wingH; dy <= 0; dy++) {
      setPixel(ctx, cx - bodyW - i, cy + dy, '#8b2020');
      setPixel(ctx, cx + bodyW + i, cy + dy, '#8b2020');
    }
  }

  // Head (top circle)
  fillCircle(ctx, cx, cy - bodyH - Math.floor(4 * scale), Math.floor(6 * scale), PALETTE.titan);

  // Eyes (yellow)
  const eyeY = cy - bodyH - Math.floor(4 * scale);
  setPixel(ctx, cx - Math.floor(2 * scale), eyeY, PALETTE.gold);
  setPixel(ctx, cx + Math.floor(2 * scale), eyeY, PALETTE.gold);

  // Flame aura (bottom glow)
  addGlow(ctx, cx, cy + bodyH, Math.floor(10 * scale), PALETTE.fireOrange, 0.2);
}

function applyColorTint(ctx: import('@napi-rs/canvas').SKRSContext2D, w: number, h: number, color: string, alpha: number): void {
  const imageData = ctx.getImageData(0, 0, w, h);
  const r = parseInt(color.slice(1, 3), 16);
  const g = parseInt(color.slice(3, 5), 16);
  const b = parseInt(color.slice(5, 7), 16);

  for (let i = 0; i < imageData.data.length; i += 4) {
    if (imageData.data[i + 3] > 0) { // only non-transparent pixels
      imageData.data[i] = Math.min(255, imageData.data[i] + Math.floor(r * alpha));
      imageData.data[i + 1] = Math.min(255, imageData.data[i + 1] + Math.floor(g * alpha));
      imageData.data[i + 2] = Math.min(255, imageData.data[i + 2] + Math.floor(b * alpha));
    }
  }
  ctx.putImageData(imageData, 0, 0);
}

const DRAW_FNS: Record<string, (ctx: ReturnType<typeof makeCanvas>['ctx'], ox: number, frame: number) => void> = {
  scout_drone: drawGoblinScout,
  battle_robot: drawOrcWarrior,
  heavy_walker: drawStoneTroll,
  stealth_drone: drawShadowAssassin,
  titan: drawAncientDragon,
};

const UNIT_IDS = ['scout_drone', 'battle_robot', 'heavy_walker', 'stealth_drone', 'titan'];

export async function generate(): Promise<ManifestEntry[]> {
  mkdirSync(OUTPUT_DIR, { recursive: true });
  const entries: ManifestEntry[] = [];

  for (const id of UNIT_IDS) {
    const { canvas, ctx } = makeCanvas(160, 48);
    const drawFn = DRAW_FNS[id];
    const fallbackDrawFn =
      id === 'scout_drone' ? drawGoblinScoutFallback :
      id === 'battle_robot' ? drawOrcWarriorFallback :
      id === 'heavy_walker' ? drawStoneTrollFallback :
      id === 'stealth_drone' ? drawShadowAssassinFallback :
      drawAncientDragonFallback;
    renderSheetWithGate(
      (sheetCtx) => {
        for (let f = 0; f < 4; f++) {
          drawShadow(sheetCtx, f * FRAME_W);
          drawFn(sheetCtx, f * FRAME_W, f);
        }
      },
      (sheetCtx) => {
        for (let f = 0; f < 4; f++) {
          drawShadow(sheetCtx, f * FRAME_W);
          fallbackDrawFn(sheetCtx, f * FRAME_W, f);
        }
      },
      canvas,
      ctx,
      id,
    );
    saveCanvas(canvas, `${OUTPUT_DIR}/${id}.png`);
    entries.push({
      key: `unit-${id}`,
      type: 'spritesheet',
      path: `assets/units/${id}.png`,
      frameWidth: FRAME_W,
      frameHeight: FRAME_H,
      frameCount: 4,
    });
  }

  // unit-death.png (160x48, 4 frames) — monster death
  {
    const { canvas, ctx } = makeCanvas(160, 48);
    const cx = 20;
    const cy = 24;
    // Frame 0: Flash
    fillCircle(ctx, cx, cy, 10, PALETTE.white);
    // Frame 1: Fragments scatter
    for (let i = 0; i < 16; i++) {
      const angle = (i / 16) * Math.PI * 2;
      const dist = 8 + (i * 37 % 6);
      const color = i % 3 === 0 ? PALETTE.fireOrange : i % 3 === 1 ? '#4a7a2a' : PALETTE.stoneDark;
      setPixel(ctx, Math.round(FRAME_W + cx + dist * Math.cos(angle)), Math.round(cy + dist * Math.sin(angle)), color);
    }
    // Frame 2: Dust/smoke cloud
    fillCircle(ctx, 2 * FRAME_W + cx, cy, 5, hexToRgba(PALETTE.dirtPath, 0.5));
    for (let i = 0; i < 10; i++) {
      const angle = (i / 10) * Math.PI * 2;
      const dist = 9 + (i * 29 % 5);
      setPixel(ctx, Math.round(2 * FRAME_W + cx + dist * Math.cos(angle)), Math.round(cy + dist * Math.sin(angle)), hexToRgba(PALETTE.dirtPath, 0.4));
    }
    // Frame 3: Fading smoke wisps
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const dist = 4 + (i * 13 % 5);
      setPixel(ctx, Math.round(3 * FRAME_W + cx + dist * Math.cos(angle)), Math.round(cy - 2 + dist * Math.sin(angle)), hexToRgba(PALETTE.gray, 0.25));
    }
    saveCanvas(canvas, `${OUTPUT_DIR}/unit-death.png`);
    entries.push({
      key: 'unit-death',
      type: 'spritesheet',
      path: 'assets/units/unit-death.png',
      frameWidth: FRAME_W,
      frameHeight: FRAME_H,
      frameCount: 4,
    });
  }

  assertRequiredOutputs();

  // Boss titan — enlarged sprite (96x96 static)
  const BOSS_SIZE = 96;
  {
    const { canvas, ctx } = makeCanvas(BOSS_SIZE, BOSS_SIZE);
    drawBossDragon(ctx, BOSS_SIZE);
    saveCanvas(canvas, `${OUTPUT_DIR}/titan-boss.png`);
    entries.push({
      key: 'unit-titan-boss',
      type: 'image',
      path: 'assets/units/titan-boss.png',
      section: 'boss' as const,
    });
  }

  // Boss titan phase 2 — rage variant (red tint intensified)
  {
    const { canvas, ctx } = makeCanvas(BOSS_SIZE, BOSS_SIZE);
    drawBossDragon(ctx, BOSS_SIZE);
    applyColorTint(ctx, BOSS_SIZE, BOSS_SIZE, PALETTE.fireRed, 0.3);
    saveCanvas(canvas, `${OUTPUT_DIR}/titan-boss-rage.png`);
    entries.push({
      key: 'unit-titan-boss-rage',
      type: 'image',
      path: 'assets/units/titan-boss-rage.png',
      section: 'boss' as const,
    });
  }

  return entries;
}

if (import.meta.main) {
  generate().then(e => console.log(JSON.stringify(e, null, 2)));
}
