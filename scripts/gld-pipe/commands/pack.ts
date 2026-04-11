/**
 * gld-pipe pack
 *
 * Pack individual sprites into texture atlases per section.
 * Outputs Phaser JSON Hash format + atlas PNG.
 */

import sharp from 'sharp';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, relative, basename } from 'path';
import { shelfPack, type PackRect } from '../lib/packer';
import type { AssetManifest, AssetManifestSection } from '../../../packages/shared/src/assets/manifest';

const ASSETS_DIR = 'packages/web-shell/public/assets';
const OUTPUT_DIR = 'packages/web-shell/public/assets/atlases';

interface PhaserFrameData {
  frame: { x: number; y: number; w: number; h: number };
  rotated: boolean;
  trimmed: boolean;
  spriteSourceSize: { x: number; y: number; w: number; h: number };
  sourceSize: { w: number; h: number };
}

interface PhaserAtlasJson {
  frames: Record<string, PhaserFrameData>;
  meta: {
    app: string;
    image: string;
    format: string;
    size: { w: number; h: number };
    scale: string;
  };
}

// Sections that benefit from atlas packing (only single-frame images)
const PACKABLE_SECTIONS: AssetManifestSection[] = ['ui', 'icons', 'mobile'];

export async function runPack(options: { dryRun?: boolean; sections?: string[] }): Promise<void> {
  console.log('\n📦 gld-pipe pack\n');

  const manifestPath = join(ASSETS_DIR, 'asset-manifest.json');
  const manifest: AssetManifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));

  const targetSections = options.sections?.map(s => s as AssetManifestSection) ?? PACKABLE_SECTIONS;

  for (const section of targetSections) {
    const entries = manifest.assets.filter(
      a => a.section === section && a.type === 'image'
    );

    if (entries.length < 2) {
      console.log(`  [${section}] ${entries.length} images — skipping (need ≥2)`);
      continue;
    }

    console.log(`  [${section}] ${entries.length} images`);

    // Read all image dimensions
    const rects: (PackRect & { path: string })[] = [];
    for (const entry of entries) {
      try {
        const fullPath = join('packages/web-shell/public', entry.path);
        const meta = await sharp(fullPath).metadata();
        rects.push({
          key: entry.key,
          w: meta.width ?? 0,
          h: meta.height ?? 0,
          path: fullPath,
        });
      } catch {
        console.log(`    ⚠️  Cannot read: ${entry.path}`);
      }
    }

    if (rects.length < 2) {
      console.log(`    Only ${rects.length} readable — skipping`);
      continue;
    }

    // Pack
    try {
      const result = shelfPack(rects);
      console.log(`    Atlas: ${result.width}×${result.height} (${(result.utilization * 100).toFixed(1)}% utilization)`);
      console.log(`    Packed ${result.rects.length}/${rects.length} sprites`);

      if (options.dryRun) {
        console.log('    [dry-run] Skipping file output');
        continue;
      }

      // Composite atlas image
      mkdirSync(OUTPUT_DIR, { recursive: true });
      const atlasFile = `atlas-${section}.png`;
      const jsonFile = `atlas-${section}.json`;

      const composites: sharp.OverlayOptions[] = [];
      for (const rect of result.rects) {
        const r = rect as PackRect & { path: string; x: number; y: number };
        composites.push({
          input: r.path,
          left: r.x,
          top: r.y,
        });
      }

      await sharp({
        create: {
          width: result.width,
          height: result.height,
          channels: 4,
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        },
      })
        .composite(composites)
        .png()
        .toFile(join(OUTPUT_DIR, atlasFile));

      // Generate Phaser JSON Hash
      const frames: Record<string, PhaserFrameData> = {};
      for (const rect of result.rects) {
        frames[rect.key] = {
          frame: { x: rect.x, y: rect.y, w: rect.w, h: rect.h },
          rotated: false,
          trimmed: false,
          spriteSourceSize: { x: 0, y: 0, w: rect.w, h: rect.h },
          sourceSize: { w: rect.w, h: rect.h },
        };
      }

      const atlas: PhaserAtlasJson = {
        frames,
        meta: {
          app: 'gld-pipe',
          image: atlasFile,
          format: 'RGBA8888',
          size: { w: result.width, h: result.height },
          scale: '1',
        },
      };

      writeFileSync(join(OUTPUT_DIR, jsonFile), JSON.stringify(atlas, null, 2));
      console.log(`    ✅ ${join(OUTPUT_DIR, atlasFile)}`);
      console.log(`    ✅ ${join(OUTPUT_DIR, jsonFile)}`);
    } catch (err) {
      console.log(`    ❌ Pack failed: ${err}`);
    }
  }

  console.log('');
}
