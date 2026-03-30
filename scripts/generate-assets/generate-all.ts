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

  console.log('[tileset]');
  const tileset = await generateTileset();

  console.log('\n[tiles]');
  const tiles = await generateTiles();

  console.log('\n[towers]');
  const towers = await generateTowers();

  console.log('\n[units]');
  const units = await generateUnits();

  console.log('\n[projectiles]');
  const projectiles = await generateProjectiles();

  console.log('\n[vfx]');
  const vfx = await generateVfx();

  console.log('\n[ui]');
  const ui = await generateUi();

  console.log('\n[pressure-ui]');
  const pressureUi = await generatePressureUi();

  console.log('\n[match-ui]');
  const matchUi = await generateMatchUi();

  console.log('\n[icons]');
  const icons = await generateIcons();

  console.log('\n[map]');
  const map = await generateMap();

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
