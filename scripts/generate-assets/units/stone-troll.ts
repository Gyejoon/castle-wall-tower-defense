import type { SKRSContext2D } from '@napi-rs/canvas';
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

// --- Walk animation curves (heavy, slow troll) ---
const WALK_FRAMES = 8;
function walkPhase(frame: number): number {
  return (frame / WALK_FRAMES) * Math.PI * 2;
}
function bobY(frame: number): number {
  return Math.round(Math.sin(walkPhase(frame) * 2) * 1);
}
function legStep(frame: number): [number, number] {
  const phase = Math.sin(walkPhase(frame));
  const lift = Math.round(phase * 2);
  return [lift, -lift];
}

// --- 3-tone palettes ---
const STONE = shade3(PALETTE.heavyWalker);
const STONE_DARK = shade3(PALETTE.stoneDark);
const STONE_LIGHT = shade3(PALETTE.stoneLight);
const LEATHER = shade3(PALETTE.leatherWorn);
const IRON = shade3(PALETTE.ironDark);
const BONE_SHADE = shade3(PALETTE.bone);

// ===================================================================
//  BODY DRAWING HELPER — shared between walk, idle, death (standing)
// ===================================================================
function drawTrollBody(
  ctx: SKRSContext2D,
  cx: number,
  by: number,
  clubAngle: number,
  shoulderOff: number,
): void {
  // --- Massive shoulders + torso (hunched giant) ---
  // Shoulder bar — wide but not edge-to-edge for outline breathing room
  drawShadedRect(ctx, cx - 14, 15 + by + shoulderOff, 28, 5, PALETTE.heavyWalker);
  // Upper torso
  drawShadedRect(ctx, cx - 10, 20 + by, 20, 7, PALETTE.heavyWalker);
  // Lower torso (slightly narrower)
  drawShadedRect(ctx, cx - 7, 27 + by, 14, 5, PALETTE.heavyWalker);

  // Shadow underneath shoulders (depth illusion)
  drawRect(ctx, cx - 12, 20 + by, 24, 1, STONE.shadow);

  // --- Tiny head sunk between shoulders ---
  drawShadedRect(ctx, cx - 4, 8 + by + shoulderOff, 8, 7, PALETTE.heavyWalker);
  // Thick eyebrow shadow ridge
  drawRect(ctx, cx - 4, 10 + by + shoulderOff, 8, 2, STONE_DARK.base);
  // 1px yellow eye gleam underneath brow
  setPixel(ctx, cx - 2, 12 + by + shoulderOff, '#e0c020');
  setPixel(ctx, cx + 2, 12 + by + shoulderOff, '#e0c020');
  // Top of head highlight
  drawRect(ctx, cx - 3, 8 + by + shoulderOff, 6, 1, STONE_LIGHT.base);

  // --- Broken fangs (asymmetric) ---
  // Left fang — taller, chipped at top
  setPixel(ctx, cx - 2, 15 + by + shoulderOff, PALETTE.bone);
  setPixel(ctx, cx - 2, 16 + by + shoulderOff, PALETTE.bone);
  // Right fang — shorter, stubby
  setPixel(ctx, cx + 2, 15 + by + shoulderOff, PALETTE.bone);

  // --- Stone skin crack lines (3-4 cracks) ---
  // Crack 1: diagonal across left shoulder
  drawLine(ctx, cx - 12, 15 + by, cx - 9, 19 + by, STONE_DARK.shadow);
  // Crack 2: vertical on right torso
  drawLine(ctx, cx + 6, 22 + by, cx + 7, 28 + by, STONE_DARK.shadow);
  // Crack 3: short on lower torso
  drawLine(ctx, cx - 3, 32 + by, cx + 1, 33 + by, STONE_DARK.shadow);
  // Crack 4: across right shoulder
  drawLine(ctx, cx + 8, 16 + by, cx + 12, 18 + by, STONE_DARK.shadow);

  // --- Moss stain patches (3 patches — subtle discoloration) ---
  // Patch 1: left shoulder area
  setPixel(ctx, cx - 11, 17 + by, PALETTE.moss);
  setPixel(ctx, cx - 10, 17 + by, PALETTE.moss);
  setPixel(ctx, cx - 11, 18 + by, PALETTE.moss);
  // Patch 2: mid-torso right
  setPixel(ctx, cx + 4, 25 + by, PALETTE.moss);
  setPixel(ctx, cx + 5, 25 + by, PALETTE.moss);
  setPixel(ctx, cx + 4, 26 + by, PALETTE.moss);
  // Patch 3: lower back
  setPixel(ctx, cx - 6, 31 + by, PALETTE.moss);
  setPixel(ctx, cx - 5, 31 + by, PALETTE.moss);

  // --- Chest: bone pendant on rope ---
  // Rope (thin line from neck down)
  drawLine(ctx, cx, 15 + by + shoulderOff, cx, 24 + by, LEATHER.shadow);
  // Pendant (bone shard — 3x2 px)
  drawRect(ctx, cx - 1, 24 + by, 3, 2, PALETTE.bone);
  setPixel(ctx, cx, 24 + by, BONE_SHADE.highlight);

  // --- Leather loincloth ---
  drawShadedRect(ctx, cx - 8, 34 + by, 16, 4, PALETTE.leatherWorn);
  // Fringe detail
  setPixel(ctx, cx - 7, 38 + by, LEATHER.shadow);
  setPixel(ctx, cx - 4, 38 + by, LEATHER.shadow);
  setPixel(ctx, cx, 38 + by, LEATHER.shadow);
  setPixel(ctx, cx + 4, 38 + by, LEATHER.shadow);
  setPixel(ctx, cx + 7, 38 + by, LEATHER.shadow);

  // --- Binding wraps on left arm area ---
  drawRect(ctx, cx - 15, 17 + by, 3, 2, LEATHER.base);
  drawRect(ctx, cx - 15, 20 + by, 3, 1, LEATHER.base);

  // --- Club (massive, with iron bands and spikes) ---
  const clubBaseX = cx + 13;
  const clubTop = 6 + by + clubAngle;
  // Club shaft (thick wooden)
  drawShadedRect(ctx, clubBaseX, clubTop + 7, 3, 18, PALETTE.leatherWorn);
  // Club head (stone/wood block)
  drawShadedRect(ctx, clubBaseX - 2, clubTop, 7, 8, PALETTE.rust);
  drawRect(ctx, clubBaseX - 1, clubTop + 1, 5, 6, PALETTE.leatherWorn);
  // Iron bands (2 horizontal)
  drawRect(ctx, clubBaseX - 2, clubTop + 2, 7, 1, IRON.base);
  drawRect(ctx, clubBaseX - 2, clubTop + 6, 7, 1, IRON.base);
  // 4 Iron spikes — connected to club head edges (2px lines, not isolated dots)
  drawLine(ctx, clubBaseX - 2, clubTop + 1, clubBaseX - 3, clubTop, IRON.highlight);
  drawLine(ctx, clubBaseX - 2, clubTop + 5, clubBaseX - 3, clubTop + 4, IRON.highlight);
  drawLine(ctx, clubBaseX + 4, clubTop + 2, clubBaseX + 5, clubTop + 1, IRON.highlight);
  drawLine(ctx, clubBaseX + 4, clubTop + 5, clubBaseX + 5, clubTop + 4, IRON.highlight);
}

// ===================================================================
//  drawWalk — 8 frames, heavy lumbering gait
// ===================================================================
function drawWalk(ctx: SKRSContext2D, ox: number, frame: number): void {
  const cx = ox + 20;
  const by = bobY(frame);
  const [lL, lR] = legStep(frame);
  const clubSwing = Math.round(Math.sin(walkPhase(frame)) * 3);

  // Thick legs + bare stone feet
  const leftLen = 8 + lL;
  const rightLen = 8 + lR;

  // Left leg
  drawShadedRect(ctx, cx - 7, 37 + by, 5, leftLen, PALETTE.heavyWalker);
  // Left foot (wide, bare stone)
  drawRect(ctx, cx - 8, 37 + by + leftLen - 2, 7, 2, STONE_DARK.base);
  setPixel(ctx, cx - 8, 37 + by + leftLen - 2, STONE_DARK.shadow);

  // Right leg
  drawShadedRect(ctx, cx + 2, 37 + by, 5, rightLen, PALETTE.heavyWalker);
  // Right foot
  drawRect(ctx, cx + 1, 37 + by + rightLen - 2, 7, 2, STONE_DARK.base);
  setPixel(ctx, cx + 7, 37 + by + rightLen - 2, STONE_DARK.shadow);

  // Body (drawn on top of legs)
  drawTrollBody(ctx, cx, by, clubSwing, 0);
}

// ===================================================================
//  drawWalkFallback — simplified silhouette
// ===================================================================
function drawWalkFallback(ctx: SKRSContext2D, ox: number, frame: number): void {
  const cx = ox + 20;
  const bounceY = frame === 1 || frame === 5 ? -1 : frame === 3 || frame === 7 ? 1 : 0;

  // Massive body block
  drawRect(ctx, cx - 14, 14 + bounceY, 28, 22, PALETTE.heavyWalker);
  // Tiny head
  drawRect(ctx, cx - 4, 8 + bounceY, 8, 7, PALETTE.heavyWalker);
  // Eyes
  setPixel(ctx, cx - 2, 12 + bounceY, '#e0c020');
  setPixel(ctx, cx + 2, 12 + bounceY, '#e0c020');
  // Club
  drawRect(ctx, cx + 13, 8 + bounceY, 4, 26, PALETTE.leatherWorn);
  drawRect(ctx, cx + 11, 6 + bounceY, 8, 8, PALETTE.rust);
  // Legs
  drawRect(ctx, cx - 7, 36 + bounceY, 6, 8, STONE_DARK.base);
  drawRect(ctx, cx + 2, 36 + bounceY, 6, 8, STONE_DARK.base);
  // Loincloth
  drawRect(ctx, cx - 8, 34 + bounceY, 16, 3, PALETTE.leatherWorn);
}

// ===================================================================
//  drawIdle — 6 frames: heavy breathing, shoulders heave, club taps
// ===================================================================
function drawIdle(ctx: SKRSContext2D, ox: number, frame: number): void {
  const cx = ox + 20;
  const phase = idlePhase(frame);

  // Heavy breathing: shoulders heave up/down
  const breathY = Math.round(Math.sin(phase) * 1.5);
  // Club slowly taps ground
  const clubTap = Math.round(Math.sin(phase + Math.PI) * 2);

  // Legs (stationary, slightly apart)
  // Left leg
  drawShadedRect(ctx, cx - 8, 37, 7, 8, PALETTE.heavyWalker);
  drawRect(ctx, cx - 9, 43, 9, 3, STONE_DARK.base);
  // Right leg
  drawShadedRect(ctx, cx + 2, 37, 7, 8, PALETTE.heavyWalker);
  drawRect(ctx, cx + 1, 43, 9, 3, STONE_DARK.base);

  // Body with shoulder heave
  drawTrollBody(ctx, cx, 0, clubTap, breathY);

  // Subtle chest expansion on inhale (frames 1-2)
  if (frame === 1 || frame === 2) {
    // Torso puffs out slightly
    drawRect(ctx, cx - 14, 22, 1, 6, STONE.base);
    drawRect(ctx, cx + 13, 22, 1, 6, STONE.base);
  }
}

// ===================================================================
//  drawDeath — 6 frames: stagger, topple head-first, fragments
// ===================================================================
function drawDeath(ctx: SKRSContext2D, ox: number, frame: number): void {
  const cx = ox + 20;
  const phase = deathPhase(frame);
  const t = deathT(frame);

  if (phase === 'hit') {
    // Frame 0-1: Hit reaction — stagger backward, cracks widen
    const stagger = frame * 2;

    // Legs (planted, knees bending)
    drawShadedRect(ctx, cx - 8, 37, 7, 8, PALETTE.heavyWalker);
    drawRect(ctx, cx - 9, 43, 9, 3, STONE_DARK.base);
    drawShadedRect(ctx, cx + 2, 37, 7, 8, PALETTE.heavyWalker);
    drawRect(ctx, cx + 1, 43, 9, 3, STONE_DARK.base);

    // Body staggers back
    drawTrollBody(ctx, cx - stagger, 0, 0, 0);

    // Extra wide cracks (damage showing)
    drawLine(ctx, cx - 12 - stagger, 15, cx - 8 - stagger, 20, STONE_DARK.shadow);
    drawLine(ctx, cx - 11 - stagger, 15, cx - 7 - stagger, 20, STONE_DARK.shadow);
    // New crack from impact
    drawLine(ctx, cx + 2 - stagger, 18, cx + 8 - stagger, 22, STONE_DARK.shadow);

    // Stone chip particles flying off
    if (frame === 1) {
      setPixel(ctx, cx + 15, 12, STONE_LIGHT.base);
      setPixel(ctx, cx + 17, 10, STONE.base);
      setPixel(ctx, cx - 18, 14, STONE_LIGHT.base);
    }
  } else if (phase === 'fall') {
    // Frame 2-3: Knees buckle, topples forward head-first
    const fallProgress = frame - 2; // 0 or 1
    const tiltY = fallProgress * 10;
    const tiltX = fallProgress * 3;

    if (fallProgress === 0) {
      // Frame 2: Knees buckling, body tilting forward

      // Legs collapsing — bending at knees
      drawShadedRect(ctx, cx - 8, 39, 7, 6, PALETTE.heavyWalker);
      drawRect(ctx, cx - 9, 43, 9, 3, STONE_DARK.base);
      drawShadedRect(ctx, cx + 2, 39, 7, 6, PALETTE.heavyWalker);
      drawRect(ctx, cx + 1, 43, 9, 3, STONE_DARK.base);

      // Body tilting forward (head goes down, tiltY shifts body)
      // Shoulders
      drawShadedRect(ctx, cx - 14, 18 + tiltY, 28, 5, PALETTE.heavyWalker);
      // Torso
      drawShadedRect(ctx, cx - 11, 23 + tiltY, 22, 8, PALETTE.heavyWalker);
      drawShadedRect(ctx, cx - 8, 31 + tiltY, 16, 5, PALETTE.heavyWalker);
      // Head dipping forward (both tiltX and tiltY)
      drawShadedRect(ctx, cx - 2 + tiltX, 14 + tiltY, 6, 5, PALETTE.heavyWalker);
      setPixel(ctx, cx + tiltX, 16 + tiltY, '#e0c020'); // one eye visible

      // Club dropping
      drawShadedRect(ctx, cx + 15, 20 + tiltY, 3, 16, PALETTE.leatherWorn);
      drawShadedRect(ctx, cx + 13, 16 + tiltY, 7, 6, PALETTE.rust);

      // Loincloth
      drawRect(ctx, cx - 6, 35 + tiltY, 12, 3, LEATHER.base);

      // Cracks intensifying
      drawLine(ctx, cx - 10, 19, cx - 6, 25, STONE_DARK.shadow);
      drawLine(ctx, cx + 4, 24, cx + 8, 28, STONE_DARK.shadow);
    } else {
      // Frame 3: Almost fully toppled — head near ground

      // Legs crumpled
      drawRect(ctx, cx - 6, 40, 12, 4, PALETTE.heavyWalker);
      drawRect(ctx, cx - 8, 43, 16, 3, STONE_DARK.base);

      // Body horizontal (toppled forward)
      // Torso lying flat-ish
      drawShadedRect(ctx, cx - 12, 32, 24, 8, PALETTE.heavyWalker);
      // Shoulders still visible
      drawShadedRect(ctx, cx - 14, 28, 28, 5, PALETTE.heavyWalker);
      // Head smashing into ground
      drawShadedRect(ctx, cx - 4, 38, 8, 5, PALETTE.heavyWalker);
      drawRect(ctx, cx - 3, 38, 6, 1, STONE_DARK.shadow); // face-down

      // Club fallen beside
      drawRect(ctx, cx + 14, 36, 3, 10, PALETTE.leatherWorn);
      drawShadedRect(ctx, cx + 12, 34, 7, 5, PALETTE.rust);

      // Major cracks
      drawLine(ctx, cx - 10, 30, cx - 4, 36, STONE_DARK.shadow);
      drawLine(ctx, cx + 3, 33, cx + 9, 37, STONE_DARK.shadow);
      drawLine(ctx, cx - 6, 34, cx + 2, 35, STONE_DARK.shadow);

      // Stone fragments starting to fly
      setPixel(ctx, cx - 16, 36, STONE.base);
      setPixel(ctx, cx + 18, 38, STONE_LIGHT.base);
      setPixel(ctx, cx - 10, 34, STONE_LIGHT.base);
    }
  } else {
    // Frame 4-5: Settle — rubble pile, dust particles
    const settleFrame = frame - 4; // 0 or 1

    // Main rubble mound (where body collapsed)
    drawShadedRect(ctx, cx - 14, 38, 28, 6, PALETTE.heavyWalker);
    drawRect(ctx, cx - 12, 37, 24, 2, STONE.base);
    // Top rubble chunks (irregular shape)
    drawShadedRect(ctx, cx - 10, 35, 8, 4, PALETTE.heavyWalker);
    drawShadedRect(ctx, cx + 2, 34, 10, 5, PALETTE.heavyWalker);
    drawShadedRect(ctx, cx - 4, 33, 8, 3, STONE_DARK.base);

    // Club sticking out of rubble
    drawRect(ctx, cx + 12, 32, 3, 12, PALETTE.leatherWorn);
    drawShadedRect(ctx, cx + 10, 28, 7, 5, PALETTE.rust);
    // Iron spike visible
    setPixel(ctx, cx + 9, 29, IRON.highlight);
    setPixel(ctx, cx + 17, 31, IRON.highlight);

    // Scattered stone fragments around rubble
    setPixel(ctx, cx - 17, 40, STONE.base);
    setPixel(ctx, cx - 15, 42, STONE_LIGHT.base);
    setPixel(ctx, cx + 16, 41, STONE.base);
    setPixel(ctx, cx + 18, 39, STONE_DARK.base);
    setPixel(ctx, cx - 12, 44, STONE.base);
    setPixel(ctx, cx + 10, 44, STONE_LIGHT.base);
    // Small fragments
    setPixel(ctx, cx - 19, 38, STONE.shadow);
    setPixel(ctx, cx + 19, 42, STONE.shadow);

    // Moss stain visible on a chunk
    setPixel(ctx, cx - 8, 36, PALETTE.moss);
    setPixel(ctx, cx - 7, 36, PALETTE.moss);

    // Bone pendant in rubble
    setPixel(ctx, cx + 1, 39, PALETTE.bone);
    setPixel(ctx, cx + 2, 39, PALETTE.bone);

    // Loincloth scrap
    drawRect(ctx, cx - 4, 40, 6, 2, LEATHER.shadow);

    // Dust particles (settling on frame 4, fading on frame 5)
    if (settleFrame === 0) {
      // More dust — actively settling
      setPixel(ctx, cx - 14, 34, hexToRgba(STONE_LIGHT.base, 0.6));
      setPixel(ctx, cx + 12, 32, hexToRgba(STONE_LIGHT.base, 0.6));
      setPixel(ctx, cx - 8, 30, hexToRgba(STONE_LIGHT.base, 0.5));
      setPixel(ctx, cx + 6, 29, hexToRgba(STONE_LIGHT.base, 0.5));
      setPixel(ctx, cx, 28, hexToRgba(STONE_LIGHT.base, 0.4));
      setPixel(ctx, cx - 18, 36, hexToRgba(STONE.base, 0.4));
      setPixel(ctx, cx + 16, 35, hexToRgba(STONE.base, 0.4));
    } else {
      // Dust fading
      setPixel(ctx, cx - 10, 32, hexToRgba(STONE_LIGHT.base, 0.3));
      setPixel(ctx, cx + 8, 30, hexToRgba(STONE_LIGHT.base, 0.3));
      setPixel(ctx, cx - 4, 28, hexToRgba(STONE_LIGHT.base, 0.2));
    }
  }
}

export default {
  drawWalk,
  drawWalkFallback,
  drawIdle,
  drawDeath,
} satisfies UnitDrawModule;
