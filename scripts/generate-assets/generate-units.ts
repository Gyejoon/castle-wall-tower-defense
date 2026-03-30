import { makeCanvas, saveCanvas, PALETTE, hexToRgba, drawRect, fillCircle, drawCircle, setPixel, drawLine, drawPolygon, addGlow, type ManifestEntry } from './shared';
import { mkdirSync } from 'fs';

const OUTPUT_DIR = 'packages/web-shell/public/assets/units';

function drawShadow(ctx: any, ox: number) {
  const cx = ox + 16;
  for (let dx = -6; dx <= 6; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      if (dx * dx / 36 + dy * dy <= 1) {
        setPixel(ctx, cx + dx, 28 + dy, hexToRgba('#000000', 0.3));
      }
    }
  }
}

// 고블린 정찰병: 초록 피부, 뾰족 귀, 가죽 갑옷, 단검
function drawGoblinScout(ctx: any, ox: number, frame: number) {
  const cx = ox + 16, cy = 16;
  const bobY = frame === 1 ? -1 : frame === 3 ? 1 : 0;
  const legOff = frame % 2 === 0 ? 1 : -1;

  // Body (가죽 갑옷)
  drawRect(ctx, cx - 3, cy - 2 + bobY, 6, 7, '#5a4a2a');
  drawRect(ctx, cx - 3, cy - 2 + bobY, 6, 1, '#6a5a3a');

  // Head (초록)
  drawRect(ctx, cx - 3, cy - 6 + bobY, 6, 5, PALETTE.scoutDrone);
  drawRect(ctx, cx - 3, cy - 6 + bobY, 6, 1, '#5a8a3a');
  // Pointy ears
  setPixel(ctx, cx - 4, cy - 5 + bobY, PALETTE.scoutDrone);
  setPixel(ctx, cx + 4, cy - 5 + bobY, PALETTE.scoutDrone);
  // Eyes
  setPixel(ctx, cx - 1, cy - 4 + bobY, '#ff2020');
  setPixel(ctx, cx + 1, cy - 4 + bobY, '#ff2020');

  // Legs
  drawRect(ctx, cx - 2, cy + 5 + bobY, 2, 4 + legOff, '#5a4a2a');
  drawRect(ctx, cx + 1, cy + 5 + bobY, 2, 4 - legOff, '#5a4a2a');

  // Dagger
  drawLine(ctx, cx + 4, cy + bobY, cx + 7, cy - 2 + bobY, '#b0b0b0');
  setPixel(ctx, cx + 7, cy - 3 + bobY, PALETTE.white);
}

// 오크 전사: 회색 피부, 뿔 투구, 방패+도끼
function drawOrcWarrior(ctx: any, ox: number, frame: number) {
  const cx = ox + 16, cy = 14;
  const bobY = frame === 1 ? -1 : frame === 3 ? 1 : 0;
  const legOff = frame % 2 === 0 ? 1 : -1;

  // Body (heavy armor)
  drawRect(ctx, cx - 4, cy - 1 + bobY, 8, 8, '#5a5a4a');
  drawRect(ctx, cx - 4, cy - 1 + bobY, 8, 1, '#6a6a5a');

  // Head (gray-green)
  drawRect(ctx, cx - 3, cy - 6 + bobY, 6, 5, PALETTE.battleRobot);
  // Horned helmet
  drawRect(ctx, cx - 4, cy - 7 + bobY, 8, 2, '#4a4a3a');
  setPixel(ctx, cx - 4, cy - 9 + bobY, '#4a4a3a');
  setPixel(ctx, cx + 4, cy - 9 + bobY, '#4a4a3a');
  // Eyes
  setPixel(ctx, cx - 1, cy - 4 + bobY, '#e0e000');
  setPixel(ctx, cx + 1, cy - 4 + bobY, '#e0e000');

  // Shield (left)
  drawRect(ctx, cx - 7, cy - 2 + bobY, 3, 7, '#6a4a2a');
  drawRect(ctx, cx - 7, cy - 2 + bobY, 3, 1, '#8a6a4a');

  // Axe (right)
  drawLine(ctx, cx + 5, cy - 3 + bobY, cx + 5, cy + 5 + bobY, '#5a3a1a');
  drawRect(ctx, cx + 5, cy - 4 + bobY, 3, 3, '#b0b0b0');
  setPixel(ctx, cx + 7, cy - 4 + bobY, PALETTE.stoneLight);

  // Legs
  drawRect(ctx, cx - 3, cy + 7 + bobY, 3, 5 + legOff, '#4a4a3a');
  drawRect(ctx, cx + 1, cy + 7 + bobY, 3, 5 - legOff, '#4a4a3a');
}

// 돌 트롤: 육중한 몸, 돌 피부, 거대 곤봉
function drawStoneTroll(ctx: any, ox: number, frame: number) {
  const cx = ox + 16, cy = 12;
  const bounceY = (frame === 1 || frame === 3) ? 1 : 0;

  // Massive body
  drawRect(ctx, cx - 6, cy - 2 + bounceY, 12, 12, PALETTE.heavyWalker);
  drawRect(ctx, cx - 6, cy - 2 + bounceY, 12, 2, PALETTE.stoneLight);
  drawRect(ctx, cx - 6, cy + 8 + bounceY, 12, 2, PALETTE.stoneDark);

  // Head (stone-like)
  drawRect(ctx, cx - 4, cy - 7 + bounceY, 8, 6, PALETTE.heavyWalker);
  drawRect(ctx, cx - 4, cy - 7 + bounceY, 8, 1, PALETTE.stoneLight);
  // Eyes (small, angry)
  setPixel(ctx, cx - 2, cy - 4 + bounceY, '#e04020');
  setPixel(ctx, cx + 2, cy - 4 + bounceY, '#e04020');
  // Underbite jaw
  drawRect(ctx, cx - 3, cy - 2 + bounceY, 6, 2, '#6a6a5a');

  // Giant club (right hand)
  drawRect(ctx, cx + 6, cy - 5 + bounceY, 3, 14, '#5a3a1a');
  drawRect(ctx, cx + 5, cy - 6 + bounceY, 5, 4, '#4a3a1e');
  setPixel(ctx, cx + 6, cy - 6 + bounceY, PALETTE.stoneDark);

  // Thick legs
  const leftOff = frame === 1 ? 1 : frame === 3 ? 0 : 0;
  const rightOff = frame === 3 ? 1 : frame === 1 ? 0 : 0;
  drawRect(ctx, cx - 5, cy + 10 + bounceY, 4, 5 + leftOff, '#6a6a5a');
  drawRect(ctx, cx + 1, cy + 10 + bounceY, 4, 5 + rightOff, '#6a6a5a');
}

// 그림자 암살자: 검은 망토, 빛나는 눈, 단검 2개
function drawShadowAssassin(ctx: any, ox: number, frame: number) {
  const cx = ox + 16, cy = 16;
  const alpha = (frame === 1 || frame === 3) ? 0.5 : 0.85;

  // Cloak (flowing, diamond-ish shape)
  for (let dy = -5; dy <= 6; dy++) {
    const w = dy < 0 ? 4 + dy : 5 - Math.floor(dy * 0.5);
    for (let dx = -w; dx <= w; dx++) {
      setPixel(ctx, cx + dx, cy + dy, hexToRgba(PALETTE.stealthDrone, alpha));
    }
  }
  // Inner cloak highlight
  for (let dy = -3; dy <= 3; dy++) {
    const w = 2 - Math.abs(Math.floor(dy * 0.5));
    for (let dx = -w; dx <= w; dx++) {
      setPixel(ctx, cx + dx, cy + dy, hexToRgba('#403060', alpha));
    }
  }

  // Glowing eyes
  setPixel(ctx, cx - 1, cy - 3, hexToRgba('#ff40ff', alpha));
  setPixel(ctx, cx + 1, cy - 3, hexToRgba('#ff40ff', alpha));

  // Twin daggers
  drawLine(ctx, cx - 4, cy + 2, cx - 7, cy - 1, hexToRgba('#c0c0c0', alpha));
  drawLine(ctx, cx + 4, cy + 2, cx + 7, cy - 1, hexToRgba('#c0c0c0', alpha));
  setPixel(ctx, cx - 7, cy - 2, hexToRgba(PALETTE.white, alpha));
  setPixel(ctx, cx + 7, cy - 2, hexToRgba(PALETTE.white, alpha));
}

// 고대 드래곤: 큰 몸, 날개, 비늘, 불꽃 오라
function drawAncientDragon(ctx: any, ox: number, frame: number) {
  const cx = ox + 16, cy = 14;
  const wingFlap = frame % 2 === 0 ? -2 : 2;

  // Wings (spread)
  // Left wing
  drawLine(ctx, cx - 4, cy - 2, cx - 12, cy - 6 + wingFlap, PALETTE.titan);
  drawLine(ctx, cx - 12, cy - 6 + wingFlap, cx - 10, cy + wingFlap, hexToRgba(PALETTE.titan, 0.6));
  drawLine(ctx, cx - 10, cy + wingFlap, cx - 4, cy + 2, hexToRgba(PALETTE.titan, 0.4));
  // Right wing
  drawLine(ctx, cx + 4, cy - 2, cx + 12, cy - 6 + wingFlap, PALETTE.titan);
  drawLine(ctx, cx + 12, cy - 6 + wingFlap, cx + 10, cy + wingFlap, hexToRgba(PALETTE.titan, 0.6));
  drawLine(ctx, cx + 10, cy + wingFlap, cx + 4, cy + 2, hexToRgba(PALETTE.titan, 0.4));

  // Body (large, scaled)
  fillCircle(ctx, cx, cy, 6, hexToRgba(PALETTE.titan, 0.7));
  drawCircle(ctx, cx, cy, 6, PALETTE.titan);
  // Scale pattern
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2;
    setPixel(ctx, cx + Math.round(3 * Math.cos(angle)), cy + Math.round(3 * Math.sin(angle)), '#e06040');
  }

  // Head
  drawRect(ctx, cx - 3, cy - 9, 6, 5, PALETTE.titan);
  drawRect(ctx, cx - 3, cy - 9, 6, 1, '#e06040');
  // Horns
  setPixel(ctx, cx - 3, cy - 11, '#4a3a1e');
  setPixel(ctx, cx + 3, cy - 11, '#4a3a1e');
  setPixel(ctx, cx - 4, cy - 12, '#4a3a1e');
  setPixel(ctx, cx + 4, cy - 12, '#4a3a1e');
  // Eyes
  setPixel(ctx, cx - 1, cy - 7, '#ffe040');
  setPixel(ctx, cx + 1, cy - 7, '#ffe040');

  // Fire aura
  addGlow(ctx, cx, cy, 8, PALETTE.fireOrange, 0.2);
  // Fire breath particles
  if (frame === 2) {
    setPixel(ctx, cx, cy - 12, PALETTE.fireOrange);
    setPixel(ctx, cx + 1, cy - 13, PALETTE.gold);
  }

  // Legs/Tail
  drawRect(ctx, cx - 4, cy + 6, 3, 5, hexToRgba(PALETTE.titan, 0.8));
  drawRect(ctx, cx + 1, cy + 6, 3, 5, hexToRgba(PALETTE.titan, 0.8));
  // Tail
  drawLine(ctx, cx - 2, cy + 4, cx - 8, cy + 8, hexToRgba(PALETTE.titan, 0.6));
}

const DRAW_FNS: Record<string, (ctx: any, ox: number, frame: number) => void> = {
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
    const { canvas, ctx } = makeCanvas(128, 32);
    const drawFn = DRAW_FNS[id];
    for (let f = 0; f < 4; f++) {
      drawShadow(ctx, f * 32);
      drawFn(ctx, f * 32, f);
    }
    saveCanvas(canvas, `${OUTPUT_DIR}/${id}.png`);
    entries.push({
      key: `unit-${id}`,
      type: 'spritesheet',
      path: `assets/units/${id}.png`,
      frameWidth: 32,
      frameHeight: 32,
      frameCount: 4,
    });
  }

  // unit-death.png (128x32, 4 frames) — monster death
  {
    const { canvas, ctx } = makeCanvas(128, 32);
    const cx = 16, cy = 16;
    // Frame 0: Flash
    fillCircle(ctx, cx, cy, 8, PALETTE.white);
    // Frame 1: Fragments scatter
    for (let i = 0; i < 16; i++) {
      const angle = (i / 16) * Math.PI * 2;
      const dist = 6 + (i * 37 % 5);
      const color = i % 3 === 0 ? PALETTE.fireOrange : i % 3 === 1 ? '#4a7a2a' : PALETTE.stoneDark;
      setPixel(ctx, Math.round(32 + cx + dist * Math.cos(angle)), Math.round(cy + dist * Math.sin(angle)), color);
    }
    // Frame 2: Dust/smoke cloud
    fillCircle(ctx, 64 + cx, cy, 4, hexToRgba(PALETTE.dirtPath, 0.5));
    for (let i = 0; i < 10; i++) {
      const angle = (i / 10) * Math.PI * 2;
      const dist = 7 + (i * 29 % 4);
      setPixel(ctx, Math.round(64 + cx + dist * Math.cos(angle)), Math.round(cy + dist * Math.sin(angle)), hexToRgba(PALETTE.dirtPath, 0.4));
    }
    // Frame 3: Fading smoke wisps
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const dist = 3 + (i * 13 % 4);
      setPixel(ctx, Math.round(96 + cx + dist * Math.cos(angle)), Math.round(cy - 2 + dist * Math.sin(angle)), hexToRgba(PALETTE.gray, 0.25));
    }
    saveCanvas(canvas, `${OUTPUT_DIR}/unit-death.png`);
    entries.push({
      key: 'unit-death',
      type: 'spritesheet',
      path: 'assets/units/unit-death.png',
      frameWidth: 32,
      frameHeight: 32,
      frameCount: 4,
    });
  }

  return entries;
}

if (import.meta.main) {
  generate().then(e => console.log(JSON.stringify(e, null, 2)));
}
