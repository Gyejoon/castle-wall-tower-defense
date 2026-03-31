import {
  makeCanvas, saveCanvas, PALETTE, ISO_TILE_W, ISO_TILE_H, ISO_TILE_DEPTH,
  hexToRgba, setPixel, drawRect, fillCircle, drawLine, addGlow,
  drawIsoDiamondTile, type ManifestEntry,
} from './shared';
import { mkdirSync } from 'fs';

const OUTPUT_DIR = 'packages/web-shell/public/assets/tiles';
const TILE_CANVAS_H = ISO_TILE_H + ISO_TILE_DEPTH; // 40

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

export async function generate(): Promise<ManifestEntry[]> {
  mkdirSync(OUTPUT_DIR, { recursive: true });
  const entries: ManifestEntry[] = [];

  // grid-floor.png (128×40, 2 isometric variants side by side)
  {
    const { canvas, ctx } = makeCanvas(ISO_TILE_W * 2, TILE_CANVAS_H);
    drawIsoDiamondTile(ctx, 0, 0, PALETTE.gridDark, '#4a7a28', '#3a6a18', ISO_TILE_DEPTH);
    addGrassTufts(ctx, 0, 0, hexToRgba(PALETTE.edgeHighlight, 0.5));
    drawIsoDiamondTile(ctx, ISO_TILE_W, 0, PALETTE.gridLight, '#5a8a30', '#4a7a28', ISO_TILE_DEPTH);
    addGrassTufts(ctx, ISO_TILE_W, 0, hexToRgba(PALETTE.gridLine, 0.5));
    saveCanvas(canvas, `${OUTPUT_DIR}/grid-floor.png`);
    entries.push({ key: 'grid-floor', type: 'image', path: 'assets/tiles/grid-floor.png' });
  }

  // path-tile.png (64×40)
  {
    const { canvas, ctx } = makeCanvas(ISO_TILE_W, TILE_CANVAS_H);
    drawIsoDiamondTile(ctx, 0, 0, PALETTE.dirtPath, PALETTE.dirtDark, '#7a5a30', ISO_TILE_DEPTH);
    const cx = ISO_TILE_W / 2;
    const cy = ISO_TILE_H / 2;
    const pebbles = [[-8, -3], [6, -4], [10, 2], [-6, 4], [0, -2]];
    for (const [dx, dy] of pebbles) {
      if (Math.abs(dx) / (ISO_TILE_W / 2) + Math.abs(dy) / (ISO_TILE_H / 2) <= 1) {
        setPixel(ctx, cx + dx, cy + dy, PALETTE.stoneDark);
        setPixel(ctx, cx + dx + 1, cy + dy, hexToRgba(PALETTE.stoneLight, 0.5));
      }
    }
    drawLine(ctx, cx - 6, cy - 3, cx - 2, cy + 1, hexToRgba(PALETTE.stoneDark, 0.6));
    drawLine(ctx, cx + 4, cy + 1, cx + 8, cy + 4, hexToRgba(PALETTE.stoneDark, 0.6));
    saveCanvas(canvas, `${OUTPUT_DIR}/path-tile.png`);
    entries.push({ key: 'path-tile', type: 'image', path: 'assets/tiles/path-tile.png' });
  }

  // spawn-tile.png (64×40)
  {
    const { canvas, ctx } = makeCanvas(ISO_TILE_W, TILE_CANVAS_H);
    drawIsoDiamondTile(ctx, 0, 0, '#1a1208', '#100a04', '#1a1208', ISO_TILE_DEPTH);
    const cx = ISO_TILE_W / 2;
    const cy = ISO_TILE_H / 2;
    drawRect(ctx, cx - 20, cy - 6, 4, 12, PALETTE.stoneDark);
    drawRect(ctx, cx - 20, cy - 6, 4, 2, PALETTE.stoneLight);
    drawRect(ctx, cx + 16, cy - 6, 4, 12, PALETTE.stoneDark);
    drawRect(ctx, cx + 16, cy - 6, 4, 2, PALETTE.stoneLight);
    setPixel(ctx, cx - 18, cy, PALETTE.fireOrange);
    setPixel(ctx, cx - 18, cy - 1, PALETTE.gold);
    setPixel(ctx, cx + 18, cy, PALETTE.fireOrange);
    setPixel(ctx, cx + 18, cy - 1, PALETTE.gold);
    addGlow(ctx, cx, cy + 2, 10, '#ff6000', 0.12);
    saveCanvas(canvas, `${OUTPUT_DIR}/spawn-tile.png`);
    entries.push({ key: 'spawn-tile', type: 'image', path: 'assets/tiles/spawn-tile.png' });
  }

  // exit-tile.png (64×40)
  {
    const { canvas, ctx } = makeCanvas(ISO_TILE_W, TILE_CANVAS_H);
    drawIsoDiamondTile(ctx, 0, 0, PALETTE.stone, PALETTE.stoneDark, '#7a7a7a', ISO_TILE_DEPTH);
    const cx = ISO_TILE_W / 2;
    const cy = ISO_TILE_H / 2;
    for (let dy = -4; dy <= 4; dy++) {
      const halfW = Math.round(6 * (1 - Math.abs(dy) / 4));
      for (let dx = -halfW; dx <= halfW; dx++) {
        setPixel(ctx, cx + dx, cy + dy, '#1a1208');
      }
    }
    drawLine(ctx, cx, cy - 14, cx, cy - 8, PALETTE.wood);
    setPixel(ctx, cx + 1, cy - 14, '#c03020');
    setPixel(ctx, cx + 2, cy - 13, '#c03020');
    setPixel(ctx, cx + 1, cy - 12, '#c03020');
    addGlow(ctx, cx, cy, 8, PALETTE.gold, 0.15);
    saveCanvas(canvas, `${OUTPUT_DIR}/exit-tile.png`);
    entries.push({ key: 'exit-tile', type: 'image', path: 'assets/tiles/exit-tile.png' });
  }

  // === Dark variants for AI field ===

  // grid-floor-dark.png (128×40, 2 isometric variants side by side)
  {
    const { canvas, ctx } = makeCanvas(ISO_TILE_W * 2, TILE_CANVAS_H);
    drawIsoDiamondTile(ctx, 0, 0, '#3a5a1a', '#2a4a10', '#1e3a0a', ISO_TILE_DEPTH);
    addGrassTufts(ctx, 0, 0, hexToRgba('#5a7a38', 0.5));
    drawIsoDiamondTile(ctx, ISO_TILE_W, 0, '#3e6020', '#2e5018', '#1e3a0a', ISO_TILE_DEPTH);
    addGrassTufts(ctx, ISO_TILE_W, 0, hexToRgba('#4a6a28', 0.5));
    saveCanvas(canvas, `${OUTPUT_DIR}/grid-floor-dark.png`);
    entries.push({ key: 'grid-floor-dark', type: 'image', path: 'assets/tiles/grid-floor-dark.png' });
  }

  // path-tile-dark.png (64×40)
  {
    const { canvas, ctx } = makeCanvas(ISO_TILE_W, TILE_CANVAS_H);
    drawIsoDiamondTile(ctx, 0, 0, '#7a6040', '#5a4028', '#4a3020', ISO_TILE_DEPTH);
    const cx = ISO_TILE_W / 2;
    const cy = ISO_TILE_H / 2;
    const pebbles = [[-8, -3], [6, -4], [10, 2], [-6, 4], [0, -2]];
    for (const [dx, dy] of pebbles) {
      if (Math.abs(dx) / (ISO_TILE_W / 2) + Math.abs(dy) / (ISO_TILE_H / 2) <= 1) {
        setPixel(ctx, cx + dx, cy + dy, '#3a3a3a');
        setPixel(ctx, cx + dx + 1, cy + dy, hexToRgba('#6a6a6a', 0.5));
      }
    }
    drawLine(ctx, cx - 6, cy - 3, cx - 2, cy + 1, hexToRgba('#3a3a3a', 0.6));
    drawLine(ctx, cx + 4, cy + 1, cx + 8, cy + 4, hexToRgba('#3a3a3a', 0.6));
    saveCanvas(canvas, `${OUTPUT_DIR}/path-tile-dark.png`);
    entries.push({ key: 'path-tile-dark', type: 'image', path: 'assets/tiles/path-tile-dark.png' });
  }

  // spawn-tile-dark.png (64×40)
  {
    const { canvas, ctx } = makeCanvas(ISO_TILE_W, TILE_CANVAS_H);
    drawIsoDiamondTile(ctx, 0, 0, '#100808', '#0a0404', '#100808', ISO_TILE_DEPTH);
    const cx = ISO_TILE_W / 2;
    const cy = ISO_TILE_H / 2;
    drawRect(ctx, cx - 20, cy - 6, 4, 12, '#3a3a3a');
    drawRect(ctx, cx - 20, cy - 6, 4, 2, '#6a6a6a');
    drawRect(ctx, cx + 16, cy - 6, 4, 12, '#3a3a3a');
    drawRect(ctx, cx + 16, cy - 6, 4, 2, '#6a6a6a');
    setPixel(ctx, cx - 18, cy, '#a04010');
    setPixel(ctx, cx - 18, cy - 1, '#c0a030');
    setPixel(ctx, cx + 18, cy, '#a04010');
    setPixel(ctx, cx + 18, cy - 1, '#c0a030');
    addGlow(ctx, cx, cy + 2, 10, '#a04010', 0.08);
    saveCanvas(canvas, `${OUTPUT_DIR}/spawn-tile-dark.png`);
    entries.push({ key: 'spawn-tile-dark', type: 'image', path: 'assets/tiles/spawn-tile-dark.png' });
  }

  // exit-tile-dark.png (64×40)
  {
    const { canvas, ctx } = makeCanvas(ISO_TILE_W, TILE_CANVAS_H);
    drawIsoDiamondTile(ctx, 0, 0, '#5a5a5a', '#3a3a3a', '#4a4a4a', ISO_TILE_DEPTH);
    const cx = ISO_TILE_W / 2;
    const cy = ISO_TILE_H / 2;
    for (let dy = -4; dy <= 4; dy++) {
      const halfW = Math.round(6 * (1 - Math.abs(dy) / 4));
      for (let dx = -halfW; dx <= halfW; dx++) {
        setPixel(ctx, cx + dx, cy + dy, '#100808');
      }
    }
    drawLine(ctx, cx, cy - 14, cx, cy - 8, '#5a3a20');
    setPixel(ctx, cx + 1, cy - 14, '#801810');
    setPixel(ctx, cx + 2, cy - 13, '#801810');
    setPixel(ctx, cx + 1, cy - 12, '#801810');
    addGlow(ctx, cx, cy, 8, '#c0a030', 0.1);
    saveCanvas(canvas, `${OUTPUT_DIR}/exit-tile-dark.png`);
    entries.push({ key: 'exit-tile-dark', type: 'image', path: 'assets/tiles/exit-tile-dark.png' });
  }

  return entries;
}

if (import.meta.main) {
  generate().then(e => console.log(JSON.stringify(e, null, 2)));
}
