import { makeCanvas, saveCanvas, PALETTE, hexToRgba, drawRect, fillCircle, drawCircle, setPixel, drawLine, drawPolygon, addGlow, drawIsoShadow, type ManifestEntry } from './shared';
import { mkdirSync, existsSync } from 'fs';

const OUTPUT_DIR = 'packages/web-shell/public/assets/units';

const FRAME_W = 40;
const FRAME_H = 48;
const FRAME_COUNT = 8;

// Walk cycle phase for 8-frame animation (0..2π)
function walkPhase(frame: number): number {
  return (frame / FRAME_COUNT) * Math.PI * 2;
}

// Smooth bob: up at frame 2,6 / down at frame 0,4
function bobY(frame: number): number {
  return Math.round(Math.sin(walkPhase(frame) * 2) * 1.5);
}

// Leg step: one leg lifts (shorter), other plants (longer). Returns [leftExtra, rightExtra].
function legStep(frame: number): [number, number] {
  const phase = Math.sin(walkPhase(frame));
  // Positive phase: left leg planted (long), right leg lifted (short)
  // Negative phase: opposite
  const lift = Math.round(phase * 3);
  return [lift, -lift];
}

// Arm swing: opposite to legs, vertical motion
function armSwing(frame: number): number {
  return Math.round(Math.sin(walkPhase(frame) + Math.PI) * 3);
}

// Body lean: very subtle
function bodyLean(frame: number): number {
  return Math.round(Math.sin(walkPhase(frame)) * 0.5);
}
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
  const by = bobY(frame);
  const [lL, lR] = legStep(frame);
  const as = armSwing(frame);

  // Cloak and torso
  drawRect(ctx, cx - 6, 17 + by, 12, 11, '#4c3f24');
  drawRect(ctx, cx - 4, 19 + by, 8, 5, '#6a5a3a');

  // Head (green) with pointed ears
  drawRect(ctx, cx - 4, 10 + by, 8, 8, PALETTE.scoutDrone);
  drawRect(ctx, cx - 4, 10 + by, 8, 1, '#5a8a3a');
  setPixel(ctx, cx - 5, 12 + by, PALETTE.scoutDrone);
  setPixel(ctx, cx + 5, 12 + by, PALETTE.scoutDrone);
  setPixel(ctx, cx - 6, 13 + by, PALETTE.scoutDrone);
  setPixel(ctx, cx + 6, 13 + by, PALETTE.scoutDrone);
  // Eyes
  setPixel(ctx, cx - 1, 13 + by, '#ff2020');
  setPixel(ctx, cx + 1, 13 + by, '#ff2020');

  // Left leg — planted when lL>0 (long), lifted when lL<0 (short)
  const leftLen = 9 + lL;
  drawRect(ctx, cx - 4, 28 + by, 4, leftLen, '#5a4a2a');
  drawRect(ctx, cx - 4, 28 + by + leftLen - 2, 5, 2, '#4a3a1a'); // foot
  // Right leg — opposite
  const rightLen = 9 + lR;
  drawRect(ctx, cx + 1, 28 + by, 4, rightLen, '#5a4a2a');
  drawRect(ctx, cx + 1, 28 + by + rightLen - 2, 5, 2, '#4a3a1a'); // foot

  // Dagger arm (vertical swing)
  drawLine(ctx, cx + 6, 20 + by, cx + 10, 17 + by + as, '#b0b0b0');
  setPixel(ctx, cx + 10, 16 + by + as, PALETTE.white);

  // Left arm
  drawLine(ctx, cx - 6, 21 + by, cx - 9, 25 + by - as, '#4c3f24');
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
  const by = bobY(frame);
  const [lL, lR] = legStep(frame);
  const as = armSwing(frame);

  // Broad armor silhouette
  drawRect(ctx, cx - 7, 18 + by, 14, 14, '#5a5a4a');
  drawRect(ctx, cx - 6, 19 + by, 12, 3, '#6a6a5a');

  // Head with horned helmet
  drawRect(ctx, cx - 4, 9 + by, 8, 9, PALETTE.battleRobot);
  drawRect(ctx, cx - 6, 8 + by, 12, 3, '#4a4a3a');
  setPixel(ctx, cx - 6, 6 + by, '#4a4a3a');
  setPixel(ctx, cx + 6, 6 + by, '#4a4a3a');
  // Eyes
  setPixel(ctx, cx - 1, 13 + by, '#e0e000');
  setPixel(ctx, cx + 1, 13 + by, '#e0e000');

  // Shield (left) — bobs vertically
  drawRect(ctx, cx - 11, 17 + by + as, 5, 12, '#6a4a2a');
  drawRect(ctx, cx - 11, 17 + by + as, 5, 1, '#8a6a4a');

  // Axe (right) — swings vertically
  const axeTop = 14 + by - as;
  drawLine(ctx, cx + 8, axeTop, cx + 8, axeTop + 15, '#5a3a1a');
  drawRect(ctx, cx + 7, axeTop - 1, 5, 5, '#b0b0b0');
  setPixel(ctx, cx + 11, axeTop - 1, PALETTE.stoneLight);

  // Left leg — length changes (planted vs lifted)
  const leftLen = 9 + lL;
  drawRect(ctx, cx - 5, 32 + by, 5, leftLen, '#4a4a3a');
  drawRect(ctx, cx - 5, 32 + by + leftLen - 2, 6, 2, '#3a3a2a'); // boot
  // Right leg
  const rightLen = 9 + lR;
  drawRect(ctx, cx + 1, 32 + by, 5, rightLen, '#4a4a3a');
  drawRect(ctx, cx + 1, 32 + by + rightLen - 2, 6, 2, '#3a3a2a'); // boot
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

// 돌 트롤: 육중한 몸, 돌 피부, 거대 곤봉 — heavy lumbering gait
function drawStoneTroll(ctx: ReturnType<typeof makeCanvas>['ctx'], ox: number, frame: number): void {
  const cx = ox + 20;
  // Troll has a slow, heavy bounce — double frequency, lower amplitude
  const by = Math.round(Math.sin(walkPhase(frame) * 2) * 1);
  const ls = Math.round(Math.sin(walkPhase(frame)) * 2); // shorter stride
  const clubSwing = Math.round(Math.sin(walkPhase(frame)) * 3);

  // Massive stone torso — squash/stretch
  const squash = Math.round(Math.sin(walkPhase(frame) * 2) * 0.5);
  drawRect(ctx, cx - 9, 17 + by - squash, 18, 18 + squash * 2, PALETTE.heavyWalker);
  drawRect(ctx, cx - 9, 17 + by - squash, 18, 2, PALETTE.stoneLight);
  drawRect(ctx, cx - 9, 33 + by + squash, 18, 2, PALETTE.stoneDark);

  // Head — squat
  drawRect(ctx, cx - 6, 8 + by, 12, 10, PALETTE.heavyWalker);
  drawRect(ctx, cx - 6, 8 + by, 12, 1, PALETTE.stoneLight);
  // Eyes (small, angry)
  setPixel(ctx, cx - 2, 12 + by, '#e04020');
  setPixel(ctx, cx + 2, 12 + by, '#e04020');
  // Underbite jaw
  drawRect(ctx, cx - 5, 17 + by, 10, 2, '#6a6a5a');

  // Giant club — swings forward/back
  const clubTop = 10 + by + clubSwing;
  drawRect(ctx, cx + 10, clubTop, 4, 22, '#5a3a1a');
  drawRect(ctx, cx + 8, clubTop - 2, 8, 6, '#4a3a1e');
  setPixel(ctx, cx + 10, clubTop - 2, PALETTE.stoneDark);

  // Thick legs — planted vs lifted, no X splay
  const [tL, tR] = legStep(frame);
  const tScale = 0.7; // troll has shorter stride
  const leftLen = 8 + Math.round(tL * tScale);
  const rightLen = 8 + Math.round(tR * tScale);
  drawRect(ctx, cx - 7, 36 + by, 6, leftLen, '#6a6a5a');
  drawRect(ctx, cx - 7, 36 + by + leftLen - 2, 7, 2, '#5a5a4a'); // foot
  drawRect(ctx, cx + 2, 36 + by, 6, rightLen, '#6a6a5a');
  drawRect(ctx, cx + 2, 36 + by + rightLen - 2, 7, 2, '#5a5a4a'); // foot
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

// 그림자 암살자: 검은 망토, 빛나는 눈, 단검 2개 — flickers in and out
function drawShadowAssassin(ctx: ReturnType<typeof makeCanvas>['ctx'], ox: number, frame: number): void {
  const cx = ox + 20;
  const baseCy = 26;
  // Smooth alpha pulse — fades in/out
  const alpha = 0.55 + Math.sin(walkPhase(frame)) * 0.3;
  const by = bobY(frame);
  const daggerSwing = armSwing(frame);

  // Cloak (sharp triangular silhouette) — sways slightly
  const sway = bodyLean(frame);
  for (let dy = -10; dy <= 10; dy++) {
    const w = dy < 0 ? 3 + Math.floor((dy + 10) * 0.6) : 7 - Math.floor(dy * 0.5);
    for (let dx = -w; dx <= w; dx++) {
      setPixel(ctx, cx + dx + sway, baseCy + dy + by, hexToRgba(PALETTE.stealthDrone, alpha));
    }
  }
  // Inner cloak highlight
  for (let dy = -4; dy <= 4; dy++) {
    const w = 2 - Math.abs(Math.floor(dy * 0.5));
    for (let dx = -w; dx <= w; dx++) {
      setPixel(ctx, cx + dx + sway, baseCy + dy + by, hexToRgba('#403060', alpha));
    }
  }

  // Glowing eyes — pulse brighter
  const eyeAlpha = 0.7 + Math.sin(walkPhase(frame) * 2) * 0.3;
  setPixel(ctx, cx - 1 + sway, baseCy - 5 + by, hexToRgba('#ff40ff', eyeAlpha));
  setPixel(ctx, cx + 1 + sway, baseCy - 5 + by, hexToRgba('#ff40ff', eyeAlpha));

  // Twin daggers — swing alternately
  drawLine(ctx, cx - 6 + sway, baseCy + 4 + by, cx - 10 + sway - daggerSwing, baseCy + by + daggerSwing, hexToRgba('#c0c0c0', alpha));
  drawLine(ctx, cx + 6 + sway, baseCy + 4 + by, cx + 10 + sway + daggerSwing, baseCy + by - daggerSwing, hexToRgba('#c0c0c0', alpha));
  setPixel(ctx, cx - 10 + sway - daggerSwing, baseCy - 1 + by + daggerSwing, hexToRgba(PALETTE.white, alpha));
  setPixel(ctx, cx + 10 + sway + daggerSwing, baseCy - 1 + by - daggerSwing, hexToRgba(PALETTE.white, alpha));
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

// 고대 드래곤: 큰 몸, 날개, 비늘, 불꽃 오라 — smooth wing flap + fire breath cycle
function drawAncientDragon(ctx: ReturnType<typeof makeCanvas>['ctx'], ox: number, frame: number): void {
  const cx = ox + 20;
  const bodyCy = 26;
  // Smooth wing flap (sinusoidal)
  const wingFlap = Math.round(Math.sin(walkPhase(frame)) * 5);
  const by = Math.round(Math.sin(walkPhase(frame) * 2) * 1);
  const tailSwing = Math.round(Math.sin(walkPhase(frame) + 1) * 3);

  // Wings (spread) — smooth up/down
  // Left wing
  drawLine(ctx, cx - 5, bodyCy - 3 + by, cx - 17, bodyCy - 10 + wingFlap + by, PALETTE.titan);
  drawLine(ctx, cx - 17, bodyCy - 10 + wingFlap + by, cx - 14, bodyCy - 1 + wingFlap + by, hexToRgba(PALETTE.titan, 0.6));
  drawLine(ctx, cx - 14, bodyCy - 1 + wingFlap + by, cx - 5, bodyCy + 4 + by, hexToRgba(PALETTE.titan, 0.4));
  // Wing membrane fill (left)
  for (let dy = bodyCy - 8 + wingFlap + by; dy < bodyCy + 2 + by; dy++) {
    const t = (dy - (bodyCy - 8 + wingFlap + by)) / 10;
    const x0 = Math.round(cx - 5 - t * 12);
    for (let x = x0; x < cx - 5; x++) {
      setPixel(ctx, x, dy, hexToRgba(PALETTE.titan, 0.2 + t * 0.15));
    }
  }
  // Right wing
  drawLine(ctx, cx + 5, bodyCy - 3 + by, cx + 17, bodyCy - 10 + wingFlap + by, PALETTE.titan);
  drawLine(ctx, cx + 17, bodyCy - 10 + wingFlap + by, cx + 14, bodyCy - 1 + wingFlap + by, hexToRgba(PALETTE.titan, 0.6));
  drawLine(ctx, cx + 14, bodyCy - 1 + wingFlap + by, cx + 5, bodyCy + 4 + by, hexToRgba(PALETTE.titan, 0.4));
  // Wing membrane fill (right)
  for (let dy = bodyCy - 8 + wingFlap + by; dy < bodyCy + 2 + by; dy++) {
    const t = (dy - (bodyCy - 8 + wingFlap + by)) / 10;
    const x1 = Math.round(cx + 5 + t * 12);
    for (let x = cx + 5; x < x1; x++) {
      setPixel(ctx, x, dy, hexToRgba(PALETTE.titan, 0.2 + t * 0.15));
    }
  }

  // Body (large, scaled)
  fillCircle(ctx, cx, bodyCy + by, 9, hexToRgba(PALETTE.titan, 0.72));
  drawCircle(ctx, cx, bodyCy + by, 9, PALETTE.titan);
  // Scale pattern — rotating slowly
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2 + walkPhase(frame) * 0.1;
    setPixel(ctx, cx + Math.round(5 * Math.cos(angle)), bodyCy + by + Math.round(5 * Math.sin(angle)), '#e06040');
  }

  // Head
  drawRect(ctx, cx - 5, 10 + by, 10, 8, PALETTE.titan);
  drawRect(ctx, cx - 5, 10 + by, 10, 1, '#e06040');
  // Horns
  setPixel(ctx, cx - 4, 8 + by, '#4a3a1e');
  setPixel(ctx, cx + 4, 8 + by, '#4a3a1e');
  setPixel(ctx, cx - 5, 7 + by, '#4a3a1e');
  setPixel(ctx, cx + 5, 7 + by, '#4a3a1e');
  // Eyes
  setPixel(ctx, cx - 1, 13 + by, '#ffe040');
  setPixel(ctx, cx + 1, 13 + by, '#ffe040');

  // Fire aura — pulsing
  const auraAlpha = 0.15 + Math.sin(walkPhase(frame) * 2) * 0.1;
  addGlow(ctx, cx, bodyCy + by, 10, PALETTE.fireOrange, auraAlpha);

  // Fire breath particles — cycle through
  const breathFrame = frame % 4;
  if (breathFrame >= 1) {
    const bDist = breathFrame * 3;
    setPixel(ctx, cx, 7 + by - bDist, PALETTE.fireOrange);
    setPixel(ctx, cx + 1, 6 + by - bDist, PALETTE.gold);
    if (breathFrame >= 2) {
      setPixel(ctx, cx - 1, 8 + by - bDist, hexToRgba(PALETTE.fireRed, 0.6));
    }
  }

  // Legs
  drawRect(ctx, cx - 5, bodyCy + 8 + by, 4, 7, hexToRgba(PALETTE.titan, 0.8));
  drawRect(ctx, cx + 2, bodyCy + 8 + by, 4, 7, hexToRgba(PALETTE.titan, 0.8));

  // Tail — swings
  drawLine(ctx, cx - 4, bodyCy + 6 + by, cx - 11 + tailSwing, bodyCy + 13 + by, hexToRgba(PALETTE.titan, 0.6));
  drawLine(ctx, cx - 11 + tailSwing, bodyCy + 13 + by, cx - 13 + tailSwing, bodyCy + 15 + by, hexToRgba(PALETTE.titan, 0.4));
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

function drawBossFrame(ctx: import('@napi-rs/canvas').SKRSContext2D, size: number, frame: number, rage: boolean): void {
  const cx = size / 2;
  const cy = size / 2;
  const scale = size / 48;
  const phase = (frame / 8) * Math.PI * 2;

  // Breathing: body slightly expands/contracts
  const breathScale = 1 + Math.sin(phase * 2) * 0.03;
  const bodyW = Math.floor(16 * scale * breathScale);
  const bodyH = Math.floor(12 * scale * breathScale);

  // Wing flap
  const wingFlap = Math.round(Math.sin(phase) * 4 * scale);

  // Fire aura pulse
  const auraPulse = 0.15 + Math.sin(phase * 2) * 0.1;
  const auraColor = rage ? PALETTE.fireRed : PALETTE.fireOrange;

  // Wings (left/right)
  const wingSpan = Math.floor(20 * scale);
  for (let i = 0; i < wingSpan; i++) {
    const wingH = Math.floor((wingSpan - i) * 0.6);
    const wingColor = rage ? '#a02020' : '#8b2020';
    for (let dy = -wingH + wingFlap; dy <= wingFlap; dy++) {
      setPixel(ctx, cx - bodyW - i, cy + dy, wingColor);
      setPixel(ctx, cx + bodyW + i, cy + dy, wingColor);
    }
  }

  // Body (large oval)
  for (let dy = -bodyH; dy <= bodyH; dy++) {
    for (let dx = -bodyW; dx <= bodyW; dx++) {
      if ((dx * dx) / (bodyW * bodyW) + (dy * dy) / (bodyH * bodyH) <= 1) {
        setPixel(ctx, cx + dx, cy + dy, PALETTE.titan);
      }
    }
  }

  // Scale shimmer — rotating
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + phase * 0.2;
    const r = 8 * scale;
    setPixel(ctx, Math.round(cx + r * Math.cos(a) * 0.6), Math.round(cy + r * Math.sin(a) * 0.4), '#e06040');
  }

  // Head (top circle) — slight bob
  const headBob = Math.round(Math.sin(phase * 2) * scale);
  fillCircle(ctx, cx, cy - bodyH - Math.floor(4 * scale) + headBob, Math.floor(6 * scale), PALETTE.titan);

  // Eyes — glow pulsing
  const eyeY = cy - bodyH - Math.floor(4 * scale) + headBob;
  const eyeColor = rage ? '#ff2020' : PALETTE.gold;
  setPixel(ctx, cx - Math.floor(2 * scale), eyeY, eyeColor);
  setPixel(ctx, cx + Math.floor(2 * scale), eyeY, eyeColor);

  // Flame aura — pulsing
  addGlow(ctx, cx, cy + bodyH, Math.floor(10 * scale), auraColor, auraPulse);

  // Fire breath particles (every other frame)
  if (frame % 3 !== 0) {
    const bDist = (frame % 3) * 3 * scale;
    setPixel(ctx, Math.round(cx), Math.round(cy - bodyH - 6 * scale - bDist + headBob), auraColor);
    setPixel(ctx, Math.round(cx + scale), Math.round(cy - bodyH - 7 * scale - bDist + headBob), PALETTE.gold);
  }

}

function applyColorTint(ctx: import('@napi-rs/canvas').SKRSContext2D, w: number, h: number, color: string, alpha: number, offsetX: number = 0, offsetY: number = 0): void {
  const imageData = ctx.getImageData(offsetX, offsetY, w, h);
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
  ctx.putImageData(imageData, offsetX, offsetY);
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
    const sheetW = FRAME_W * FRAME_COUNT;
    const { canvas, ctx } = makeCanvas(sheetW, FRAME_H);
    const drawFn = DRAW_FNS[id];
    const fallbackDrawFn =
      id === 'scout_drone' ? drawGoblinScoutFallback :
      id === 'battle_robot' ? drawOrcWarriorFallback :
      id === 'heavy_walker' ? drawStoneTrollFallback :
      id === 'stealth_drone' ? drawShadowAssassinFallback :
      drawAncientDragonFallback;
    renderSheetWithGate(
      (sheetCtx) => {
        for (let f = 0; f < FRAME_COUNT; f++) {
          drawShadow(sheetCtx, f * FRAME_W);
          drawFn(sheetCtx, f * FRAME_W, f);
        }
      },
      (sheetCtx) => {
        for (let f = 0; f < FRAME_COUNT; f++) {
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
      frameCount: FRAME_COUNT,
    });
  }

  // unit-death.png (8 frames) — monster death: flash → expand → fragments → smoke → fade
  {
    const deathFrames = FRAME_COUNT;
    const { canvas, ctx } = makeCanvas(FRAME_W * deathFrames, FRAME_H);
    const cx = 20;
    const cy = 24;

    for (let f = 0; f < deathFrames; f++) {
      const ox = f * FRAME_W;
      const t = f / (deathFrames - 1); // 0..1 normalized time

      if (f === 0) {
        // Frame 0: Bright white flash
        fillCircle(ctx, ox + cx, cy, 10, PALETTE.white);
        addGlow(ctx, ox + cx, cy, 12, PALETTE.gold, 0.5);
      } else if (f === 1) {
        // Frame 1: Flash expanding + orange tint
        fillCircle(ctx, ox + cx, cy, 12, hexToRgba(PALETTE.white, 0.7));
        drawCircle(ctx, ox + cx, cy, 13, PALETTE.fireOrange);
      } else if (f <= 3) {
        // Frame 2-3: Fragments scattering outward
        const scatter = f * 4;
        for (let i = 0; i < 20; i++) {
          const angle = (i / 20) * Math.PI * 2 + f * 0.3;
          const dist = scatter + (i * 37 % 6);
          const color = i % 3 === 0 ? PALETTE.fireOrange : i % 3 === 1 ? '#4a7a2a' : PALETTE.stoneDark;
          const size = f === 2 ? 2 : 1;
          drawRect(ctx, Math.round(ox + cx + dist * Math.cos(angle)), Math.round(cy + dist * Math.sin(angle)), size, size, color);
        }
        addGlow(ctx, ox + cx, cy, 8 - f * 2, PALETTE.fireOrange, 0.3);
      } else if (f <= 5) {
        // Frame 4-5: Dust/smoke cloud expanding
        const smokeR = 4 + (f - 3) * 3;
        const smokeAlpha = 0.5 - (f - 3) * 0.1;
        fillCircle(ctx, ox + cx, cy, smokeR, hexToRgba(PALETTE.dirtPath, smokeAlpha));
        // Scattered particles still visible
        for (let i = 0; i < 8; i++) {
          const angle = (i / 8) * Math.PI * 2;
          const dist = 10 + f * 2 + (i * 29 % 5);
          setPixel(ctx, Math.round(ox + cx + dist * Math.cos(angle)), Math.round(cy + dist * Math.sin(angle)), hexToRgba(PALETTE.dirtPath, smokeAlpha * 0.6));
        }
      } else {
        // Frame 6-7: Fading smoke wisps rising
        const riseY = (f - 5) * 3;
        const fadeAlpha = 0.3 - (f - 5) * 0.12;
        for (let i = 0; i < 6; i++) {
          const angle = (i / 6) * Math.PI * 2;
          const dist = 4 + (i * 13 % 5);
          setPixel(ctx, Math.round(ox + cx + dist * Math.cos(angle)), Math.round(cy - riseY + dist * Math.sin(angle)), hexToRgba(PALETTE.gray, Math.max(0.05, fadeAlpha)));
        }
      }
    }

    saveCanvas(canvas, `${OUTPUT_DIR}/unit-death.png`);
    entries.push({
      key: 'unit-death',
      type: 'spritesheet',
      path: 'assets/units/unit-death.png',
      frameWidth: FRAME_W,
      frameHeight: FRAME_H,
      frameCount: deathFrames,
    });
  }

  assertRequiredOutputs();

  // Boss titan — animated idle (96x96, 8 frames) — breathing + wing + fire aura
  const BOSS_SIZE = 96;
  const BOSS_FRAMES = 8;
  {
    const { canvas, ctx } = makeCanvas(BOSS_SIZE * BOSS_FRAMES, BOSS_SIZE);
    for (let f = 0; f < BOSS_FRAMES; f++) {
      const ox = f * BOSS_SIZE;
      // Save/restore per frame to avoid bleed
      ctx.save();
      ctx.translate(ox, 0);
      drawBossFrame(ctx, BOSS_SIZE, f, false);
      ctx.restore();
    }
    saveCanvas(canvas, `${OUTPUT_DIR}/titan-boss.png`);
    entries.push({
      key: 'unit-titan-boss',
      type: 'spritesheet',
      path: 'assets/units/titan-boss.png',
      frameWidth: BOSS_SIZE,
      frameHeight: BOSS_SIZE,
      frameCount: BOSS_FRAMES,
      section: 'boss' as const,
    });
  }

  // Boss titan phase 2 — rage variant (red tint + more fire)
  {
    const { canvas, ctx } = makeCanvas(BOSS_SIZE * BOSS_FRAMES, BOSS_SIZE);
    for (let f = 0; f < BOSS_FRAMES; f++) {
      const ox = f * BOSS_SIZE;
      ctx.save();
      ctx.translate(ox, 0);
      drawBossFrame(ctx, BOSS_SIZE, f, true);
      ctx.restore();
      // Apply rage tint per-frame at absolute coordinates (getImageData ignores translate)
      applyColorTint(ctx, BOSS_SIZE, BOSS_SIZE, PALETTE.fireRed, 0.25, ox, 0);
    }
    saveCanvas(canvas, `${OUTPUT_DIR}/titan-boss-rage.png`);
    entries.push({
      key: 'unit-titan-boss-rage',
      type: 'spritesheet',
      path: 'assets/units/titan-boss-rage.png',
      frameWidth: BOSS_SIZE,
      frameHeight: BOSS_SIZE,
      frameCount: BOSS_FRAMES,
      section: 'boss' as const,
    });
  }

  return entries;
}

if (import.meta.main) {
  generate().then(e => console.log(JSON.stringify(e, null, 2)));
}
