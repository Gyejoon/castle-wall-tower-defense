import { mkdirSync } from 'fs';
import type { ManifestEntry } from './shared';
import {
  makeCanvas, saveCanvas, drawRect, fillCircle,
  addGlow, PALETTE, hexToRgba,
} from './shared';

const OUTPUT_DIR = 'packages/web-shell/public/assets/ui';

const TIERS = [
  { name: 'common', color: PALETTE.tierCommon, glow: false },
  { name: 'rare', color: PALETTE.tierRare, glow: true },
  { name: 'heroic', color: PALETTE.tierHeroic, glow: true },
  { name: 'legendary', color: PALETTE.tierLegendary, glow: true },
  { name: 'god', color: PALETTE.tierGod, glow: true },
] as const;

export async function generate(): Promise<ManifestEntry[]> {
  mkdirSync(OUTPUT_DIR, { recursive: true });
  const entries: ManifestEntry[] = [];

  // Rarity frames (72x72 each, 5 tiers)
  for (const tier of TIERS) {
    const { canvas, ctx } = makeCanvas(72, 72);
    drawRect(ctx, 0, 0, 72, 72, tier.color);
    drawRect(ctx, 4, 4, 64, 64, PALETTE.shadow);
    for (const [cx, cy] of [[4, 4], [67, 4], [4, 67], [67, 67]] as const) {
      fillCircle(ctx, cx, cy, 3, tier.color);
    }
    if (tier.glow) {
      addGlow(ctx, 36, 36, 40, tier.color, 0.1);
    }
    saveCanvas(canvas, `${OUTPUT_DIR}/rarity-frame-${tier.name}.png`);
    entries.push({
      key: `ui-rarity-frame-${tier.name}`, type: 'image',
      path: `assets/ui/rarity-frame-${tier.name}.png`,
    });
  }

  // Tower card backgrounds (80x120 each, 5 tiers)
  for (const tier of TIERS) {
    const { canvas, ctx } = makeCanvas(80, 120);
    drawRect(ctx, 0, 0, 80, 120, PALETTE.shadow);
    drawRect(ctx, 2, 2, 76, 116, tier.color);
    drawRect(ctx, 4, 4, 72, 112, hexToRgba(PALETTE.shadow, 0.8));
    if (tier.glow) {
      addGlow(ctx, 40, 60, 50, tier.color, 0.08);
    }
    saveCanvas(canvas, `${OUTPUT_DIR}/tower-card-${tier.name}.png`);
    entries.push({
      key: `ui-tower-card-${tier.name}`, type: 'image',
      path: `assets/ui/tower-card-${tier.name}.png`,
    });
  }

  // Promotion glow overlays (72x72, 3 tiers: rare/heroic/legendary)
  for (const tier of TIERS.filter((t) => ['rare', 'heroic', 'legendary'].includes(t.name))) {
    const { canvas, ctx } = makeCanvas(72, 72);
    addGlow(ctx, 36, 36, 32, tier.color, 0.4);
    addGlow(ctx, 36, 36, 24, PALETTE.white, 0.2);
    saveCanvas(canvas, `${OUTPUT_DIR}/promotion-glow-${tier.name}.png`);
    entries.push({
      key: `ui-promotion-glow-${tier.name}`, type: 'image',
      path: `assets/ui/promotion-glow-${tier.name}.png`,
    });
  }

  // Level badge (24x24)
  {
    const { canvas, ctx } = makeCanvas(24, 24);
    fillCircle(ctx, 12, 12, 10, PALETTE.shadow);
    fillCircle(ctx, 12, 12, 8, PALETTE.gold);
    saveCanvas(canvas, `${OUTPUT_DIR}/level-badge.png`);
    entries.push({ key: 'ui-level-badge', type: 'image', path: 'assets/ui/level-badge.png' });
  }

  return entries;
}

if (import.meta.main) {
  generate().then((e) => console.log(JSON.stringify(e, null, 2)));
}
