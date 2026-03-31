import { existsSync, writeFileSync } from 'fs';
import { convertToWebP } from './convert-webp';
import { generateMap } from './generate-map';
import { generate as generateTowers } from './generate-towers';
import { generate as generateUnits } from './generate-units';
import { generate as generateProjectiles } from './generate-projectiles';
import { generate as generateVfx } from './generate-vfx';
import { generate as generateUi } from './generate-ui';
import { generate as generatePressureUi } from './generate-pressure-ui';
import { generate as generateMatchUi } from './generate-match-ui';
import { generate as generateIcons } from './generate-icons';
import type { ManifestEntry } from './shared';
import {
  TINY_SWORDS_DECORATION_ASSETS,
  TINY_SWORDS_TILESET_ASSETS,
} from '../../packages/phaser-game/src/fieldAssets';

export function collectStaticFieldAssetEntries(): ManifestEntry[] {
  const staticEntries = [
    ...TINY_SWORDS_TILESET_ASSETS,
    ...TINY_SWORDS_DECORATION_ASSETS,
  ].map(({ key, path, frameWidth, frameHeight, frameCount }) => ({
    key,
    type: 'spritesheet' as const,
    path,
    frameWidth,
    frameHeight,
    frameCount,
  }));

  const missing = staticEntries
    .filter((entry) => !existsSync(
      new URL(
        `../../packages/web-shell/public/${entry.path}`,
        import.meta.url,
      ),
    ))
    .map((entry) => entry.path);
  if (missing.length > 0) {
    throw new Error(`[vendor field assets] missing required assets: ${missing.join(', ')}`);
  }

  return staticEntries;
}

export async function generateAllAssets() {
  console.log('=== Generating all assets ===\n');

  const [staticFieldAssets, towers, units, projectiles, vfx, ui, pressureUi, matchUi, icons, map] =
    await Promise.all([
      Promise.resolve(collectStaticFieldAssetEntries()).then(r => { console.log('[vendor-field-assets] done'); return r; }),
      generateTowers().then(r => { console.log('[towers] done'); return r; }),
      generateUnits().then(r => { console.log('[units] done'); return r; }),
      generateProjectiles().then(r => { console.log('[projectiles] done'); return r; }),
      generateVfx().then(r => { console.log('[vfx] done'); return r; }),
      generateUi().then(r => { console.log('[ui] done'); return r; }),
      generatePressureUi().then(r => { console.log('[pressure-ui] done'); return r; }),
      generateMatchUi().then(r => { console.log('[match-ui] done'); return r; }),
      generateIcons().then(r => { console.log('[icons] done'); return r; }),
      generateMap().then(r => { console.log('[map] done'); return r; }),
    ]);

  const allEntries = [
    ...staticFieldAssets,
    ...towers,
    ...units,
    ...projectiles,
    ...vfx,
    ...ui,
    ...pressureUi,
    ...matchUi,
    ...icons,
    ...map,
  ];

  const manifest = {
    generated: new Date().toISOString(),
    assets: allEntries,
  };

  const manifestPath = 'packages/web-shell/public/assets/asset-manifest.json';
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`\nWrote ${manifestPath}`);
  console.log(`Total assets: ${allEntries.length}`);

  console.log('\n[webp conversion]');
  const { converted, savedBytes } = await convertToWebP();
  console.log(`Converted ${converted} PNGs to WebP (saved ${(savedBytes / 1024).toFixed(1)}KB)`);

  return manifest;
}

if (import.meta.main) {
  generateAllAssets().catch(err => {
    console.error(err);
    process.exit(1);
  });
}
