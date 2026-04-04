import { mkdirSync } from 'fs';
import type { ManifestEntry } from './shared';
import { makeCanvas, saveCanvas, PALETTE, addGlow } from './shared';

const OUTPUT_DIR = 'packages/web-shell/public/assets/ui';

export async function generate(): Promise<ManifestEntry[]> {
  mkdirSync(OUTPUT_DIR, { recursive: true });
  const entries: ManifestEntry[] = [];

  // Defense Success — "STAGE CLEAR" (256x128)
  {
    const { canvas, ctx } = makeCanvas(256, 128);
    addGlow(ctx, 128, 64, 80, PALETTE.gold, 0.15);
    ctx.fillStyle = PALETTE.gold;
    ctx.font = 'bold 36px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('STAGE', 128, 50);
    ctx.fillText('CLEAR', 128, 90);
    saveCanvas(canvas, `${OUTPUT_DIR}/defense-success.png`);
    entries.push({ key: 'ui-defense-success', type: 'image', path: 'assets/ui/defense-success.png' });
  }

  // Defense Failed — "DEFENSE FAILED" (256x128)
  {
    const { canvas, ctx } = makeCanvas(256, 128);
    addGlow(ctx, 128, 64, 80, PALETTE.fireRed, 0.15);
    ctx.fillStyle = PALETTE.fireRed;
    ctx.font = 'bold 32px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('DEFENSE', 128, 50);
    ctx.fillText('FAILED', 128, 90);
    saveCanvas(canvas, `${OUTPUT_DIR}/defense-fail.png`);
    entries.push({ key: 'ui-defense-fail', type: 'image', path: 'assets/ui/defense-fail.png' });
  }

  return entries;
}

if (import.meta.main) {
  generate().then((e) => console.log(JSON.stringify(e, null, 2)));
}
