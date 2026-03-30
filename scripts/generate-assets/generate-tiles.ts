import { makeCanvas, saveCanvas, PALETTE, TILE_SIZE, hexToRgba, drawRect, fillCircle, setPixel, drawLine, addGlow, type ManifestEntry } from './shared';
import { mkdirSync } from 'fs';

const OUTPUT_DIR = 'packages/web-shell/public/assets/tiles';

export async function generate(): Promise<ManifestEntry[]> {
  mkdirSync(OUTPUT_DIR, { recursive: true });
  const entries: ManifestEntry[] = [];

  // grid-floor.png (64x32, 2 variants side-by-side: dark grass / light grass)
  {
    const { canvas, ctx } = makeCanvas(64, 32);

    // Left tile: dark grass
    drawRect(ctx, 0, 0, 32, 32, PALETTE.gridDark);
    // Grass texture: small bright pixels scattered
    const darkGrassPixels = [
      [3,4],[7,8],[12,3],[17,11],[22,6],[26,14],[5,18],[9,22],[14,26],[20,20],[28,25],[2,28],[11,15],[24,9],[29,19],
    ];
    for (const [x, y] of darkGrassPixels) {
      setPixel(ctx, x, y, hexToRgba(PALETTE.edgeHighlight, 0.4));
    }
    // Edge highlight top
    for (let i = 0; i < 32; i++) {
      setPixel(ctx, i, 0, hexToRgba(PALETTE.edgeHighlight, 0.3));
    }

    // Right tile: light grass
    drawRect(ctx, 32, 0, 32, 32, PALETTE.gridLight);
    // Slightly different grass texture
    const lightGrassPixels = [
      [5,6],[10,2],[15,9],[20,4],[25,12],[30,7],[4,16],[8,21],[13,27],[19,23],[27,17],[3,29],[12,13],[23,8],[31,22],
    ];
    for (const [x, y] of lightGrassPixels) {
      setPixel(ctx, 32 + x, y, hexToRgba(PALETTE.gridLine, 0.4));
    }
    for (let i = 0; i < 32; i++) {
      setPixel(ctx, 32 + i, 0, hexToRgba(PALETTE.edgeHighlight, 0.2));
    }

    saveCanvas(canvas, `${OUTPUT_DIR}/grid-floor.png`);
    entries.push({ key: 'grid-floor', type: 'image', path: 'assets/tiles/grid-floor.png' });
  }

  // path-tile.png (32x32) — 흙길, 경로 시각화용
  {
    const { canvas, ctx } = makeCanvas(32, 32);

    // Base dirt
    drawRect(ctx, 0, 0, 32, 32, PALETTE.dirtPath);

    // Darker center strip (worn path)
    drawRect(ctx, 6, 0, 20, 32, PALETTE.dirtDark);
    drawRect(ctx, 8, 0, 16, 32, hexToRgba(PALETTE.dirtPath, 0.7));

    // Small stones/pebbles
    const pebbles = [[4,5],[14,10],[22,8],[9,19],[18,24],[26,15],[6,27],[20,3]];
    for (const [x, y] of pebbles) {
      setPixel(ctx, x, y, PALETTE.stoneDark);
      setPixel(ctx, x + 1, y, hexToRgba(PALETTE.stoneLight, 0.5));
    }

    // Edge highlights
    for (let i = 0; i < 32; i++) {
      setPixel(ctx, i, 0, hexToRgba(PALETTE.woodLight, 0.2));
    }

    saveCanvas(canvas, `${OUTPUT_DIR}/path-tile.png`);
    entries.push({ key: 'path-tile', type: 'image', path: 'assets/tiles/path-tile.png' });
  }

  // spawn-tile.png (32x32) — 동굴 입구
  {
    const { canvas, ctx } = makeCanvas(32, 32);
    const cx = 16, cy = 16;

    // Dark cave background
    drawRect(ctx, 0, 0, 32, 32, '#1a1208');

    // Stone arch outline
    // Arch sides
    drawRect(ctx, 4, 12, 3, 20, PALETTE.stoneDark);
    drawRect(ctx, 25, 12, 3, 20, PALETTE.stoneDark);
    // Arch top (semicircle stones)
    for (let a = 180; a <= 360; a += 15) {
      const rad = (a * Math.PI) / 180;
      const px = Math.round(cx + 12 * Math.cos(rad));
      const py = Math.round(cy - 2 + 10 * Math.sin(rad));
      setPixel(ctx, px, py, PALETTE.stone);
      setPixel(ctx, px, py + 1, PALETTE.stoneDark);
    }
    // Stone highlights
    drawRect(ctx, 4, 12, 3, 2, PALETTE.stoneLight);
    drawRect(ctx, 25, 12, 3, 2, PALETTE.stoneLight);

    // Torch flames on sides (2 pixels each)
    // Left torch
    setPixel(ctx, 6, 14, PALETTE.fireOrange);
    setPixel(ctx, 6, 13, PALETTE.gold);
    setPixel(ctx, 7, 13, PALETTE.fireOrange);
    // Right torch
    setPixel(ctx, 25, 14, PALETTE.fireOrange);
    setPixel(ctx, 25, 13, PALETTE.gold);
    setPixel(ctx, 26, 13, PALETTE.fireOrange);

    // Inner darkness glow
    addGlow(ctx, cx, cy + 2, 8, '#ff6000', 0.15);

    saveCanvas(canvas, `${OUTPUT_DIR}/spawn-tile.png`);
    entries.push({ key: 'spawn-tile', type: 'image', path: 'assets/tiles/spawn-tile.png' });
  }

  // exit-tile.png (32x32) — 중세 성문
  {
    const { canvas, ctx } = makeCanvas(32, 32);
    const cx = 16, cy = 16;

    // Castle wall base (stone)
    drawRect(ctx, 0, 8, 32, 24, PALETTE.stone);
    drawRect(ctx, 0, 8, 32, 2, PALETTE.stoneLight);

    // Battlements (성가퀴) at top
    for (let bx = 0; bx < 32; bx += 8) {
      drawRect(ctx, bx, 2, 5, 6, PALETTE.stone);
      drawRect(ctx, bx, 2, 5, 1, PALETTE.stoneLight);
    }

    // Gate opening (dark arch)
    drawRect(ctx, 9, 10, 14, 22, '#1a1208');
    // Gate arch
    for (let a = 180; a <= 360; a += 20) {
      const rad = (a * Math.PI) / 180;
      const px = Math.round(cx + 7 * Math.cos(rad));
      const py = Math.round(10 + 7 * Math.sin(rad));
      setPixel(ctx, px, py, PALETTE.stoneDark);
    }

    // Flag on top
    drawLine(ctx, 16, 0, 16, 4, PALETTE.wood);
    // Flag triangle (red)
    setPixel(ctx, 17, 0, '#c03020');
    setPixel(ctx, 18, 1, '#c03020');
    setPixel(ctx, 17, 2, '#c03020');

    // Gold glow at gate
    addGlow(ctx, cx, 20, 6, PALETTE.gold, 0.2);

    saveCanvas(canvas, `${OUTPUT_DIR}/exit-tile.png`);
    entries.push({ key: 'exit-tile', type: 'image', path: 'assets/tiles/exit-tile.png' });
  }

  return entries;
}

if (import.meta.main) {
  generate().then(e => console.log(JSON.stringify(e, null, 2)));
}
