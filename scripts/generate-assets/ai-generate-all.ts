/**
 * AI Asset Generation Orchestrator
 *
 * Runs the full AI asset generation pipeline:
 *   ComfyUI (tiles + towers) in parallel with PixelLab (units)
 *
 * Usage:
 *   bun run scripts/generate-assets/ai-generate-all.ts
 *
 * Environment:
 *   COMFYUI_URL      — ComfyUI server (default: http://localhost:8188)
 *   PIXELLAB_API_KEY  — PixelLab API key for unit generation
 */

import { writeFileSync, readFileSync, existsSync, mkdirSync, rmSync } from 'fs';
import { generate as generateTiles } from './ai-generate-tiles';
import { generate as generateTowers } from './ai-generate-towers';
import { generate as generateUnits } from './ai-generate-units';
import { AI_TEMP_DIR } from './ai-config';
import { auditPalette, composeRuntimeTileset } from './ai-post-process';
import type { ManifestEntry } from './shared';

const MANIFEST_PATH = 'packages/web-shell/public/assets/asset-manifest.json';

export interface AssetManifest {
  generated: string;
  assets: ManifestEntry[];
}

function loadExistingManifest(): AssetManifest {
  if (!existsSync(MANIFEST_PATH)) {
    return { generated: new Date().toISOString(), assets: [] };
  }
  return JSON.parse(readFileSync(MANIFEST_PATH, 'utf-8')) as AssetManifest;
}

export function mergeManifest(existing: AssetManifest, newEntries: ManifestEntry[]): AssetManifest {
  const entryMap = new Map<string, ManifestEntry>();
  for (const entry of existing.assets) entryMap.set(entry.key, entry);
  for (const entry of newEntries) entryMap.set(entry.key, entry);

  return {
    generated: new Date().toISOString(),
    assets: Array.from(entryMap.values()),
  };
}

async function runPaletteAudit(entries: ManifestEntry[]): Promise<void> {
  console.log('\n[palette-audit]');
  let totalOff = 0;

  for (const entry of entries) {
    const filePath = `packages/web-shell/public/${entry.path}`;
    if (!existsSync(filePath)) continue;

    try {
      const result = await auditPalette(filePath);
      if (result.offPalette > 0) {
        console.warn(`  ${entry.key}: ${result.offPalette}/${result.total} pixels off-palette (${result.percentage.toFixed(1)}%)`);
        totalOff += result.offPalette;
      } else {
        console.log(`  ${entry.key}: all ${result.total} pixels on-palette`);
      }
    } catch {
      console.warn(`  ${entry.key}: could not audit`);
    }
  }

  if (totalOff === 0) {
    console.log('  All AI-generated assets pass palette audit');
  } else {
    console.warn(`  WARNING: ${totalOff} total off-palette pixels found`);
  }
}

async function updateRuntimeTileset(entries: ManifestEntry[]): Promise<void> {
  const entryByKey = new Map(entries.map((entry) => [entry.key, entry]));
  const gridFloor = entryByKey.get('grid-floor');
  const path = entryByKey.get('path-tile');
  const spawn = entryByKey.get('spawn-tile');
  const exit = entryByKey.get('exit-tile');

  if (!gridFloor || !path || !spawn || !exit) return;

  console.log('\n[tileset-runtime]');
  await composeRuntimeTileset(
    {
      gridFloor: `packages/web-shell/public/${gridFloor.path}`,
      path: `packages/web-shell/public/${path.path}`,
      spawn: `packages/web-shell/public/${spawn.path}`,
      exit: `packages/web-shell/public/${exit.path}`,
    },
    'packages/web-shell/public/assets/tileset.png',
  );
  console.log('  Updated packages/web-shell/public/assets/tileset.png');
}

async function main(): Promise<void> {
  const startTime = Date.now();
  console.log('=== AI Asset Generation Pipeline ===\n');

  mkdirSync(AI_TEMP_DIR, { recursive: true });

  // ComfyUI work (tiles + towers) runs in parallel with PixelLab work (units)
  const [comfyResults, units] = await Promise.all([
    (async () => {
      console.log('[ai-tiles]');
      const tiles = await generateTiles();
      console.log('\n[ai-towers]');
      const towers = await generateTowers();
      return [...tiles, ...towers];
    })(),
    (async () => {
      console.log('\n[ai-units]');
      return generateUnits();
    })(),
  ]);

  const allNewEntries = [...comfyResults, ...units];

  if (allNewEntries.length === 0) {
    console.log('\nNo AI assets generated (backends unavailable).');
    console.log('Ensure ComfyUI is running and/or PIXELLAB_API_KEY is set.');
    return;
  }

  console.log('\n[manifest]');
  const existing = loadExistingManifest();
  const merged = mergeManifest(existing, allNewEntries);
  writeFileSync(MANIFEST_PATH, JSON.stringify(merged, null, 2));
  console.log(`  Updated ${MANIFEST_PATH}`);
  console.log(`  Total assets: ${merged.assets.length} (${allNewEntries.length} AI-generated)`);

  await updateRuntimeTileset(allNewEntries);
  await runPaletteAudit(allNewEntries);

  console.log('\n[cleanup]');
  try {
    rmSync(AI_TEMP_DIR, { recursive: true, force: true });
    console.log(`  Removed temp directory: ${AI_TEMP_DIR}`);
  } catch {
    console.warn(`  Could not clean temp directory: ${AI_TEMP_DIR}`);
  }

  const tileCount = comfyResults.filter((e) => e.key.startsWith('grid-') || e.key.startsWith('path-') || e.key.startsWith('spawn-') || e.key.startsWith('exit-')).length;
  const towerCount = comfyResults.length - tileCount;
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n=== Done in ${elapsed}s ===`);
  console.log(`Generated: ${tileCount} tiles, ${towerCount} towers, ${units.length} units`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error('Pipeline failed:', err);
    process.exit(1);
  });
}
