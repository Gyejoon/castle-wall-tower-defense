/**
 * gld-pipe scale
 *
 * Upscale pixel art assets using EPX/Scale2x algorithm.
 * Preserves sharp edges unlike bilinear/bicubic interpolation.
 */

import sharp from 'sharp';
import { readFileSync, mkdirSync } from 'fs';
import { join, relative, dirname } from 'path';
import { findPngFiles } from '../lib/image';
import type { AssetManifest } from '../../../packages/shared/src/assets/manifest';

const ASSETS_DIR = 'packages/web-shell/public/assets';

/**
 * EPX / Scale2x algorithm
 *
 * For each pixel P with neighbors:
 *     A
 *   C P B
 *     D
 *
 * Output 2×2 block:
 *   1 = (C==A && C!=D && A!=B) ? A : P
 *   2 = (A==B && A!=C && B!=D) ? B : P
 *   3 = (D==C && D!=B && C!=A) ? C : P
 *   4 = (B==D && B!=A && D!=C) ? D : P
 */
function scale2x(
  src: Uint8Array,
  srcW: number,
  srcH: number,
): { data: Uint8Array; width: number; height: number } {
  const dstW = srcW * 2;
  const dstH = srcH * 2;
  const dst = new Uint8Array(dstW * dstH * 4);

  const getIdx = (x: number, y: number) => (y * srcW + x) * 4;
  const eq = (i1: number, i2: number) =>
    src[i1] === src[i2] && src[i1 + 1] === src[i2 + 1] &&
    src[i1 + 2] === src[i2 + 2] && src[i1 + 3] === src[i2 + 3];

  const copyPixel = (dstIdx: number, srcIdx: number) => {
    dst[dstIdx] = src[srcIdx];
    dst[dstIdx + 1] = src[srcIdx + 1];
    dst[dstIdx + 2] = src[srcIdx + 2];
    dst[dstIdx + 3] = src[srcIdx + 3];
  };

  for (let y = 0; y < srcH; y++) {
    for (let x = 0; x < srcW; x++) {
      const P = getIdx(x, y);
      const A = y > 0 ? getIdx(x, y - 1) : P;
      const B = x < srcW - 1 ? getIdx(x + 1, y) : P;
      const C = x > 0 ? getIdx(x - 1, y) : P;
      const D = y < srcH - 1 ? getIdx(x, y + 1) : P;

      const dstBase = ((y * 2) * dstW + (x * 2)) * 4;

      // Pixel 1 (top-left)
      copyPixel(dstBase,
        (eq(C, A) && !eq(C, D) && !eq(A, B)) ? A : P);
      // Pixel 2 (top-right)
      copyPixel(dstBase + 4,
        (eq(A, B) && !eq(A, C) && !eq(B, D)) ? B : P);
      // Pixel 3 (bottom-left)
      copyPixel(dstBase + dstW * 4,
        (eq(D, C) && !eq(D, B) && !eq(C, A)) ? C : P);
      // Pixel 4 (bottom-right)
      copyPixel(dstBase + dstW * 4 + 4,
        (eq(B, D) && !eq(B, A) && !eq(D, C)) ? D : P);
    }
  }

  return { data: dst, width: dstW, height: dstH };
}

export async function runScale(options: {
  factor?: number;
  outDir?: string;
  include?: string[];
  dryRun?: boolean;
}): Promise<void> {
  const factor = options.factor ?? 2;
  const outDir = options.outDir ?? join(ASSETS_DIR, `@${factor}x`);

  console.log(`\n🔎 gld-pipe scale (${factor}x EPX/Scale2x)\n`);

  if (factor !== 2) {
    // For 4x, apply Scale2x twice
    if (factor !== 4) {
      console.log('  Only 2x and 4x supported (Scale2x applied 1 or 2 times)');
      return;
    }
  }

  const pngFiles = findPngFiles(ASSETS_DIR)
    .filter(f => !f.includes('/vendor/') && !f.includes('/@'));

  const filteredFiles = options.include
    ? pngFiles.filter(f => options.include!.some(pat => f.includes(pat)))
    : pngFiles;

  console.log(`  ${filteredFiles.length} files to scale\n`);

  if (options.dryRun) {
    for (const f of filteredFiles.slice(0, 10)) {
      console.log(`    [dry-run] ${relative('.', f)}`);
    }
    if (filteredFiles.length > 10) console.log(`    ... and ${filteredFiles.length - 10} more`);
    return;
  }

  // Load manifest to detect spritesheets and scale them frame-by-frame
  const manifestPath = join(ASSETS_DIR, 'asset-manifest.json');
  let manifest: AssetManifest | null = null;
  try {
    manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
  } catch { /* proceed without manifest */ }

  const spritesheetMap = new Map<string, { frameWidth: number; frameHeight: number }>();
  if (manifest) {
    for (const entry of manifest.assets) {
      if (entry.type === 'spritesheet' && entry.frameWidth && entry.frameHeight) {
        const fullPath = join('packages/web-shell/public', entry.path);
        spritesheetMap.set(fullPath, { frameWidth: entry.frameWidth, frameHeight: entry.frameHeight });
      }
    }
  }

  let processed = 0;
  let skippedSheets = 0;
  for (const file of filteredFiles) {
    const relPath = relative(ASSETS_DIR, file);
    const outPath = join(outDir, relPath);
    mkdirSync(dirname(outPath), { recursive: true });

    const { data, info } = await sharp(file)
      .raw()
      .ensureAlpha()
      .toBuffer({ resolveWithObject: true });

    const src = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
    const sheetInfo = spritesheetMap.get(file);

    if (sheetInfo) {
      // Spritesheet: scale each frame individually, then reassemble
      const fw = sheetInfo.frameWidth;
      const fh = sheetInfo.frameHeight;
      const cols = Math.floor(info.width / fw);
      const rows = Math.floor(info.height / fh);

      if (cols === 0 || rows === 0) {
        skippedSheets++;
        continue;
      }

      const scaledFw = fw * factor;
      const scaledFh = fh * factor;
      const dstW = cols * scaledFw;
      const dstH = rows * scaledFh;
      const dst = new Uint8Array(dstW * dstH * 4);

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          // Extract frame
          const frame = new Uint8Array(fw * fh * 4);
          for (let y = 0; y < fh; y++) {
            const srcOffset = ((row * fh + y) * info.width + col * fw) * 4;
            const dstOffset = y * fw * 4;
            frame.set(src.subarray(srcOffset, srcOffset + fw * 4), dstOffset);
          }

          // Scale frame
          let scaled = scale2x(frame, fw, fh);
          if (factor === 4) {
            scaled = scale2x(scaled.data, scaled.width, scaled.height);
          }

          // Place scaled frame into destination
          for (let y = 0; y < scaledFh; y++) {
            const srcOff = y * scaledFw * 4;
            const dstOff = ((row * scaledFh + y) * dstW + col * scaledFw) * 4;
            dst.set(scaled.data.subarray(srcOff, srcOff + scaledFw * 4), dstOff);
          }
        }
      }

      await sharp(Buffer.from(dst.buffer), {
        raw: { width: dstW, height: dstH, channels: 4 },
      })
        .png()
        .toFile(outPath);
    } else {
      // Single image: scale as whole
      let result = scale2x(src, info.width, info.height);
      if (factor === 4) {
        result = scale2x(result.data, result.width, result.height);
      }

      await sharp(Buffer.from(result.data.buffer), {
        raw: { width: result.width, height: result.height, channels: 4 },
      })
        .png()
        .toFile(outPath);
    }

    processed++;
    if (processed % 50 === 0) {
      console.log(`  ${processed}/${filteredFiles.length} processed...`);
    }
  }

  if (skippedSheets > 0) {
    console.log(`  ⚠️  ${skippedSheets} spritesheets skipped (invalid frame dimensions)`);
  }
  console.log(`\n  ✅ ${processed} files scaled to ${factor}x → ${outDir}\n`);
}
