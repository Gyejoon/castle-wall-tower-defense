/**
 * Manifest updater — merges generated asset entries into asset-manifest.json.
 */

import { readFileSync, writeFileSync } from 'fs';
import type { AssetManifest, AssetManifestEntry, AssetManifestSection } from '../../../packages/shared/src/assets/manifest';
import type { SpritesheetResult, ResolvedAsset } from '../types';
import { ASSET_PATH_PREFIX } from '../types';

const MANIFEST_PATH = 'packages/web-shell/public/assets/asset-manifest.json';

// ── Main ───────────────────────────────────────────────────────────

export function updateManifest(results: SpritesheetResult[], assets: ResolvedAsset[], mapId?: string): void {
  const manifest = loadManifest();
  const assetMap = new Map(assets.map((a) => [a.id, a]));

  for (const result of results) {
    const asset = assetMap.get(result.assetId);
    if (!asset) continue;

    const entry = toManifestEntry(result, asset, mapId);
    mergeEntry(manifest, entry);
  }

  manifest.generated = new Date().toISOString();
  saveManifest(manifest);

  console.log(`  manifest updated: ${results.length} entries merged`);
}

// ── Entry Construction ─────────────────────────────────────────────

function toManifestEntry(result: SpritesheetResult, asset: ResolvedAsset, mapId?: string): AssetManifestEntry {
  const key = buildKey(asset, mapId, result.state);
  const path = result.path.replace(ASSET_PATH_PREFIX, '');
  const section = inferSection(asset);

  const entry: AssetManifestEntry = {
    key,
    type: result.frameCount > 1 ? 'spritesheet' : 'image',
    path,
    section,
  };

  if (result.frameCount > 1) {
    entry.frameWidth = result.frameWidth;
    entry.frameHeight = result.frameHeight;
    entry.frameCount = result.frameCount;
  }

  return entry;
}

function buildKey(asset: ResolvedAsset, mapId?: string, state?: string): string {
  const parts: string[] = [];

  if (asset.workflowOverride === 'boss') {
    parts.push('boss', asset.id);
    if (state) parts.push(state);
  } else if (mapId && (asset.category === 'terrain' || asset.category === 'structures' || asset.category === 'decorations')) {
    parts.push('map', mapId, asset.category, asset.id);
  } else {
    parts.push(asset.category, asset.id);
  }

  return parts.join('-');
}

function inferSection(asset: ResolvedAsset): AssetManifestSection {
  if (asset.workflowOverride === 'boss') return 'boss';
  // Map terrain, structures, decorations are preloaded
  return 'preload';
}

// ── Manifest I/O ───────────────────────────────────────────────────

function loadManifest(): AssetManifest {
  try {
    const raw = readFileSync(MANIFEST_PATH, 'utf-8');
    return JSON.parse(raw) as AssetManifest;
  } catch {
    return { generated: '', assets: [] };
  }
}

function saveManifest(manifest: AssetManifest): void {
  writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + '\n');
}

function mergeEntry(manifest: AssetManifest, entry: AssetManifestEntry): void {
  const idx = manifest.assets.findIndex((a) => a.key === entry.key);
  if (idx >= 0) {
    manifest.assets[idx] = entry; // overwrite
  } else {
    manifest.assets.push(entry);
  }
}
