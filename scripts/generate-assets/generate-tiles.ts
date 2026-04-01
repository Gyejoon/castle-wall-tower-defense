/**
 * Deprecated: field background main path is now the vendored Tiny Swords terrain set.
 * Keep this generator only as a historical fallback while the rest of the asset pipeline
 * still relies on generated tower/unit/ui assets.
 */
import {
  makeCanvas, saveCanvas, PALETTE, ISO_TILE_W, ISO_TILE_H, ISO_TILE_DEPTH,
  hexToRgba, setPixel, drawRect, fillCircle, drawLine, addGlow,
  drawIsoDiamondTile, type ManifestEntry,
} from './shared';
import { mkdirSync, existsSync } from 'fs';

const OUTPUT_DIR = 'packages/web-shell/public/assets/tiles';
const TILE_CANVAS_H = ISO_TILE_H + ISO_TILE_DEPTH; // 40
const TILE_LOOK = {
  grassLightTop: '#95d067',
  grassLightLeft: '#6ea53c',
  grassLightRight: '#5a8f31',
  grassDarkTop: '#6aa13c',
  grassDarkLeft: '#4f7f2a',
  grassDarkRight: '#406821',
  pathTop: '#c98544',
  pathLeft: '#9c6431',
  pathRight: '#86532a',
  pathPebble: '#6a6a58',
  pathBand: '#e6c68d',
  spawnTop: '#2a1b0d',
  spawnLeft: '#1c1309',
  spawnRight: '#2b1a0d',
  exitTop: '#66725f',
  exitLeft: '#4d5648',
  exitRight: '#596352',
  exitStoneAccent: '#c6ccb4',
} as const;
const REQUIRED_FILES = [
  'grid-floor.png',
  'path-tile.png',
  'spawn-tile.png',
  'exit-tile.png',
  'grid-floor-dark.png',
  'path-tile-dark.png',
  'spawn-tile-dark.png',
  'exit-tile-dark.png',
];

function addGrassTufts(ctx: Parameters<typeof setPixel>[0], ox: number, oy: number, color: string) {
  const cx = ox + ISO_TILE_W / 2;
  const cy = oy + ISO_TILE_H / 2;
  const hw = ISO_TILE_W / 2;
  const hh = ISO_TILE_H / 2;
  const tufts = [
    [-8, -4], [10, -2], [-12, 2], [6, 6], [14, 0], [-3, -8], [8, -6], [-10, 1],
  ];
  for (const [dx, dy] of tufts) {
    if (Math.abs(dx) / hw + Math.abs(dy) / hh <= 1) {
      setPixel(ctx, cx + dx, cy + dy, color);
      setPixel(ctx, cx + dx, cy + dy - 1, color);
    }
  }
}

function assertRequiredOutputs(): void {
  const missing = REQUIRED_FILES.filter((file) => !existsSync(`${OUTPUT_DIR}/${file}`));
  if (missing.length > 0) {
    throw new Error(`[tiles] missing required outputs: ${missing.join(', ')}`);
  }
}

function relativeLuminance(hex: string): number {
  const toLinear = (channel: number) => {
    const srgb = channel / 255;
    return srgb <= 0.03928 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
  };

  const r = toLinear(parseInt(hex.slice(1, 3), 16));
  const g = toLinear(parseInt(hex.slice(3, 5), 16));
  const b = toLinear(parseInt(hex.slice(5, 7), 16));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function luminanceDelta(a: string, b: string): number {
  return Math.abs(relativeLuminance(a) - relativeLuminance(b));
}

function assertTileReadabilityGate(): void {
  if (luminanceDelta(TILE_LOOK.grassLightTop, TILE_LOOK.pathTop) < 0.18) {
    throw new Error('[tiles] readability gate failed: grass/path contrast is too weak');
  }

  if (luminanceDelta(TILE_LOOK.grassDarkTop, '#7a6040') < 0.1) {
    throw new Error('[tiles] readability gate failed: dark field silhouette diverged');
  }

  if (luminanceDelta(TILE_LOOK.pathTop, TILE_LOOK.spawnTop) < 0.2) {
    throw new Error('[tiles] readability gate failed: spawn landmark is not distinct enough');
  }

  if (luminanceDelta(TILE_LOOK.pathTop, TILE_LOOK.exitTop) < 0.12) {
    throw new Error('[tiles] readability gate failed: exit landmark is not distinct enough');
  }
}

function drawReadablePathTile(
  ctx: Parameters<typeof setPixel>[0],
  ox: number,
  oy: number,
  top: string,
  left: string,
  right: string,
  pebble: string,
) {
  drawIsoDiamondTile(ctx, ox, oy, top, left, right, ISO_TILE_DEPTH);
  const cx = ox + ISO_TILE_W / 2;
  const cy = oy + ISO_TILE_H / 2;

  // Clear center lane for stronger path readability.
  drawRect(ctx, cx - 18, cy - 4, 36, 9, hexToRgba(top, 0.96));
  drawRect(ctx, cx - 14, cy - 2, 28, 5, hexToRgba(TILE_LOOK.pathBand, 0.28));

  // Small border stones keep the lane legible without adding noise.
  const stones = [[-20, -4], [18, -4], [-16, 4], [12, 5], [0, -6], [0, 6]];
  for (const [dx, dy] of stones) {
    if (Math.abs(dx) / (ISO_TILE_W / 2) + Math.abs(dy) / (ISO_TILE_H / 2) <= 1) {
      setPixel(ctx, cx + dx, cy + dy, pebble);
      setPixel(ctx, cx + dx + 1, cy + dy, hexToRgba(PALETTE.stoneLight, 0.35));
    }
  }

  drawLine(ctx, cx - 16, cy + 2, cx - 4, cy - 2, hexToRgba(left, 0.6));
  drawLine(ctx, cx + 4, cy + 2, cx + 16, cy - 2, hexToRgba(right, 0.6));
  drawLine(ctx, cx - 17, cy - 5, cx + 17, cy - 5, hexToRgba(TILE_LOOK.pathBand, 0.2));
}

export async function generate(): Promise<ManifestEntry[]> {
  mkdirSync(OUTPUT_DIR, { recursive: true });
  const entries: ManifestEntry[] = [];
  assertTileReadabilityGate();

  // grid-floor.png (128×40, 2 isometric variants side by side)
  {
    const { canvas, ctx } = makeCanvas(ISO_TILE_W * 2, TILE_CANVAS_H);
    drawIsoDiamondTile(
      ctx,
      0,
      0,
      TILE_LOOK.grassDarkTop,
      TILE_LOOK.grassDarkLeft,
      TILE_LOOK.grassDarkRight,
      ISO_TILE_DEPTH,
    );
    drawRect(ctx, 8, 12, 18, 5, hexToRgba(PALETTE.gridLine, 0.35));
    addGrassTufts(ctx, 0, 0, hexToRgba(PALETTE.edgeHighlight, 0.38));
    drawIsoDiamondTile(
      ctx,
      ISO_TILE_W,
      0,
      TILE_LOOK.grassLightTop,
      TILE_LOOK.grassLightLeft,
      TILE_LOOK.grassLightRight,
      ISO_TILE_DEPTH,
    );
    drawRect(ctx, ISO_TILE_W + 10, 11, 16, 5, hexToRgba(PALETTE.gridLine, 0.28));
    addGrassTufts(ctx, ISO_TILE_W, 0, hexToRgba(PALETTE.gridLine, 0.35));
    saveCanvas(canvas, `${OUTPUT_DIR}/grid-floor.png`);
    entries.push({ key: 'grid-floor', type: 'image', path: 'assets/tiles/grid-floor.png' });
  }

  // path-tile.png (64×40)
  {
    const { canvas, ctx } = makeCanvas(ISO_TILE_W, TILE_CANVAS_H);
    drawReadablePathTile(
      ctx,
      0,
      0,
      TILE_LOOK.pathTop,
      TILE_LOOK.pathLeft,
      TILE_LOOK.pathRight,
      TILE_LOOK.pathPebble,
    );
    const cx = ISO_TILE_W / 2;
    const cy = ISO_TILE_H / 2;
    drawRect(ctx, cx - 8, cy - 6, 16, 2, hexToRgba(PALETTE.gold, 0.18));
    saveCanvas(canvas, `${OUTPUT_DIR}/path-tile.png`);
    entries.push({ key: 'path-tile', type: 'image', path: 'assets/tiles/path-tile.png' });
  }

  // spawn-tile.png (64×40)
  {
    const { canvas, ctx } = makeCanvas(ISO_TILE_W, TILE_CANVAS_H);
    drawIsoDiamondTile(
      ctx,
      0,
      0,
      TILE_LOOK.spawnTop,
      TILE_LOOK.spawnLeft,
      TILE_LOOK.spawnRight,
      ISO_TILE_DEPTH,
    );
    const cx = ISO_TILE_W / 2;
    const cy = ISO_TILE_H / 2;
    for (let offset = -20; offset <= 20; offset += 8) {
      drawLine(ctx, cx + offset, cy - 8, cx + offset + (offset < 0 ? -2 : 2), cy + 8, PALETTE.woodDark);
      drawLine(ctx, cx + offset + 1, cy - 7, cx + offset + (offset < 0 ? -1 : 3), cy + 7, PALETTE.wood);
    }
    drawRect(ctx, cx - 18, cy - 7, 36, 3, PALETTE.woodLight);
    drawRect(ctx, cx - 10, cy - 12, 20, 6, PALETTE.stoneDark);
    drawRect(ctx, cx - 8, cy - 10, 16, 4, PALETTE.stoneLight);
    fillCircle(ctx, cx - 18, cy - 2, 2, PALETTE.fireOrange);
    fillCircle(ctx, cx + 18, cy - 2, 2, PALETTE.fireOrange);
    addGlow(ctx, cx - 18, cy - 1, 6, PALETTE.fireOrange, 0.18);
    addGlow(ctx, cx + 18, cy - 1, 6, PALETTE.fireOrange, 0.18);
    saveCanvas(canvas, `${OUTPUT_DIR}/spawn-tile.png`);
    entries.push({ key: 'spawn-tile', type: 'image', path: 'assets/tiles/spawn-tile.png' });
  }

  // exit-tile.png (64×40)
  {
    const { canvas, ctx } = makeCanvas(ISO_TILE_W, TILE_CANVAS_H);
    drawIsoDiamondTile(
      ctx,
      0,
      0,
      TILE_LOOK.exitTop,
      TILE_LOOK.exitLeft,
      TILE_LOOK.exitRight,
      ISO_TILE_DEPTH,
    );
    const cx = ISO_TILE_W / 2;
    const cy = ISO_TILE_H / 2;
    drawRect(ctx, cx - 18, cy - 9, 36, 4, hexToRgba(TILE_LOOK.exitStoneAccent, 0.45));
    drawRect(ctx, cx - 20, cy - 12, 5, 11, PALETTE.stoneDark);
    drawRect(ctx, cx + 15, cy - 12, 5, 11, PALETTE.stoneDark);
    drawRect(ctx, cx - 18, cy - 14, 3, 3, PALETTE.stoneLight);
    drawRect(ctx, cx + 15, cy - 14, 3, 3, PALETTE.stoneLight);
    for (let dy = -5; dy <= 5; dy++) {
      const halfW = Math.round(7 * (1 - Math.abs(dy) / 5));
      for (let dx = -halfW; dx <= halfW; dx++) {
        setPixel(ctx, cx + dx, cy + dy, '#1a1208');
      }
    }
    drawLine(ctx, cx, cy - 17, cx, cy - 8, PALETTE.wood);
    drawLine(ctx, cx - 7, cy - 13, cx + 7, cy - 13, PALETTE.stoneLight);
    drawLine(ctx, cx - 2, cy - 15, cx + 4, cy - 15, '#c03020');
    setPixel(ctx, cx + 3, cy - 16, '#c03020');
    setPixel(ctx, cx + 4, cy - 15, '#c03020');
    addGlow(ctx, cx, cy, 9, PALETTE.gold, 0.18);
    saveCanvas(canvas, `${OUTPUT_DIR}/exit-tile.png`);
    entries.push({ key: 'exit-tile', type: 'image', path: 'assets/tiles/exit-tile.png' });
  }

  // === Dark variants for AI field ===

  // grid-floor-dark.png (128×40, 2 isometric variants side by side)
  {
    const { canvas, ctx } = makeCanvas(ISO_TILE_W * 2, TILE_CANVAS_H);
    drawIsoDiamondTile(ctx, 0, 0, '#456c24', '#305018', '#223814', ISO_TILE_DEPTH);
    addGrassTufts(ctx, 0, 0, hexToRgba('#5a7a38', 0.3));
    drawIsoDiamondTile(ctx, ISO_TILE_W, 0, '#537c2f', '#34591d', '#264119', ISO_TILE_DEPTH);
    addGrassTufts(ctx, ISO_TILE_W, 0, hexToRgba('#4a6a28', 0.3));
    saveCanvas(canvas, `${OUTPUT_DIR}/grid-floor-dark.png`);
    entries.push({ key: 'grid-floor-dark', type: 'image', path: 'assets/tiles/grid-floor-dark.png' });
  }

  // path-tile-dark.png (64×40)
  {
    const { canvas, ctx } = makeCanvas(ISO_TILE_W, TILE_CANVAS_H);
    drawReadablePathTile(ctx, 0, 0, '#856742', '#5f452a', '#4c3620', '#44443a');
    const cx = ISO_TILE_W / 2;
    const cy = ISO_TILE_H / 2;
    drawRect(ctx, cx - 8, cy - 6, 16, 2, hexToRgba(TILE_LOOK.pathBand, 0.12));
    saveCanvas(canvas, `${OUTPUT_DIR}/path-tile-dark.png`);
    entries.push({ key: 'path-tile-dark', type: 'image', path: 'assets/tiles/path-tile-dark.png' });
  }

  // spawn-tile-dark.png (64×40)
  {
    const { canvas, ctx } = makeCanvas(ISO_TILE_W, TILE_CANVAS_H);
    drawIsoDiamondTile(ctx, 0, 0, '#140d08', '#0d0705', '#150d08', ISO_TILE_DEPTH);
    const cx = ISO_TILE_W / 2;
    const cy = ISO_TILE_H / 2;
    for (let offset = -20; offset <= 20; offset += 8) {
      drawLine(ctx, cx + offset, cy - 8, cx + offset + (offset < 0 ? -2 : 2), cy + 8, '#3a2a16');
      drawLine(ctx, cx + offset + 1, cy - 7, cx + offset + (offset < 0 ? -1 : 3), cy + 7, '#6a4a28');
    }
    drawRect(ctx, cx - 18, cy - 7, 36, 3, '#7a5a30');
    drawRect(ctx, cx - 10, cy - 12, 20, 6, '#4d4d46');
    drawRect(ctx, cx - 8, cy - 10, 16, 4, '#88887a');
    fillCircle(ctx, cx - 18, cy - 2, 2, '#a04010');
    fillCircle(ctx, cx + 18, cy - 2, 2, '#a04010');
    addGlow(ctx, cx - 18, cy - 1, 5, '#a04010', 0.09);
    addGlow(ctx, cx + 18, cy - 1, 5, '#a04010', 0.09);
    saveCanvas(canvas, `${OUTPUT_DIR}/spawn-tile-dark.png`);
    entries.push({ key: 'spawn-tile-dark', type: 'image', path: 'assets/tiles/spawn-tile-dark.png' });
  }

  // exit-tile-dark.png (64×40)
  {
    const { canvas, ctx } = makeCanvas(ISO_TILE_W, TILE_CANVAS_H);
    drawIsoDiamondTile(ctx, 0, 0, '#66725f', '#495244', '#57604f', ISO_TILE_DEPTH);
    const cx = ISO_TILE_W / 2;
    const cy = ISO_TILE_H / 2;
    drawRect(ctx, cx - 18, cy - 9, 36, 4, hexToRgba('#c0c7b0', 0.28));
    drawRect(ctx, cx - 20, cy - 12, 5, 11, '#3a3a3a');
    drawRect(ctx, cx + 15, cy - 12, 5, 11, '#3a3a3a');
    drawRect(ctx, cx - 18, cy - 14, 3, 3, '#909088');
    drawRect(ctx, cx + 15, cy - 14, 3, 3, '#909088');
    for (let dy = -5; dy <= 5; dy++) {
      const halfW = Math.round(7 * (1 - Math.abs(dy) / 5));
      for (let dx = -halfW; dx <= halfW; dx++) {
        setPixel(ctx, cx + dx, cy + dy, '#100808');
      }
    }
    drawLine(ctx, cx, cy - 17, cx, cy - 8, '#5a3a20');
    drawLine(ctx, cx - 7, cy - 13, cx + 7, cy - 13, '#9a9a90');
    drawLine(ctx, cx - 2, cy - 15, cx + 4, cy - 15, '#801810');
    setPixel(ctx, cx + 3, cy - 16, '#801810');
    setPixel(ctx, cx + 4, cy - 15, '#801810');
    addGlow(ctx, cx, cy, 8, '#c0a030', 0.12);
    saveCanvas(canvas, `${OUTPUT_DIR}/exit-tile-dark.png`);
    entries.push({ key: 'exit-tile-dark', type: 'image', path: 'assets/tiles/exit-tile-dark.png' });
  }

  assertRequiredOutputs();

  return entries;
}

if (import.meta.main) {
  generate().then(e => console.log(JSON.stringify(e, null, 2)));
}
