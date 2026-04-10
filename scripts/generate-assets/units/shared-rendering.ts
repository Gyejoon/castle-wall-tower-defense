import type { SKRSContext2D } from '@napi-rs/canvas';
import { setPixel, drawRect, PALETTE } from '../shared';

export const IDLE_FRAMES = 6;
export const DEATH_FRAMES = 6;
export const FRAME_W = 40;
export const FRAME_H = 48;
export const OUTLINE_COLOR = PALETTE.outline; // '#1a0e14'

/** 3-tone shading: base + shadow(-25%) + highlight(+20%) */
export function shade3(baseHex: string): { base: string; shadow: string; highlight: string } {
  const r = parseInt(baseHex.slice(1, 3), 16);
  const g = parseInt(baseHex.slice(3, 5), 16);
  const b = parseInt(baseHex.slice(5, 7), 16);

  const toHex = (v: number) =>
    Math.min(255, Math.max(0, Math.round(v)))
      .toString(16)
      .padStart(2, '0');

  return {
    base: baseHex,
    shadow: `#${toHex(r * 0.75)}${toHex(g * 0.75)}${toHex(b * 0.75)}`,
    highlight: `#${toHex(r * 1.2)}${toHex(g * 1.2)}${toHex(b * 1.2)}`,
  };
}

/**
 * Apply 1px dark outline around all opaque pixels in a rectangular region.
 * Uses 4-connected neighbors (up/down/left/right).
 */
export function applyOutline(
  ctx: SKRSContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string = OUTLINE_COLOR,
): void {
  const imageData = ctx.getImageData(x, y, w, h);
  const { data, width, height } = imageData;

  const cr = parseInt(color.slice(1, 3), 16);
  const cg = parseInt(color.slice(3, 5), 16);
  const cb = parseInt(color.slice(5, 7), 16);

  // Collect outline positions first to avoid mutating while scanning
  const outlinePixels: number[] = [];

  for (let py = 0; py < height; py++) {
    for (let px = 0; px < width; px++) {
      const idx = (py * width + px) * 4;
      if (data[idx + 3] > 0) continue; // skip opaque pixels

      // Check 4-connected neighbors
      const neighbors: [number, number][] = [
        [px - 1, py],
        [px + 1, py],
        [px, py - 1],
        [px, py + 1],
      ];

      for (const [nx, ny] of neighbors) {
        if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
        const nIdx = (ny * width + nx) * 4;
        if (data[nIdx + 3] > 0) {
          outlinePixels.push(idx);
          break;
        }
      }
    }
  }

  for (const idx of outlinePixels) {
    data[idx] = cr;
    data[idx + 1] = cg;
    data[idx + 2] = cb;
    data[idx + 3] = 255;
  }

  ctx.putImageData(imageData, x, y);
}

/** Apply outline to every frame in a horizontal spritesheet */
export function applyOutlineToSheet(
  ctx: SKRSContext2D,
  frameCount: number,
  frameW: number = FRAME_W,
  frameH: number = FRAME_H,
): void {
  for (let f = 0; f < frameCount; f++) {
    applyOutline(ctx, f * frameW, 0, frameW, frameH);
  }
}

/**
 * Draw a shaded rectangle with 3-tone: base fill, shadow on bottom edge, highlight on top edge.
 */
export function drawShadedRect(
  ctx: SKRSContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  baseColor: string,
): void {
  const { base, shadow, highlight } = shade3(baseColor);
  drawRect(ctx, x, y, w, h, base);
  // Top highlight (1px)
  drawRect(ctx, x, y, w, 1, highlight);
  // Bottom shadow (1px)
  if (h > 2) drawRect(ctx, x, y + h - 1, w, 1, shadow);
}

/** Death keyframe progress: 1-2f hit reaction, 3-4f fall, 5-6f settle */
export function deathPhase(frame: number): 'hit' | 'fall' | 'settle' {
  if (frame <= 1) return 'hit';
  if (frame <= 3) return 'fall';
  return 'settle';
}

/** Normalized time within 6 death frames (0..1) */
export function deathT(frame: number): number {
  return frame / (DEATH_FRAMES - 1);
}

/** Idle phase for 6-frame animation (0..2PI) */
export function idlePhase(frame: number): number {
  return (frame / IDLE_FRAMES) * Math.PI * 2;
}

/** Standard draw function type */
export type DrawFn = (ctx: SKRSContext2D, ox: number, frame: number) => void;

/** Unit module interface — each unit exports this */
export interface UnitDrawModule {
  drawWalk: DrawFn;
  drawWalkFallback: DrawFn;
  drawIdle: DrawFn;
  drawDeath: DrawFn;
}
