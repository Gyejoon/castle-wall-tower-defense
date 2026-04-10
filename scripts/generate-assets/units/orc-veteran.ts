import { PALETTE, drawRect, setPixel, drawLine } from '../shared';
import {
  shade3, drawShadedRect, idlePhase, deathPhase, deathT,
  FRAME_W, FRAME_H, IDLE_FRAMES, DEATH_FRAMES,
  type UnitDrawModule,
} from './shared-rendering';
import type { SKRSContext2D } from '@napi-rs/canvas';

// ── Walk animation helpers (8 frames) ──────────────────────────
const WALK_FRAMES = 8;
function walkPhase(frame: number): number { return (frame / WALK_FRAMES) * Math.PI * 2; }
function bobY(frame: number): number { return Math.round(Math.sin(walkPhase(frame) * 2) * 1.5); }
function legStep(frame: number): [number, number] {
  const phase = Math.sin(walkPhase(frame));
  const lift = Math.round(phase * 3);
  return [lift, -lift];
}
function armSwing(frame: number): number { return Math.round(Math.sin(walkPhase(frame) + Math.PI) * 3); }

// ── Palette shortcuts ──────────────────────────────────────────
const SKIN     = shade3(PALETTE.orcSkin);        // green orc skin
const STEEL    = shade3(PALETTE.stoneLight);      // stolen knight steel
const LEATHER  = shade3(PALETTE.leatherWorn);     // tribal leather
const IRON     = shade3(PALETTE.ironDark);         // dark iron accents
const BONE_C   = shade3(PALETTE.bone);             // bone decorations
const RUST     = shade3(PALETTE.rust);             // rusty weapon
const BLOOD    = PALETTE.bloodStain;
const ROPE     = '#8a7a50';                        // crude rope color
const YELLOW   = '#e0d020';                        // yellow dot eyes
const SCAR     = '#3a5018';                        // face scar (darker green)
const CHAIN    = '#6a6a5a';                        // chain links

// ── Body drawing (shared core for all animations) ──────────────
function drawBody(
  ctx: SKRSContext2D, cx: number, baseY: number,
  opts: {
    bob?: number;
    breathOffset?: number;
    leftArmDy?: number;
    rightArmDy?: number;
    leftLegDy?: number;
    rightLegDy?: number;
    splitX?: number;    // death: armor separation
    tiltY?: number;     // death: body tilt
    alpha?: number;     // death: fade
  } = {},
) {
  const bob = opts.bob ?? 0;
  const breath = opts.breathOffset ?? 0;
  const lArmDy = opts.leftArmDy ?? 0;
  const rArmDy = opts.rightArmDy ?? 0;
  const lLegDy = opts.leftLegDy ?? 0;
  const rLegDy = opts.rightLegDy ?? 0;
  const splitX = opts.splitX ?? 0;
  const tiltY = opts.tiltY ?? 0;

  // ── Legs ──────────────────────────────────────────
  const legY = baseY + 34 + bob + tiltY;

  // LEFT leg: steel shin guard
  const llx = cx - 5 + splitX;
  drawRect(ctx, llx, legY + lLegDy, 4, 8, SKIN.base);          // green thigh
  drawRect(ctx, llx, legY + 4 + lLegDy, 4, 5, STEEL.base);     // steel shin guard
  drawRect(ctx, llx, legY + 4 + lLegDy, 4, 1, STEEL.highlight);// highlight top
  drawRect(ctx, llx, legY + 8 + lLegDy, 4, 1, STEEL.shadow);   // shadow bottom
  drawRect(ctx, llx, legY + 9 + lLegDy, 4, 2, IRON.base);      // boot

  // RIGHT leg: leather-wrapped bare green
  const rlx = cx + 1 - splitX;
  drawRect(ctx, rlx, legY + rLegDy, 4, 8, SKIN.base);          // full green leg
  drawRect(ctx, rlx, legY + rLegDy, 4, 1, SKIN.highlight);     // highlight
  // leather wraps (3 horizontal bands)
  drawRect(ctx, rlx, legY + 2 + rLegDy, 4, 1, LEATHER.base);
  drawRect(ctx, rlx, legY + 5 + rLegDy, 4, 1, LEATHER.base);
  drawRect(ctx, rlx, legY + 7 + rLegDy, 4, 1, LEATHER.shadow);
  drawRect(ctx, rlx, legY + 9 + rLegDy, 4, 2, LEATHER.shadow); // leather boot

  // ── Torso ─────────────────────────────────────────
  const torsoY = baseY + 20 + bob + tiltY;

  // LEFT torso half: stolen knight's steel plate
  drawRect(ctx, cx - 7 + splitX, torsoY + breath, 7, 14, STEEL.base);
  drawRect(ctx, cx - 7 + splitX, torsoY + breath, 7, 1, STEEL.highlight);
  drawRect(ctx, cx - 7 + splitX, torsoY + 13 + breath, 7, 1, STEEL.shadow);
  // Steel plate rivet dots
  setPixel(ctx, cx - 6 + splitX, torsoY + 3 + breath, STEEL.highlight);
  setPixel(ctx, cx - 6 + splitX, torsoY + 7 + breath, STEEL.highlight);
  setPixel(ctx, cx - 3 + splitX, torsoY + 5 + breath, STEEL.highlight);

  // RIGHT torso half: tribal leather + chain
  drawRect(ctx, cx - splitX, torsoY + breath, 7, 14, LEATHER.base);
  drawRect(ctx, cx - splitX, torsoY + breath, 7, 1, LEATHER.highlight);
  drawRect(ctx, cx - splitX, torsoY + 13 + breath, 7, 1, LEATHER.shadow);
  // chain links running diagonally
  setPixel(ctx, cx + 1 - splitX, torsoY + 2 + breath, CHAIN);
  setPixel(ctx, cx + 2 - splitX, torsoY + 4 + breath, CHAIN);
  setPixel(ctx, cx + 3 - splitX, torsoY + 6 + breath, CHAIN);
  setPixel(ctx, cx + 4 - splitX, torsoY + 8 + breath, CHAIN);
  setPixel(ctx, cx + 5 - splitX, torsoY + 10 + breath, CHAIN);

  // Central rope seam between left/right armor
  if (splitX === 0) {
    for (let ry = 0; ry < 14; ry += 3) {
      setPixel(ctx, cx - 1, torsoY + ry + breath, ROPE);
      setPixel(ctx, cx, torsoY + ry + 1 + breath, ROPE);
    }
  }

  // ── Belt with trophy teeth ────────────────────────
  const beltY = torsoY + 14 + breath;
  drawRect(ctx, cx - 6, beltY, 12, 2, LEATHER.shadow);
  drawRect(ctx, cx - 6, beltY, 12, 1, LEATHER.base);
  // 3 trophy teeth dangling
  setPixel(ctx, cx - 3, beltY + 2, BONE_C.base);
  setPixel(ctx, cx - 3, beltY + 3, BONE_C.shadow);
  setPixel(ctx, cx, beltY + 2, BONE_C.base);
  setPixel(ctx, cx, beltY + 3, BONE_C.highlight);
  setPixel(ctx, cx + 3, beltY + 2, BONE_C.base);
  setPixel(ctx, cx + 3, beltY + 3, BONE_C.shadow);

  // ── Shoulders / Pauldrons ─────────────────────────
  const shoulderY = torsoY - 1 + breath;

  // LEFT pauldron: large steel plate (stolen knight) — taller for silhouette asymmetry
  drawShadedRect(ctx, cx - 10 + splitX, shoulderY - 3, 5, 7, PALETTE.stoneLight);
  setPixel(ctx, cx - 9 + splitX, shoulderY - 1, STEEL.highlight); // rivet
  setPixel(ctx, cx - 7 + splitX, shoulderY + 1, STEEL.shadow);
  // Ridge on tall pauldron
  drawRect(ctx, cx - 10 + splitX, shoulderY - 3, 5, 1, STEEL.highlight);

  // RIGHT pauldron: bone + leather tribal decoration — shorter, organic
  drawRect(ctx, cx + 5 - splitX, shoulderY, 5, 3, LEATHER.base);
  drawRect(ctx, cx + 5 - splitX, shoulderY, 5, 1, LEATHER.highlight);
  // bone spikes sticking up (taller, more dramatic)
  setPixel(ctx, cx + 6 - splitX, shoulderY - 1, BONE_C.base);
  setPixel(ctx, cx + 6 - splitX, shoulderY - 2, BONE_C.highlight);
  setPixel(ctx, cx + 6 - splitX, shoulderY - 3, BONE_C.highlight);
  setPixel(ctx, cx + 8 - splitX, shoulderY - 1, BONE_C.base);
  setPixel(ctx, cx + 8 - splitX, shoulderY - 2, BONE_C.base);

  // ── Arms ──────────────────────────────────────────
  const armY = torsoY + 2 + breath;

  // LEFT arm: steel plated
  drawRect(ctx, cx - 10 + splitX, armY + 3 + lArmDy, 3, 8, SKIN.base);
  drawRect(ctx, cx - 10 + splitX, armY + 3 + lArmDy, 3, 4, STEEL.base);
  drawRect(ctx, cx - 10 + splitX, armY + 3 + lArmDy, 3, 1, STEEL.highlight);
  // fist
  drawRect(ctx, cx - 10 + splitX, armY + 11 + lArmDy, 3, 2, SKIN.shadow);

  // RIGHT arm: bare green with leather bracer
  drawRect(ctx, cx + 7 - splitX, armY + 3 + rArmDy, 3, 8, SKIN.base);
  drawRect(ctx, cx + 7 - splitX, armY + 3 + rArmDy, 3, 1, SKIN.highlight);
  // leather bracer
  drawRect(ctx, cx + 7 - splitX, armY + 6 + rArmDy, 3, 2, LEATHER.base);
  drawRect(ctx, cx + 7 - splitX, armY + 6 + rArmDy, 3, 1, LEATHER.highlight);
  // fist
  drawRect(ctx, cx + 7 - splitX, armY + 11 + rArmDy, 3, 2, SKIN.shadow);

  // ── Head / Helmet ─────────────────────────────────
  const headY = baseY + 8 + bob + tiltY;

  // Neck
  drawRect(ctx, cx - 2, headY + 10, 4, 3, SKIN.base);

  // Head base (green skin)
  drawRect(ctx, cx - 5, headY, 10, 10, SKIN.base);
  drawRect(ctx, cx - 5, headY, 10, 1, SKIN.highlight);

  // Dented steel half-helm (covers top half)
  drawRect(ctx, cx - 5, headY, 10, 5, STEEL.base);
  drawRect(ctx, cx - 5, headY, 10, 1, STEEL.highlight);
  drawRect(ctx, cx - 5, headY + 4, 10, 1, STEEL.shadow);
  // Dent in the helm
  setPixel(ctx, cx + 2, headY + 1, STEEL.shadow);
  setPixel(ctx, cx + 3, headY + 2, STEEL.shadow);

  // Eye slit with yellow dot eyes (2px wide each)
  drawRect(ctx, cx - 4, headY + 5, 8, 2, IRON.shadow);
  // Left eye
  setPixel(ctx, cx - 3, headY + 5, YELLOW);
  setPixel(ctx, cx - 2, headY + 5, YELLOW);
  // Right eye
  setPixel(ctx, cx + 1, headY + 5, YELLOW);
  setPixel(ctx, cx + 2, headY + 5, YELLOW);

  // Diagonal face scar (from helm edge down-right across exposed face)
  setPixel(ctx, cx - 2, headY + 6, SCAR);
  setPixel(ctx, cx - 1, headY + 7, SCAR);
  setPixel(ctx, cx, headY + 8, SCAR);

  // Lower tusks (asymmetric — left one much larger)
  // Large left tusk
  setPixel(ctx, cx - 3, headY + 8, BONE_C.base);
  setPixel(ctx, cx - 3, headY + 9, BONE_C.base);
  setPixel(ctx, cx - 3, headY + 10, BONE_C.highlight);
  // Small right tusk
  setPixel(ctx, cx + 2, headY + 8, BONE_C.base);
  setPixel(ctx, cx + 2, headY + 9, BONE_C.shadow);

  // ── Battle axe (crude, heavy) ─
  const axeX = cx + 9 - splitX;
  const axeY = baseY + 8 + bob + tiltY;

  // Axe handle (long wooden shaft)
  drawRect(ctx, axeX, axeY, 2, 24, LEATHER.shadow);
  setPixel(ctx, axeX, axeY + 6, LEATHER.base);  // grip wrap
  setPixel(ctx, axeX + 1, axeY + 10, LEATHER.base);
  setPixel(ctx, axeX, axeY + 14, LEATHER.base);
  // Axe head (wide iron blade on top)
  drawRect(ctx, axeX - 3, axeY, 3, 7, IRON.base);      // blade left side
  drawRect(ctx, axeX - 3, axeY, 3, 1, IRON.highlight);  // top edge highlight
  drawRect(ctx, axeX - 3, axeY + 6, 3, 1, IRON.shadow); // bottom edge
  // Blade edge (sharp left side)
  setPixel(ctx, axeX - 4, axeY + 1, STEEL.highlight);
  setPixel(ctx, axeX - 4, axeY + 3, STEEL.base);
  setPixel(ctx, axeX - 4, axeY + 5, STEEL.highlight);
  // Blood stain on blade
  setPixel(ctx, axeX - 3, axeY + 3, BLOOD);
  setPixel(ctx, axeX - 2, axeY + 4, BLOOD);
}

// ── drawWalk ───────────────────────────────────────────────────
function drawWalk(ctx: SKRSContext2D, ox: number, frame: number): void {
  const cx = ox + 20;
  const baseY = 2;
  const bob = bobY(frame);
  const [lLeg, rLeg] = legStep(frame);
  const arm = armSwing(frame);

  drawBody(ctx, cx, baseY, {
    bob,
    leftArmDy: -arm,
    rightArmDy: arm,
    leftLegDy: lLeg,
    rightLegDy: rLeg,
  });
}

// ── drawWalkFallback ───────────────────────────────────────────
function drawWalkFallback(ctx: SKRSContext2D, ox: number, frame: number): void {
  const cx = ox + 20;
  const baseY = 2;
  const bob = bobY(frame);

  // Simplified body — minimal detail
  // Head
  drawRect(ctx, cx - 4, baseY + 8 + bob, 8, 8, SKIN.base);
  drawRect(ctx, cx - 4, baseY + 8 + bob, 8, 4, STEEL.base);
  setPixel(ctx, cx - 2, baseY + 13 + bob, YELLOW);
  setPixel(ctx, cx + 1, baseY + 13 + bob, YELLOW);

  // Torso — left steel, right leather
  drawRect(ctx, cx - 5, baseY + 18 + bob, 5, 12, STEEL.base);
  drawRect(ctx, cx, baseY + 18 + bob, 5, 12, LEATHER.base);

  // Arms
  drawRect(ctx, cx - 8, baseY + 19 + bob, 3, 8, SKIN.base);
  drawRect(ctx, cx + 5, baseY + 19 + bob, 3, 8, SKIN.base);

  // Legs
  const [lLeg, rLeg] = legStep(frame);
  drawRect(ctx, cx - 4, baseY + 32 + bob + lLeg, 4, 8, STEEL.base);
  drawRect(ctx, cx, baseY + 32 + bob + rLeg, 4, 8, SKIN.base);

  // Sword (simplified)
  drawRect(ctx, cx + 8, baseY + 10 + bob, 2, 18, IRON.base);
}

// ── drawIdle ───────────────────────────────────────────────────
function drawIdle(ctx: SKRSContext2D, ox: number, frame: number): void {
  const cx = ox + 20;
  const baseY = 2;
  const phase = idlePhase(frame);

  // Heavy breathing: shoulders heave up/down
  const breathOffset = Math.round(Math.sin(phase) * 1);
  // Rope knots shift with breathing
  const ropeShift = Math.round(Math.sin(phase + 0.5) * 1.5);

  drawBody(ctx, cx, baseY, {
    bob: 0,
    breathOffset,
    leftArmDy: breathOffset,
    rightArmDy: breathOffset,
  });

  // Extra: rope knot creaking detail on top of base drawing
  // Subtle shift of rope knot pixels at the seam
  const torsoY = baseY + 20;
  if (ropeShift !== 0) {
    setPixel(ctx, cx - 1, torsoY + 1 + breathOffset + ropeShift, ROPE);
    setPixel(ctx, cx, torsoY + 4 + breathOffset + ropeShift, ROPE);
    setPixel(ctx, cx - 1, torsoY + 7 + breathOffset + ropeShift, ROPE);
    setPixel(ctx, cx, torsoY + 10 + breathOffset + ropeShift, ROPE);
  }

  // Slight shoulder heave asymmetry (left steel pauldron heavier)
  const shoulderY = torsoY - 1 + breathOffset;
  if (frame % 3 === 0) {
    setPixel(ctx, cx - 9, shoulderY + 1, STEEL.shadow); // weight settling
  }
}

// ── drawDeath ──────────────────────────────────────────────────
function drawDeath(ctx: SKRSContext2D, ox: number, frame: number): void {
  const cx = ox + 20;
  const baseY = 2;
  const phase = deathPhase(frame);
  const t = deathT(frame);

  if (phase === 'hit') {
    // Stagger back, armor pieces shift slightly
    const stagger = Math.round(t * 2);
    const splitX = Math.round(t * 1);
    drawBody(ctx, cx + stagger, baseY, {
      bob: 0,
      splitX,
      tiltY: 0,
    });
    // Impact flash on the hit point
    if (frame === 0) {
      setPixel(ctx, cx - 2, baseY + 24, '#ffffff');
      setPixel(ctx, cx - 1, baseY + 25, '#ffffff');
    }
  } else if (phase === 'fall') {
    // Armor separating, knees buckle
    const fallT = (frame - 2) / 2; // 0..0.5
    const splitX = Math.round(2 + fallT * 4);
    const tiltY = Math.round(fallT * 8);
    const kneeBuckle = Math.round(fallT * 4);

    drawBody(ctx, cx, baseY, {
      bob: 0,
      splitX,
      tiltY,
      leftLegDy: kneeBuckle,
      rightLegDy: kneeBuckle + 1,
      leftArmDy: Math.round(fallT * 3),
      rightArmDy: Math.round(fallT * 4),
    });

    // Rope snapping — debris pixels
    setPixel(ctx, cx - 1 - splitX, baseY + 26 + tiltY, ROPE);
    setPixel(ctx, cx + splitX, baseY + 24 + tiltY, ROPE);
  } else {
    // Settle: collapsed orc, armor pieces on ground separated
    const splitX = 6;
    const tiltY = 12;

    // LEFT armor pile (steel)
    const lpx = cx - 8;
    const lpy = baseY + 36;
    drawRect(ctx, lpx, lpy, 7, 4, STEEL.base);
    drawRect(ctx, lpx, lpy, 7, 1, STEEL.highlight);
    drawRect(ctx, lpx, lpy + 3, 7, 1, STEEL.shadow);
    // Steel pauldron fallen
    drawRect(ctx, lpx - 1, lpy - 1, 4, 2, STEEL.shadow);
    setPixel(ctx, lpx, lpy - 1, STEEL.highlight);

    // RIGHT armor pile (leather + bone)
    const rpx = cx + 2;
    const rpy = baseY + 36;
    drawRect(ctx, rpx, rpy, 6, 4, LEATHER.base);
    drawRect(ctx, rpx, rpy, 6, 1, LEATHER.highlight);
    // Bone decoration fallen beside
    setPixel(ctx, rpx + 5, rpy - 1, BONE_C.base);
    setPixel(ctx, rpx + 6, rpy, BONE_C.shadow);

    // Collapsed orc body between armor piles
    drawRect(ctx, cx - 3, baseY + 34, 6, 5, SKIN.base);
    drawRect(ctx, cx - 3, baseY + 34, 6, 1, SKIN.shadow);
    // Head on ground
    drawRect(ctx, cx - 3, baseY + 31, 6, 4, SKIN.base);
    drawRect(ctx, cx - 3, baseY + 31, 6, 2, STEEL.shadow); // dented helm
    // One eye barely visible
    setPixel(ctx, cx - 1, baseY + 33, YELLOW);

    // Greatsword fallen flat
    drawRect(ctx, cx - 8, baseY + 40, 16, 2, IRON.base);
    drawRect(ctx, cx - 8, baseY + 40, 16, 1, IRON.highlight);
    setPixel(ctx, cx - 3, baseY + 40, BLOOD);
    setPixel(ctx, cx + 1, baseY + 41, BLOOD);
    // Crossguard
    drawRect(ctx, cx + 7, baseY + 39, 2, 4, RUST.base);

    // Scattered trophy teeth
    setPixel(ctx, cx - 5, baseY + 42, BONE_C.base);
    setPixel(ctx, cx + 4, baseY + 43, BONE_C.shadow);
    setPixel(ctx, cx + 1, baseY + 44, BONE_C.highlight);

    // Broken rope fragments
    setPixel(ctx, cx - 1, baseY + 38, ROPE);
    setPixel(ctx, cx + 2, baseY + 37, ROPE);
  }
}

export default {
  drawWalk,
  drawWalkFallback,
  drawIdle,
  drawDeath,
} satisfies UnitDrawModule;
