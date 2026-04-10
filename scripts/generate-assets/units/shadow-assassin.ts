import { PALETTE, hexToRgba, drawRect, fillCircle, setPixel, drawLine, addGlow } from '../shared';
import {
  shade3,
  drawShadedRect,
  idlePhase,
  deathPhase,
  deathT,
  FRAME_W,
  FRAME_H,
  IDLE_FRAMES,
  DEATH_FRAMES,
  type UnitDrawModule,
} from './shared-rendering';
import type { SKRSContext2D } from '@napi-rs/canvas';

// ---------------------------------------------------------------------------
// Walk animation curves (local)
// ---------------------------------------------------------------------------
const WALK_FRAMES = 8;
function walkPhase(frame: number): number { return (frame / WALK_FRAMES) * Math.PI * 2; }
// Floating bob: slow, gentle ±1px (NOT walking bounce)
function floatY(frame: number): number { return Math.round(Math.sin(walkPhase(frame)) * 1); }
// Lateral drift: slow ±1px side-to-side glide
function driftX(frame: number): number { return Math.round(Math.sin(walkPhase(frame) * 0.5) * 1); }
function armSwing(frame: number): number { return Math.round(Math.sin(walkPhase(frame) + Math.PI) * 2); }

// ---------------------------------------------------------------------------
// Color constants
// ---------------------------------------------------------------------------
const CLOAK_COLOR = PALETTE.stealthDrone; // '#302040'
const CLOAK = shade3(CLOAK_COLOR);
const INNER_CLOAK = '#403060';
const EYE_COLOR = '#9040ff';
const BLADE_COLOR = PALETTE.stoneLight;   // '#b0b0b0'
const BLADE_DARK = PALETTE.ironDark;      // '#4a4438'

// Vertical extents
const HEAD_TOP = 8;      // top of hood
const WAIST_Y = 28;      // waist line — below this, alpha gradient kicks in
const BOTTOM_Y = 42;     // lowest smoke wisps (floats above ground)

// ---------------------------------------------------------------------------
// Alpha gradient helper: solid above waist, fading below
// ---------------------------------------------------------------------------
function alphaAt(y: number): number {
  if (y <= WAIST_Y) return 1.0;
  if (y >= BOTTOM_Y) return 0.3;
  return 1.0 - ((y - WAIST_Y) / (BOTTOM_Y - WAIST_Y)) * 0.7;
}

/** Draw a rect with per-row alpha gradient below waist. */
function drawFadingRect(
  ctx: SKRSContext2D,
  x: number, y: number, w: number, h: number,
  color: string,
): void {
  for (let row = 0; row < h; row++) {
    const ry = y + row;
    drawRect(ctx, x, ry, w, 1, hexToRgba(color, alphaAt(ry)));
  }
}

/** Set a pixel with vertical alpha gradient. */
function setFadingPixel(ctx: SKRSContext2D, x: number, y: number, color: string): void {
  setPixel(ctx, x, y, hexToRgba(color, alphaAt(y)));
}

/** Draw a line with alpha applied at the midpoint y. */
function drawFadingLine(
  ctx: SKRSContext2D,
  x1: number, y1: number, x2: number, y2: number,
  color: string,
): void {
  const midY = (y1 + y2) / 2;
  drawLine(ctx, x1, y1, x2, y2, hexToRgba(color, alphaAt(midY)));
}

// ---------------------------------------------------------------------------
// drawWalk — 8 frames, gliding motion with cape billow
// ---------------------------------------------------------------------------
function drawWalk(ctx: SKRSContext2D, ox: number, frame: number): void {
  const cx = ox + 20;
  const by = floatY(frame);
  const lean = driftX(frame);
  const capeBillow = Math.round(Math.sin(walkPhase(frame)) * 2);

  // --- Hood (top of head) ---
  const hoodTop = HEAD_TOP + by;
  drawFadingRect(ctx, cx - 5 + lean, hoodTop, 10, 2, CLOAK.shadow);
  drawFadingRect(ctx, cx - 6 + lean, hoodTop + 2, 12, 4, CLOAK.base);
  drawFadingRect(ctx, cx - 7 + lean, hoodTop + 4, 14, 3, CLOAK.base);
  drawFadingRect(ctx, cx - 4 + lean, hoodTop, 8, 1, CLOAK.highlight);

  // --- Face (darkness + eyes) ---
  const faceY = hoodTop + 5;
  drawFadingRect(ctx, cx - 4 + lean, faceY, 8, 4, CLOAK.shadow);

  // Glowing eyes
  const eyePulse = 0.8 + Math.sin(walkPhase(frame) * 2) * 0.2;
  const eyeY = faceY + 1;
  setPixel(ctx, cx - 2 + lean, eyeY, hexToRgba(EYE_COLOR, eyePulse));
  setPixel(ctx, cx + 1 + lean, eyeY, hexToRgba(EYE_COLOR, eyePulse));
  addGlow(ctx, cx - 2 + lean, eyeY, 3, EYE_COLOR, eyePulse * 0.3);
  addGlow(ctx, cx + 1 + lean, eyeY, 3, EYE_COLOR, eyePulse * 0.3);

  // --- Shoulders & upper torso ---
  const shoulderY = hoodTop + 7;
  drawFadingRect(ctx, cx - 8 + lean, shoulderY, 16, 2, CLOAK.base);
  drawFadingRect(ctx, cx - 7 + lean, shoulderY + 2, 14, 3, CLOAK.base);
  drawFadingRect(ctx, cx - 6 + lean, shoulderY + 5, 12, 3, CLOAK.shadow);

  // Inner cloak detail
  drawFadingRect(ctx, cx - 3 + lean, shoulderY + 2, 6, 4, INNER_CLOAK);

  // --- Daggers crossed in front of chest (static, no swing) ---
  const daggerCY = shoulderY + 5;
  drawFadingLine(ctx, cx - 5 + lean, daggerCY - 2 + by, cx + 2 + lean, daggerCY + 3 + by, BLADE_COLOR);
  drawFadingLine(ctx, cx + 4 + lean, daggerCY - 2 + by, cx - 3 + lean, daggerCY + 3 + by, BLADE_COLOR);

  // --- Cape / Cloak billowing sides ---
  // Left cape edge
  for (let dy = 0; dy < 16; dy++) {
    const y = shoulderY + dy;
    const spread = Math.round(Math.sin((dy / 16) * Math.PI) * 3) + capeBillow;
    const xa = cx - 8 + lean - spread;
    drawFadingRect(ctx, xa, y, 2, 1, CLOAK.base);
  }
  // Right cape edge
  for (let dy = 0; dy < 16; dy++) {
    const y = shoulderY + dy;
    const spread = Math.round(Math.sin((dy / 16) * Math.PI) * 3) - capeBillow;
    const xa = cx + 6 + lean + spread;
    drawFadingRect(ctx, xa, y, 2, 1, CLOAK.base);
  }

  // --- Lower body: cloak continues with narrowing + alpha gradient ---
  const waistTop = shoulderY + 8; // ~23+by area
  // Lateral sway increases toward feet (walking feel without visible legs)
  const smokeBaseShift = Math.round(Math.sin(walkPhase(frame)) * 1.5);
  for (let dy = 0; dy < (BOTTOM_Y - waistTop); dy++) {
    const y = waistTop + dy;
    const t = dy / (BOTTOM_Y - waistTop);
    // Narrows from 12px wide to 6px as smoke disperses
    const halfW = Math.round(6 - t * 3);
    const lateralSway = Math.round(smokeBaseShift * t);
    const smokeJitter = Math.round(Math.sin(walkPhase(frame) + dy * 0.5) * (t * 2));
    drawFadingRect(ctx, cx - halfW + lean + smokeJitter + lateralSway, y, halfW * 2, 1, CLOAK.base);
  }

  // --- Smoke wisps at feet ---
  for (let i = 0; i < 4; i++) {
    const angle = walkPhase(frame) + (i / 4) * Math.PI * 2;
    const wx = cx + Math.round(Math.cos(angle) * 5) + lean;
    const wy = BOTTOM_Y - 2 + Math.round(Math.sin(angle) * 2);
    const a = 0.15 + Math.sin(angle) * 0.1;
    setPixel(ctx, wx, wy, hexToRgba(CLOAK.base, a));
    setPixel(ctx, wx + 1, wy, hexToRgba(CLOAK.shadow, a * 0.7));
  }
}

// ---------------------------------------------------------------------------
// drawWalkFallback — simplified silhouette version
// ---------------------------------------------------------------------------
function drawWalkFallback(ctx: SKRSContext2D, ox: number, frame: number): void {
  const cx = ox + 20;
  const by = (frame === 1 || frame === 5) ? -1 : 0;

  // Simple hooded shape (upper body solid)
  drawRect(ctx, cx - 5, HEAD_TOP + by, 10, 6, CLOAK.base);               // hood
  drawRect(ctx, cx - 7, HEAD_TOP + 6 + by, 14, 12, CLOAK.base);          // torso/shoulders

  // Eyes
  setPixel(ctx, cx - 2, HEAD_TOP + 6 + by, hexToRgba(EYE_COLOR, 0.9));
  setPixel(ctx, cx + 1, HEAD_TOP + 6 + by, hexToRgba(EYE_COLOR, 0.9));

  // Lower body with alpha fade
  for (let dy = 0; dy < (BOTTOM_Y - WAIST_Y); dy++) {
    const y = WAIST_Y + dy;
    const halfW = Math.round(5 - (dy / (BOTTOM_Y - WAIST_Y)) * 3);
    drawRect(ctx, cx - halfW, y + by, halfW * 2, 1, hexToRgba(CLOAK.base, alphaAt(y)));
  }

  // Daggers
  drawLine(ctx, cx - 6, HEAD_TOP + 12 + by, cx + 2, HEAD_TOP + 18 + by, BLADE_COLOR);
  drawLine(ctx, cx + 5, HEAD_TOP + 12 + by, cx - 3, HEAD_TOP + 18 + by, BLADE_COLOR);
}

// ---------------------------------------------------------------------------
// drawIdle — 6 frames, cape sways gently, eye glow pulses
// ---------------------------------------------------------------------------
function drawIdle(ctx: SKRSContext2D, ox: number, frame: number): void {
  const cx = ox + 20;
  const phase = idlePhase(frame);
  const sway = Math.round(Math.sin(phase) * 1);       // very gentle sway
  const capeSway = Math.round(Math.sin(phase) * 1.5);

  // --- Hood ---
  const hoodTop = HEAD_TOP;
  drawFadingRect(ctx, cx - 5, hoodTop, 10, 2, CLOAK.shadow);
  drawFadingRect(ctx, cx - 6, hoodTop + 2, 12, 4, CLOAK.base);
  drawFadingRect(ctx, cx - 7, hoodTop + 4, 14, 3, CLOAK.base);
  drawFadingRect(ctx, cx - 4, hoodTop, 8, 1, CLOAK.highlight);

  // --- Face ---
  const faceY = hoodTop + 5;
  drawFadingRect(ctx, cx - 4, faceY, 8, 4, CLOAK.shadow);

  // Pulsing eyes
  const eyeBright = 0.6 + Math.sin(phase * 2) * 0.4; // more dramatic pulse in idle
  const eyeY = faceY + 1;
  setPixel(ctx, cx - 2, eyeY, hexToRgba(EYE_COLOR, eyeBright));
  setPixel(ctx, cx + 1, eyeY, hexToRgba(EYE_COLOR, eyeBright));
  addGlow(ctx, cx - 2, eyeY, 4, EYE_COLOR, eyeBright * 0.35);
  addGlow(ctx, cx + 1, eyeY, 4, EYE_COLOR, eyeBright * 0.35);

  // --- Shoulders & torso ---
  const shoulderY = hoodTop + 7;
  drawFadingRect(ctx, cx - 8, shoulderY, 16, 2, CLOAK.base);
  drawFadingRect(ctx, cx - 7, shoulderY + 2, 14, 3, CLOAK.base);
  drawFadingRect(ctx, cx - 6, shoulderY + 5, 12, 3, CLOAK.shadow);
  drawFadingRect(ctx, cx - 3, shoulderY + 2, 6, 4, INNER_CLOAK);

  // --- Daggers at rest (crossed, no swing) ---
  const daggerCY = shoulderY + 5;
  drawFadingLine(ctx, cx - 6, daggerCY - 3, cx + 2, daggerCY + 4, BLADE_COLOR);
  drawFadingLine(ctx, cx + 5, daggerCY - 3, cx - 3, daggerCY + 4, BLADE_COLOR);
  setFadingPixel(ctx, cx - 6, daggerCY - 3, BLADE_DARK);
  setFadingPixel(ctx, cx + 5, daggerCY - 3, BLADE_DARK);

  // --- Cape sides (gentle sway) ---
  for (let dy = 0; dy < 16; dy++) {
    const y = shoulderY + dy;
    const spread = Math.round(Math.sin((dy / 16) * Math.PI) * 3) + capeSway;
    drawFadingRect(ctx, cx - 8 - spread, y, 2, 1, CLOAK.base);
  }
  for (let dy = 0; dy < 16; dy++) {
    const y = shoulderY + dy;
    const spread = Math.round(Math.sin((dy / 16) * Math.PI) * 3) - capeSway;
    drawFadingRect(ctx, cx + 6 + spread, y, 2, 1, CLOAK.base);
  }

  // --- Lower body with alpha gradient ---
  const waistTop = shoulderY + 8;
  for (let dy = 0; dy < (BOTTOM_Y - waistTop); dy++) {
    const y = waistTop + dy;
    const t = dy / (BOTTOM_Y - waistTop);
    const halfW = Math.round(6 - t * 3);
    const smokeJitter = Math.round(Math.sin(phase + dy * 0.5) * (t * 1.5));
    drawFadingRect(ctx, cx - halfW + smokeJitter + sway, y, halfW * 2, 1, CLOAK.base);
  }

  // --- Smoke wisps ---
  for (let i = 0; i < 3; i++) {
    const angle = phase + (i / 3) * Math.PI * 2;
    const wx = cx + Math.round(Math.cos(angle) * 4);
    const wy = BOTTOM_Y - 2 + Math.round(Math.sin(angle) * 1.5);
    setPixel(ctx, wx, wy, hexToRgba(CLOAK.base, 0.15 + Math.sin(angle) * 0.08));
  }
}

// ---------------------------------------------------------------------------
// drawDeath — 6 frames: hit reaction → dissolve upward → cape fragments
// ---------------------------------------------------------------------------
function drawDeath(ctx: SKRSContext2D, ox: number, frame: number): void {
  const cx = ox + 20;
  const phase = deathPhase(frame);
  const t = deathT(frame);  // 0..1

  if (phase === 'hit') {
    // Frame 0-1: Flicker — body visible but eyes flash bright
    const flickerAlpha = frame === 0 ? 0.9 : 0.5;
    const eyeFlash = 1.0;

    // Hood
    drawRect(ctx, cx - 6, HEAD_TOP, 12, 6, hexToRgba(CLOAK.base, flickerAlpha));
    // Torso
    drawRect(ctx, cx - 8, HEAD_TOP + 6, 16, 12, hexToRgba(CLOAK.base, flickerAlpha));

    // Bright eye flash
    setPixel(ctx, cx - 2, HEAD_TOP + 6, hexToRgba(EYE_COLOR, eyeFlash));
    setPixel(ctx, cx + 1, HEAD_TOP + 6, hexToRgba(EYE_COLOR, eyeFlash));
    addGlow(ctx, cx - 2, HEAD_TOP + 6, 5, EYE_COLOR, eyeFlash * 0.5);
    addGlow(ctx, cx + 1, HEAD_TOP + 6, 5, EYE_COLOR, eyeFlash * 0.5);

    // Daggers
    drawLine(ctx, cx - 6, HEAD_TOP + 10, cx + 2, HEAD_TOP + 16, hexToRgba(BLADE_COLOR, flickerAlpha));
    drawLine(ctx, cx + 5, HEAD_TOP + 10, cx - 3, HEAD_TOP + 16, hexToRgba(BLADE_COLOR, flickerAlpha));

    // Lower body still partially visible with gradient
    for (let dy = 0; dy < (BOTTOM_Y - WAIST_Y); dy++) {
      const y = WAIST_Y + dy;
      const halfW = Math.round(5 - (dy / (BOTTOM_Y - WAIST_Y)) * 3);
      const rowAlpha = alphaAt(y) * flickerAlpha;
      drawRect(ctx, cx - halfW, y, halfW * 2, 1, hexToRgba(CLOAK.base, rowAlpha));
    }

  } else if (phase === 'fall') {
    // Frame 2-3: Smoke dissolves upward from body
    const dissolveProgress = frame === 2 ? 0.4 : 0.75;
    // Body breaks into rising smoke particles
    const visibleRows = Math.round((BOTTOM_Y - HEAD_TOP) * (1 - dissolveProgress));

    for (let row = 0; row < visibleRows; row++) {
      const y = HEAD_TOP + row;
      // Rise offset — upper parts dissolve first, creating upward sweep
      const riseOffset = Math.round((1 - row / visibleRows) * dissolveProgress * 8);
      const rowAlpha = (1 - dissolveProgress) * alphaAt(y) * 0.8;
      const halfW = row < 6 ? Math.round(3 + row) : Math.round(8 - (row - 6) * 0.3);
      const jitter = Math.round(Math.sin(row * 1.2 + frame * 2) * dissolveProgress * 3);
      drawRect(ctx, cx - halfW + jitter, y - riseOffset, halfW * 2, 1,
        hexToRgba(CLOAK.base, Math.max(0, rowAlpha)));
    }

    // Rising smoke particles
    for (let i = 0; i < 8; i++) {
      const px = cx + Math.round(Math.sin(i * 2.7 + frame * 1.3) * 8 + Math.sin(i * 1.5) * 4);
      const py = HEAD_TOP - Math.round(dissolveProgress * 10) + Math.round(Math.sin(i * 2.3) * 6);
      const pa = (1 - dissolveProgress) * 0.4;
      if (pa > 0.05) {
        setPixel(ctx, px, py, hexToRgba(CLOAK.shadow, pa));
        setPixel(ctx, px + 1, py, hexToRgba(CLOAK.base, pa * 0.5));
      }
    }

    // Fading eye glow
    const eyeFade = (1 - dissolveProgress) * 0.6;
    if (eyeFade > 0.05) {
      addGlow(ctx, cx - 1, HEAD_TOP + 6 - Math.round(dissolveProgress * 4), 3, EYE_COLOR, eyeFade);
      addGlow(ctx, cx + 2, HEAD_TOP + 6 - Math.round(dissolveProgress * 4), 3, EYE_COLOR, eyeFade);
    }

  } else {
    // Frame 4-5: Settle — only cape fragments + fading smoke wisps
    const settleT = frame === 4 ? 0.5 : 1.0;

    // 6 cape fragments flying upward and outward
    const fragments = [
      { baseX: -6, baseY: 14, angle: -0.8 },
      { baseX: -3, baseY: 18, angle: -0.4 },
      { baseX:  0, baseY: 12, angle:  0.0 },
      { baseX:  3, baseY: 16, angle:  0.3 },
      { baseX:  5, baseY: 20, angle:  0.6 },
      { baseX:  7, baseY: 14, angle:  0.9 },
    ];

    for (const frag of fragments) {
      const fragAlpha = Math.max(0, 0.6 - settleT * 0.55);
      if (fragAlpha < 0.02) continue;

      // Fragment flies upward and outward
      const fx = cx + frag.baseX + Math.round(frag.angle * settleT * 10);
      const fy = HEAD_TOP + frag.baseY - Math.round(settleT * 16);

      // Small 3x2 fragment
      drawRect(ctx, fx, fy, 3, 2, hexToRgba(CLOAK.base, fragAlpha));
      setPixel(ctx, fx + 1, fy, hexToRgba(CLOAK.highlight, fragAlpha * 0.5));
    }

    // Fading smoke wisps
    const smokeAlpha = Math.max(0, 0.3 - settleT * 0.28);
    if (smokeAlpha > 0.02) {
      for (let i = 0; i < 5; i++) {
        const sx = cx + Math.round(Math.sin(i * 1.7) * 8);
        const sy = HEAD_TOP - Math.round(settleT * 12) + Math.round(Math.cos(i * 2.1) * 5);
        setPixel(ctx, sx, sy, hexToRgba(CLOAK.shadow, smokeAlpha));
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Module export
// ---------------------------------------------------------------------------
export default {
  drawWalk,
  drawWalkFallback,
  drawIdle,
  drawDeath,
} satisfies UnitDrawModule;
