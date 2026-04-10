import type { SKRSContext2D } from '@napi-rs/canvas';
import {
  PALETTE,
  drawIsoShadow,
  drawRect,
  fillCircle,
  setPixel,
  drawLine,
  addGlow,
  hexToRgba,
} from '../shared';

// ── Pixel-art iso helpers (medieval + pixel style) ──────────────

/**
 * Iso cube — the core building block for all medieval structures.
 * Exact copy of generate-towers.ts drawIsoCube for consistency.
 */
function drawIsoCube(
  ctx: SKRSContext2D,
  cx: number, cy: number,
  hw: number, height: number,
  topColor: string, leftColor: string, rightColor: string,
): void {
  const hh = Math.round(hw / 2);
  for (let dy = -hh; dy <= hh; dy++) {
    const ratio = 1 - Math.abs(dy) / hh;
    const w = Math.round(hw * ratio);
    for (let dx = -w; dx <= w; dx++) {
      setPixel(ctx, cx + dx, cy + dy, topColor);
    }
  }
  for (let h = 1; h <= height; h++) {
    for (let row = 0; row <= hh; row++) {
      const ratio = 1 - row / hh;
      const w = Math.round(hw * ratio);
      for (let dx = -w; dx < 0; dx++) setPixel(ctx, cx + dx, cy + row + h, leftColor);
      for (let dx = 0; dx <= w; dx++) setPixel(ctx, cx + dx, cy + row + h, rightColor);
    }
  }
}

/** Stone base platform — iso diamond with depth, same as legacy drawBase but scaled */
function drawBase(ctx: SKRSContext2D, cx: number, baseY: number, hw: number): void {
  const hh = Math.round(hw / 2.5);
  for (let dy = -hh; dy <= hh; dy++) {
    const ratio = 1 - Math.abs(dy) / hh;
    const w = Math.round(hw * ratio);
    for (let dx = -w; dx <= w; dx++) setPixel(ctx, cx + dx, baseY + dy, PALETTE.stoneLight);
  }
  for (let d = 1; d <= 5; d++) {
    for (let row = 0; row <= hh; row++) {
      const ratio = 1 - row / hh;
      const w = Math.round(hw * ratio);
      for (let dx = -w; dx < 0; dx++) setPixel(ctx, cx + dx, baseY + row + d, PALETTE.stoneDark);
      for (let dx = 0; dx <= w; dx++) setPixel(ctx, cx + dx, baseY + row + d, PALETTE.stone);
    }
  }
}

/** Mortar line texture on a vertical wall */
function drawMortarLines(ctx: SKRSContext2D, cx: number, topY: number, hw: number, rows: number): void {
  for (let i = 0; i < rows; i++) {
    const y = topY + i * 8;
    drawLine(ctx, cx - hw + 2, y, cx + hw - 2, y, hexToRgba('#1a1208', 0.3));
    // Stagger bricks
    if (i % 2 === 0) {
      setPixel(ctx, cx - 4, y, hexToRgba('#1a1208', 0.4));
      setPixel(ctx, cx + 6, y, hexToRgba('#1a1208', 0.4));
    } else {
      setPixel(ctx, cx + 2, y, hexToRgba('#1a1208', 0.4));
      setPixel(ctx, cx - 8, y, hexToRgba('#1a1208', 0.4));
    }
  }
}

/** Pixel flag — hard-edged pennant */
function drawFlag(ctx: SKRSContext2D, x: number, topY: number, poleH: number, color: string): void {
  drawLine(ctx, x, topY, x, topY + poleH, PALETTE.woodDark);
  setPixel(ctx, x, topY, PALETTE.woodLight);
  // Pennant — pixelated triangle
  drawRect(ctx, x + 1, topY + 1, 7, 2, color);
  drawRect(ctx, x + 1, topY + 3, 5, 2, color);
  drawRect(ctx, x + 1, topY + 5, 3, 1, color);
  drawRect(ctx, x + 1, topY + 6, 1, 1, color);
}

// ══════════════════════════════════════════════════════════════
// ██  Pilot draw functions — 128×160 medieval pixel sprites  ██
// ══════════════════════════════════════════════════════════════

export function drawArcherHQ(ctx: SKRSContext2D, ox: number, oy: number): void {
  const cx = ox + 64;
  const baseY = oy + 132;

  drawIsoShadow(ctx, cx, baseY + 10, 28, 9, 0.45);
  drawBase(ctx, cx, baseY, 26);

  // Main tower body — stacked iso cubes (3 tiers)
  drawIsoCube(ctx, cx, oy + 94, 20, 32, PALETTE.stoneLight, PALETTE.stoneDark, PALETTE.stone);
  drawIsoCube(ctx, cx, oy + 68, 18, 24, PALETTE.stone, PALETTE.stoneDark, PALETTE.stoneLight);
  drawIsoCube(ctx, cx, oy + 50, 16, 16, PALETTE.stoneLight, PALETTE.stoneDark, PALETTE.stone);

  // Mortar lines on front faces
  drawMortarLines(ctx, cx, oy + 56, 16, 10);

  // Battlements — 4 merlon blocks on top
  drawIsoCube(ctx, cx - 12, oy + 42, 5, 6, PALETTE.stone, PALETTE.stoneDark, PALETTE.stoneLight);
  drawIsoCube(ctx, cx - 3, oy + 42, 5, 6, PALETTE.stone, PALETTE.stoneDark, PALETTE.stoneLight);
  drawIsoCube(ctx, cx + 6, oy + 42, 5, 6, PALETTE.stone, PALETTE.stoneDark, PALETTE.stoneLight);
  drawIsoCube(ctx, cx + 14, oy + 42, 4, 6, PALETTE.stone, PALETTE.stoneDark, PALETTE.stoneLight);

  // Arrow slits — dark rectangles
  drawRect(ctx, cx + 2, oy + 74, 2, 8, '#1a1208');
  drawRect(ctx, cx - 5, oy + 82, 2, 6, '#1a1208');
  drawRect(ctx, cx + 4, oy + 98, 2, 6, '#1a1208');

  // Flag pole + red pennant
  drawFlag(ctx, cx + 10, oy + 20, 20, PALETTE.fireRed);

  // Window with warm light
  drawRect(ctx, cx - 2, oy + 62, 4, 5, '#1a1208');
  setPixel(ctx, cx - 1, oy + 63, hexToRgba(PALETTE.magicGold, 0.4));
  setPixel(ctx, cx, oy + 64, hexToRgba(PALETTE.magicGold, 0.3));
}

export function drawFlameTowerHQ(ctx: SKRSContext2D, ox: number, oy: number): void {
  const cx = ox + 64;
  const baseY = oy + 132;

  drawIsoShadow(ctx, cx, baseY + 10, 30, 10, 0.55);

  // Dark volcanic stone base
  drawIsoCube(ctx, cx, baseY - 4, 24, 8, '#3a1609', '#1a0804', '#2b0f08');

  // Furnace body — stacked dark stone cubes
  drawIsoCube(ctx, cx, oy + 88, 22, 36, '#2b0f08', '#1a0804', '#3a1609');
  drawIsoCube(ctx, cx, oy + 60, 20, 26, '#3a1609', '#1a0804', '#2b0f08');

  // Mortar with lava glow
  for (let i = 0; i < 8; i++) {
    const y = oy + 64 + i * 8;
    drawLine(ctx, cx - 16, y, cx + 16, y, hexToRgba('#c54120', 0.25));
  }

  // Heat cracks — pixel lines with orange glow
  const cracks = [
    { x1: -10, y1: 72, x2: -14, y2: 86 },
    { x1: 8, y1: 78, x2: 12, y2: 96 },
    { x1: -4, y1: 90, x2: 2, y2: 108 },
  ];
  for (const c of cracks) {
    drawLine(ctx, cx + c.x1, oy + c.y1, cx + c.x2, oy + c.y2, hexToRgba('#c54120', 0.6));
    setPixel(ctx, cx + c.x2, oy + c.y2, '#f5b23b');
  }

  // Furnace mouth — dark opening at top
  drawRect(ctx, cx - 12, oy + 54, 24, 6, '#0a0200');
  drawRect(ctx, cx - 10, oy + 55, 20, 4, '#1a0804');
  // Inner glow
  drawRect(ctx, cx - 6, oy + 56, 12, 2, hexToRgba('#c54120', 0.7));

  // Pixelated flames on top — layered rectangles
  // Core (bright)
  drawRect(ctx, cx - 3, oy + 42, 6, 12, '#f5b23b');
  drawRect(ctx, cx - 1, oy + 36, 2, 6, '#ffe27a');
  // Side tongues
  drawRect(ctx, cx - 8, oy + 46, 4, 8, '#c54120');
  drawRect(ctx, cx - 6, oy + 44, 2, 4, '#f5b23b');
  drawRect(ctx, cx + 5, oy + 44, 4, 10, '#c54120');
  drawRect(ctx, cx + 6, oy + 42, 2, 4, '#f5b23b');
  // Tip sparks
  setPixel(ctx, cx, oy + 34, '#ffe27a');
  setPixel(ctx, cx - 5, oy + 40, '#f5b23b');
  setPixel(ctx, cx + 7, oy + 38, '#f5b23b');

  // Subtle base glow
  addGlow(ctx, cx, oy + 56, 6, '#c54120', 0.2);
}

export function drawDragonNestHQ(ctx: SKRSContext2D, ox: number, oy: number): void {
  const cx = ox + 64;
  const baseY = oy + 130;

  drawIsoShadow(ctx, cx, baseY + 10, 32, 11, 0.5);

  // Rocky nest wall — stacked iso cubes in a ring shape
  // Bottom ring (widest)
  drawIsoCube(ctx, cx, baseY - 2, 28, 10, '#5a4a3a', '#3a2a1a', '#6a5a4a');
  // Middle ring
  drawIsoCube(ctx, cx, baseY - 12, 24, 8, '#6a5a4a', '#3a2a1a', '#5a4a3a');
  // Top ring (narrowest)
  drawIsoCube(ctx, cx, baseY - 20, 20, 6, '#5a4a3a', '#3a2a1a', '#6a5a4a');

  // Dark interior
  for (let dy = -5; dy <= 5; dy++) {
    const w = 14 - Math.abs(dy);
    drawRect(ctx, cx - w, oy + 96 + dy, w * 2, 1, '#2b1a0a');
  }

  // Rock texture spots
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    setPixel(ctx, Math.round(cx + 20 * Math.cos(a)), Math.round(oy + 108 + 7 * Math.sin(a)), '#3a2a1a');
  }

  // Dragon eggs — small pixel ovals
  // Big egg (gold-red)
  drawRect(ctx, cx - 12, oy + 90, 6, 10, '#c04a28');
  drawRect(ctx, cx - 11, oy + 89, 4, 2, '#f2a13a');
  setPixel(ctx, cx - 10, oy + 88, '#ffe27a');
  // Medium egg
  drawRect(ctx, cx + 6, oy + 92, 5, 8, '#7a2a12');
  drawRect(ctx, cx + 7, oy + 91, 3, 2, '#d97a20');
  setPixel(ctx, cx + 8, oy + 90, '#f5b23b');
  // Small egg (back)
  drawRect(ctx, cx - 2, oy + 86, 4, 6, '#4a1a08');
  drawRect(ctx, cx - 1, oy + 85, 2, 2, '#b85a15');

  // Bone fragments — pixel lines
  drawLine(ctx, cx - 22, oy + 116, cx - 14, oy + 112, '#c8c0b0');
  drawLine(ctx, cx - 22, oy + 117, cx - 14, oy + 113, '#a0988a');
  drawRect(ctx, cx - 22, oy + 115, 2, 3, '#c8c0b0');
  drawLine(ctx, cx + 16, oy + 114, cx + 22, oy + 110, '#c8c0b0');
  drawRect(ctx, cx + 22, oy + 109, 2, 3, '#c8c0b0');

  // Steam wisps — scattered pixels
  setPixel(ctx, cx - 4, oy + 78, hexToRgba('#ffffff', 0.2));
  setPixel(ctx, cx + 2, oy + 74, hexToRgba('#ffffff', 0.15));
  setPixel(ctx, cx - 8, oy + 72, hexToRgba('#ffffff', 0.1));
  setPixel(ctx, cx + 6, oy + 70, hexToRgba('#ffffff', 0.15));

  // Egg glow — very subtle
  addGlow(ctx, cx - 10, oy + 94, 5, '#ffdc80', 0.15);
}

export function drawWindSpireHQ(ctx: SKRSContext2D, ox: number, oy: number): void {
  const cx = ox + 64;
  const baseY = oy + 134;

  drawIsoShadow(ctx, cx, baseY + 8, 22, 8, 0.35);

  // Marble base — 2-tier iso platform
  drawIsoCube(ctx, cx, baseY - 2, 20, 6, '#c0d0d8', '#8a9aa4', '#e8ecef');
  drawIsoCube(ctx, cx, baseY - 8, 16, 4, '#e8ecef', '#8a9aa4', '#c0d0d8');

  // Tall thin spire — stacked narrow iso cubes
  drawIsoCube(ctx, cx, oy + 100, 10, 22, '#e8ecef', '#a8b5c0', '#c0d0d8');
  drawIsoCube(ctx, cx, oy + 78, 9, 20, '#c0d0d8', '#a8b5c0', '#e8ecef');
  drawIsoCube(ctx, cx, oy + 60, 8, 16, '#e8ecef', '#a8b5c0', '#c0d0d8');
  // Pinnacle
  drawIsoCube(ctx, cx, oy + 48, 6, 10, '#c0d0d8', '#8a9aa4', '#e8ecef');

  // Vertical windows — dark slits with cyan glow
  drawRect(ctx, cx, oy + 68, 2, 8, '#4a6a7a');
  setPixel(ctx, cx, oy + 70, '#6bd4d0');
  drawRect(ctx, cx, oy + 86, 2, 6, '#4a6a7a');
  setPixel(ctx, cx, oy + 88, '#6bd4d0');
  drawRect(ctx, cx, oy + 102, 2, 5, '#4a6a7a');

  // Windmill blades — 4 pixel lines from hub
  const hubY = oy + 40;
  fillCircle(ctx, cx, hubY, 2, '#a8b5c0');
  setPixel(ctx, cx, hubY, '#e8ecef');
  // Blades as pixel lines
  drawLine(ctx, cx, hubY, cx - 18, hubY - 8, '#e8ecef');
  drawLine(ctx, cx, hubY, cx + 16, hubY - 10, '#c0d0d8');
  drawLine(ctx, cx, hubY, cx + 12, hubY + 14, '#e8ecef');
  drawLine(ctx, cx, hubY, cx - 14, hubY + 12, '#c0d0d8');
  // Blade width — second line offset by 1px
  drawLine(ctx, cx, hubY + 1, cx - 18, hubY - 7, '#c0d0d8');
  drawLine(ctx, cx, hubY + 1, cx + 16, hubY - 9, '#a8b5c0');
  drawLine(ctx, cx + 1, hubY, cx + 13, hubY + 14, '#c0d0d8');
  drawLine(ctx, cx + 1, hubY, cx - 13, hubY + 12, '#a8b5c0');

  // Wind trail wisps at base — scattered pixels
  for (let i = 0; i < 5; i++) {
    const trailX = cx - 16 + i * 8;
    setPixel(ctx, trailX, baseY - 12 + (i % 2), hexToRgba('#6bd4d0', 0.2));
    setPixel(ctx, trailX + 1, baseY - 13, hexToRgba('#6bd4d0', 0.1));
  }
}

export function drawArcaneSpireHQ(ctx: SKRSContext2D, ox: number, oy: number): void {
  const cx = ox + 64;
  const baseY = oy + 134;

  drawIsoShadow(ctx, cx, baseY + 8, 24, 9, 0.45);

  // Dark stone base
  drawIsoCube(ctx, cx, baseY - 2, 22, 8, '#4a3068', '#2a1a3e', '#3a2058');

  // Wizard tower body — stacked dark cubes
  drawIsoCube(ctx, cx, oy + 96, 18, 28, '#2a1a3e', '#1a0a2e', '#3a2058');
  drawIsoCube(ctx, cx, oy + 72, 16, 22, '#3a2058', '#1a0a2e', '#2a1a3e');

  // Mortar lines with purple tint
  for (let i = 0; i < 7; i++) {
    const y = oy + 76 + i * 8;
    drawLine(ctx, cx - 12, y, cx + 12, y, hexToRgba('#1a0a2e', 0.4));
  }

  // Cone roof — layered rectangles narrowing upward
  for (let i = 0; i < 12; i++) {
    const w = 18 - i;
    const y = oy + 60 - i;
    drawRect(ctx, cx - w, y, w * 2, 1, i % 2 === 0 ? '#1a0a2e' : '#2a1a3e');
  }
  setPixel(ctx, cx, oy + 47, '#4a3068');

  // Glowing magic windows
  drawRect(ctx, cx - 4, oy + 80, 3, 5, '#0a0a1a');
  drawRect(ctx, cx - 3, oy + 81, 1, 3, '#a855f7');
  drawRect(ctx, cx + 3, oy + 90, 3, 5, '#0a0a1a');
  drawRect(ctx, cx + 4, oy + 91, 1, 3, '#a855f7');
  drawRect(ctx, cx - 1, oy + 104, 3, 4, '#0a0a1a');
  drawRect(ctx, cx, oy + 105, 1, 2, '#d8b4fe');

  // Floating magic orb at top — small pixel circle
  fillCircle(ctx, cx, oy + 38, 4, '#4a3068');
  fillCircle(ctx, cx, oy + 38, 3, '#a855f7');
  setPixel(ctx, cx - 1, oy + 36, '#d8b4fe');
  setPixel(ctx, cx, oy + 37, '#ffffff');
  addGlow(ctx, cx, oy + 38, 6, '#a855f7', 0.2);

  // Orbiting rune dots — 3 pixel symbols
  setPixel(ctx, cx - 14, oy + 44, '#d8b4fe');
  setPixel(ctx, cx - 15, oy + 45, '#a855f7');
  setPixel(ctx, cx + 14, oy + 40, '#d8b4fe');
  setPixel(ctx, cx + 13, oy + 41, '#a855f7');
  setPixel(ctx, cx + 4, oy + 32, '#d8b4fe');
  setPixel(ctx, cx + 3, oy + 33, '#a855f7');
}

export function drawWorldTreeHQ(ctx: SKRSContext2D, ox: number, oy: number): void {
  const cx = ox + 64;
  const baseY = oy + 140;

  drawIsoShadow(ctx, cx, baseY + 6, 28, 10, 0.4);

  // Exposed roots — pixel lines
  drawLine(ctx, cx - 8, baseY, cx - 24, baseY + 8, '#4a3018');
  drawLine(ctx, cx - 8, baseY + 1, cx - 24, baseY + 9, '#7a5828');
  drawRect(ctx, cx - 26, baseY + 7, 3, 3, '#4a3018');
  drawLine(ctx, cx + 6, baseY - 2, cx + 22, baseY + 6, '#4a3018');
  drawLine(ctx, cx + 6, baseY - 1, cx + 22, baseY + 7, '#7a5828');
  drawRect(ctx, cx + 22, baseY + 5, 3, 3, '#4a3018');
  drawLine(ctx, cx - 2, baseY + 2, cx - 16, baseY + 10, '#5a4020');
  drawRect(ctx, cx - 18, baseY + 9, 3, 2, '#4a3018');

  // Gnarled trunk — stacked rectangles with bark texture
  // Bottom (widest)
  drawRect(ctx, cx - 14, oy + 100, 28, 36, '#4a3018');
  drawRect(ctx, cx - 12, oy + 100, 8, 36, '#3a2410');
  drawRect(ctx, cx + 4, oy + 100, 10, 36, '#5a4020');
  // Middle (narrower)
  drawRect(ctx, cx - 12, oy + 80, 24, 20, '#5a4020');
  drawRect(ctx, cx - 10, oy + 80, 8, 20, '#4a3018');
  drawRect(ctx, cx + 2, oy + 80, 8, 20, '#7a5828');
  // Bark texture
  for (let i = 0; i < 6; i++) {
    setPixel(ctx, cx - 6 + (i % 3) * 4, oy + 84 + i * 8, '#3a2010');
    setPixel(ctx, cx + 2 + (i % 2) * 6, oy + 88 + i * 6, '#3a2010');
  }

  // Trunk rune — small green symbol
  drawRect(ctx, cx - 2, oy + 108, 4, 1, '#8fe08f');
  drawRect(ctx, cx, oy + 106, 1, 5, '#8fe08f');
  setPixel(ctx, cx, oy + 108, '#ffffff');

  // Foliage crown — layered pixel blocks (not smooth circles)
  // Dark bottom layer
  drawRect(ctx, cx - 30, oy + 52, 60, 16, '#2d5f2d');
  drawRect(ctx, cx - 26, oy + 48, 52, 6, '#2d5f2d');
  drawRect(ctx, cx - 22, oy + 44, 44, 6, '#2d5f2d');
  // Mid layer
  drawRect(ctx, cx - 26, oy + 46, 52, 14, '#4ca04c');
  drawRect(ctx, cx - 22, oy + 42, 44, 8, '#4ca04c');
  // Bright top layer
  drawRect(ctx, cx - 18, oy + 40, 36, 10, '#6abe48');
  drawRect(ctx, cx - 12, oy + 36, 24, 6, '#8fe08f');
  // Extra leaf blobs
  drawRect(ctx, cx + 18, oy + 50, 10, 8, '#4ca04c');
  drawRect(ctx, cx - 28, oy + 54, 8, 6, '#2d5f2d');
  drawRect(ctx, cx + 14, oy + 44, 8, 6, '#6abe48');

  // Life sparkles — individual pixels
  setPixel(ctx, cx - 8, oy + 40, '#ffffff');
  setPixel(ctx, cx + 6, oy + 44, '#ffffff');
  setPixel(ctx, cx - 14, oy + 50, '#ffffff');
  setPixel(ctx, cx + 12, oy + 48, '#ffffff');
  setPixel(ctx, cx, oy + 38, '#ffffff');
  setPixel(ctx, cx + 20, oy + 52, hexToRgba('#ffffff', 0.6));
}

export function drawCelestialHQ(ctx: SKRSContext2D, ox: number, oy: number): void {
  const cx = ox + 64;
  const cy = oy + 80;

  // Faint ground glow residue (floating, no base)
  addGlow(ctx, cx, oy + 140, 14, '#5a3ab0', 0.1);

  // Outer aura — very subtle, just a few pixels
  for (let r = 28; r > 20; r -= 2) {
    const alpha = 0.06 + (28 - r) * 0.02;
    for (let a = 0; a < 16; a++) {
      const angle = (a / 16) * Math.PI * 2;
      setPixel(ctx, Math.round(cx + r * Math.cos(angle)), Math.round(cy + r * Math.sin(angle)), hexToRgba('#2a1a5e', alpha));
    }
  }

  // Galaxy orb — pixelated circle with dark-to-purple gradient
  // Outer ring
  for (let dy = -14; dy <= 14; dy++) {
    for (let dx = -14; dx <= 14; dx++) {
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= 14 && dist > 10) {
        setPixel(ctx, cx + dx, cy + dy, '#0a0820');
      } else if (dist <= 10 && dist > 6) {
        setPixel(ctx, cx + dx, cy + dy, '#2a1a5e');
      } else if (dist <= 6) {
        setPixel(ctx, cx + dx, cy + dy, '#5a3ab0');
      }
    }
  }

  // Nebula noise — deterministic pixel dots inside orb
  let seed = 42;
  for (let i = 0; i < 10; i++) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    const angle = (seed / 0x7fffffff) * Math.PI * 2;
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    const dist = (seed / 0x7fffffff) * 12;
    const px = Math.round(cx + dist * Math.cos(angle));
    const py = Math.round(cy + dist * Math.sin(angle));
    setPixel(ctx, px, py, hexToRgba('#ffffff', 0.3 + (i % 3) * 0.15));
  }

  // Core specular
  setPixel(ctx, cx - 2, cy - 3, '#ffffff');
  setPixel(ctx, cx - 1, cy - 2, hexToRgba('#ffffff', 0.6));

  // Orbiting stars — 4-point pixel crosses
  const stars: Array<[number, number, number]> = [
    [cx - 28, cy - 8, 3],
    [cx + 26, cy - 4, 2],
    [cx - 18, cy + 24, 2],
    [cx + 24, cy + 18, 3],
    [cx + 4, cy - 30, 2],
  ];
  for (const [sx, sy, sz] of stars) {
    setPixel(ctx, sx, sy, '#ffffff');
    for (let d = 1; d <= sz; d++) {
      const a = 1 - d / (sz + 1);
      setPixel(ctx, sx + d, sy, hexToRgba('#fde68a', a));
      setPixel(ctx, sx - d, sy, hexToRgba('#fde68a', a));
      setPixel(ctx, sx, sy + d, hexToRgba('#fde68a', a));
      setPixel(ctx, sx, sy - d, hexToRgba('#fde68a', a));
    }
  }
}

export function drawDivineThroneHQ(ctx: SKRSContext2D, ox: number, oy: number): void {
  const cx = ox + 64;
  const baseY = oy + 148;

  drawIsoShadow(ctx, cx, baseY + 4, 32, 12, 0.55);

  // Marble steps — 3-tier iso platform
  drawIsoCube(ctx, cx, baseY - 2, 30, 6, '#f0ece0', '#b8a878', '#e0d8c8');
  drawIsoCube(ctx, cx, baseY - 10, 24, 5, '#e0d8c8', '#b8a878', '#f0ece0');
  drawIsoCube(ctx, cx, baseY - 17, 18, 4, '#f0ece0', '#b8a878', '#e0d8c8');

  // Halo disc behind throne — pixel circle outline
  for (let a = 0; a < 32; a++) {
    const angle = (a / 32) * Math.PI * 2;
    const r = 30;
    setPixel(ctx, Math.round(cx + r * Math.cos(angle)), Math.round(oy + 60 + r * Math.sin(angle)), '#fde68a');
    setPixel(ctx, Math.round(cx + (r - 1) * Math.cos(angle)), Math.round(oy + 60 + (r - 1) * Math.sin(angle)), hexToRgba('#c09028', 0.5));
  }
  // Inner halo glow — very subtle
  addGlow(ctx, cx, oy + 60, 16, '#fde68a', 0.12);

  // Angel wings — pixel feather arcs (behind throne)
  // Left wing
  for (let i = 0; i < 16; i++) {
    const t = i / 16;
    const wingX = cx - 8 - Math.round(20 * Math.sin(t * Math.PI));
    const wingY = oy + 48 + i * 2;
    drawRect(ctx, wingX, wingY, 3, 1, hexToRgba('#ffffff', 0.5 - t * 0.2));
    drawRect(ctx, wingX + 3, wingY, 2, 1, hexToRgba('#f0ece0', 0.4 - t * 0.15));
  }
  // Right wing
  for (let i = 0; i < 16; i++) {
    const t = i / 16;
    const wingX = cx + 6 + Math.round(20 * Math.sin(t * Math.PI));
    const wingY = oy + 48 + i * 2;
    drawRect(ctx, wingX - 2, wingY, 3, 1, hexToRgba('#f0ece0', 0.5 - t * 0.2));
    drawRect(ctx, wingX - 5, wingY, 2, 1, hexToRgba('#ffffff', 0.4 - t * 0.15));
  }

  // Golden throne — iso cube body
  drawIsoCube(ctx, cx, oy + 86, 14, 28, '#fde68a', '#c09028', '#e8c050');

  // Tall backrest
  drawRect(ctx, cx - 8, oy + 62, 16, 24, '#c09028');
  drawRect(ctx, cx - 6, oy + 62, 4, 24, '#fde68a');
  drawRect(ctx, cx + 2, oy + 62, 6, 24, '#e8c050');
  // Backrest top ornament
  drawRect(ctx, cx - 4, oy + 58, 8, 4, '#fde68a');
  setPixel(ctx, cx, oy + 57, '#ffe89a');

  // Armrests — small iso cubes
  drawIsoCube(ctx, cx - 16, oy + 98, 5, 8, '#fde68a', '#c09028', '#e8c050');
  drawIsoCube(ctx, cx + 16, oy + 98, 5, 8, '#e8c050', '#c09028', '#fde68a');
  // Armrest spheres
  fillCircle(ctx, cx - 16, oy + 96, 2, '#fde68a');
  fillCircle(ctx, cx + 16, oy + 96, 2, '#fde68a');

  // Seat cushion
  drawRect(ctx, cx - 10, oy + 100, 20, 3, '#c09028');

  // Gold trim highlights
  setPixel(ctx, cx - 6, oy + 64, '#ffe89a');
  setPixel(ctx, cx + 4, oy + 70, '#ffe89a');
  setPixel(ctx, cx, oy + 60, '#ffffff');
}
