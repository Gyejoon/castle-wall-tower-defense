import type { SKRSContext2D } from '@napi-rs/canvas';
import { PALETTE, hexToRgba, drawRect, fillCircle, setPixel, drawLine, addGlow, drawIsoShadow } from '../shared';
import { shade3, drawShadedRect, idlePhase, deathPhase, deathT, FRAME_W, FRAME_H, IDLE_FRAMES, DEATH_FRAMES, type UnitDrawModule } from './shared-rendering';

// --- Walk animation helpers (8-frame cycle) ---
const WALK_FRAMES = 8;
function walkPhase(frame: number): number { return (frame / WALK_FRAMES) * Math.PI * 2; }
function bobY(frame: number): number { return Math.round(Math.sin(walkPhase(frame) * 2) * 1.5); }
function legStep(frame: number): [number, number] {
  const phase = Math.sin(walkPhase(frame));
  const lift = Math.round(phase * 3);
  return [lift, -lift];
}
function armSwing(frame: number): number { return Math.round(Math.sin(walkPhase(frame) + Math.PI) * 3); }
function bodyLean(frame: number): number { return Math.round(Math.sin(walkPhase(frame)) * 0.5); }

// --- 3-tone shade sets ---
const GOBLIN_SKIN = '#526f2f';
const HOOD_DARK = '#3c2814';
const SACK_CLOTH = '#7a5424';
const skinShade = shade3(GOBLIN_SKIN);            // muted goblin green
const leatherShade = shade3(PALETTE.leatherWorn); // worn leather
const ironShade = shade3(PALETTE.ironDark);        // dark iron
const rustShade = shade3(PALETTE.rust);            // rust
const boneShade = shade3(PALETTE.bone);            // bone/ivory

// ============================================================
// drawWalk — 8-frame walk cycle, full detail
// ============================================================
function drawWalk(ctx: SKRSContext2D, ox: number, frame: number): void {
  const cx = ox + 20;
  const by = bobY(frame);
  const [lL, lR] = legStep(frame);

  // --- Scrawny green legs (barefoot) ---
  const leftLen = 8 + lL;
  const rightLen = 8 + lR;
  drawRect(ctx, cx - 4, 32 + by, 3, leftLen, skinShade.base);
  drawRect(ctx, cx - 4, 32 + by, 3, 1, skinShade.highlight);
  drawRect(ctx, cx - 4, 32 + by + leftLen - 1, 4, 1, skinShade.shadow);
  drawRect(ctx, cx + 1, 32 + by, 3, rightLen, skinShade.base);
  drawRect(ctx, cx + 1, 32 + by, 3, 1, skinShade.highlight);
  drawRect(ctx, cx + 1, 32 + by + rightLen - 1, 4, 1, skinShade.shadow);

  // --- Hunched torso (leather vest) ---
  const tx = cx + 1; // offset 1px right for pack weight
  drawShadedRect(ctx, tx - 5, 21 + by, 10, 10, PALETTE.leatherWorn);
  // Leather stitch highlight
  drawLine(ctx, tx - 1, 22 + by, tx - 1, 29 + by, leatherShade.highlight);

  // --- Belt ---
  drawRect(ctx, tx - 5, 30 + by, 10, 2, rustShade.base);
  drawRect(ctx, tx - 5, 30 + by, 10, 1, rustShade.highlight);
  // Gold coin on belt
  setPixel(ctx, tx - 3, 30 + by, PALETTE.gold);
  setPixel(ctx, tx - 3, 31 + by, shade3(PALETTE.gold).shadow);
  // Small key dangling
  setPixel(ctx, tx + 2, 31 + by, ironShade.highlight);
  setPixel(ctx, tx + 2, 32 + by, ironShade.base);

  // --- Backpack (large junk pile — hermit-crab shell) ---
  // Cloth sack behind the pot gives the goblin a clearer scavenger silhouette.
  const packX = tx + 3;
  const packY = 16 + by;
  drawShadedRect(ctx, packX - 2, packY + 2, 7, 11, SACK_CLOTH);
  setPixel(ctx, packX - 2, packY + 6, leatherShade.shadow);
  setPixel(ctx, packX + 3, packY + 12, PALETTE.gold);
  // Iron pot (dented) — main pack body
  drawShadedRect(ctx, packX, packY, 8, 10, PALETTE.ironDark);
  // Dent in pot
  setPixel(ctx, packX + 3, packY + 4, ironShade.shadow);
  setPixel(ctx, packX + 4, packY + 5, ironShade.shadow);
  // Pot handle
  drawLine(ctx, packX + 2, packY - 1, packX + 5, packY - 1, ironShade.highlight);

  // Scroll tube poking up from pack
  drawRect(ctx, packX + 1, packY - 3, 2, 4, boneShade.base);
  setPixel(ctx, packX + 1, packY - 3, boneShade.highlight);
  setPixel(ctx, packX + 2, packY, boneShade.shadow);

  // Broken sword handle sticking out diagonally
  drawLine(ctx, packX + 5, packY - 1, packX + 8, packY - 4, rustShade.base);
  setPixel(ctx, packX + 8, packY - 4, rustShade.highlight);
  // Broken blade tip (jagged)
  setPixel(ctx, packX + 8, packY - 5, PALETTE.stoneLight);

  // Chicken leg dangling from pack (sways with walk)
  const chickenSway = Math.round(Math.sin(walkPhase(frame) + 0.5) * 1);
  drawRect(ctx, packX + 6, packY + 7 + chickenSway, 2, 3, boneShade.base);
  setPixel(ctx, packX + 6, packY + 7 + chickenSway, '#c89060'); // meat color
  setPixel(ctx, packX + 7, packY + 9 + chickenSway, boneShade.highlight); // bone tip

  // --- Head with leather hood ---
  const hx = tx - 1;
  const hy = 11 + by;
  // Hood
  drawShadedRect(ctx, hx - 5, hy, 10, 7, HOOD_DARK);
  drawRect(ctx, hx - 4, hy + 1, 8, 5, leatherShade.shadow); // hood interior shadow
  drawRect(ctx, hx - 4, hy, 8, 1, leatherShade.highlight); // worn rim

  // Green face peeking from hood
  drawRect(ctx, hx - 3, hy + 2, 6, 4, skinShade.base);
  drawRect(ctx, hx - 3, hy + 2, 6, 1, skinShade.highlight); // forehead highlight

  // Pointed ears sticking out from hood
  setPixel(ctx, hx - 5, hy + 2, skinShade.base);
  setPixel(ctx, hx - 6, hy + 1, skinShade.highlight);
  setPixel(ctx, hx + 5, hy + 2, skinShade.base);
  setPixel(ctx, hx + 6, hy + 1, skinShade.highlight);

  // Dark eye sockets with yellow eye dots + subtle glow
  setPixel(ctx, hx - 1, hy + 3, '#0a0a0a');
  setPixel(ctx, hx + 1, hy + 3, '#0a0a0a');
  setPixel(ctx, hx - 1, hy + 3, PALETTE.gold); // yellow eye dot overwrites socket center
  setPixel(ctx, hx + 1, hy + 3, PALETTE.gold);
  addGlow(ctx, hx - 1, hy + 3, 2, PALETTE.gold, 0.2);
  addGlow(ctx, hx + 1, hy + 3, 2, PALETTE.gold, 0.2);

  // Greedy crooked-tooth smile
  setPixel(ctx, hx - 1, hy + 5, skinShade.shadow); // mouth shadow
  setPixel(ctx, hx, hy + 5, boneShade.base);       // tooth left
  setPixel(ctx, hx + 1, hy + 5, skinShade.shadow); // gap
  setPixel(ctx, hx + 2, hy + 5, boneShade.base);   // tooth right (crooked — offset)

  // --- Right arm + wooden stick (static, no swing) ---
  drawLine(ctx, tx - 6, 23 + by, tx - 8, 26 + by, skinShade.base); // arm
  // Wooden stick (vertical, held in right hand)
  drawLine(ctx, tx - 8, 18 + by, tx - 8, 28 + by, leatherShade.base);
  setPixel(ctx, tx - 8, 17 + by, leatherShade.highlight); // tip
  // Tiny lucky charm on the stick, readable at 2x scale but restrained in-game.
  setPixel(ctx, tx - 9, 20 + by, PALETTE.gold);
  setPixel(ctx, tx - 10, 21 + by, shade3(PALETTE.gold).shadow);
}

// ============================================================
// drawWalkFallback — simplified silhouette
// ============================================================
function drawWalkFallback(ctx: SKRSContext2D, ox: number, frame: number): void {
  const cx = ox + 20;
  const bobOff = frame === 1 || frame === 5 ? -1 : frame === 3 || frame === 7 ? 1 : 0;

  // Head + hood
  drawRect(ctx, cx - 5, 11 + bobOff, 10, 7, HOOD_DARK);
  drawRect(ctx, cx - 3, 13 + bobOff, 6, 4, GOBLIN_SKIN);
  // Ears
  setPixel(ctx, cx - 6, 13 + bobOff, GOBLIN_SKIN);
  setPixel(ctx, cx + 6, 13 + bobOff, GOBLIN_SKIN);
  // Eyes
  setPixel(ctx, cx - 1, 14 + bobOff, PALETTE.gold);
  setPixel(ctx, cx + 1, 14 + bobOff, PALETTE.gold);

  // Torso
  drawRect(ctx, cx - 4, 21 + bobOff, 8, 10, PALETTE.leatherWorn);

  // Backpack
  drawRect(ctx, cx + 4, 17 + bobOff, 7, 9, PALETTE.ironDark);

  // Legs
  drawRect(ctx, cx - 3, 31 + bobOff, 3, 7, GOBLIN_SKIN);
  drawRect(ctx, cx + 1, 31 + bobOff, 3, 7, GOBLIN_SKIN);
}

// ============================================================
// drawIdle — 6 frames: sway left/right from heavy pack, items jiggle
// ============================================================
function drawIdle(ctx: SKRSContext2D, ox: number, frame: number): void {
  const cx = ox + 20;
  const phase = idlePhase(frame);
  const sway = Math.round(Math.sin(phase) * 1.5);   // body sways from pack weight
  const packJiggle = Math.round(Math.sin(phase * 2) * 0.8);

  // --- Legs (standing still, barefoot) ---
  drawRect(ctx, cx - 4, 33, 3, 8, skinShade.base);
  drawRect(ctx, cx - 4, 33, 3, 1, skinShade.highlight);
  drawRect(ctx, cx - 4, 40, 4, 1, skinShade.shadow); // foot
  drawRect(ctx, cx + 1, 33, 3, 8, skinShade.base);
  drawRect(ctx, cx + 1, 33, 3, 1, skinShade.highlight);
  drawRect(ctx, cx + 1, 40, 4, 1, skinShade.shadow); // foot

  // --- Belt ---
  drawRect(ctx, cx - 4 + sway, 31, 9, 2, rustShade.base);
  setPixel(ctx, cx - 2 + sway, 31, PALETTE.gold); // coin
  setPixel(ctx, cx + 3 + sway, 32, ironShade.highlight); // key

  // --- Torso (sways) ---
  drawShadedRect(ctx, cx - 4 + sway, 22, 9, 9, PALETTE.leatherWorn);
  drawLine(ctx, cx + sway, 23, cx + sway, 29, leatherShade.highlight);

  // --- Backpack (sways opposite + jiggle) ---
  const packX = cx + 4 + sway;
  const packY = 17 + packJiggle;
  drawShadedRect(ctx, packX, packY, 7, 9, PALETTE.ironDark);
  // Pot handle
  drawLine(ctx, packX + 1, packY - 1, packX + 4, packY - 1, ironShade.highlight);
  // Scroll tube
  drawRect(ctx, packX + 1, packY - 3, 2, 3, boneShade.base);
  // Broken sword handle
  drawLine(ctx, packX + 4, packY - 1, packX + 7, packY - 3 - packJiggle, rustShade.base);
  // Chicken leg (swings with sway)
  const chickenOff = Math.round(Math.sin(phase + 1) * 1);
  drawRect(ctx, packX + 5, packY + 6 + chickenOff, 2, 3, boneShade.base);
  setPixel(ctx, packX + 5, packY + 6 + chickenOff, '#c89060');

  // --- Head with hood (sways) ---
  const hx = cx + sway;
  const hy = 12;
  drawShadedRect(ctx, hx - 5, hy, 10, 7, HOOD_DARK);
  drawRect(ctx, hx - 4, hy + 1, 8, 5, leatherShade.shadow);
  drawRect(ctx, hx - 4, hy, 8, 1, leatherShade.highlight);
  // Face
  drawRect(ctx, hx - 3, hy + 2, 6, 4, skinShade.base);
  drawRect(ctx, hx - 3, hy + 2, 6, 1, skinShade.highlight);
  // Ears
  setPixel(ctx, hx - 5, hy + 2, skinShade.base);
  setPixel(ctx, hx - 6, hy + 1, skinShade.highlight);
  setPixel(ctx, hx + 5, hy + 2, skinShade.base);
  setPixel(ctx, hx + 6, hy + 1, skinShade.highlight);
  // Eyes
  setPixel(ctx, hx - 1, hy + 3, PALETTE.gold);
  setPixel(ctx, hx + 1, hy + 3, PALETTE.gold);
  // Smile
  setPixel(ctx, hx - 1, hy + 5, skinShade.shadow);
  setPixel(ctx, hx, hy + 5, boneShade.base);
  setPixel(ctx, hx + 1, hy + 5, skinShade.shadow);
  setPixel(ctx, hx + 2, hy + 5, boneShade.base);

  // --- Arms (idle, hanging with dagger loosely held) ---
  // Right arm with dagger
  drawLine(ctx, cx - 5 + sway, 24, cx - 7 + sway, 30, skinShade.base);
  drawLine(ctx, cx - 7 + sway, 30, cx - 10 + sway, 28, ironShade.base);
  setPixel(ctx, cx - 10 + sway, 28, ironShade.highlight);
  // Left arm
  drawLine(ctx, cx + 4 + sway, 24, cx + 5 + sway, 30, skinShade.base);
}

// ============================================================
// drawDeath — 6 frames: collapse, junk scatters, gold coins remain
// ============================================================
function drawDeath(ctx: SKRSContext2D, ox: number, frame: number): void {
  const cx = ox + 20;
  const phase = deathPhase(frame);
  const t = deathT(frame);

  if (phase === 'hit') {
    // --- Hit reaction: stagger backward, flash ---
    const stagger = Math.round(t * 3);
    const flash = frame === 0 ? '#ffffff' : skinShade.base;

    // Body staggers back
    drawShadedRect(ctx, cx - 4 - stagger, 22, 9, 9, PALETTE.leatherWorn);
    // Head recoils
    drawShadedRect(ctx, cx - 4 - stagger, 12, 8, 7, PALETTE.leatherWorn);
    drawRect(ctx, cx - 3 - stagger, 14, 6, 4, flash);
    // Ears
    setPixel(ctx, cx - 5 - stagger, 14, flash);
    setPixel(ctx, cx + 5 - stagger, 14, flash);
    // Eyes (shocked)
    setPixel(ctx, cx - 1 - stagger, 15, PALETTE.gold);
    setPixel(ctx, cx + 1 - stagger, 15, PALETTE.gold);
    // Legs
    drawRect(ctx, cx - 3 - stagger, 31, 3, 8, skinShade.base);
    drawRect(ctx, cx + 1 - stagger, 31, 3, 8, skinShade.base);
    // Pack still on back
    drawShadedRect(ctx, cx + 4 - stagger, 17, 7, 9, PALETTE.ironDark);
    // Belt
    drawRect(ctx, cx - 4 - stagger, 30, 9, 2, rustShade.base);
    // Dagger flies up
    drawLine(ctx, cx - 8 - stagger, 20 - frame * 2, cx - 11 - stagger, 17 - frame * 2, ironShade.base);
  } else if (phase === 'fall') {
    // --- Falling: body collapses sideways, junk flies off ---
    const fallAngle = (frame - 2) / 2; // 0..0.5 within fall frames
    const dropY = Math.round(fallAngle * 12);
    const tiltX = Math.round(fallAngle * 8);

    // Torso collapses rightward
    drawRect(ctx, cx - 3 + tiltX, 26 + dropY, 9, 6, leatherShade.shadow);
    // Head falling
    drawRect(ctx, cx - 3 + tiltX, 22 + dropY, 6, 5, skinShade.shadow);
    setPixel(ctx, cx - 1 + tiltX, 24 + dropY, PALETTE.gold); // eye
    // Legs crumple
    drawRect(ctx, cx - 3, 33, 3, 5, skinShade.shadow);
    drawRect(ctx, cx + 1, 33, 3, 4, skinShade.shadow);

    // --- Junk scatters ---
    // Iron pot flies off right
    const potFlyX = cx + 10 + (frame - 2) * 4;
    const potFlyY = 14 + (frame - 2) * 3;
    drawRect(ctx, potFlyX, potFlyY, 5, 4, ironShade.base);
    setPixel(ctx, potFlyX + 2, potFlyY, ironShade.highlight);

    // Scroll tube flung left
    const scrollFlyX = cx - 8 - (frame - 2) * 3;
    const scrollFlyY = 12 + (frame - 2) * 5;
    drawRect(ctx, scrollFlyX, scrollFlyY, 2, 4, boneShade.base);

    // Chicken leg bouncing
    const chickenX = cx + 6 + (frame - 2) * 2;
    const chickenY = 20 + (frame - 2) * 6;
    drawRect(ctx, chickenX, chickenY, 2, 3, boneShade.base);
    setPixel(ctx, chickenX, chickenY, '#c89060');

    // Gold coin spills from belt
    setPixel(ctx, cx - 2 + (frame - 2) * 2, 34 + (frame - 2) * 2, PALETTE.gold);
    setPixel(ctx, cx + 3 - (frame - 2), 35 + (frame - 2) * 3, PALETTE.gold);
  } else {
    // --- Settle: body on ground, debris scattered, gold coins visible ---
    // Collapsed body flat on ground
    drawRect(ctx, cx - 2, 38, 12, 4, leatherShade.shadow);
    // Head on ground
    drawRect(ctx, cx - 4, 37, 5, 4, skinShade.shadow);
    setPixel(ctx, cx - 3, 38, PALETTE.gold); // eye still glinting
    // Crumpled legs
    drawRect(ctx, cx + 8, 39, 4, 3, skinShade.shadow);

    // Scattered debris on ground
    // Pot (dented, landed upside down)
    drawRect(ctx, cx + 14, 36, 5, 4, ironShade.shadow);
    setPixel(ctx, cx + 16, 36, ironShade.base);
    // Scroll tube
    drawRect(ctx, cx - 12, 38, 4, 2, boneShade.shadow);
    // Broken sword piece
    setPixel(ctx, cx + 12, 40, rustShade.base);
    setPixel(ctx, cx + 13, 39, rustShade.shadow);

    // Gold coins on ground (the payoff — greed even in death)
    setPixel(ctx, cx, 42, PALETTE.gold);
    setPixel(ctx, cx + 1, 42, shade3(PALETTE.gold).highlight);
    setPixel(ctx, cx + 4, 41, PALETTE.gold);
    setPixel(ctx, cx + 5, 41, shade3(PALETTE.gold).shadow);
  }
}

export default {
  drawWalk,
  drawWalkFallback,
  drawIdle,
  drawDeath,
} satisfies UnitDrawModule;
