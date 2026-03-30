import { makeCanvas, saveCanvas, PALETTE, hexToRgba, drawRect, fillCircle, drawCircle, setPixel, drawLine, drawPolygon, addGlow, type ManifestEntry } from './shared';
import { mkdirSync } from 'fs';

const OUTPUT_DIR = 'packages/web-shell/public/assets/units';

function drawShadow(ctx: any, ox: number) {
  const cx = ox + 16;
  const cy = 28;
  for (let dx = -6; dx <= 6; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      if (dx * dx / 36 + dy * dy <= 1) {
        setPixel(ctx, cx + dx, cy + dy, hexToRgba('#000000', 0.3));
      }
    }
  }
}

function drawScoutDrone(ctx: any, ox: number, frame: number) {
  const cx = ox + 16, cy = 16;
  const bobY = frame === 1 ? -1 : frame === 3 ? 1 : 0;
  drawLine(ctx, cx - 5, cy - 4 + bobY, cx + 5, cy + bobY, PALETTE.scoutDrone);
  drawLine(ctx, cx + 5, cy + bobY, cx - 5, cy + 4 + bobY, PALETTE.scoutDrone);
  drawLine(ctx, cx - 5, cy + 4 + bobY, cx - 5, cy - 4 + bobY, PALETTE.scoutDrone);
  for (let y = -3; y <= 3; y++) {
    const w = Math.round(5 - Math.abs(y) * 1.2);
    for (let x = -4; x <= w; x++) {
      setPixel(ctx, cx + x, cy + y + bobY, hexToRgba(PALETTE.scoutDrone, 0.7));
    }
  }
  if (frame % 2 === 0) {
    drawLine(ctx, cx - 3, cy - 5 + bobY, cx + 2, cy - 6 + bobY, hexToRgba(PALETTE.scoutDrone, 0.5));
  } else {
    drawLine(ctx, cx - 3, cy + 5 + bobY, cx + 2, cy + 6 + bobY, hexToRgba(PALETTE.scoutDrone, 0.5));
  }
}

function drawBattleRobot(ctx: any, ox: number, frame: number) {
  const cx = ox + 16, cy = 14;
  drawRect(ctx, cx - 6, cy - 5, 12, 10, hexToRgba(PALETTE.battleRobot, 0.7));
  drawLine(ctx, cx - 6, cy - 5, cx + 5, cy - 5, PALETTE.battleRobot);
  drawLine(ctx, cx + 5, cy - 5, cx + 5, cy + 4, PALETTE.battleRobot);
  drawLine(ctx, cx + 5, cy + 4, cx - 6, cy + 4, PALETTE.battleRobot);
  drawLine(ctx, cx - 6, cy + 4, cx - 6, cy - 5, PALETTE.battleRobot);
  drawRect(ctx, cx - 3, cy - 8, 6, 3, PALETTE.battleRobot);
  setPixel(ctx, cx - 1, cy - 7, PALETTE.white);
  setPixel(ctx, cx + 1, cy - 7, PALETTE.white);
  const leftLegOff = (frame === 1 || frame === 2) ? 2 : 0;
  const rightLegOff = (frame === 3 || frame === 0) ? 2 : 0;
  drawRect(ctx, cx - 4, cy + 5, 3, 5 + leftLegOff, hexToRgba(PALETTE.battleRobot, 0.8));
  drawRect(ctx, cx + 1, cy + 5, 3, 5 + rightLegOff, hexToRgba(PALETTE.battleRobot, 0.8));
}

function drawHeavyWalker(ctx: any, ox: number, frame: number) {
  const cx = ox + 16, cy = 13;
  const bounceY = (frame === 1 || frame === 3) ? 1 : 0;
  drawPolygon(ctx, cx, cy + bounceY, 10, 6, PALETTE.heavyWalker, Math.PI / 6);
  fillCircle(ctx, cx, cy + bounceY, 7, hexToRgba(PALETTE.heavyWalker, 0.5));
  fillCircle(ctx, cx, cy + bounceY, 2, PALETTE.white);
  setPixel(ctx, cx, cy + bounceY, PALETTE.heavyWalker);
  const leftOff = frame === 1 ? 2 : frame === 3 ? 0 : 1;
  const rightOff = frame === 3 ? 2 : frame === 1 ? 0 : 1;
  drawRect(ctx, cx - 6, cy + 10 + bounceY, 4, 4 + leftOff, hexToRgba(PALETTE.heavyWalker, 0.8));
  drawRect(ctx, cx + 2, cy + 10 + bounceY, 4, 4 + rightOff, hexToRgba(PALETTE.heavyWalker, 0.8));
}

function drawStealthDrone(ctx: any, ox: number, frame: number) {
  const cx = ox + 16, cy = 16;
  const alpha = (frame === 1 || frame === 3) ? 0.5 : 0.8;
  const s = 7;
  drawLine(ctx, cx, cy - s, cx + s, cy, hexToRgba(PALETTE.stealthDrone, alpha));
  drawLine(ctx, cx + s, cy, cx, cy + s, hexToRgba(PALETTE.stealthDrone, alpha));
  drawLine(ctx, cx, cy + s, cx - s, cy, hexToRgba(PALETTE.stealthDrone, alpha));
  drawLine(ctx, cx - s, cy, cx, cy - s, hexToRgba(PALETTE.stealthDrone, alpha));
  for (let dy = -s + 1; dy < s; dy++) {
    const w = s - Math.abs(dy);
    for (let dx = -w + 1; dx < w; dx++) {
      setPixel(ctx, cx + dx, cy + dy, hexToRgba(PALETTE.stealthDrone, alpha * 0.5));
    }
  }
  setPixel(ctx, cx, cy, hexToRgba(PALETTE.white, alpha));
}

function drawTitan(ctx: any, ox: number, frame: number) {
  const cx = ox + 16, cy = 14;
  drawPolygon(ctx, cx, cy, 12, 8, PALETTE.titan, Math.PI / 8);
  fillCircle(ctx, cx, cy, 9, hexToRgba(PALETTE.titan, 0.4));
  const coreAngle = (frame * Math.PI) / 2;
  const coreX = Math.round(cx + 3 * Math.cos(coreAngle));
  const coreY = Math.round(cy + 3 * Math.sin(coreAngle));
  fillCircle(ctx, coreX, coreY, 3, hexToRgba(PALETTE.white, 0.6));
  fillCircle(ctx, cx, cy, 4, hexToRgba(PALETTE.titan, 0.7));
  setPixel(ctx, cx, cy, PALETTE.white);
  const offset = frame % 2 === 0 ? 1 : -1;
  drawRect(ctx, cx - 7 + offset, cy + 12, 5, 5, hexToRgba(PALETTE.titan, 0.7));
  drawRect(ctx, cx + 2 - offset, cy + 12, 5, 5, hexToRgba(PALETTE.titan, 0.7));
}

const DRAW_FNS: Record<string, (ctx: any, ox: number, frame: number) => void> = {
  scout_drone: drawScoutDrone,
  battle_robot: drawBattleRobot,
  heavy_walker: drawHeavyWalker,
  stealth_drone: drawStealthDrone,
  titan: drawTitan,
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

  // unit-death.png (128x32, 4 frames)
  {
    const { canvas, ctx } = makeCanvas(128, 32);
    const cx = 16, cy = 16;
    // Frame 0: Flash white
    fillCircle(ctx, cx, cy, 8, PALETTE.white);
    // Frame 1: Outline breaks apart
    for (let i = 0; i < 20; i++) {
      const angle = (i / 20) * Math.PI * 2;
      const dist = 6 + (i * 37 % 5);
      setPixel(ctx, Math.round(32 + cx + dist * Math.cos(angle)), Math.round(cy + dist * Math.sin(angle)), PALETTE.white);
    }
    // Frame 2: Scattered pixels + small explosion center
    fillCircle(ctx, 64 + cx, cy, 3, hexToRgba('#ff8c42', 0.7));
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const dist = 8 + (i * 29 % 5);
      setPixel(ctx, Math.round(64 + cx + dist * Math.cos(angle)), Math.round(cy + dist * Math.sin(angle)), hexToRgba(PALETTE.white, 0.5));
    }
    // Frame 3: Smoke wisps
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const dist = 4 + (i * 13 % 4);
      setPixel(ctx, Math.round(96 + cx + dist * Math.cos(angle)), Math.round(cy + dist * Math.sin(angle)), hexToRgba(PALETTE.gray, 0.3));
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
