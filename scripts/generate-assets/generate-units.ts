import { makeCanvas, saveCanvas, PALETTE, hexToRgba, drawRect, fillCircle, drawCircle, setPixel, drawLine, addGlow, drawIsoShadow, type ManifestEntry } from './shared';
import { mkdirSync, existsSync } from 'fs';
import {
  applyOutlineToSheet,
  DEATH_FRAMES,
  FRAME_H as SHARED_FRAME_H,
  FRAME_W as SHARED_FRAME_W,
  IDLE_FRAMES,
  type UnitDrawModule,
} from './units/shared-rendering';
import goblinScavenger from './units/goblin-scavenger';
import orcVeteran from './units/orc-veteran';
import stoneTroll from './units/stone-troll';
import shadowAssassin from './units/shadow-assassin';

const OUTPUT_DIR = 'packages/web-shell/public/assets/units';

const FRAME_W = SHARED_FRAME_W;
const FRAME_H = SHARED_FRAME_H;
const FRAME_COUNT = 8;

// Walk cycle phase for 8-frame animation (0..2π)
function walkPhase(frame: number): number {
  return (frame / FRAME_COUNT) * Math.PI * 2;
}

// (bobY, legStep, armSwing, bodyLean moved to unit modules)
const REQUIRED_FILES = [
  'scout_drone.png',
  'scout_drone_idle.png',
  'scout_drone_death.png',
  'battle_robot.png',
  'battle_robot_idle.png',
  'battle_robot_death.png',
  'heavy_walker.png',
  'heavy_walker_idle.png',
  'heavy_walker_death.png',
  'stealth_drone.png',
  'stealth_drone_idle.png',
  'stealth_drone_death.png',
  'titan.png',
];

function drawShadow(ctx: ReturnType<typeof makeCanvas>['ctx'], ox: number): void {
  const cx = ox + 20;
  drawIsoShadow(ctx, cx, 43, 10, 5, 0.3);
}

// Per-unit shadow: size proportional to body, assassin gets faint dispersed shadow
const UNIT_SHADOWS: Record<string, { rx: number; ry: number; alpha: number }> = {
  scout_drone:   { rx: 8,  ry: 4, alpha: 0.25 },  // small goblin
  battle_robot:  { rx: 10, ry: 5, alpha: 0.28 },  // medium orc
  heavy_walker:  { rx: 11, ry: 5, alpha: 0.28 },  // large troll
  stealth_drone: { rx: 6,  ry: 3, alpha: 0.12 },  // faint, floating
};

function drawUnitShadow(ctx: ReturnType<typeof makeCanvas>['ctx'], ox: number, unitId: string): void {
  const cx = ox + 20;
  const s = UNIT_SHADOWS[unitId];
  if (s) {
    drawIsoShadow(ctx, cx, 43, s.rx, s.ry, s.alpha);
  } else {
    drawIsoShadow(ctx, cx, 43, 10, 5, 0.3);
  }
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

// (Legacy draw functions removed — replaced by modular units in ./units/)

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

// === Dragon Boss Palette (dark & evil medieval dragon) ===
const DRAGON = {
  bodyDeep:    '#1a0404',
  bodyDark:    '#2a0808',
  body:        '#3a0e0e',
  bodyMid:     '#4a1212',
  bodyLight:   '#5a1818',
  belly:       '#602020',
  bellyGlow:   '#803020',
  wingBone:    '#200404',
  wingMem:     '#180303',
  wingMemRage: '#2a0606',
  spine:       '#1a0e04',
  horn:        '#2a1a0a',
  hornTip:     '#3a2a1a',
  claw:        '#0a0402',
  eyeNorm:     '#e0b040',
  eyeRage:     '#ff1010',
  fireCore:    '#ffe060',
  fireOrange:  '#e07020',
  fireRed:     '#c03020',
  fireDark:    '#801808',
  smoke:       '#403020',
  lavaGlow:    '#c04010',
} as const;

/** Pixel-art ellipse fill (no anti-aliasing) — uses setPixel for crisp edges */
function fillEllipse(ctx: import('@napi-rs/canvas').SKRSContext2D, cx: number, cy: number, rx: number, ry: number, color: string): void {
  for (let dy = -ry; dy <= ry; dy++) {
    for (let dx = -rx; dx <= rx; dx++) {
      if ((dx * dx) / (rx * rx) + (dy * dy) / (ry * ry) <= 1) {
        setPixel(ctx, cx + dx, cy + dy, color);
      }
    }
  }
}

function drawBossFrame(ctx: import('@napi-rs/canvas').SKRSContext2D, size: number, frame: number, rage: boolean): void {
  const cx = size / 2; // 48
  const cy = 44;       // body center (slightly above center, room for tail above and head below)
  const phase = (frame / 8) * Math.PI * 2;

  // === Animation parameters ===
  const wingFlap = Math.sin(phase);
  const wingY = wingFlap > 0 ? wingFlap * 6 : wingFlap * 4; // asymmetric: fast down, slow up
  const wingSpread = 1 + wingFlap * 0.08;
  const tailSwing1 = Math.sin(phase + Math.PI * 0.6) * 6;
  const tailSwing2 = Math.sin(phase + Math.PI) * 4;
  const headBob = Math.round(Math.sin(phase * 2) * 1);
  const bodyBob = Math.round(Math.sin(phase * 2) * 1.0);  // BUG-2 FIX: was 0.5
  const breathScale = 1 + Math.sin(phase * 2) * 0.02;
  const legAnim = Math.round(Math.sin(phase) * 3);

  // === 1. Fire aura (ground glow) ===
  addGlow(ctx, cx, cy, 40, rage ? DRAGON.fireRed : DRAGON.fireOrange, rage ? 0.12 : 0.08);

  // === 2. Shadow ===
  drawIsoShadow(ctx, cx, cy + 2, 32, 16, 0.25);

  // === 3. Tail (top — extending upward, away from movement) ===
  const tailBaseY = cy - 16;
  for (let t = 0; t <= 1; t += 0.04) {
    const tx = cx + tailSwing1 * t * 0.7 + tailSwing2 * t * t * 0.3;
    const ty = tailBaseY - t * 24;  // BUG-1 FIX: was t * 30
    const thickness = Math.round(3 - t * 2);
    const c = t < 0.5 ? DRAGON.body : DRAGON.bodyDark;
    drawRect(ctx, tx - thickness, ty, thickness * 2 + 1, 1, c);
  }
  // Tail spade (diamond at tip)
  const tsX = Math.round(cx + tailSwing2 * 0.8);
  const tsY = Math.round(tailBaseY - 24);  // BUG-1 FIX: was tailBaseY - 30
  drawLine(ctx, tsX, tsY, tsX - 4, tsY - 4, DRAGON.bodyDark);
  drawLine(ctx, tsX, tsY, tsX + 4, tsY - 4, DRAGON.bodyDark);
  drawLine(ctx, tsX - 4, tsY - 4, tsX, tsY - 2, DRAGON.bodyDark);
  drawLine(ctx, tsX + 4, tsY - 4, tsX, tsY - 2, DRAGON.bodyDark);
  // Tail spines (3)
  for (let i = 0; i < 3; i++) {
    const t = (i + 1) / 4;
    const spX = Math.round(cx + tailSwing1 * t * 0.5);
    const spY = Math.round(tailBaseY - t * 22);
    drawLine(ctx, spX - 2, spY, spX, spY - 3, DRAGON.spine);
    drawLine(ctx, spX + 2, spY, spX, spY - 3, DRAGON.spine);
  }
  // Tail fire (rage only)
  if (rage) {
    addGlow(ctx, tsX, tsY - 2, 4, DRAGON.fireRed, 0.25 + Math.sin(phase * 3) * 0.1);
  }

  // === 4. Body (vertical ellipse — head-to-tail orientation) ===
  const bw = Math.round(16 * breathScale);
  const bh = Math.round(20 * breathScale);
  const bcy = cy + bodyBob;

  // Body outer shadow
  fillEllipse(ctx, cx, bcy, bw + 1, bh + 1, DRAGON.bodyDeep);
  // Main body
  fillEllipse(ctx, cx, bcy, bw, bh, DRAGON.body);
  // Spine ridge (center line)
  drawLine(ctx, cx, bcy - bh + 2, cx, bcy + bh - 2, DRAGON.bodyDeep);
  // Belly glow (lava showing through)
  const bellyAlpha = rage ? 0.3 : 0.12;
  addGlow(ctx, cx, bcy, Math.round(bw * 0.6), rage ? DRAGON.lavaGlow : DRAGON.bellyGlow, bellyAlpha + Math.sin(phase * 2) * 0.05);
  // Belly scale lines
  for (let i = 0; i < 3; i++) {
    const sy = bcy + 2 + i * 3;
    const hw = Math.round(bw * (0.5 - i * 0.1));
    drawLine(ctx, cx - hw, sy, cx + hw, sy, hexToRgba(DRAGON.belly, 0.5));
  }
  // Scale texture dots
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + phase * 0.08;
    const sx = cx + Math.round(Math.cos(a) * bw * 0.5);
    const sy = bcy + Math.round(Math.sin(a) * bh * 0.45);
    setPixel(ctx, sx, sy, hexToRgba(DRAGON.bodyMid, 0.4));
  }

  // === 5. Spine ridges (on body) ===
  for (let i = 0; i < 6; i++) {
    const t = (i - 2.5) / 3;
    const sy = Math.round(bcy + t * bh * 0.7);
    drawLine(ctx, cx - 2, sy, cx, sy - 1, DRAGON.spine);
    drawLine(ctx, cx + 2, sy, cx, sy - 1, DRAGON.spine);
  }

  // === 6. Wings (massive, spread left-right) ===
  for (const side of [-1, 1] as const) {
    const wbx = cx + side * 8;  // wing base on body edge
    const wby = cy;

    // 3 wing bones
    const boneLens = [34, 30, 24].map(l => Math.round(l * wingSpread));
    // Bone endpoints: front bone angles down (toward head), back bone angles up (toward tail)
    const boneEndpoints = [
      { x: wbx + side * boneLens[0], y: wby + 12 + Math.round(wingY) },      // front
      { x: wbx + side * boneLens[1], y: wby - 2 + Math.round(wingY * 0.7) },  // middle
      { x: wbx + side * boneLens[2], y: wby - 14 + Math.round(wingY * 0.4) }, // back
    ];

    // Wing membrane — fill area between bones using scanline
    const memColor = rage ? DRAGON.wingMemRage : DRAGON.wingMem;
    for (let row = Math.min(boneEndpoints[2].y, wby - 8); row <= Math.max(boneEndpoints[0].y, wby + 8); row++) {
      const t = (row - boneEndpoints[2].y) / (boneEndpoints[0].y - boneEndpoints[2].y + 0.01);
      const outerX = Math.round(wbx + side * (boneLens[2] + t * (boneLens[0] - boneLens[2])));
      const innerX = wbx + side * 2;
      const startX = Math.min(innerX, outerX);
      const endX = Math.max(innerX, outerX);
      for (let px = startX; px <= endX; px++) {
        setPixel(ctx, px, row, hexToRgba(memColor, 0.55));
      }
    }

    // Rage: wing inner glow
    if (rage) {
      addGlow(ctx, wbx + side * 18, wby, 14, DRAGON.fireRed, 0.08);
    }

    // Wing bones
    for (const ep of boneEndpoints) {
      drawLine(ctx, wbx, wby, ep.x, ep.y, DRAGON.wingBone);
      drawLine(ctx, wbx, wby + 1, ep.x, ep.y + 1, DRAGON.wingBone);
    }

    // Wing bone tip claws (first 2 bones)
    for (let b = 0; b < 2; b++) {
      const ep = boneEndpoints[b];
      setPixel(ctx, ep.x + side, ep.y, DRAGON.claw);
      setPixel(ctx, ep.x + side, ep.y + 1, DRAGON.claw);
    }
  }

  // === 7. Back legs (toward tail = upper area) ===
  for (const side of [-1, 1] as const) {
    const lx = cx + side * 14;
    const ly = bcy - 8;
    const le = -legAnim; // opposite phase to front legs
    drawRect(ctx, lx + (side > 0 ? 0 : -5), ly + le, 5, 10, DRAGON.bodyDark);
    // Claws (3)
    for (let c = 0; c < 3; c++) {
      setPixel(ctx, lx + side * (3 + c), ly + le + 9 + c, DRAGON.claw);
    }
  }

  // === 8. Front legs (toward head = lower area) ===
  for (const side of [-1, 1] as const) {
    const lx = cx + side * 12;
    const ly = bcy + 6;
    const le = legAnim; // main phase
    drawRect(ctx, lx + (side > 0 ? 0 : -5), ly + le, 5, 10, DRAGON.bodyMid);
    for (let c = 0; c < 3; c++) {
      setPixel(ctx, lx + side * (3 + c), ly + le + 9 + c, DRAGON.claw);
    }
  }

  // === 9. Neck connection ===
  fillEllipse(ctx, cx, bcy + bh - 2, 8, 5, DRAGON.body);

  // === 10. Head (bottom — facing downward, movement direction) ===
  const headY = bcy + bh + 6 + headBob;

  // Head shape (hexagonal, snout pointing down)
  // Top of head (wider)
  fillEllipse(ctx, cx, headY, 9, 6, DRAGON.body);
  // Snout (narrower, extends down)
  for (let dy = 0; dy < 6; dy++) {
    const hw = Math.round(5 - dy * 0.7);
    drawRect(ctx, cx - hw, headY + 4 + dy, hw * 2 + 1, 1, dy < 3 ? DRAGON.body : DRAGON.bodyDark);
  }
  // Head center ridge
  drawLine(ctx, cx, headY - 4, cx, headY + 9, DRAGON.bodyDeep);
  // Head dark top half
  for (let dy = -5; dy < 0; dy++) {
    const hw = Math.round(4 + dy * 0.3);
    if (hw > 0) drawRect(ctx, cx - hw, headY + dy, hw * 2 + 1, 1, DRAGON.bodyDark);
  }

  // Horns (sweeping upward/outward — trailing behind the head)
  for (const side of [-1, 1] as const) {
    // Horn base to tip
    drawLine(ctx, cx + side * 6, headY - 2, cx + side * 14, headY - 8, DRAGON.horn);
    drawLine(ctx, cx + side * 6, headY - 1, cx + side * 14, headY - 7, DRAGON.horn);
    // Horn tip highlight
    setPixel(ctx, cx + side * 14, headY - 8, DRAGON.hornTip);
    setPixel(ctx, cx + side * 13, headY - 8, DRAGON.hornTip);
  }

  // Eyes (on sides of head, glowing)
  for (const side of [-1, 1] as const) {
    const ex = cx + side * 4;
    const ey = headY + 1;
    const eColor = rage ? DRAGON.eyeRage : DRAGON.eyeNorm;
    // Eye glow
    addGlow(ctx, ex, ey, rage ? 5 : 3, eColor, rage ? 0.3 : 0.2);
    // Eye dot
    setPixel(ctx, ex, ey, eColor);
    setPixel(ctx, ex + 1, ey, eColor);
    // Eye highlight
    setPixel(ctx, ex + 1, ey - 1, '#ffffff');
  }

  // Nostrils
  setPixel(ctx, cx - 1, headY + 8, DRAGON.bodyDeep);
  setPixel(ctx, cx + 1, headY + 8, DRAGON.bodyDeep);

  // === 11. Fire breath (downward — toward movement direction) ===
  // Nostril smoke (always)
  setPixel(ctx, cx - 1, headY + 10, hexToRgba(DRAGON.smoke, 0.3));
  setPixel(ctx, cx + 1, headY + 11, hexToRgba(DRAGON.smoke, 0.25));

  // Periodic fire breath (4-frame cycle)
  const breathCycle = frame % 4;
  if (breathCycle >= 1) {
    const fireLen = rage ? breathCycle * 5 : breathCycle * 3;
    const fireBaseY = headY + 10;
    // Fire stream — 3 layers
    for (let fy = 0; fy < fireLen; fy++) {
      const t = fy / fireLen;
      const halfW = Math.round(2 * (1 - t * 0.5)); // narrows toward tip
      const colors = [DRAGON.fireCore, rage ? DRAGON.fireRed : DRAGON.fireOrange, DRAGON.fireDark];
      const c = colors[Math.min(Math.floor(t * 3), 2)];
      const alpha = 0.8 - t * 0.4;
      for (let fx = -halfW; fx <= halfW; fx++) {
        // Slight wave
        const wave = Math.round(Math.sin(fy * 0.8 + phase * 3) * 1);
        setPixel(ctx, cx + fx + wave, fireBaseY + fy, hexToRgba(c, alpha));
      }
    }
    // Fire core (bright center)
    setPixel(ctx, cx, fireBaseY, DRAGON.fireCore);
    setPixel(ctx, cx, fireBaseY + 1, DRAGON.fireCore);

    // Smoke puffs at tip
    if (breathCycle >= 2) {
      setPixel(ctx, cx - 1, fireBaseY + fireLen + 1, hexToRgba(DRAGON.smoke, 0.2));
      setPixel(ctx, cx + 1, fireBaseY + fireLen + 2, hexToRgba(DRAGON.smoke, 0.15));
    }
  }

  // === 12. Rage overlay ===
  if (rage) {
    // Lava crack lines on body (5 lines)
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + phase * 0.12;
      const r1 = bw * 0.3;
      const r2 = bw * 0.8;
      const x1 = Math.round(cx + Math.cos(a) * r1);
      const y1 = Math.round(bcy + Math.sin(a) * bh * 0.3);
      const x2 = Math.round(cx + Math.cos(a + 0.3) * r2);
      const y2 = Math.round(bcy + Math.sin(a + 0.3) * bh * 0.7);
      drawLine(ctx, x1, y1, x2, y2, hexToRgba('#e04020', 0.2));
    }

    // Body edge glow
    for (let a = 0; a < Math.PI * 2; a += 0.15) {
      const edgeX = Math.round(cx + Math.cos(a) * (bw + 2));
      const edgeY = Math.round(bcy + Math.sin(a) * (bh + 2));
      setPixel(ctx, edgeX, edgeY, hexToRgba(DRAGON.fireRed, 0.15));
    }
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

const REDESIGNED_UNIT_MODULES: Record<string, UnitDrawModule> = {
  scout_drone: goblinScavenger,
  battle_robot: orcVeteran,
  heavy_walker: stoneTroll,
  stealth_drone: shadowAssassin,
  flame_imp: goblinScavenger,
  lava_golem: stoneTroll,
  arcane_mage: goblinScavenger,
  mana_shield: stoneTroll,
  orc_warlord: orcVeteran,
  forge_master: stoneTroll,
  corrupted_archmage: shadowAssassin,
};

const UNIT_IDS = [
  'scout_drone',
  'battle_robot',
  'heavy_walker',
  'stealth_drone',
  'titan',
  'flame_imp',
  'lava_golem',
  'arcane_mage',
  'mana_shield',
  'orc_warlord',
  'forge_master',
  'corrupted_archmage',
] as const;

export async function generate(): Promise<ManifestEntry[]> {
  mkdirSync(OUTPUT_DIR, { recursive: true });
  const entries: ManifestEntry[] = [];

  for (const [id, module] of Object.entries(REDESIGNED_UNIT_MODULES)) {
    const walkSheetW = FRAME_W * FRAME_COUNT;
    const { canvas: walkCanvas, ctx: walkCtx } = makeCanvas(walkSheetW, FRAME_H);
    renderSheetWithGate(
      (sheetCtx) => {
        for (let f = 0; f < FRAME_COUNT; f++) {
          drawUnitShadow(sheetCtx, f * FRAME_W, id);
          module.drawWalk(sheetCtx, f * FRAME_W, f);
        }
        applyOutlineToSheet(sheetCtx, FRAME_COUNT);
      },
      (sheetCtx) => {
        for (let f = 0; f < FRAME_COUNT; f++) {
          drawUnitShadow(sheetCtx, f * FRAME_W, id);
          module.drawWalkFallback(sheetCtx, f * FRAME_W, f);
        }
        applyOutlineToSheet(sheetCtx, FRAME_COUNT);
      },
      walkCanvas,
      walkCtx,
      id,
    );
    saveCanvas(walkCanvas, `${OUTPUT_DIR}/${id}.png`);
    entries.push({
      key: `unit-${id}`,
      type: 'spritesheet',
      path: `assets/units/${id}.png`,
      frameWidth: FRAME_W,
      frameHeight: FRAME_H,
      frameCount: FRAME_COUNT,
    });

    const idleSheetW = FRAME_W * IDLE_FRAMES;
    const { canvas: idleCanvas, ctx: idleCtx } = makeCanvas(idleSheetW, FRAME_H);
    for (let f = 0; f < IDLE_FRAMES; f++) {
      drawUnitShadow(idleCtx, f * FRAME_W, id);
      module.drawIdle(idleCtx, f * FRAME_W, f);
    }
    applyOutlineToSheet(idleCtx, IDLE_FRAMES);
    saveCanvas(idleCanvas, `${OUTPUT_DIR}/${id}_idle.png`);
    entries.push({
      key: `unit-${id}-idle`,
      type: 'spritesheet',
      path: `assets/units/${id}_idle.png`,
      frameWidth: FRAME_W,
      frameHeight: FRAME_H,
      frameCount: IDLE_FRAMES,
    });

    const deathSheetW = FRAME_W * DEATH_FRAMES;
    const { canvas: deathCanvas, ctx: deathCtx } = makeCanvas(deathSheetW, FRAME_H);
    for (let f = 0; f < DEATH_FRAMES; f++) {
      module.drawDeath(deathCtx, f * FRAME_W, f);
    }
    applyOutlineToSheet(deathCtx, DEATH_FRAMES);
    saveCanvas(deathCanvas, `${OUTPUT_DIR}/${id}_death.png`);
    entries.push({
      key: `unit-${id}-death`,
      type: 'spritesheet',
      path: `assets/units/${id}_death.png`,
      frameWidth: FRAME_W,
      frameHeight: FRAME_H,
      frameCount: DEATH_FRAMES,
    });
  }

  {
    const sheetW = FRAME_W * FRAME_COUNT;
    const { canvas, ctx } = makeCanvas(sheetW, FRAME_H);
    renderSheetWithGate(
      (sheetCtx) => {
        for (let f = 0; f < FRAME_COUNT; f++) {
          drawShadow(sheetCtx, f * FRAME_W);
          drawAncientDragon(sheetCtx, f * FRAME_W, f);
        }
      },
      (sheetCtx) => {
        for (let f = 0; f < FRAME_COUNT; f++) {
          drawShadow(sheetCtx, f * FRAME_W);
          drawAncientDragonFallback(sheetCtx, f * FRAME_W, f);
        }
      },
      canvas,
      ctx,
      'titan',
    );
    saveCanvas(canvas, `${OUTPUT_DIR}/titan.png`);
    entries.push({
      key: 'unit-titan',
      type: 'spritesheet',
      path: 'assets/units/titan.png',
      frameWidth: FRAME_W,
      frameHeight: FRAME_H,
      frameCount: FRAME_COUNT,
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
      section: 'preload' as const,
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
      section: 'preload' as const,
    });
  }

  return entries;
}

if (import.meta.main) {
  generate().then(e => console.log(JSON.stringify(e, null, 2)));
}
