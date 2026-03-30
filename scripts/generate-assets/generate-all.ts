import { writeFileSync } from 'fs';
import { generate as generateTiles } from './generate-tiles';
import { generate as generateTowers } from './generate-towers';
import { generate as generateUnits } from './generate-units';
import { generate as generateProjectiles } from './generate-projectiles';
import { generate as generateVfx } from './generate-vfx';
import { generate as generateUi } from './generate-ui';
import { generateTileset } from './generate-tileset';
import { generateMap } from './generate-map';

async function main() {
  console.log('=== Generating all assets ===\n');

  console.log('[tiles]');
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

  console.log('\n[tileset]');
  const tileset = await generateTileset();

  console.log('\n[map]');
  const mapAssets = await generateMap();

  const allEntries = [
    ...tiles,
    ...towers,
    ...units,
    ...projectiles,
    ...vfx,
    ...ui,
    ...tileset,
    ...mapAssets,
  ];

  const manifest = {
    generated: new Date().toISOString(),
    assets: allEntries,
  };

  const manifestPath = 'packages/web-shell/public/assets/asset-manifest.json';
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`\nWrote ${manifestPath}`);
  console.log(`Total assets: ${allEntries.length}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
