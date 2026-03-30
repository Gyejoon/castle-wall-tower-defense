import { makeCanvas, saveCanvas, PALETTE, drawRect, fillCircle, drawCircle, setPixel, drawLine, type ManifestEntry } from './shared';
import { mkdirSync } from 'fs';

const OUTPUT_DIR = 'packages/web-shell/public/assets/ui';

export async function generate(): Promise<ManifestEntry[]> {
  mkdirSync(OUTPUT_DIR, { recursive: true });
  const entries: ManifestEntry[] = [];

  // pressure-defend.png (32x32) — Shield icon in cyan
  {
    const { canvas, ctx } = makeCanvas(32, 32);
    const cx = 16, cy = 16;
    const color = PALETTE.cyan;

    // Shield body: rectangular top, pointed bottom
    // Top edge
    drawLine(ctx, cx - 9, cy - 10, cx + 9, cy - 10, color);
    // Left edge
    drawLine(ctx, cx - 9, cy - 10, cx - 9, cy + 1, color);
    // Right edge
    drawLine(ctx, cx + 9, cy - 10, cx + 9, cy + 1, color);
    // Bottom-left diagonal to point
    drawLine(ctx, cx - 9, cy + 1, cx, cy + 12, color);
    // Bottom-right diagonal to point
    drawLine(ctx, cx + 9, cy + 1, cx, cy + 12, color);

    // Inner fill (lighter)
    for (let y = cy - 9; y <= cy + 11; y++) {
      for (let x = cx - 8; x <= cx + 8; x++) {
        // Inside the shield shape
        if (y <= cy + 1) {
          // Rectangular region
          fillPixelIfInside(ctx, x, y, color);
        } else {
          // Triangular region below
          const progress = (y - (cy + 1)) / 11;
          const halfWidth = 8 * (1 - progress);
          if (Math.abs(x - cx) <= halfWidth) {
            fillPixelIfInside(ctx, x, y, color);
          }
        }
      }
    }

    // Center cross detail
    drawLine(ctx, cx, cy - 6, cx, cy + 4, PALETTE.dark);
    drawLine(ctx, cx - 4, cy - 2, cx + 4, cy - 2, PALETTE.dark);

    saveCanvas(canvas, `${OUTPUT_DIR}/pressure-defend.png`);
    entries.push({ key: 'ui-pressure-defend', type: 'image', path: 'assets/ui/pressure-defend.png' });
  }

  // pressure-attack.png (32x32) — Sword/arrow icon in pink
  {
    const { canvas, ctx } = makeCanvas(32, 32);
    const cx = 16, cy = 16;
    const color = PALETTE.pink;

    // Upward-pointing arrow
    // Arrow head (triangle)
    drawLine(ctx, cx, cy - 12, cx - 7, cy - 2, color);
    drawLine(ctx, cx, cy - 12, cx + 7, cy - 2, color);
    drawLine(ctx, cx - 7, cy - 2, cx + 7, cy - 2, color);

    // Fill arrow head
    for (let y = cy - 11; y <= cy - 2; y++) {
      const progress = (y - (cy - 12)) / 10;
      const halfWidth = Math.round(7 * progress);
      for (let x = cx - halfWidth; x <= cx + halfWidth; x++) {
        setPixel(ctx, x, y, color);
      }
    }

    // Arrow shaft
    drawRect(ctx, cx - 2, cy - 2, 5, 16, color);

    saveCanvas(canvas, `${OUTPUT_DIR}/pressure-attack.png`);
    entries.push({ key: 'ui-pressure-attack', type: 'image', path: 'assets/ui/pressure-attack.png' });
  }

  // pressure-invest.png (32x32) — Coin icon in gold
  {
    const { canvas, ctx } = makeCanvas(32, 32);
    const cx = 16, cy = 16;
    const color = PALETTE.gold;

    // Outer circle
    fillCircle(ctx, cx, cy, 11, color);
    // Inner ring
    drawCircle(ctx, cx, cy, 9, PALETTE.dark);
    // Inner fill (slightly darker gold tone)
    fillCircle(ctx, cx, cy, 8, color);
    // Dollar sign / coin mark
    drawLine(ctx, cx, cy - 6, cx, cy + 6, PALETTE.dark);
    drawLine(ctx, cx - 3, cy - 3, cx + 3, cy - 3, PALETTE.dark);
    drawLine(ctx, cx - 3, cy, cx + 3, cy, PALETTE.dark);
    drawLine(ctx, cx - 3, cy + 3, cx + 3, cy + 3, PALETTE.dark);

    saveCanvas(canvas, `${OUTPUT_DIR}/pressure-invest.png`);
    entries.push({ key: 'ui-pressure-invest', type: 'image', path: 'assets/ui/pressure-invest.png' });
  }

  // pressure-panel-bg.png (256x96) — Panel background with purple border
  {
    const { canvas, ctx } = makeCanvas(256, 96);
    const borderWidth = 2;
    const borderColor = PALETTE.purple;
    const bgColor = PALETTE.dark;

    // Fill background
    drawRect(ctx, 0, 0, 256, 96, bgColor);

    // Top border
    drawRect(ctx, 0, 0, 256, borderWidth, borderColor);
    // Bottom border
    drawRect(ctx, 0, 96 - borderWidth, 256, borderWidth, borderColor);
    // Left border
    drawRect(ctx, 0, 0, borderWidth, 96, borderColor);
    // Right border
    drawRect(ctx, 256 - borderWidth, 0, borderWidth, 96, borderColor);

    saveCanvas(canvas, `${OUTPUT_DIR}/pressure-panel-bg.png`);
    entries.push({ key: 'ui-pressure-panel-bg', type: 'image', path: 'assets/ui/pressure-panel-bg.png' });
  }

  return entries;
}

function fillPixelIfInside(ctx: import('@napi-rs/canvas').SKRSContext2D, x: number, y: number, color: string): void {
  setPixel(ctx, x, y, color);
}

if (import.meta.main) {
  generate().then(e => console.log(JSON.stringify(e, null, 2)));
}
