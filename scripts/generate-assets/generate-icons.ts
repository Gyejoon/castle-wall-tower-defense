import { makeCanvas, saveCanvas, PALETTE, fillCircle, drawRect } from './shared';
import type { ManifestEntry } from './shared';

export async function generate(): Promise<ManifestEntry[]> {
  const sizes = [192, 512];
  const entries: ManifestEntry[] = [];

  for (const size of sizes) {
    const { canvas, ctx } = makeCanvas(size, size);

    // Background: grass green
    drawRect(ctx, 0, 0, size, size, PALETTE.gridLight);

    // Border
    const border = Math.floor(size * 0.05);
    drawRect(ctx, border, border, size - border * 2, size - border * 2, PALETTE.gridDark);
    drawRect(ctx, border + 2, border + 2, size - border * 2 - 4, size - border * 2 - 4, PALETTE.gridLight);

    // Tower silhouette (center)
    const cx = Math.floor(size / 2);
    const cy = Math.floor(size / 2);
    const towerW = Math.floor(size * 0.3);
    const towerH = Math.floor(size * 0.5);

    // Tower base
    drawRect(ctx, cx - towerW / 2, cy - towerH / 4, towerW, towerH / 2, PALETTE.stone);
    // Tower top
    drawRect(ctx, cx - towerW / 2 - 2, cy - towerH / 4 - 4, towerW + 4, 4, PALETTE.wood);
    // Gold accent
    fillCircle(ctx, cx, cy - towerH / 4 - 8, Math.floor(size * 0.06), PALETTE.gold);

    saveCanvas(canvas, `packages/web-shell/public/assets/icons/icon-${size}.png`);
    entries.push({ key: `icon-${size}`, type: 'image', path: `assets/icons/icon-${size}.png` });

    // Maskable version (512 only) — same but with extra padding
    if (size === 512) {
      const { canvas: mc, ctx: mctx } = makeCanvas(size, size);
      const pad = Math.floor(size * 0.1); // 10% safe zone

      drawRect(mctx, 0, 0, size, size, PALETTE.gridLight);
      drawRect(mctx, pad, pad, size - pad * 2, size - pad * 2, PALETTE.gridDark);
      drawRect(mctx, pad + 2, pad + 2, size - pad * 2 - 4, size - pad * 2 - 4, PALETTE.gridLight);

      const mcx = Math.floor(size / 2);
      const mcy = Math.floor(size / 2);
      drawRect(mctx, mcx - towerW / 2, mcy - towerH / 4, towerW, towerH / 2, PALETTE.stone);
      drawRect(mctx, mcx - towerW / 2 - 2, mcy - towerH / 4 - 4, towerW + 4, 4, PALETTE.wood);
      fillCircle(mctx, mcx, mcy - towerH / 4 - 8, Math.floor(size * 0.06), PALETTE.gold);

      saveCanvas(mc, `packages/web-shell/public/assets/icons/icon-${size}-maskable.png`);
      entries.push({ key: `icon-${size}-maskable`, type: 'image', path: `assets/icons/icon-${size}-maskable.png` });
    }
  }

  return entries;
}
