import { mkdirSync } from 'fs';
import type { ManifestEntry } from './shared';
import { makeCanvas, saveCanvas, drawRect, drawLine, fillCircle, PALETTE, hexToRgba } from './shared';

const OUTPUT_DIR = 'packages/web-shell/public/assets/ui';

export async function generate(): Promise<ManifestEntry[]> {
  mkdirSync(OUTPUT_DIR, { recursive: true });
  const entries: ManifestEntry[] = [];

  // Highlight frame (64x64, dashed gold border)
  {
    const { canvas, ctx } = makeCanvas(64, 64);
    for (let i = 0; i < 64; i += 4) {
      drawRect(ctx, i, 0, 2, 2, PALETTE.gold);
      drawRect(ctx, i, 62, 2, 2, PALETTE.gold);
      drawRect(ctx, 0, i, 2, 2, PALETTE.gold);
      drawRect(ctx, 62, i, 2, 2, PALETTE.gold);
    }
    saveCanvas(canvas, `${OUTPUT_DIR}/tutorial-highlight.png`);
    entries.push({ key: 'ui-tutorial-highlight', type: 'image', path: 'assets/ui/tutorial-highlight.png' });
  }

  // Arrow indicators (4 directions, 32x32 each)
  const DIRS = [
    { name: 'up', dx: 0, dy: -1 },
    { name: 'down', dx: 0, dy: 1 },
    { name: 'left', dx: -1, dy: 0 },
    { name: 'right', dx: 1, dy: 0 },
  ];
  for (const dir of DIRS) {
    const { canvas, ctx } = makeCanvas(32, 32);
    const cx = 16, cy = 16;
    fillCircle(ctx, cx, cy, 6, PALETTE.gold);
    const tipX = cx + dir.dx * 12;
    const tipY = cy + dir.dy * 12;
    drawLine(ctx, cx, cy, tipX, tipY, PALETTE.gold);
    fillCircle(ctx, tipX, tipY, 3, PALETTE.gold);
    saveCanvas(canvas, `${OUTPUT_DIR}/tutorial-arrow-${dir.name}.png`);
    entries.push({
      key: `ui-tutorial-arrow-${dir.name}`, type: 'image',
      path: `assets/ui/tutorial-arrow-${dir.name}.png`,
    });
  }

  // Hint bubble (128x64)
  {
    const { canvas, ctx } = makeCanvas(128, 64);
    drawRect(ctx, 4, 4, 120, 48, PALETTE.white);
    drawRect(ctx, 2, 2, 124, 52, hexToRgba(PALETTE.shadow, 0.3));
    for (let i = 0; i < 8; i++) {
      drawRect(ctx, 60 + i, 52 + i, 8 - i * 2, 1, PALETTE.white);
    }
    saveCanvas(canvas, `${OUTPUT_DIR}/tutorial-hint-bubble.png`);
    entries.push({ key: 'ui-tutorial-hint-bubble', type: 'image', path: 'assets/ui/tutorial-hint-bubble.png' });
  }

  return entries;
}

if (import.meta.main) {
  generate().then((e) => console.log(JSON.stringify(e, null, 2)));
}
