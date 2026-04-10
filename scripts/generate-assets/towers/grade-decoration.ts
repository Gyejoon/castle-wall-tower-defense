import type { SKRSContext2D } from '@napi-rs/canvas';
import {
  PALETTE,
  drawRect,
  setPixel,
  drawLine,
  addGlow,
  fillCircle,
  hexToRgba,
} from '../shared';

export type GradeVariant = 'normal' | 'rare' | 'unique' | 'epic';

export interface GradeContext {
  cx: number;
  topY: number;
  width: number;
  height: number;
  accentColor: string;
}

/**
 * Draw grade-specific decoration overlay on top of a tower sprite.
 * Tower-shape-independent — works for any tower silhouette.
 */
export function drawGradeDecoration(
  ctx: SKRSContext2D,
  grade: GradeVariant,
  g: GradeContext,
): void {
  switch (grade) {
    case 'normal':
      return;
    case 'rare':
      return drawRareBanner(ctx, g);
    case 'unique':
      return drawUniqueCrystal(ctx, g);
    case 'epic':
      return drawEpicAura(ctx, g);
  }
}

/** Rare: teal banner across tower midsection + white trim + V-tail */
function drawRareBanner(ctx: SKRSContext2D, g: GradeContext): void {
  const y = g.topY + Math.round(g.height * 0.55);
  // Banner spans tower width + 6px flare per side, centered on g.cx
  const halfW = Math.round(g.width / 2) + 6;
  drawRect(ctx, g.cx - halfW, y, halfW * 2, 6, '#2dd4bf');
  drawRect(ctx, g.cx - halfW, y + 6, halfW * 2, 1, '#ffffff');
  // V-tail trim
  drawLine(ctx, g.cx - 4, y + 6, g.cx, y + 10, '#2dd4bf');
  drawLine(ctx, g.cx + 4, y + 6, g.cx, y + 10, '#2dd4bf');
}

/** Unique: rare banner + floating purple crystal above + glow */
function drawUniqueCrystal(ctx: SKRSContext2D, g: GradeContext): void {
  const cy = g.topY - 10;
  // Crystal shape (triangle)
  drawLine(ctx, g.cx - 5, cy + 6, g.cx, cy - 8, '#a855f7');
  drawLine(ctx, g.cx + 5, cy + 6, g.cx, cy - 8, '#a855f7');
  drawLine(ctx, g.cx - 5, cy + 6, g.cx + 5, cy + 6, '#a855f7');
  // Inner fill
  setPixel(ctx, g.cx, cy - 4, '#ffffff');
  setPixel(ctx, g.cx - 1, cy - 2, '#f0abfc');
  setPixel(ctx, g.cx + 1, cy, '#d8b4fe');
  setPixel(ctx, g.cx, cy + 2, '#a855f7');
  // Glow
  addGlow(ctx, g.cx, cy, 9, '#a855f7', 0.45);
  // Rare banner below (evolution layering)
  drawRareBanner(ctx, g);
}

/** Epic: unique (crystal + banner) + golden aura + gold trim + floating particles */
function drawEpicAura(ctx: SKRSContext2D, g: GradeContext): void {
  // Crystal + banner from unique
  drawUniqueCrystal(ctx, g);
  // Golden aura around tower body
  const midY = g.topY + Math.round(g.height * 0.5);
  addGlow(ctx, g.cx, midY, Math.round(g.width * 0.9), PALETTE.gold, 0.35);
  addGlow(ctx, g.cx, midY, Math.round(g.width * 0.6), '#fde68a', 0.3);
  // Gold trim at base
  const baseHw = Math.round(g.width * 0.6);
  drawRect(ctx, g.cx - baseHw, g.topY + g.height - 4, baseHw * 2, 2, PALETTE.gold);
  // Floating golden particles (4 around tower)
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 8;
    fillCircle(
      ctx,
      Math.round(g.cx + Math.cos(a) * (g.width * 0.65)),
      Math.round(midY + Math.sin(a) * (g.height * 0.3)),
      2,
      hexToRgba(PALETTE.gold, 0.85),
    );
  }
}
