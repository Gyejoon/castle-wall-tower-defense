/**
 * gld-pipe audit
 *
 * Checks:
 * [PALETTE]   Colors outside defined PALETTE
 * [CONTRAST]  ΔE distance between same-category assets
 * [UNUSED]    Manifest entries not referenced in code
 * [SIZE]      Unusual dimensions / file sizes
 * [DENSITY]   Color count vs pixel count ratio
 */

import { readFileSync, statSync } from 'fs';
import { join, relative, basename } from 'path';
import { findPngFiles, readImage, extractColors, countOpaquePixels } from '../lib/image';
import { hexToRgb, rgbToLab, deltaE } from '../lib/color';
import { getFlatPalette, getPaletteHexSet } from '../lib/palette';
import type { AssetManifest } from '../../../packages/shared/src/assets/manifest';

const ASSETS_DIR = 'packages/web-shell/public/assets';
const SRC_DIRS = ['packages/phaser-game/src', 'packages/shared/src', 'packages/web-shell/src'];

interface AuditIssue {
  level: 'error' | 'warn' | 'info';
  check: string;
  file: string;
  message: string;
  detail?: string;
}

// ─── PALETTE check ───────────────────────────────────────────

async function checkPalette(pngFiles: string[]): Promise<AuditIssue[]> {
  const issues: AuditIssue[] = [];
  const paletteHexes = getPaletteHexSet();
  const TOLERANCE = 5; // ΔE threshold — below this is "close enough"

  for (const file of pngFiles) {
    // Skip vendored assets
    if (file.includes('/vendor/')) continue;

    const img = await readImage(file);
    const colors = extractColors(img);
    const offPaletteColors: { hex: string; count: number; closestDist: number }[] = [];

    const paletteLab = getFlatPalette();

    for (const [hex, count] of colors) {
      if (paletteHexes.has(hex)) continue;

      const lab = rgbToLab(hexToRgb(hex));
      let minDist = Infinity;
      for (const p of paletteLab) {
        const d = deltaE(lab, p.lab);
        if (d < minDist) minDist = d;
      }

      if (minDist > TOLERANCE) {
        offPaletteColors.push({ hex, count, closestDist: Math.round(minDist * 10) / 10 });
      }
    }

    if (offPaletteColors.length > 0) {
      const sorted = offPaletteColors.sort((a, b) => b.count - a.count);
      const top5 = sorted.slice(0, 5);
      const total = sorted.reduce((s, c) => s + c.count, 0);
      issues.push({
        level: sorted.length > 10 ? 'error' : 'warn',
        check: 'PALETTE',
        file: relative('.', file),
        message: `${sorted.length} off-palette colors (${total} pixels)`,
        detail: top5.map(c => `  ${c.hex} ×${c.count} (ΔE=${c.closestDist})`).join('\n'),
      });
    }
  }

  return issues;
}

// ─── CONTRAST check ──────────────────────────────────────────

async function checkContrast(pngFiles: string[]): Promise<AuditIssue[]> {
  const issues: AuditIssue[] = [];

  // Group files by category (directory)
  const groups = new Map<string, string[]>();
  for (const file of pngFiles) {
    if (file.includes('/vendor/')) continue;
    const rel = relative(ASSETS_DIR, file);
    const cat = rel.split('/')[0];
    if (!groups.has(cat)) groups.set(cat, []);
    groups.get(cat)!.push(file);
  }

  const MIN_DE = 12; // Minimum recommended ΔE between assets in same category

  for (const [cat, files] of groups) {
    if (files.length < 2) continue;

    // Calculate dominant color per file (most frequent non-transparent color)
    const dominants: { file: string; hex: string; lab: ReturnType<typeof rgbToLab> }[] = [];
    for (const file of files) {
      const img = await readImage(file);
      const colors = extractColors(img);
      if (colors.size === 0) continue;
      let maxCount = 0;
      let dominant = '#000000';
      for (const [hex, count] of colors) {
        if (count > maxCount) { maxCount = count; dominant = hex; }
      }
      dominants.push({ file, hex: dominant, lab: rgbToLab(hexToRgb(dominant)) });
    }

    // Pairwise ΔE check
    for (let i = 0; i < dominants.length; i++) {
      for (let j = i + 1; j < dominants.length; j++) {
        const de = deltaE(dominants[i].lab, dominants[j].lab);
        if (de < MIN_DE) {
          issues.push({
            level: de < 5 ? 'error' : 'warn',
            check: 'CONTRAST',
            file: `${cat}/`,
            message: `Low contrast between assets (ΔE=${Math.round(de * 10) / 10})`,
            detail: `  ${basename(dominants[i].file)} (${dominants[i].hex})\n  ${basename(dominants[j].file)} (${dominants[j].hex})`,
          });
        }
      }
    }
  }

  return issues;
}

// ─── UNUSED check ────────────────────────────────────────────

function checkUnused(): AuditIssue[] {
  const issues: AuditIssue[] = [];
  const manifestPath = join(ASSETS_DIR, 'asset-manifest.json');

  let manifest: AssetManifest;
  try {
    manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
  } catch {
    issues.push({ level: 'error', check: 'UNUSED', file: manifestPath, message: 'Cannot read manifest' });
    return issues;
  }

  // Collect all source code
  let allSource = '';
  for (const srcDir of SRC_DIRS) {
    try {
      const tsFiles = findTsFiles(srcDir);
      for (const f of tsFiles) {
        allSource += readFileSync(f, 'utf-8') + '\n';
      }
    } catch { /* dir may not exist */ }
  }

  // Detect which sections are bulk-loaded via preloadAssetSection / prefetchAssetSections
  const bulkLoadedSections = new Set<string>();
  const sectionPattern = /preloadAssetSection.*?['"`](\w+)['"`]|prefetchAssetSections.*?\[([^\]]+)\]/g;
  let sectionMatch: RegExpExecArray | null;
  while ((sectionMatch = sectionPattern.exec(allSource)) !== null) {
    if (sectionMatch[1]) {
      bulkLoadedSections.add(sectionMatch[1]);
    }
    if (sectionMatch[2]) {
      // Parse array contents like 'ui', 'vfx', 'projectiles'
      for (const m of sectionMatch[2].matchAll(/['"`](\w+)['"`]/g)) {
        bulkLoadedSections.add(m[1]);
      }
    }
  }
  // 'preload' section is always loaded in Preloader scene
  bulkLoadedSections.add('preload');

  // Detect dynamic key patterns like `unit-${id}`, `tower-${type}`
  const dynamicPrefixes = new Set<string>();
  const dynPattern = /['"`](\w+)-\$\{/g;
  let dynMatch: RegExpExecArray | null;
  while ((dynMatch = dynPattern.exec(allSource)) !== null) {
    dynamicPrefixes.add(dynMatch[1]);
  }

  // Check each manifest key
  for (const entry of manifest.assets) {
    // Skip assets in bulk-loaded sections — they're loaded by section, not by key
    if (entry.section && bulkLoadedSections.has(entry.section)) continue;

    // Skip assets matching dynamic key patterns (e.g., tower-*, unit-*)
    const keyPrefix = entry.key.split('-')[0];
    if (dynamicPrefixes.has(keyPrefix)) continue;

    // Use word-boundary matching for remaining keys
    const keyPattern = new RegExp(`['"\`]${entry.key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"\`]`);
    if (!keyPattern.test(allSource)) {
      issues.push({
        level: 'info',
        check: 'UNUSED',
        file: entry.path,
        message: `Key "${entry.key}" not found in source code`,
      });
    }
  }

  return issues;
}

function findTsFiles(dir: string): string[] {
  const { readdirSync, statSync } = require('fs');
  const files: string[] = [];
  try {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) {
        files.push(...findTsFiles(full));
      } else if (entry.endsWith('.ts') || entry.endsWith('.tsx')) {
        files.push(full);
      }
    }
  } catch { /* ignore */ }
  return files;
}

// ─── SIZE check ──────────────────────────────────────────────

function checkSize(pngFiles: string[]): AuditIssue[] {
  const issues: AuditIssue[] = [];
  const MAX_FILE_KB = 50;

  for (const file of pngFiles) {
    if (file.includes('/vendor/')) continue;
    const stat = statSync(file);
    const kb = stat.size / 1024;
    if (kb > MAX_FILE_KB) {
      issues.push({
        level: kb > 200 ? 'error' : 'warn',
        check: 'SIZE',
        file: relative('.', file),
        message: `${Math.round(kb)}KB exceeds ${MAX_FILE_KB}KB threshold`,
      });
    }
  }

  return issues;
}

// ─── DENSITY check ───────────────────────────────────────────

async function checkDensity(pngFiles: string[]): Promise<AuditIssue[]> {
  const issues: AuditIssue[] = [];
  const MAX_COLORS_RATIO = 0.5; // More than 50% unique colors per opaque pixel = too complex

  for (const file of pngFiles) {
    if (file.includes('/vendor/')) continue;
    const img = await readImage(file);
    const colors = extractColors(img);
    const opaqueCount = countOpaquePixels(img);
    if (opaqueCount < 16) continue; // Skip tiny sprites

    const ratio = colors.size / opaqueCount;
    if (ratio > MAX_COLORS_RATIO && colors.size > 32) {
      issues.push({
        level: 'warn',
        check: 'DENSITY',
        file: relative('.', file),
        message: `High color density: ${colors.size} colors / ${opaqueCount} pixels (${(ratio * 100).toFixed(1)}%)`,
        detail: `  Pixel art typically uses fewer unique colors. This may indicate anti-aliasing leakage.`,
      });
    }
  }

  return issues;
}

// ─── Main ────────────────────────────────────────────────────

export async function runAudit(options: { checks?: string[]; verbose?: boolean }): Promise<void> {
  const startTime = Date.now();
  console.log('\n🔍 gld-pipe audit\n');

  const pngFiles = findPngFiles(ASSETS_DIR);
  console.log(`  Found ${pngFiles.length} PNG files\n`);

  const allChecks = ['PALETTE', 'CONTRAST', 'UNUSED', 'SIZE', 'DENSITY'];
  const enabledChecks = options.checks?.map(c => c.toUpperCase()) ?? allChecks;

  const issues: AuditIssue[] = [];

  if (enabledChecks.includes('PALETTE')) {
    process.stdout.write('  [PALETTE]  Checking palette compliance...');
    issues.push(...await checkPalette(pngFiles));
    console.log(' done');
  }

  if (enabledChecks.includes('CONTRAST')) {
    process.stdout.write('  [CONTRAST] Checking visual distinction...');
    issues.push(...await checkContrast(pngFiles));
    console.log(' done');
  }

  if (enabledChecks.includes('UNUSED')) {
    process.stdout.write('  [UNUSED]   Checking manifest references...');
    issues.push(...checkUnused());
    console.log(' done');
  }

  if (enabledChecks.includes('SIZE')) {
    process.stdout.write('  [SIZE]     Checking file sizes...');
    issues.push(...checkSize(pngFiles));
    console.log(' done');
  }

  if (enabledChecks.includes('DENSITY')) {
    process.stdout.write('  [DENSITY]  Checking color density...');
    issues.push(...await checkDensity(pngFiles));
    console.log(' done');
  }

  // ─── Report ───
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  const errors = issues.filter(i => i.level === 'error');
  const warns = issues.filter(i => i.level === 'warn');
  const infos = issues.filter(i => i.level === 'info');

  console.log(`\n${'─'.repeat(60)}`);
  console.log(`  Results: ${errors.length} errors, ${warns.length} warnings, ${infos.length} info (${elapsed}s)\n`);

  const levelIcon = { error: '❌', warn: '⚠️ ', info: 'ℹ️ ' };
  const levelColor = { error: '\x1b[31m', warn: '\x1b[33m', info: '\x1b[36m' };
  const reset = '\x1b[0m';

  // Group by check
  for (const check of allChecks) {
    if (!enabledChecks.includes(check)) {
      console.log(`  ⏭️  [${check}] Skipped`);
      continue;
    }
    const checkIssues = issues.filter(i => i.check === check);
    if (checkIssues.length === 0) {
      console.log(`  ✅ [${check}] All clear`);
      continue;
    }

    console.log(`\n  [${check}] ${checkIssues.length} issues:`);
    for (const issue of checkIssues) {
      console.log(`    ${levelIcon[issue.level]} ${levelColor[issue.level]}${issue.file}${reset}`);
      console.log(`      ${issue.message}`);
      if (options.verbose && issue.detail) {
        console.log(issue.detail);
      }
    }
  }

  console.log('');

  if (errors.length > 0) {
    process.exitCode = 1;
  }
}
