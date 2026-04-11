/**
 * gld-pipe convert
 *
 * PNG → WebP conversion with quality stats.
 * Absorbs and improves the existing convert-webp.ts.
 */

import sharp from 'sharp';
import { mkdirSync, existsSync, statSync } from 'fs';
import { dirname, relative } from 'path';
import { findPngFiles } from '../lib/image';

const ASSETS_DIR = 'packages/web-shell/public/assets';

export async function runConvert(options: {
  quality?: number;
  force?: boolean;
  dryRun?: boolean;
}): Promise<void> {
  const quality = options.quality ?? 90;

  console.log(`\n🔄 gld-pipe convert (WebP, quality=${quality})\n`);

  const pngFiles = findPngFiles(ASSETS_DIR);
  let converted = 0;
  let skipped = 0;
  let totalSavedBytes = 0;

  for (const pngPath of pngFiles) {
    const webpPath = pngPath.replace(/\.png$/, '.webp');

    // Skip if WebP exists and is newer (unless --force)
    if (!options.force && existsSync(webpPath)) {
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

  const savedKB = (totalSavedBytes / 1024).toFixed(1);
  console.log(`  ✅ Converted: ${converted}, Skipped: ${skipped} (unchanged)`);
  if (!options.dryRun) {
    console.log(`  💾 Saved: ${savedKB}KB total`);
  }
  console.log('');
}
