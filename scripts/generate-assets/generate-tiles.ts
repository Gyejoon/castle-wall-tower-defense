import { makeCanvas, saveCanvas, PALETTE, TILE_SIZE, hexToRgba, drawRect, fillCircle, setPixel, drawLine, addGlow, type ManifestEntry } from './shared';
import { mkdirSync } from 'fs';
import type { SKRSContext2D } from '@napi-rs/canvas';

const OUTPUT_DIR = 'packages/web-shell/public/assets/tiles';

// Draw isometric diamond top face within 32x32 tile
function drawIsoDiamond(ctx: SKRSContext2D, ox: number, oy: number, topColor: string, leftColor: string, rightColor: string, depth: number) {
  const cx = ox + 16;
  const cy = oy + 10;

  // Top face (diamond shape)
  for (let dy = -8; dy <= 8; dy++) {
    const halfW = Math.round(8 - Math.abs(dy));
    for (let dx = -halfW; dx <= halfW; dx++) {
      setPixel(ctx, cx + dx, cy + dy, topColor);
    }
  }

  // Left face (depth below left half)
  for (let d = 1; d <= depth; d++) {
    for (let row = 0; row <= 8; row++) {
      const halfW = 8 - row;
      for (let dx = -halfW; dx < 0; dx++) {
        setPixel(ctx, cx + dx, cy + row + d, leftColor);
      }
    }
  }

  // Right face (depth below right half)
  for (let d = 1; d <= depth; d++) {
    for (let row = 0; row <= 8; row++) {
      const halfW = 8 - row;
      for (let dx = 0; dx <= halfW; dx++) {
        setPixel(ctx, cx + dx, cy + row + d, rightColor);
      }
    }
  }
}

// Add grass tufts as subtle texture
function addGrassTufts(ctx: SKRSContext2D, ox: number, oy: number, color: string) {
  const cx = ox + 16;
  const cy = oy + 10;
  const tufts = [
    [-3, -4], [4, -2], [-5, 2], [2, 4], [6, 0], [-1, -6], [3, -5], [-4, 1],
  ];
  for (const [dx, dy] of tufts) {
    if (Math.abs(dx) + Math.abs(dy) <= 7) {
      setPixel(ctx, cx + dx, cy + dy, color);
      setPixel(ctx, cx + dx, cy + dy - 1, color);
    }
  }
}

export async function generate(): Promise<ManifestEntry[]> {
  mkdirSync(OUTPUT_DIR, { recursive: true });
  const entries: ManifestEntry[] = [];

  // grid-floor.png (64x32, 2 isometric variants: dark grass / light grass)
  {
    const { canvas, ctx } = makeCanvas(64, 32);

    // Left tile: dark grass isometric diamond
    drawIsoDiamond(ctx, 0, 0, PALETTE.gridDark, '#4a7a28', '#3a6a18', 4);
    addGrassTufts(ctx, 0, 0, hexToRgba(PALETTE.edgeHighlight, 0.5));

    // Right tile: light grass isometric diamond
    drawIsoDiamond(ctx, 32, 0, PALETTE.gridLight, '#5a8a30', '#4a7a28', 4);
    addGrassTufts(ctx, 32, 0, hexToRgba(PALETTE.gridLine, 0.5));

    saveCanvas(canvas, `${OUTPUT_DIR}/grid-floor.png`);
    entries.push({ key: 'grid-floor', type: 'image', path: 'assets/tiles/grid-floor.png' });
  }

  // path-tile.png (32x32) — isometric dirt path
  {
    const { canvas, ctx } = makeCanvas(32, 32);

    drawIsoDiamond(ctx, 0, 0, PALETTE.dirtPath, PALETTE.dirtDark, '#7a5a30', 4);

    // Pebbles on top face
    const cx = 16, cy = 10;
    const pebbles = [[-3, -2], [2, -3], [4, 1], [-2, 3], [0, -1]];
    for (const [dx, dy] of pebbles) {
      if (Math.abs(dx) + Math.abs(dy) <= 7) {
        setPixel(ctx, cx + dx, cy + dy, PALETTE.stoneDark);
        setPixel(ctx, cx + dx + 1, cy + dy, hexToRgba(PALETTE.stoneLight, 0.5));
      }
    }

    // Stone crack texture
    drawLine(ctx, cx - 3, cy - 2, cx - 1, cy, hexToRgba(PALETTE.stoneDark, 0.6));
    drawLine(ctx, cx + 2, cy + 1, cx + 4, cy + 3, hexToRgba(PALETTE.stoneDark, 0.6));

    saveCanvas(canvas, `${OUTPUT_DIR}/path-tile.png`);
    entries.push({ key: 'path-tile', type: 'image', path: 'assets/tiles/path-tile.png' });
  }

  // spawn-tile.png (32x32) — 동굴 입구
  {
    const { canvas, ctx } = makeCanvas(32, 32);
    const cx = 16, cy = 16;

    drawRect(ctx, 0, 0, 32, 32, '#1a1208');

    drawRect(ctx, 4, 12, 3, 20, PALETTE.stoneDark);
    drawRect(ctx, 25, 12, 3, 20, PALETTE.stoneDark);
    for (let a = 180; a <= 360; a += 15) {
      const rad = (a * Math.PI) / 180;
      const px = Math.round(cx + 12 * Math.cos(rad));
      const py = Math.round(cy - 2 + 10 * Math.sin(rad));
      setPixel(ctx, px, py, PALETTE.stone);
      setPixel(ctx, px, py + 1, PALETTE.stoneDark);
    }
    drawRect(ctx, 4, 12, 3, 2, PALETTE.stoneLight);
    drawRect(ctx, 25, 12, 3, 2, PALETTE.stoneLight);

    setPixel(ctx, 6, 14, PALETTE.fireOrange);
    setPixel(ctx, 6, 13, PALETTE.gold);
    setPixel(ctx, 7, 13, PALETTE.fireOrange);
    setPixel(ctx, 25, 14, PALETTE.fireOrange);
    setPixel(ctx, 25, 13, PALETTE.gold);
    setPixel(ctx, 26, 13, PALETTE.fireOrange);

    addGlow(ctx, cx, cy + 2, 8, '#ff6000', 0.15);

    saveCanvas(canvas, `${OUTPUT_DIR}/spawn-tile.png`);
    entries.push({ key: 'spawn-tile', type: 'image', path: 'assets/tiles/spawn-tile.png' });
  }

  // exit-tile.png (32x32) — 중세 성문
  {
    const { canvas, ctx } = makeCanvas(32, 32);
    const cx = 16, cy = 16;

    drawRect(ctx, 0, 8, 32, 24, PALETTE.stone);
    drawRect(ctx, 0, 8, 32, 2, PALETTE.stoneLight);

    for (let bx = 0; bx < 32; bx += 8) {
      drawRect(ctx, bx, 2, 5, 6, PALETTE.stone);
      drawRect(ctx, bx, 2, 5, 1, PALETTE.stoneLight);
    }

    drawRect(ctx, 9, 10, 14, 22, '#1a1208');
    for (let a = 180; a <= 360; a += 20) {
      const rad = (a * Math.PI) / 180;
      const px = Math.round(cx + 7 * Math.cos(rad));
      const py = Math.round(10 + 7 * Math.sin(rad));
      setPixel(ctx, px, py, PALETTE.stoneDark);
    }

    drawLine(ctx, 16, 0, 16, 4, PALETTE.wood);
    setPixel(ctx, 17, 0, '#c03020');
    setPixel(ctx, 18, 1, '#c03020');
    setPixel(ctx, 17, 2, '#c03020');

    addGlow(ctx, cx, 20, 6, PALETTE.gold, 0.2);

    saveCanvas(canvas, `${OUTPUT_DIR}/exit-tile.png`);
    entries.push({ key: 'exit-tile', type: 'image', path: 'assets/tiles/exit-tile.png' });
  }

  return entries;
}

if (import.meta.main) {
  generate().then(e => console.log(JSON.stringify(e, null, 2)));
}
