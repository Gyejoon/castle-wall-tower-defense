/**
 * export-shared-to-json.ts
 *
 * Phase 1 Task 2 — Bun CLI that exports all 13 shared data catalogs to
 * deterministic JSON files under packages/unity-game/Assets/Resources/GameData/.
 *
 * Exported function:
 *   exportAll(outDir: string): Promise<ExportResult>
 *
 * CLI entry (when run directly via `bun run scripts/export-shared-to-json.ts`):
 *   writes to the default output directory and prints a summary.
 */

import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

// ── catalog imports ──────────────────────────────────────────────────────────
import { BOSS_CONFIG } from '../packages/shared/src/constants/boss';
import { ELEMENT_MATCHUP } from '../packages/shared/src/constants/elements';
import {
  BASE_FAMILY_UPGRADE_COST,
  FAMILY_UPGRADE_DAMAGE_PER_LEVEL,
  MAX_FAMILY_UPGRADE_LEVEL,
  UPGRADEABLE_FAMILIES,
} from '../packages/shared/src/constants/familyUpgrade';
import { GACHA_COSTS, PITY_THRESHOLD } from '../packages/shared/src/constants/gacha';
import { MAP_REGISTRY } from '../packages/shared/src/constants/maps';
import { WAVE_SCALING } from '../packages/shared/src/constants/waves';
import { TOWER_DEFS, MERGE_CHAIN } from '../packages/shared/src/constants/towers';
import {
  UNITS,
  MIN_MOVE_SPEED,
  STUN_IMMUNITY_WINDOW_MS,
} from '../packages/shared/src/constants/units';
import {
  ENERGY_CAP,
  ENERGY_INITIAL,
  ENERGY_MAX,
  ENERGY_PER_BOSS_FAST_CLEAR,
  ENERGY_PER_BOSS_KILL,
  ENERGY_PER_KILL,
  ENERGY_PER_SECOND,
  ENERGY_PER_WAVE_CLEAR,
  FAST_CLEAR_THRESHOLD_MS,
  INGAME_GACHA,
  INITIAL_ENERGY,
} from '../packages/shared/src/constants/energy';
import { UPGRADE_CARDS } from '../packages/shared/src/data/upgradeCards';
import { createSummonPool } from '../packages/shared/src/data/summonPool';
import { generateWaves } from '../packages/shared/src/data/waves';
import { tokens } from '../packages/shared/src/design/tokens';
import { stableStringify } from '../packages/shared/src/testing/deterministic-json';

// ── assembled catalog objects ────────────────────────────────────────────────

function buildCatalogs(): Record<string, unknown> {
  return {
    towers: TOWER_DEFS,
    mergeChain: MERGE_CHAIN,
    units: {
      units: UNITS,
      minMoveSpeed: MIN_MOVE_SPEED,
      stunImmunityWindowMs: STUN_IMMUNITY_WINDOW_MS,
    },
    waves: generateWaves(50),
    upgradeCards: UPGRADE_CARDS,
    summonPools: createSummonPool(),
    gachaConfig: {
      costs: GACHA_COSTS,
      pityThreshold: PITY_THRESHOLD,
    },
    energyConfig: {
      energyPerSecond: ENERGY_PER_SECOND,
      energyInitial: ENERGY_INITIAL,
      energyMax: ENERGY_MAX,
      energyPerKill: ENERGY_PER_KILL,
      energyPerWaveClear: ENERGY_PER_WAVE_CLEAR,
      energyPerBossKill: ENERGY_PER_BOSS_KILL,
      energyPerBossFastClear: ENERGY_PER_BOSS_FAST_CLEAR,
      fastClearThresholdMs: FAST_CLEAR_THRESHOLD_MS,
      ingameGacha: INGAME_GACHA,
      // legacy aliases
      energyCap: ENERGY_CAP,
      initialEnergy: INITIAL_ENERGY,
    },
    scalingConfig: {
      waveScaling: WAVE_SCALING,
    },
    familyUpgrade: {
      upgradeableFamilies: UPGRADEABLE_FAMILIES,
      upgradesDamagePerLevel: FAMILY_UPGRADE_DAMAGE_PER_LEVEL,
      baseFamilyUpgradeCost: BASE_FAMILY_UPGRADE_COST,
      maxFamilyUpgradeLevel: MAX_FAMILY_UPGRADE_LEVEL,
    },
    elementMatchup: ELEMENT_MATCHUP,
    bossConfig: BOSS_CONFIG,
    maps: MAP_REGISTRY,
    designTokens: tokens,
  };
}

export interface ExportEntry {
  file: string;
  sha256: string;
  bytes: number;
}

export interface ExportResult {
  outDir: string;
  entries: ExportEntry[];
  indexFile: string;
}

function sha256(content: string): string {
  return createHash('sha256').update(content, 'utf8').digest('hex');
}

/**
 * Export all 13 catalogs to `outDir` as deterministic JSON files.
 * Also writes `index.json` listing every emitted file with its SHA-256 hash.
 *
 * Re-running produces identical output when source data is unchanged.
 */
export async function exportAll(outDir: string): Promise<ExportResult> {
  const absOut = resolve(outDir);
  await mkdir(absOut, { recursive: true });

  const catalogs = buildCatalogs();
  const entries: ExportEntry[] = [];

  for (const [name, data] of Object.entries(catalogs)) {
    const content = stableStringify(data) + '\n';
    const fileName = `${name}.json`;
    const filePath = join(absOut, fileName);
    await writeFile(filePath, content, 'utf8');
    entries.push({
      file: fileName,
      sha256: sha256(content),
      bytes: Buffer.byteLength(content, 'utf8'),
    });
  }

  // Write index.json
  const indexContent =
    stableStringify({
      generatedAt: new Date().toISOString(),
      catalogs: entries,
    }) + '\n';
  const indexFile = join(absOut, 'index.json');
  await writeFile(indexFile, indexContent, 'utf8');

  return { outDir: absOut, entries, indexFile };
}

// ── CLI entry ────────────────────────────────────────────────────────────────

if (import.meta.main) {
  const DEFAULT_OUT = resolve(
    import.meta.dirname ?? '.',
    '../packages/unity-game/Assets/Resources/GameData',
  );

  const outDir = process.argv[2] ?? DEFAULT_OUT;

  console.log(`Exporting shared catalogs → ${outDir}`);

  exportAll(outDir)
    .then((result) => {
      for (const entry of result.entries) {
        console.log(`  ✓ ${entry.file}  (${entry.bytes} bytes, sha256: ${entry.sha256.slice(0, 12)}…)`);
      }
      console.log(`  ✓ index.json`);
      console.log(`\nDone — ${result.entries.length} catalogs exported.`);
    })
    .catch((err) => {
      console.error('Export failed:', err);
      process.exit(1);
    });
}
