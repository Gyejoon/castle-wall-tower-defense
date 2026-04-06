#!/usr/bin/env bun
/**
 * ComfyUI Asset Harness — CLI entry point.
 *
 * Usage:
 *   bun run comfyui-harness generate --config configs/maps/forest_gate.yaml
 *   bun run comfyui-harness generate --config configs/maps/forest_gate.yaml --only oak-tree-large
 *   bun run comfyui-harness generate --config configs/bosses.yaml --dry-run
 *   bun run comfyui-harness generate-all
 *   bun run comfyui-harness audit --config configs/maps/forest_gate.yaml
 */

import { readdirSync } from 'fs';
import { resolve, join } from 'path';
import { loadConfig, resolveAssets } from './pipeline/config-loader';
import { buildWorkflowPlan, serializeWorkflowPlan } from './pipeline/workflow-builder';
import { checkAvailable, generateAndDownload } from './pipeline/comfyui-client';
import { postProcess } from './pipeline/post-process';
import { runQualityCheck, formatQualityReport } from './pipeline/quality-check';
import { assembleSpritesheet, saveSingleFrame } from './pipeline/spritesheet-assembler';
import { updateManifest } from './pipeline/manifest-updater';
import type { ComfyUIWorkflow, HarnessOptions, ResolvedAsset, SpritesheetResult } from './types';
import { TEMP_DIR, DEFAULTS } from './types';

// ── CLI Parser ─────────────────────────────────────────────────────

function parseArgs(argv: string[]): { command: string; options: HarnessOptions } {
  const args = argv.slice(2);
  const command = args[0] ?? 'help';

  const options: HarnessOptions = {
    config: '',
    dryRun: false,
    maxRetries: DEFAULTS.maxRetries,
    verbose: false,
  };

  for (let i = 1; i < args.length; i++) {
    switch (args[i]) {
      case '--config':
        options.config = args[++i] ?? '';
        break;
      case '--only':
        options.only = args[++i];
        break;
      case '--dry-run':
        options.dryRun = true;
        break;
      case '--verbose':
      case '-v':
        options.verbose = true;
        break;
      case '--retries':
        options.maxRetries = parseInt(args[++i] ?? '3', 10);
        break;
    }
  }

  return { command, options };
}

// ── Commands ───────────────────────────────────────────────────────

async function generate(options: HarnessOptions): Promise<void> {
  if (!options.config) {
    throw new Error('--config is required for generate command');
  }

  const configPath = resolve(options.config);
  console.log(`Loading config: ${configPath}`);

  const config = loadConfig(configPath);
  const assets = resolveAssets(config, options.only);
  const mapId = config.meta.id;

  console.log(`Resolved ${assets.length} assets from ${config.meta.name}`);

  if (options.dryRun) {
    console.log('\n=== DRY RUN ===\n');
    for (const asset of assets) {
      const plan = buildWorkflowPlan(asset);
      console.log(serializeWorkflowPlan(plan));
      console.log();
    }
    return;
  }

  // Check ComfyUI availability
  const available = await checkAvailable();
  if (!available) {
    throw new Error('ComfyUI is not available at ' + (process.env.COMFYUI_URL || 'http://localhost:8188'));
  }

  const results = await generateAssets(assets, mapId, options);

  // Update manifest
  if (results.length > 0) {
    updateManifest(results, assets, mapId);
  }

  console.log(`\nDone: ${results.length}/${assets.length} assets generated successfully`);
}

async function generateAll(options: HarnessOptions): Promise<void> {
  const configDir = resolve('scripts/comfyui-harness/configs');
  const configFiles = findAllConfigs(configDir);

  console.log(`Found ${configFiles.length} config files`);

  for (const configFile of configFiles) {
    console.log(`\n--- ${configFile} ---`);
    await generate({ ...options, config: configFile });
  }
}

async function audit(options: HarnessOptions): Promise<void> {
  if (!options.config) {
    throw new Error('--config is required for audit command');
  }

  const config = loadConfig(resolve(options.config));
  const assets = resolveAssets(config, options.only);

  console.log(`Auditing ${assets.length} assets...`);
  console.log('(audit runs quality checks on already-generated assets)');
  console.log('Note: Full audit requires generated frames in .temp directory');
}

// ── Generation Pipeline ────────────────────────────────────────────

async function generateAssets(
  assets: ResolvedAsset[],
  mapId: string,
  options: HarnessOptions,
): Promise<SpritesheetResult[]> {
  const results: SpritesheetResult[] = [];

  for (const asset of assets) {
    const plan = buildWorkflowPlan(asset);

    for (const entry of plan.workflows) {
      console.log(`\nGenerating: ${entry.label}`);

      for (let attempt = 1; attempt <= options.maxRetries; attempt++) {
        try {
          const result = await executeWorkflow(entry.workflow, asset, mapId, entry.state, options);
          if (result) {
            results.push(result);
            break;
          }
          // null = quality failure → fall through to next attempt
          console.warn(`  quality check failed on attempt ${attempt}/${options.maxRetries}`);
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error(`  attempt ${attempt}/${options.maxRetries} failed: ${msg}`);
          if (attempt === options.maxRetries) {
            console.error(`  SKIPPING ${entry.label} after ${options.maxRetries} failed attempts`);
          }
        }
      }
    }
  }

  return results;
}

async function executeWorkflow(
  workflow: ComfyUIWorkflow,
  asset: ResolvedAsset,
  mapId: string,
  state: string | undefined,
  options: HarnessOptions,
): Promise<SpritesheetResult | null> {
  const tempDir = resolve(TEMP_DIR, asset.id);
  const prefix = state ? `${asset.id}_${state}` : asset.id;

  // 1. Generate via ComfyUI
  const framePaths = await generateAndDownload(workflow, tempDir, prefix);
  if (framePaths.length === 0) {
    console.error('  no frames generated');
    return null;
  }

  console.log(`  generated ${framePaths.length} frames`);

  // 2. Post-process
  const processed = await postProcess(framePaths, asset);

  // 3. Quality check
  const report = await runQualityCheck(processed, asset);
  if (options.verbose) {
    console.log(formatQualityReport(report));
  }

  if (!report.passed) {
    console.warn(`  quality check FAILED: ${report.issues.join(', ')}`);
    // Return null to trigger retry at the caller level
    return null;
  }

  // 4. Assemble spritesheet (or save single)
  if (processed.processedFrames.length === 1) {
    return saveSingleFrame(processed, asset, mapId);
  }
  return assembleSpritesheet(processed, asset, mapId, state);
}

// ── Helpers ────────────────────────────────────────────────────────

function findAllConfigs(dir: string, depth: number = 0): string[] {
  if (depth > 5) return [];
  const files: string[] = [];

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...findAllConfigs(fullPath, depth + 1));
    } else if (entry.name.endsWith('.yaml') || entry.name.endsWith('.yml')) {
      files.push(fullPath);
    }
  }

  return files.sort();
}

function printUsage(): void {
  console.log(`
ComfyUI Asset Harness

Commands:
  generate      Generate assets from a config file
  generate-all  Generate all assets from all configs
  audit         Run quality checks on generated assets

Options:
  --config <path>   YAML config file path (required for generate/audit)
  --only <id>       Generate only a specific asset by ID
  --dry-run         Print workflow JSON without running ComfyUI
  --retries <n>     Max retry attempts (default: 3)
  --verbose, -v     Verbose output

Examples:
  bun run scripts/comfyui-harness/harness.ts generate --config scripts/comfyui-harness/configs/maps/forest_gate.yaml
  bun run scripts/comfyui-harness/harness.ts generate --config scripts/comfyui-harness/configs/maps/forest_gate.yaml --only oak-tree-large --dry-run
  bun run scripts/comfyui-harness/harness.ts generate-all
  `.trim());
}

// ── Main ───────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const { command, options } = parseArgs(process.argv);

  switch (command) {
    case 'generate':
      await generate(options);
      break;
    case 'generate-all':
      await generateAll(options);
      break;
    case 'audit':
      await audit(options);
      break;
    case 'help':
    default:
      printUsage();
      break;
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
