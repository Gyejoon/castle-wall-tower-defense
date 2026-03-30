import { makeCanvas, saveCanvas, PALETTE, TILE_SIZE, hexToRgba, drawRect, fillCircle, setPixel, drawLine, addGlow, type ManifestEntry } from './shared';
import { mkdirSync } from 'fs';

const OUTPUT_DIR = 'packages/web-shell/public/assets/tiles';

export async function generate(): Promise<ManifestEntry[]> {
  mkdirSync(OUTPUT_DIR, { recursive: true });
  const entries: ManifestEntry[] = [];

  // grid-floor.png (64x32, 2 variants side-by-side)
  {
    const { canvas, ctx } = makeCanvas(64, 32);

    // Left tile: dark
    drawRect(ctx, 0, 0, 32, 32, PALETTE.gridDark);
    // Subtle 1px inner edge highlight
    for (let i = 1; i < 31; i++) {
      setPixel(ctx, i, 1, hexToRgba(PALETTE.edgeHighlight, 0.3));
      setPixel(ctx, i, 30, hexToRgba(PALETTE.edgeHighlight, 0.3));
      setPixel(ctx, 1, i, hexToRgba(PALETTE.edgeHighlight, 0.3));
      setPixel(ctx, 30, i, hexToRgba(PALETTE.edgeHighlight, 0.3));
    }

    // Right tile: lighter
    drawRect(ctx, 32, 0, 32, 32, PALETTE.gridLight);
    for (let i = 1; i < 31; i++) {
      setPixel(ctx, 32 + i, 1, hexToRgba(PALETTE.edgeHighlight, 0.3));
      setPixel(ctx, 32 + i, 30, hexToRgba(PALETTE.edgeHighlight, 0.3));
      setPixel(ctx, 33, i, hexToRgba(PALETTE.edgeHighlight, 0.3));
      setPixel(ctx, 62, i, hexToRgba(PALETTE.edgeHighlight, 0.3));
    }

    saveCanvas(canvas, `${OUTPUT_DIR}/grid-floor.png`);
    entries.push({ key: 'grid-floor', type: 'image', path: 'assets/tiles/grid-floor.png' });
  }

  // spawn-tile.png (32x32)
  {
    const { canvas, ctx } = makeCanvas(32, 32);
    const cx = 16, cy = 16;

    // Green glow gradient from center
    addGlow(ctx, cx, cy, 14, PALETTE.green, 0.6);

    // Right-pointing arrow (triangle)
    drawLine(ctx, 10, 10, 22, 16, PALETTE.green);
    drawLine(ctx, 22, 16, 10, 22, PALETTE.green);
    drawLine(ctx, 10, 22, 10, 10, PALETTE.green);
    // Fill the triangle
    for (let y = 11; y < 22; y++) {
      const t = (y - 10) / 12;
      const leftX = 11;
      const rightX = Math.round(10 + (y <= 16 ? (y - 10) * 2 : (22 - y) * 2));
      for (let x = leftX; x <= rightX; x++) {
        setPixel(ctx, x, y, PALETTE.green);
      }
    }

    // Glow ring at edges
    for (let a = 0; a < 360; a += 5) {
      const rad = (a * Math.PI) / 180;
      const px = Math.round(cx + 13 * Math.cos(rad));
      const py = Math.round(cy + 13 * Math.sin(rad));
      setPixel(ctx, px, py, hexToRgba(PALETTE.green, 0.4));
    }

    saveCanvas(canvas, `${OUTPUT_DIR}/spawn-tile.png`);
    entries.push({ key: 'spawn-tile', type: 'image', path: 'assets/tiles/spawn-tile.png' });
  }

  // exit-tile.png (32x32)
  {
    const { canvas, ctx } = makeCanvas(32, 32);
    const cx = 16, cy = 16;

    // Pink glow gradient from center
    addGlow(ctx, cx, cy, 14, PALETTE.pink, 0.6);

    // X mark
    drawLine(ctx, 10, 10, 22, 22, PALETTE.pink);
    drawLine(ctx, 11, 10, 22, 21, PALETTE.pink);
    drawLine(ctx, 22, 10, 10, 22, PALETTE.pink);
    drawLine(ctx, 21, 10, 10, 21, PALETTE.pink);

    // Glow ring at edges
    for (let a = 0; a < 360; a += 5) {
      const rad = (a * Math.PI) / 180;
      const px = Math.round(cx + 13 * Math.cos(rad));
      const py = Math.round(cy + 13 * Math.sin(rad));
      setPixel(ctx, px, py, hexToRgba(PALETTE.pink, 0.4));
    }

    saveCanvas(canvas, `${OUTPUT_DIR}/exit-tile.png`);
    entries.push({ key: 'exit-tile', type: 'image', path: 'assets/tiles/exit-tile.png' });
  }

  return entries;
}

if (import.meta.main) {
  generate().then(e => console.log(JSON.stringify(e, null, 2)));
}
