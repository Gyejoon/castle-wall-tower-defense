import { makeCanvas, saveCanvas, PALETTE, drawRect, setPixel, type ManifestEntry } from './shared';
import { mkdirSync } from 'fs';
import type { SKRSContext2D } from '@napi-rs/canvas';

const OUTPUT_DIR = 'packages/web-shell/public/assets/castle-wall';
const W = 64;
const H = 80;

const CS = PALETTE.castleStone;
const ACCENT = PALETTE.laser; // #c8a04a — brand gold accent
const DEBRIS = '#4a5254';

// Merlon definitions: [x, width] for 5 merlons across 64px
const MERLONS: [number, number][] = [
  [2, 12],   // 1st
  [14, 10],  // 2nd
  [26, 12],  // 3rd
  [40, 10],  // 4th
  [52, 10],  // 5th
];

function clampChannel(v: number): number {
  return Math.max(0, Math.min(255, v));
}

/** Shift all pixel colors by a per-channel offset (applied as tint overlay) */
function shiftColors(ctx: SKRSContext2D, shift: number): void {
  if (shift === 0) return;
  const imgData = ctx.getImageData(0, 0, W, H);
  const d = imgData.data;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] === 0) continue; // skip transparent
    d[i]     = clampChannel(d[i] + shift);
    d[i + 1] = clampChannel(d[i + 1] + shift);
    d[i + 2] = clampChannel(d[i + 2] + shift);
  }
  ctx.putImageData(imgData, 0, 0);
}

/** Apply red tint overlay */
function applyRedTint(ctx: SKRSContext2D): void {
  ctx.save();
  ctx.globalCompositeOperation = 'source-atop';
  ctx.fillStyle = 'rgba(180,30,10,0.12)';
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

function drawTopDownWall(ctx: SKRSContext2D, w: number, h: number, damageLevel: 0 | 1 | 2): void {
  // === Base: offset brick pattern (y:16~79) ===
  for (let y = 16; y < h; y++) {
    const row = y - 16;
    const isOddRow = Math.floor(row / 6) % 2 === 1;
    const offset = isOddRow ? 8 : 0;

    for (let x = 0; x < w; x++) {
      const bx = (x + offset) % 16;
      // Joint lines: every 16px horizontally, every 6px vertically
      const isHJoint = bx === 0;
      const isVJoint = row % 6 === 0;

      if (isHJoint || isVJoint) {
        setPixel(ctx, x, y, CS.joint);
      } else {
        // Alternate between mid and dark for slight variation
        const tileIdx = Math.floor((x + offset) / 16) + Math.floor(row / 6);
        const color = tileIdx % 3 === 0 ? CS.dark : tileIdx % 3 === 1 ? CS.mid : CS.light;
        setPixel(ctx, x, y, color);
      }
    }
  }

  // === Merlons (y:0~14) ===
  const collapsedMerlons = new Set<number>();
  if (damageLevel >= 1) collapsedMerlons.add(1); // 2nd merlon
  if (damageLevel >= 2) {
    collapsedMerlons.add(0); // 1st merlon
    collapsedMerlons.add(4); // last merlon
  }

  for (let i = 0; i < MERLONS.length; i++) {
    if (collapsedMerlons.has(i)) continue;
    const [mx, mw] = MERLONS[i];
    // Merlon body
    drawRect(ctx, mx, 1, mw, 14, CS.merlon);
    // Shadow on left edge
    for (let y = 1; y < 15; y++) {
      setPixel(ctx, mx, y, CS.shadow);
    }
    // Accent highlight on top 1px
    drawRect(ctx, mx, 0, mw, 1, ACCENT);
  }

  // Fill gap between merlons at y:0~14 with wall-top (shadow color for depth)
  for (let x = 0; x < w; x++) {
    let insideMerlon = false;
    for (let i = 0; i < MERLONS.length; i++) {
      if (collapsedMerlons.has(i)) continue;
      const [mx, mw] = MERLONS[i];
      if (x >= mx && x < mx + mw) { insideMerlon = true; break; }
    }
    if (!insideMerlon) {
      // Crenel (gap between merlons) — show wall top surface
      drawRect(ctx, x, 0, 1, 15, CS.shadow);
    }
  }

  // === Gate passage (y:48~79, x:22~41) ===
  drawRect(ctx, 22, 48, 20, 32, CS.gate);
  // Inner shadow on gate edges
  for (let y = 48; y < 80; y++) {
    setPixel(ctx, 22, y, CS.shadow);
    setPixel(ctx, 41, y, CS.shadow);
  }
  for (let x = 22; x <= 41; x++) {
    setPixel(ctx, x, 48, CS.shadow);
  }

  // === Moss dots (2x2) ===
  const mossSpots = [
    [5, 30], [50, 25], [10, 55], [45, 65], [55, 40], [28, 35],
  ];
  for (const [mx, my] of mossSpots) {
    // Skip moss in gate area
    if (mx >= 22 && mx <= 41 && my >= 48 && my < 80) continue;
    drawRect(ctx, mx, my, 2, 2, CS.moss);
  }

  // === Damage level 1+: Cracks and holes ===
  if (damageLevel >= 1) {
    // Widened joints: 2-3px irregular black lines in 2 places
    drawRect(ctx, 8, 28, 3, 12, CS.gate);
    drawRect(ctx, 48, 36, 2, 10, CS.gate);

    // Small stone fallout: 6x4px black holes in 2 places
    drawRect(ctx, 12, 42, 6, 4, CS.gate);
    drawRect(ctx, 50, 22, 6, 4, CS.gate);
  }

  // === Damage level 2: Large holes, debris, red tint ===
  if (damageLevel >= 2) {
    // Large holes
    drawRect(ctx, 4, 32, 12, 10, CS.gate);  // left: 12x10
    drawRect(ctx, 46, 50, 10, 8, CS.gate);  // right: 10x8

    // Debris pixels at hole edges
    const debrisSpots = [
      [3, 32], [3, 33], [16, 35], [16, 38], [5, 42], [14, 41],
      [45, 50], [45, 51], [56, 53], [56, 56], [47, 58], [54, 57],
    ];
    for (const [dx, dy] of debrisSpots) {
      setPixel(ctx, dx, dy, DEBRIS);
    }
  }

  // Color shift
  const colorShift = damageLevel === 0 ? 0 : damageLevel === 1 ? -12 : -24;
  shiftColors(ctx, colorShift);

  // Red tint for heavy damage
  if (damageLevel === 2) {
    applyRedTint(ctx);
  }
}

export async function generate(): Promise<ManifestEntry[]> {
  mkdirSync(OUTPUT_DIR, { recursive: true });
  const entries: ManifestEntry[] = [];

  const levels: { damage: 0 | 1 | 2; hp: string }[] = [
    { damage: 0, hp: 'hp3' },
    { damage: 1, hp: 'hp2' },
    { damage: 2, hp: 'hp1' },
  ];

  for (const { damage, hp } of levels) {
    const { canvas, ctx } = makeCanvas(W, H);
    drawTopDownWall(ctx, W, H, damage);
    const filename = `base-${hp}.png`;
    saveCanvas(canvas, `${OUTPUT_DIR}/${filename}`);
    entries.push({
      key: `castle-wall-${hp}`,
      type: 'image',
      path: `assets/castle-wall/${filename}`,
    });
  }

  return entries;
}

if (import.meta.main) {
  generate().then(e => console.log(JSON.stringify(e, null, 2)));
}
