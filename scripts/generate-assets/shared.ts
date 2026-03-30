import { createCanvas, type Canvas, type SKRSContext2D } from '@napi-rs/canvas';
import { writeFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';

// === Color Palette (strict - only use these) ===
export const PALETTE = {
  dark:       '#1a1a2e',
  darkAlt:    '#16161a',
  gridDark:   '#12121e',
  gridLight:  '#161625',
  gridLine:   '#1e1e30',
  purple:     '#7f5af0',
  green:      '#2cb67d',
  pink:       '#e53170',
  gold:       '#e2b714',
  cyan:       '#00ccff',
  white:      '#fffffe',
  gray:       '#94a1b2',
  // Tower colors
  laser:      '#e2b714',
  plasma:     '#2cb67d',
  emp:        '#7f5af0',
  shield:     '#00ccff',
  stasis:     '#94a1b2',
  // Unit colors
  scoutDrone:    '#72f1b8',
  battleRobot:   '#5b8cff',
  heavyWalker:   '#ff8c42',
  stealthDrone:  '#b388ff',
  titan:         '#ff4757',
  // Utility
  towerBase:  '#0a0a14',
  edgeHighlight: '#252538',
} as const;

export const TILE_SIZE = 32;

// === Utilities ===
export function makeCanvas(w: number, h: number): { canvas: Canvas; ctx: SKRSContext2D } {
  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  return { canvas, ctx };
}

export function saveCanvas(canvas: Canvas, path: string): void {
  mkdirSync(dirname(path), { recursive: true });
  const buf = canvas.toBuffer('image/png');
  writeFileSync(path, buf);
  console.log(`  wrote ${path} (${canvas.width}x${canvas.height})`);
}

export function hexToRgba(hex: string, alpha: number = 1): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// === Pixel Drawing (no anti-aliasing) ===
export function setPixel(ctx: SKRSContext2D, x: number, y: number, color: string): void {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
}

export function drawRect(ctx: SKRSContext2D, x: number, y: number, w: number, h: number, color: string): void {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

export function drawCircle(ctx: SKRSContext2D, cx: number, cy: number, r: number, color: string): void {
  // Bresenham circle
  let x = r;
  let y = 0;
  let d = 1 - r;
  while (x >= y) {
    setPixel(ctx, cx + x, cy + y, color);
    setPixel(ctx, cx - x, cy + y, color);
    setPixel(ctx, cx + x, cy - y, color);
    setPixel(ctx, cx - x, cy - y, color);
    setPixel(ctx, cx + y, cy + x, color);
    setPixel(ctx, cx - y, cy + x, color);
    setPixel(ctx, cx + y, cy - x, color);
    setPixel(ctx, cx - y, cy - x, color);
    y++;
    if (d < 0) {
      d += 2 * y + 1;
    } else {
      x--;
      d += 2 * (y - x) + 1;
    }
  }
}

export function fillCircle(ctx: SKRSContext2D, cx: number, cy: number, r: number, color: string): void {
  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) {
      if (dx * dx + dy * dy <= r * r) {
        setPixel(ctx, cx + dx, cy + dy, color);
      }
    }
  }
}

export function drawLine(ctx: SKRSContext2D, x1: number, y1: number, x2: number, y2: number, color: string): void {
  // Bresenham line
  x1 = Math.round(x1); y1 = Math.round(y1);
  x2 = Math.round(x2); y2 = Math.round(y2);
  const dx = Math.abs(x2 - x1);
  const dy = Math.abs(y2 - y1);
  const sx = x1 < x2 ? 1 : -1;
  const sy = y1 < y2 ? 1 : -1;
  let err = dx - dy;
  while (true) {
    setPixel(ctx, x1, y1, color);
    if (x1 === x2 && y1 === y2) break;
    const e2 = 2 * err;
    if (e2 > -dy) { err -= dy; x1 += sx; }
    if (e2 < dx) { err += dx; y1 += sy; }
  }
}

export function drawPolygon(ctx: SKRSContext2D, cx: number, cy: number, radius: number, sides: number, color: string, rotation: number = 0): void {
  for (let i = 0; i < sides; i++) {
    const a1 = rotation + (2 * Math.PI * i) / sides;
    const a2 = rotation + (2 * Math.PI * ((i + 1) % sides)) / sides;
    const x1 = Math.round(cx + radius * Math.cos(a1));
    const y1 = Math.round(cy + radius * Math.sin(a1));
    const x2 = Math.round(cx + radius * Math.cos(a2));
    const y2 = Math.round(cy + radius * Math.sin(a2));
    drawLine(ctx, x1, y1, x2, y2, color);
  }
}

export function drawStar(ctx: SKRSContext2D, cx: number, cy: number, outerR: number, innerR: number, points: number, color: string): void {
  for (let i = 0; i < points * 2; i++) {
    const r1 = i % 2 === 0 ? outerR : innerR;
    const r2 = (i + 1) % 2 === 0 ? outerR : innerR;
    const a1 = -Math.PI / 2 + (Math.PI * i) / points;
    const a2 = -Math.PI / 2 + (Math.PI * (i + 1)) / points;
    drawLine(ctx,
      Math.round(cx + r1 * Math.cos(a1)),
      Math.round(cy + r1 * Math.sin(a1)),
      Math.round(cx + r2 * Math.cos(a2)),
      Math.round(cy + r2 * Math.sin(a2)),
      color
    );
  }
}

export function addGlow(ctx: SKRSContext2D, cx: number, cy: number, radius: number, color: string, alpha: number): void {
  for (let r = radius; r > 0; r--) {
    const a = alpha * (r / radius) * 0.5;
    fillCircle(ctx, cx, cy, r, hexToRgba(color, a));
  }
}

// === Manifest ===
export interface ManifestEntry {
  key: string;
  type: 'image' | 'spritesheet' | 'tilemapTiledJSON';
  path: string;
  frameWidth?: number;
  frameHeight?: number;
  frameCount?: number;
}
