import {
  copyFileSync,
  existsSync,
  mkdirSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { join, resolve, relative } from 'node:path';
import { findLibreSprite, runScript, type ScriptStep } from '../lib/libresprite';
import {
  ASSET_SPECS,
  resolveAssetIds,
  type AssetSpec,
  type PolishParams,
} from '../lib/asset-specs';

const REPO_ROOT = process.cwd();
const STAGING_ROOT = join(REPO_ROOT, 'staging/assets');
const SCRIPT_ROOT = join(REPO_ROOT, 'scripts/libresprite');
const PALETTE_PATH = join(SCRIPT_ROOT, 'master.gpl');

export interface ForgeOptions {
  selectors: string[];
  seed?: number;
  force?: boolean;
}

interface VerifyFrameReport {
  frame: number;
  cx: number;
  cy: number;
  alphaSum: number;
}

interface VerifyWarning {
  from: number;
  to: number;
  drift: number;
  maxDrift: number;
}

interface VerifyReport {
  frames?: VerifyFrameReport[];
  warnings?: VerifyWarning[];
  error?: string;
}

interface ForgeMetadata {
  assetId: string;
  sourcePath: string; // relative to repo root
  destPath: string;
  forgedAt: string;
  polishLevel: 'canvas-only' | 'libresprite-polished';
  polish: PolishParams;
  status: 'pending';
  warnings: string[];
  animation?: VerifyReport;
}

function rel(p: string) {
  return relative(REPO_ROOT, p).replace(/\\/g, '/');
}

function runChain(
  bin: string,
  spec: AssetSpec,
  stagingDir: string,
): { finalPath: string; warnings: string[]; animation?: VerifyReport } {
  const source = resolve(REPO_ROOT, spec.sourcePath);
  if (!existsSync(source)) {
    throw new Error(`source missing: ${spec.sourcePath}`);
  }

  mkdirSync(stagingDir, { recursive: true });
  const originalPath = join(stagingDir, 'original.png');
  copyFileSync(source, originalPath);

  const tmpDir = join(stagingDir, '.tmp-scripts');
  mkdirSync(tmpDir, { recursive: true });

  const chain: ScriptStep[] = [];

  // Step 1: snap palette (always runs when polished).
  const afterPalette = join(stagingDir, 'step1-palette.png');
  if (spec.polish.palette) {
    chain.push({
      label: 'apply-palette',
      templatePath: join(SCRIPT_ROOT, 'apply-palette.js'),
      vars: {
        INPUT: originalPath,
        OUTPUT: afterPalette,
        PALETTE: PALETTE_PATH,
      },
    });
  } else {
    copyFileSync(originalPath, afterPalette);
  }

  // Step 2: rim light.
  const afterRim = join(stagingDir, 'step2-rim.png');
  chain.push({
    label: 'apply-rim-light',
    templatePath: join(SCRIPT_ROOT, 'apply-rim-light.js'),
    vars: {
      INPUT: afterPalette,
      OUTPUT: afterRim,
      RIM_STRENGTH: spec.polish.rimLight.strength,
      SHADOW_STRENGTH: spec.polish.rimLight.shadow,
    },
  });

  // Step 3: texture noise.
  const afterNoise = join(stagingDir, 'step3-noise.png');
  chain.push({
    label: 'texture-noise',
    templatePath: join(SCRIPT_ROOT, 'texture-noise.js'),
    vars: {
      INPUT: afterRim,
      OUTPUT: afterNoise,
      SEED: spec.polish.noise.seed,
      DENSITY: spec.polish.noise.density,
    },
  });

  // Step 4: re-snap palette to keep noise inside gamut.
  const polishedPath = join(stagingDir, 'polished.png');
  chain.push({
    label: 'apply-palette-final',
    templatePath: join(SCRIPT_ROOT, 'apply-palette.js'),
    vars: {
      INPUT: afterNoise,
      OUTPUT: polishedPath,
      PALETTE: PALETTE_PATH,
    },
  });

  // 실패한 스텝은 체인 중단. 그렇지 않으면 다음 스텝이 stale 출력을 읽어 반쯤 폴리시된 PNG가
  // "polished"로 승격되어 HITL 계약이 소리없이 깨진다.
  const warnings: string[] = [];
  for (const step of chain) {
    const outPath = step.vars.OUTPUT as string;
    const prevMtime = existsSync(outPath) ? statSync(outPath).mtimeMs : 0;
    const result = runScript(bin, step, tmpDir);
    if (!result.ok) {
      throw new Error(
        `${step.label}: script error (exit ${result.exitCode}) — ` +
          `stdout=${result.stdout.slice(0, 400)} stderr=${result.stderr.slice(0, 200)}`,
      );
    }
    if (!existsSync(outPath)) {
      throw new Error(
        `${step.label}: expected output ${rel(outPath)} not produced ` +
          `(stdout: ${result.stdout.slice(0, 200)})`,
      );
    }
    const newMtime = statSync(outPath).mtimeMs;
    if (newMtime <= prevMtime && prevMtime > 0) {
      throw new Error(
        `${step.label}: output ${rel(outPath)} not refreshed (mtime unchanged) — ` +
          `a stale prior output would be promoted if chain continued`,
      );
    }
  }

  // Step 5: verify-animation — non-destructive audit, only for sheets.
  let animation: VerifyReport | undefined;
  if (spec.polish.animation) {
    const report = runScript(
      bin,
      {
        label: 'verify-animation',
        templatePath: join(SCRIPT_ROOT, 'verify-animation.js'),
        vars: {
          INPUT: polishedPath,
          FRAME_W: spec.polish.animation.frameW,
          FRAME_H: spec.polish.animation.frameH,
          FRAME_COUNT: spec.polish.animation.frameCount,
          REPORT: join(stagingDir, 'verify-animation.json'),
          MAX_DRIFT: 20,
        },
      },
      tmpDir,
    );
    const tag = 'VERIFY_ANIMATION_JSON:';
    const line = report.stdout.split('\n').find((l) => l.startsWith(tag));
    if (line) {
      try {
        const parsed = JSON.parse(line.slice(tag.length));
        animation = parsed.data as VerifyReport;
        writeFileSync(
          join(stagingDir, 'verify-animation.json'),
          JSON.stringify(animation, null, 2),
        );
        if (animation.warnings?.length) {
          warnings.push(
            `animation drift: ${animation.warnings.length} frame pair(s) exceed threshold`,
          );
        }
      } catch (e) {
        warnings.push(`verify-animation: parse failed (${String(e)})`);
      }
    } else {
      warnings.push('verify-animation: no report in stdout');
    }
  }

  return { finalPath: polishedPath, warnings, animation };
}

export async function runForge(opts: ForgeOptions): Promise<void> {
  const bin = findLibreSprite();
  const selected = new Set<string>();
  for (const sel of opts.selectors) {
    const matches = resolveAssetIds(sel);
    if (matches.length === 0) {
      console.warn(`  ⚠ no match for selector "${sel}"`);
      continue;
    }
    matches.forEach((id) => selected.add(id));
  }
  if (selected.size === 0) {
    console.log('  No assets selected. Known ids:');
    for (const id of Object.keys(ASSET_SPECS)) console.log(`    - ${id}`);
    return;
  }

  console.log(`forge: ${selected.size} asset(s)`);
  if (!bin.available) {
    console.log(
      `  ⚠ libresprite binary not found. Tried: ${bin.tried.join(', ')}`,
    );
    console.log(
      '  Graceful degradation: staging will contain canvas-only copies with warnings.json',
    );
  } else {
    console.log(`  using libresprite: ${bin.path}`);
  }

  for (const id of selected) {
    const spec = ASSET_SPECS[id];
    const stagingDir = join(STAGING_ROOT, id);
    console.log(`\n• ${id}`);
    if (!opts.force && existsSync(join(stagingDir, 'metadata.json'))) {
      console.log('    already staged (pass --force to redo)');
      continue;
    }
    try {
      const sourceAbs = resolve(REPO_ROOT, spec.sourcePath);
      if (!existsSync(sourceAbs)) {
        console.log(`    ✗ source missing: ${spec.sourcePath}`);
        continue;
      }
      mkdirSync(stagingDir, { recursive: true });
      copyFileSync(sourceAbs, join(stagingDir, 'original.png'));

      let warnings: string[] = [];
      let animation: VerifyReport | undefined;
      let polishLevel: 'canvas-only' | 'libresprite-polished' = 'canvas-only';
      // --seed CLI 오버라이드를 반영해 metadata가 실제 입력 그대로 재생 가능하게 보존.
      const seedOverride = opts.seed ?? spec.polish.noise.seed;
      const effectiveSpec: AssetSpec = {
        ...spec,
        polish: {
          ...spec.polish,
          noise: { ...spec.polish.noise, seed: seedOverride },
        },
      };

      if (bin.available) {
        const out = runChain(bin.path, effectiveSpec, stagingDir);
        warnings = out.warnings;
        animation = out.animation;
        polishLevel = 'libresprite-polished';
      } else {
        // libresprite 없으면 graceful degradation: polished = original.
        copyFileSync(sourceAbs, join(stagingDir, 'polished.png'));
        warnings.push('libresprite_missing');
      }

      const metadata: ForgeMetadata = {
        assetId: id,
        sourcePath: spec.sourcePath,
        destPath: spec.destPath,
        forgedAt: new Date().toISOString(),
        polishLevel,
        polish: effectiveSpec.polish,
        status: 'pending',
        warnings,
        animation,
      };
      writeFileSync(
        join(stagingDir, 'metadata.json'),
        JSON.stringify(metadata, null, 2),
      );
      console.log(
        `    ✓ staged → ${rel(stagingDir)}` +
          (warnings.length ? ` (${warnings.length} warnings)` : ''),
      );
    } catch (e) {
      console.error(`    ✗ ${id}: ${(e as Error).message}`);
    }
  }
}
