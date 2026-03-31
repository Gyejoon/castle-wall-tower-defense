import { createCanvas, type Canvas, type SKRSContext2D } from '@napi-rs/canvas';
import { writeFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';

// === Color Palette (medieval nature theme) ===
export const PALETTE = {
  // Grid tiles
  gridDark:      '#5a8a30',  // 어두운 잔디
  gridLight:     '#7ab648',  // 밝은 잔디
  gridLine:      '#4a7a20',  // 잔디 테두리
  edgeHighlight: '#8ec850',  // 잔디 하이라이트
  // Nature
  dirtPath:      '#b8956a',  // 흙길
  dirtDark:      '#8b6a40',  // 어두운 흙
  stone:         '#8c8c8c',  // 돌
  stoneDark:     '#5a5a5a',  // 어두운 돌
  stoneLight:    '#b0b0b0',  // 밝은 돌
  wood:          '#8b5e3c',  // 나무
  woodDark:      '#5a3a1e',  // 어두운 나무
  woodLight:     '#c8905a',  // 밝은 나무
  // Magic/Special
  ice:           '#a8def0',  // 얼음
  iceGlow:       '#5bc8e8',  // 얼음 빛
  magicBlue:     '#4060e0',  // 마법 파란
  magicGold:     '#e0b020',  // 마법 금빛
  fireOrange:    '#e07020',  // 불꽃 오렌지
  fireRed:       '#c03020',  // 불꽃 빨강
  // Tower colors
  laser:         '#c8a04a',  // 궁수 탑 (황금 갈색)
  plasma:        '#8b4513',  // 투석기 (진한 갈색)
  emp:           '#5bc8e8',  // 서리 마탑 (아이스 블루)
  shield:        '#f0e080',  // 성기사 제단 (황금빛)
  stasis:        '#a8def0',  // 빙하 제단 (옅은 파란)
  // Unit colors
  scoutDrone:    '#4a7a2a',  // 고블린 정찰병 (초록 피부)
  battleRobot:   '#7a7a6a',  // 오크 전사 (회색 피부)
  heavyWalker:   '#8c8c7a',  // 돌 트롤 (돌 회색)
  stealthDrone:  '#302040',  // 그림자 암살자 (검보라)
  titan:         '#c04020',  // 고대 드래곤 (불꽃 빨강)
  // UI
  gold:          '#f0d060',  // 황금 장식
  white:         '#fffffe',  // 흰색
  gray:          '#94a1b2',  // 회색
  shadow:        '#2a1f0a',  // 그림자
  // Legacy (일부 스크립트 호환용)
  green:         '#7ab648',
  pink:          '#c03020',
  // Tier colors
  tierCommon:    '#c8a04a',  // T1 Common (기존 색상)
  tierRare:      '#5bc8e8',  // T2 Rare (파란 틴트)
  tierRareDark:  '#3a90b0',  // T2 Rare 어두운
  tierHeroic:    '#c040d0',  // T3 Heroic (보라 틴트)
  tierHeroicDark:'#8020a0',  // T3 Heroic 어두운
  tierLegendary: '#e04040',  // T4 Legendary (빨강/오렌지)
  tierLegendaryDark: '#a02020', // T4 Legendary 어두운
  tierGod:       '#f0d060',  // T5 God (황금)
  tierGodBright: '#ffe89a',  // T5 God 밝은
  tierGodDark:   '#c0a030',  // T5 God 어두운
  // Utility
  towerBase:     '#2a1f0a',  // 타워 기단 (어두운 갈색)
} as const;

export const TILE_SIZE = 32;
export const ISO_TILE_W = 64;
export const ISO_TILE_H = 32;
export const ISO_TILE_DEPTH = 8;

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

export function drawIsoDiamondTile(
  ctx: SKRSContext2D,
  ox: number, oy: number,
  topColor: string, leftColor: string, rightColor: string,
  depth: number,
): void {
  const cx = ox + ISO_TILE_W / 2;
  const cy = oy + ISO_TILE_H / 2;
  const hw = ISO_TILE_W / 2;
  const hh = ISO_TILE_H / 2;

  // Top face (diamond shape)
  for (let dy = -hh; dy <= hh; dy++) {
    const ratio = 1 - Math.abs(dy) / hh;
    const halfW = Math.round(hw * ratio);
    for (let dx = -halfW; dx <= halfW; dx++) {
      setPixel(ctx, cx + dx, cy + dy, topColor);
    }
  }

  // Left face (depth below left half)
  for (let d = 1; d <= depth; d++) {
    for (let row = 0; row <= hh; row++) {
      const ratio = 1 - row / hh;
      const halfW = Math.round(hw * ratio);
      for (let dx = -halfW; dx < 0; dx++) {
        setPixel(ctx, cx + dx, cy + row + d, leftColor);
      }
    }
  }

  // Right face (depth below right half)
  for (let d = 1; d <= depth; d++) {
    for (let row = 0; row <= hh; row++) {
      const ratio = 1 - row / hh;
      const halfW = Math.round(hw * ratio);
      for (let dx = 0; dx <= halfW; dx++) {
        setPixel(ctx, cx + dx, cy + row + d, rightColor);
      }
    }
  }
}

export function drawIsoShadow(ctx: SKRSContext2D, cx: number, cy: number, rx: number, ry: number, alpha: number = 0.3): void {
  for (let dy = -ry; dy <= ry; dy++) {
    for (let dx = -rx; dx <= rx; dx++) {
      if ((dx * dx) / (rx * rx) + (dy * dy) / (ry * ry) <= 1) {
        setPixel(ctx, cx + dx, cy + dy, hexToRgba('#000000', alpha));
      }
    }
  }
}

// === Manifest ===
export interface ManifestEntry {
  key: string;
  type: 'image' | 'spritesheet';
  path: string;
  frameWidth?: number;
  frameHeight?: number;
  frameCount?: number;
}
