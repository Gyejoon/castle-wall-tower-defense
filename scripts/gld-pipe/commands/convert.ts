/**
 * gld-pipe convert
 *
 * PNG → WebP conversion with quality stats.
 * Absorbs and improves the existing convert-webp.ts.
 */

import sharp from 'sharp';
import { mkdirSync, existsSync, statSync, readFileSync, writeFileSync } from 'fs';
import { join, dirname, relative } from 'path';
import { findPngFiles } from '../lib/image';

const ASSETS_DIR = 'packages/web-shell/public/assets';
const META_FILE = join(ASSETS_DIR, '.webp-meta.json');

interface WebpMeta { quality: number; timestamp: string }

function loadMeta(): WebpMeta | null {
  try { return JSON.parse(readFileSync(META_FILE, 'utf-8')); } catch { return null; }
}

function saveMeta(quality: number): void {
  writeFileSync(META_FILE, JSON.stringify({ quality, timestamp: new Date().toISOString() }));
}

export async function runConvert(options: {
  quality?: number;
  force?: boolean;
  dryRun?: boolean;
}): Promise<void> {
  const quality = Math.max(0, Math.min(100, options.quality ?? 90));

  console.log(`\n🔄 gld-pipe convert (WebP, quality=${quality})\n`);

  const pngFiles = findPngFiles(ASSETS_DIR);
  let converted = 0;
  let skipped = 0;
  let totalSavedBytes = 0;

  // Force reconvert if quality changed since last run
  const prevMeta = loadMeta();
  const qualityChanged = prevMeta !== null && prevMeta.quality !== quality;
  if (qualityChanged) {
    console.log(`  Quality changed (${prevMeta.quality} → ${quality}), reconverting all\n`);
  }

  for (const pngPath of pngFiles) {
    const webpPath = pngPath.replace(/\.png$/, '.webp');

    // Skip if WebP exists, is newer, and quality hasn't changed (unless --force)
    if (!options.force && !qualityChanged && existsSync(webpPath)) {
      const pngMtime = statSync(pngPath).mtimeMs;
      const webpMtime = statSync(webpPath).mtimeMs;
      if (webpMtime >= pngMtime) {
        skipped++;
        continue;
      }
    }

    if (options.dryRun) {
      console.log(`  [dry-run] ${relative('.', pngPath)}`);
      converted++;
      continue;
    }

    const dir = dirname(webpPath);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

    const pngSize = statSync(pngPath).size;

    await sharp(pngPath)
      .webp({ quality, nearLossless: true })
      .toFile(webpPath);

    const webpSize = statSync(webpPath).size;
    totalSavedBytes += pngSize - webpSize;
    converted++;
  }

  // Persist quality for future incremental runs
  if (!options.dryRun) {
    saveMeta(quality);
  }

  const savedKB = (totalSavedBytes / 1024).toFixed(1);
  console.log(`  ✅ Converted: ${converted}, Skipped: ${skipped} (unchanged)`);
  if (!options.dryRun) {
    console.log(`  💾 Saved: ${savedKB}KB total`);
  }
  console.log('');
}
