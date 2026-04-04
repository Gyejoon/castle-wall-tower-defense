import { mkdirSync } from 'fs';
import type { ManifestEntry } from './shared';
import { makeCanvas, saveCanvas, drawRect, fillCircle, addGlow, PALETTE, hexToRgba } from './shared';

const OUTPUT_DIR = 'packages/web-shell/public/assets/ui';

const BOXES = [
  { name: 'free', color: PALETTE.wood, accent: PALETTE.woodLight },
  { name: 'ad', color: PALETTE.magicBlue, accent: '#6080ff' },
  { name: 'diamond', color: PALETTE.tierRare, accent: PALETTE.white },
  { name: 'premium', color: PALETTE.tierGod, accent: PALETTE.tierGodBright },
];

export async function generate(): Promise<ManifestEntry[]> {
  mkdirSync(OUTPUT_DIR, { recursive: true });
  const entries: ManifestEntry[] = [];

  // Box sprites (64x64 each)
  for (const box of BOXES) {
    const { canvas, ctx } = makeCanvas(64, 64);
    drawRect(ctx, 12, 20, 40, 32, box.color);
    drawRect(ctx, 14, 22, 36, 28, hexToRgba(box.color, 0.8));
    drawRect(ctx, 8, 14, 48, 8, box.accent);
    fillCircle(ctx, 32, 36, 6, box.accent);
    if (box.name === 'premium') {
      addGlow(ctx, 32, 32, 24, box.accent, 0.15);
    }
    saveCanvas(canvas, `${OUTPUT_DIR}/gacha-box-${box.name}.png`);
    entries.push({
      key: `ui-gacha-box-${box.name}`, type: 'image',
      path: `assets/ui/gacha-box-${box.name}.png`,
      section: 'gacha' as const,
    });
  }

  // Box open animation (256x64, 4 frames)
  {
    const FW = 64, FH = 64, FRAMES = 4;
    const { canvas, ctx } = makeCanvas(FW * FRAMES, FH);
    for (let f = 0; f < FRAMES; f++) {
      const ox = f * FW;
      const lidOffset = f * 8;
      drawRect(ctx, ox + 12, 20, 40, 32, PALETTE.wood);
      drawRect(ctx, ox + 8, 14 - lidOffset, 48, 8, PALETTE.woodLight);
      if (f >= 2) {
        addGlow(ctx, ox + 32, 28, 16 + f * 4, PALETTE.gold, 0.2 + f * 0.1);
      }
    }
    saveCanvas(canvas, `${OUTPUT_DIR}/gacha-box-open.png`);
    entries.push({
      key: 'ui-gacha-box-open', type: 'spritesheet',
      path: 'assets/ui/gacha-box-open.png',
      frameWidth: FW, frameHeight: FH, frameCount: FRAMES,
      section: 'gacha' as const,
    });
  }

  // "NEW!" badge (24x24)
  {
    const { canvas, ctx } = makeCanvas(24, 24);
    fillCircle(ctx, 12, 12, 10, PALETTE.fireRed);
    ctx.fillStyle = PALETTE.white;
    ctx.font = 'bold 8px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('NEW', 12, 15);
    saveCanvas(canvas, `${OUTPUT_DIR}/badge-new.png`);
    entries.push({ key: 'ui-badge-new', type: 'image', path: 'assets/ui/badge-new.png', section: 'gacha' as const });
  }

  return entries;
}

if (import.meta.main) {
  generate().then((e) => console.log(JSON.stringify(e, null, 2)));
}
