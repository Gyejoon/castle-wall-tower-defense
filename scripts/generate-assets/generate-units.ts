import { makeCanvas, saveCanvas, PALETTE, hexToRgba, drawRect, fillCircle, drawCircle, setPixel, drawLine, drawPolygon, addGlow, drawIsoShadow, type ManifestEntry } from './shared';
import { mkdirSync } from 'fs';

const OUTPUT_DIR = 'packages/web-shell/public/assets/units';

const FRAME_W = 40;
const FRAME_H = 48;

function drawShadow(ctx: ReturnType<typeof makeCanvas>['ctx'], ox: number): void {
  const cx = ox + 20;
  drawIsoShadow(ctx, cx, 43, 10, 5, 0.3);
}

// 고블린 정찰병: 초록 피부, 뾰족 귀, 가죽 갑옷, 단검
function drawGoblinScout(ctx: ReturnType<typeof makeCanvas>['ctx'], ox: number, frame: number): void {
  const cx = ox + 20;
  const bobY = frame === 1 ? -1 : frame === 3 ? 1 : 0;
  const legOff = frame % 2 === 0 ? 1 : -1;

  // Body (가죽 갑옷) — y 18..28
  drawRect(ctx, cx - 4, 18 + bobY, 8, 10, '#5a4a2a');
  drawRect(ctx, cx - 4, 18 + bobY, 8, 1, '#6a5a3a');

  // Head (초록) — y 10..17
  drawRect(ctx, cx - 3, 10 + bobY, 6, 8, PALETTE.scoutDrone);
  drawRect(ctx, cx - 3, 10 + bobY, 6, 1, '#5a8a3a');
  // Pointy ears
  setPixel(ctx, cx - 4, 11 + bobY, PALETTE.scoutDrone);
  setPixel(ctx, cx + 4, 11 + bobY, PALETTE.scoutDrone);
  // Eyes
  setPixel(ctx, cx - 1, 13 + bobY, '#ff2020');
  setPixel(ctx, cx + 1, 13 + bobY, '#ff2020');

  // Legs — y 28..38
  drawRect(ctx, cx - 3, 28 + bobY, 3, 6 + legOff, '#5a4a2a');
  drawRect(ctx, cx + 1, 28 + bobY, 3, 6 - legOff, '#5a4a2a');

  // Dagger
  drawLine(ctx, cx + 5, 20 + bobY, cx + 8, 17 + bobY, '#b0b0b0');
  setPixel(ctx, cx + 8, 16 + bobY, PALETTE.white);
}

// 오크 전사: 회색 피부, 뿔 투구, 방패+도끼
function drawOrcWarrior(ctx: ReturnType<typeof makeCanvas>['ctx'], ox: number, frame: number): void {
  const cx = ox + 20;
  const bobY = frame === 1 ? -1 : frame === 3 ? 1 : 0;
  const legOff = frame % 2 === 0 ? 1 : -1;

  // Body (heavy armor) — y 20..30
  drawRect(ctx, cx - 5, 20 + bobY, 10, 12, '#5a5a4a');
  drawRect(ctx, cx - 5, 20 + bobY, 10, 1, '#6a6a5a');

  // Head (gray-green) — y 10..18
  drawRect(ctx, cx - 4, 10 + bobY, 8, 8, PALETTE.battleRobot);
  // Horned helmet
  drawRect(ctx, cx - 5, 9 + bobY, 10, 2, '#4a4a3a');
  setPixel(ctx, cx - 5, 7 + bobY, '#4a4a3a');
  setPixel(ctx, cx + 5, 7 + bobY, '#4a4a3a');
  // Eyes
  setPixel(ctx, cx - 1, 13 + bobY, '#e0e000');
  setPixel(ctx, cx + 1, 13 + bobY, '#e0e000');

  // Shield (left)
  drawRect(ctx, cx - 9, 18 + bobY, 4, 10, '#6a4a2a');
  drawRect(ctx, cx - 9, 18 + bobY, 4, 1, '#8a6a4a');

  // Axe (right)
  drawLine(ctx, cx + 7, 14 + bobY, cx + 7, 28 + bobY, '#5a3a1a');
  drawRect(ctx, cx + 7, 13 + bobY, 4, 4, '#b0b0b0');
  setPixel(ctx, cx + 10, 13 + bobY, PALETTE.stoneLight);

  // Legs — y 32..41
  drawRect(ctx, cx - 4, 32 + bobY, 4, 7 + legOff, '#4a4a3a');
  drawRect(ctx, cx + 1, 32 + bobY, 4, 7 - legOff, '#4a4a3a');
}

// 돌 트롤: 육중한 몸, 돌 피부, 거대 곤봉
function drawStoneTroll(ctx: ReturnType<typeof makeCanvas>['ctx'], ox: number, frame: number): void {
  const cx = ox + 20;
  const bounceY = (frame === 1 || frame === 3) ? 1 : 0;

  // Massive body — y 18..35
  drawRect(ctx, cx - 8, 18 + bounceY, 16, 18, PALETTE.heavyWalker);
  drawRect(ctx, cx - 8, 18 + bounceY, 16, 2, PALETTE.stoneLight);
  drawRect(ctx, cx - 8, 34 + bounceY, 16, 2, PALETTE.stoneDark);

  // Head (stone-like) — y 8..17
  drawRect(ctx, cx - 5, 8 + bounceY, 10, 10, PALETTE.heavyWalker);
  drawRect(ctx, cx - 5, 8 + bounceY, 10, 1, PALETTE.stoneLight);
  // Eyes (small, angry)
  setPixel(ctx, cx - 2, 12 + bounceY, '#e04020');
  setPixel(ctx, cx + 2, 12 + bounceY, '#e04020');
  // Underbite jaw
  drawRect(ctx, cx - 4, 17 + bounceY, 8, 2, '#6a6a5a');

  // Giant club (right hand)
  drawRect(ctx, cx + 9, 10 + bounceY, 4, 21, '#5a3a1a');
  drawRect(ctx, cx + 8, 8 + bounceY, 6, 6, '#4a3a1e');
  setPixel(ctx, cx + 9, 8 + bounceY, PALETTE.stoneDark);

  // Thick legs
  const leftOff = frame === 1 ? 1 : 0;
  const rightOff = frame === 3 ? 1 : 0;
  drawRect(ctx, cx - 7, 36 + bounceY, 6, 8 + leftOff, '#6a6a5a');
  drawRect(ctx, cx + 2, 36 + bounceY, 6, 8 + rightOff, '#6a6a5a');
}

// 그림자 암살자: 검은 망토, 빛나는 눈, 단검 2개
function drawShadowAssassin(ctx: ReturnType<typeof makeCanvas>['ctx'], ox: number, frame: number): void {
  const cx = ox + 20;
  const baseCy = 26;
  const alpha = (frame === 1 || frame === 3) ? 0.5 : 0.85;

  // Cloak (flowing, diamond-ish shape)
  for (let dy = -8; dy <= 10; dy++) {
    const w = dy < 0 ? 5 + dy : 6 - Math.floor(dy * 0.5);
    for (let dx = -w; dx <= w; dx++) {
      setPixel(ctx, cx + dx, baseCy + dy, hexToRgba(PALETTE.stealthDrone, alpha));
    }
  }
  // Inner cloak highlight
  for (let dy = -5; dy <= 5; dy++) {
    const w = 3 - Math.abs(Math.floor(dy * 0.5));
    for (let dx = -w; dx <= w; dx++) {
      setPixel(ctx, cx + dx, baseCy + dy, hexToRgba('#403060', alpha));
    }
  }

  // Glowing eyes
  setPixel(ctx, cx - 1, baseCy - 5, hexToRgba('#ff40ff', alpha));
  setPixel(ctx, cx + 1, baseCy - 5, hexToRgba('#ff40ff', alpha));

  // Twin daggers
  drawLine(ctx, cx - 5, baseCy + 3, cx - 9, baseCy - 1, hexToRgba('#c0c0c0', alpha));
  drawLine(ctx, cx + 5, baseCy + 3, cx + 9, baseCy - 1, hexToRgba('#c0c0c0', alpha));
  setPixel(ctx, cx - 9, baseCy - 2, hexToRgba(PALETTE.white, alpha));
  setPixel(ctx, cx + 9, baseCy - 2, hexToRgba(PALETTE.white, alpha));
}

// 고대 드래곤: 큰 몸, 날개, 비늘, 불꽃 오라
function drawAncientDragon(ctx: ReturnType<typeof makeCanvas>['ctx'], ox: number, frame: number): void {
  const cx = ox + 20;
  const bodyCy = 26;
  const wingFlap = frame % 2 === 0 ? -3 : 3;

  // Wings (spread)
  // Left wing
  drawLine(ctx, cx - 5, bodyCy - 3, cx - 16, bodyCy - 9 + wingFlap, PALETTE.titan);
  drawLine(ctx, cx - 16, bodyCy - 9 + wingFlap, cx - 13, bodyCy - 1 + wingFlap, hexToRgba(PALETTE.titan, 0.6));
  drawLine(ctx, cx - 13, bodyCy - 1 + wingFlap, cx - 5, bodyCy + 3, hexToRgba(PALETTE.titan, 0.4));
  // Right wing
  drawLine(ctx, cx + 5, bodyCy - 3, cx + 16, bodyCy - 9 + wingFlap, PALETTE.titan);
  drawLine(ctx, cx + 16, bodyCy - 9 + wingFlap, cx + 13, bodyCy - 1 + wingFlap, hexToRgba(PALETTE.titan, 0.6));
  drawLine(ctx, cx + 13, bodyCy - 1 + wingFlap, cx + 5, bodyCy + 3, hexToRgba(PALETTE.titan, 0.4));

  // Body (large, scaled)
  fillCircle(ctx, cx, bodyCy, 8, hexToRgba(PALETTE.titan, 0.7));
  drawCircle(ctx, cx, bodyCy, 8, PALETTE.titan);
  // Scale pattern
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2;
    setPixel(ctx, cx + Math.round(4 * Math.cos(angle)), bodyCy + Math.round(4 * Math.sin(angle)), '#e06040');
  }

  // Head — y 10..18
  drawRect(ctx, cx - 4, 10, 8, 8, PALETTE.titan);
  drawRect(ctx, cx - 4, 10, 8, 1, '#e06040');
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
  drawLine(ctx, cx - 3, bodyCy + 6, cx - 10, bodyCy + 12, hexToRgba(PALETTE.titan, 0.6));
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
    for (let f = 0; f < 4; f++) {
      drawShadow(ctx, f * FRAME_W);
      drawFn(ctx, f * FRAME_W, f);
    }
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

  return entries;
}

if (import.meta.main) {
  generate().then(e => console.log(JSON.stringify(e, null, 2)));
}
