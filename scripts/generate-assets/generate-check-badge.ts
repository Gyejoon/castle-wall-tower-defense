import { makeCanvas, saveCanvas, PALETTE, setPixel, drawRect, type ManifestEntry } from './shared';
import { mkdirSync } from 'fs';

const OUTPUT_DIR = 'packages/web-shell/public/assets/ui';

/**
 * 20x20 pixel art clear badge — gold shield with white checkmark.
 * Used on WorldMapPage to indicate a cleared stage.
 */
export async function generate(): Promise<ManifestEntry[]> {
  mkdirSync(OUTPUT_DIR, { recursive: true });
  const entries: ManifestEntry[] = [];

  const S = 20;
  const { canvas, ctx } = makeCanvas(S, S);

  // Shield shape (gold) — pointed bottom, flat top
  const shieldColor = PALETTE.gold;          // #f0d060
  const shieldDark = PALETTE.tierGodDark;     // #c0a030
  const shieldHighlight = PALETTE.tierGodBright; // #ffe89a
  const checkColor = PALETTE.shadow;         // #2a1f0a
  const shadowColor = PALETTE.shadow;        // #2a1f0a

  // Draw shield body (rows 2-17, centered)
  // Shield is roughly 14px wide at top, narrows to point at bottom
  const shieldRows: [number, number][] = [
    // [leftX, width] for each row from top (y=2) to bottom (y=17)
    [3, 14],  // y=2
    [3, 14],  // y=3
    [3, 14],  // y=4
    [3, 14],  // y=5
    [3, 14],  // y=6
    [3, 14],  // y=7
    [3, 14],  // y=8
    [3, 14],  // y=9
    [4, 12],  // y=10
    [4, 12],  // y=11
    [5, 10],  // y=12
    [5, 10],  // y=13
    [6, 8],   // y=14
    [7, 6],   // y=15
    [8, 4],   // y=16
    [9, 2],   // y=17
  ];

  // Shield fill
  for (let i = 0; i < shieldRows.length; i++) {
    const [lx, w] = shieldRows[i];
    const y = i + 2;
    drawRect(ctx, lx, y, w, 1, shieldColor);
  }

  // Shield border (1px outline)
  for (let i = 0; i < shieldRows.length; i++) {
    const [lx, w] = shieldRows[i];
    const y = i + 2;
    setPixel(ctx, lx, y, shieldDark);
    setPixel(ctx, lx + w - 1, y, shieldDark);
  }
  // Top border
  drawRect(ctx, 3, 2, 14, 1, shieldDark);
  // Bottom point
  setPixel(ctx, 9, 17, shieldDark);
  setPixel(ctx, 10, 17, shieldDark);

  // Shield highlight (top-left shine, 2px inset)
  drawRect(ctx, 5, 4, 4, 1, shieldHighlight);
  drawRect(ctx, 5, 5, 2, 1, shieldHighlight);
  setPixel(ctx, 5, 6, shieldHighlight);

  // Inner border line (subtle depth)
  for (let i = 0; i < shieldRows.length - 2; i++) {
    const [lx, w] = shieldRows[i];
    const y = i + 2;
    setPixel(ctx, lx + 1, y, shieldDark);
    setPixel(ctx, lx + w - 2, y, shieldDark);
  }

  // Checkmark (2px thick, dark color for contrast against gold)
  // Short stroke: going down-right from (6,10) to (8,12)
  setPixel(ctx, 6, 9, checkColor);
  setPixel(ctx, 6, 10, checkColor);
  setPixel(ctx, 7, 10, checkColor);
  setPixel(ctx, 7, 11, checkColor);
  setPixel(ctx, 8, 11, checkColor);
  setPixel(ctx, 8, 12, checkColor);

  // Long stroke: going up-right from (8,12) to (14,6)
  setPixel(ctx, 9, 11, checkColor);
  setPixel(ctx, 9, 12, checkColor);
  setPixel(ctx, 10, 10, checkColor);
  setPixel(ctx, 10, 11, checkColor);
  setPixel(ctx, 11, 9, checkColor);
  setPixel(ctx, 11, 10, checkColor);
  setPixel(ctx, 12, 8, checkColor);
  setPixel(ctx, 12, 9, checkColor);
  setPixel(ctx, 13, 7, checkColor);
  setPixel(ctx, 13, 8, checkColor);
  setPixel(ctx, 14, 6, checkColor);
  setPixel(ctx, 14, 7, checkColor);

  // Drop shadow (bottom-right, 1px)
  for (let i = 2; i < shieldRows.length; i++) {
    const [lx, w] = shieldRows[i];
    const y = i + 2;
    setPixel(ctx, lx + w, y + 1, shadowColor);
  }

  saveCanvas(canvas, `${OUTPUT_DIR}/check-badge.png`);
  entries.push({
    key: 'ui-check-badge',
    type: 'image',
    path: 'assets/ui/check-badge.png',
  });

  return entries;
}

if (import.meta.main) {
  generate().then((e) => console.log(JSON.stringify(e, null, 2)));
}
