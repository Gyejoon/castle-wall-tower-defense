import type { SKRSContext2D } from '@napi-rs/canvas';
import { addGlow, drawLine, drawRect, setPixel } from '../shared';

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
 *
 * Design philosophy:
 * - Shape-independent — works for any tower silhouette
 * - Minimal, chunky pixel art that stays readable at 64×80 game scale
 * - Escalating visual weight: rare (subtle) → unique (magical) → epic (divine)
 * - Corner gems anchor every decorated grade so promotions feel cumulative
 * - Glows stay tiny (radius ≤ 6) because addGlow's overlapping disk alpha
 *   accumulation fully saturates the center at larger radii
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
      return drawRareDecoration(ctx, g);
    case 'unique':
      return drawUniqueDecoration(ctx, g);
    case 'epic':
      return drawEpicDecoration(ctx, g);
  }
}

/** Small 3×3 diamond gem with a 1px highlight pixel. */
function drawGem(
  ctx: SKRSContext2D,
  x: number,
  y: number,
  color: string,
  highlight: string,
): void {
  drawRect(ctx, x - 1, y - 1, 3, 3, color);
  setPixel(ctx, x - 1, y - 1, highlight);
}

/** Four corner gems wrapping the tower body, anchored to g.width/g.height. */
function drawCornerGems(
  ctx: SKRSContext2D,
  g: GradeContext,
  color: string,
  highlight: string,
): void {
  const leftX = g.cx - Math.round(g.width / 2) - 4;
  const rightX = g.cx + Math.round(g.width / 2) + 4;
  const topInset = 10;
  const bottomInset = 10;
  drawGem(ctx, leftX, g.topY + topInset, color, highlight);
  drawGem(ctx, rightX, g.topY + topInset, color, highlight);
  drawGem(ctx, leftX, g.topY + g.height - bottomInset, color, highlight);
  drawGem(ctx, rightX, g.topY + g.height - bottomInset, color, highlight);
  // Subtle glow on each gem (small radius so it doesn't overwhelm the tower)
  addGlow(ctx, leftX, g.topY + topInset, 4, color, 0.4);
  addGlow(ctx, rightX, g.topY + topInset, 4, color, 0.4);
  addGlow(ctx, leftX, g.topY + g.height - bottomInset, 4, color, 0.4);
  addGlow(ctx, rightX, g.topY + g.height - bottomInset, 4, color, 0.4);
}

/**
 * Rare: four teal corner gems with tiny gem-halos.
 * Reads as "this tower has been blessed" without touching the silhouette.
 */
function drawRareDecoration(ctx: SKRSContext2D, g: GradeContext): void {
  drawCornerGems(ctx, g, '#2dd4bf', '#67e8d9');
}

/**
 * Unique: purple corner gems + floating arcane crystal above the tower head.
 */
function drawUniqueDecoration(ctx: SKRSContext2D, g: GradeContext): void {
  drawCornerGems(ctx, g, '#a855f7', '#d8b4fe');

  // Floating arcane crystal above tower head (7 wide × 10 tall diamond)
  const cy = g.topY - 10;
  // Outline
  drawLine(ctx, g.cx - 4, cy + 4, g.cx, cy - 6, '#a855f7');
  drawLine(ctx, g.cx + 4, cy + 4, g.cx, cy - 6, '#a855f7');
  drawLine(ctx, g.cx - 4, cy + 4, g.cx + 4, cy + 4, '#a855f7');
  // Inner gradient fill
  setPixel(ctx, g.cx, cy - 4, '#ffffff');
  setPixel(ctx, g.cx - 1, cy - 2, '#f0abfc');
  setPixel(ctx, g.cx + 1, cy - 1, '#d8b4fe');
  setPixel(ctx, g.cx, cy + 1, '#a855f7');
  // Tight crystal glow
  addGlow(ctx, g.cx, cy, 6, '#a855f7', 0.4);
}

/**
 * Epic: gold corner gems + floating halo ring above the tower head + six
 * ambient sparkles around the body.
 */
function drawEpicDecoration(ctx: SKRSContext2D, g: GradeContext): void {
  drawCornerGems(ctx, g, '#f0d060', '#fef3c7');

  // Golden halo ring above tower head (ellipse outline drawn as 2 horizontal
  // lines + 2 side pixels + top highlight pair)
  const haloCy = g.topY - 6;
  drawLine(ctx, g.cx - 5, haloCy - 1, g.cx + 5, haloCy - 1, '#f0d060');
  drawLine(ctx, g.cx - 5, haloCy + 1, g.cx + 5, haloCy + 1, '#f0d060');
  setPixel(ctx, g.cx - 7, haloCy, '#f0d060');
  setPixel(ctx, g.cx + 7, haloCy, '#f0d060');
  // White top highlight — divine shine
  setPixel(ctx, g.cx - 2, haloCy - 1, '#ffffff');
  setPixel(ctx, g.cx + 2, haloCy - 1, '#ffffff');
  // Tight halo ambient glow
  addGlow(ctx, g.cx, haloCy, 6, '#f0d060', 0.4);

  // Ambient sparkles at fixed asymmetric positions around the tower body
  const sparkles: Array<[number, number]> = [
    [g.cx - 18, g.topY + 24],
    [g.cx + 20, g.topY + 36],
    [g.cx - 22, g.topY + 60],
    [g.cx + 18, g.topY + 74],
    [g.cx - 14, g.topY + g.height - 18],
    [g.cx + 16, g.topY + g.height - 26],
  ];
  for (const [sx, sy] of sparkles) {
    setPixel(ctx, sx, sy, '#ffffff');
    setPixel(ctx, sx + 1, sy, '#f0d060');
  }
}
