import { writeFileSync } from 'fs';
import { convertToWebP } from './convert-webp';
import { generateMap } from './generate-map';
import { generate as generateTiles } from './generate-tiles';
import { generate as generateTileset } from './generate-tileset';
import { generate as generateTowers } from './generate-towers';
import { generate as generateUnits } from './generate-units';
import { generate as generateProjectiles } from './generate-projectiles';
import { generate as generateVfx } from './generate-vfx';
import { generate as generateUi } from './generate-ui';
import { generate as generatePressureUi } from './generate-pressure-ui';
import { generate as generateMatchUi } from './generate-match-ui';
import { generate as generateIcons } from './generate-icons';

async function main() {
  console.log('=== Generating all assets ===\n');

  const [tileset, tiles, towers, units, projectiles, vfx, ui, pressureUi, matchUi, icons, map] =
    await Promise.all([
      generateTileset().then(r => { console.log('[tileset] done'); return r; }),
      generateTiles().then(r => { console.log('[tiles] done'); return r; }),
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
    ...tileset,
    ...tiles,
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
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
