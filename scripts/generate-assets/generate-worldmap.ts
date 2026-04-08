/**
 * World Map Asset Generation via ComfyUI
 *
 * Generates:
 * - worldmap-bg.png (512x768) — full world map background
 * - landmark-{stage_id}.png (96x96) — stage landmark icons
 *
 * Falls back to @napi-rs/canvas placeholders when ComfyUI is unavailable.
 *
 * Usage: bun run scripts/generate-assets/generate-worldmap.ts
 */

import { loadImage } from '@napi-rs/canvas';
import { mkdirSync } from 'fs';
import { dirname } from 'path';
import {
  AI_TEMP_DIR,
  COMFYUI_CONFIG,
  WORLDMAP_PROMPTS,
  toManifestEntry,
  type AssetPromptConfig,
} from './ai-config';
import {
  checkAvailable,
  downloadImage,
  queuePrompt,
  waitForCompletion,
  type ComfyUIWorkflow,
} from './comfyui-client';
import {
  PALETTE,
  drawRect,
  makeCanvas,
  saveCanvas,
  type ManifestEntry,
} from './shared';

const OUTPUT_DIR = 'packages/web-shell/public/assets/ui';

function buildWorkflow(
  config: AssetPromptConfig,
  width: number,
  height: number,
): ComfyUIWorkflow {
  return {
    '3': {
      class_type: 'KSampler',
      inputs: {
        seed: Math.floor(Math.random() * 2 ** 32),
        steps: COMFYUI_CONFIG.steps,
        cfg: COMFYUI_CONFIG.cfgScale,
        sampler_name: COMFYUI_CONFIG.sampler,
        scheduler: 'normal',
        denoise: 1.0,
        model: ['4', 0],
        positive: ['6', 0],
        negative: ['7', 0],
        latent_image: ['5', 0],
      },
    },
    '4': {
      class_type: 'CheckpointLoaderSimple',
      inputs: { ckpt_name: COMFYUI_CONFIG.model },
    },
    '5': {
      class_type: 'EmptyLatentImage',
      inputs: { width, height, batch_size: 1 },
    },
    '6': {
      class_type: 'CLIPTextEncode',
      inputs: { text: config.prompt, clip: ['4', 1] },
    },
    '7': {
      class_type: 'CLIPTextEncode',
      inputs: { text: config.negativePrompt, clip: ['4', 1] },
    },
    '8': {
      class_type: 'VAEDecode',
      inputs: { samples: ['3', 0], vae: ['4', 2] },
    },
    '9': {
      class_type: 'SaveImage',
      inputs: {
        filename_prefix: `ai-worldmap-${config.key}`,
        images: ['8', 0],
      },
    },
  };
}

async function generateAsset(config: AssetPromptConfig): Promise<ManifestEntry> {
  console.log(`  generating: ${config.key}`);

  const isBackground = config.key === 'ui-worldmap-bg';
  const genWidth = isBackground ? 512 : 512;
  const genHeight = isBackground ? 768 : 512;

  const tempPath = `${AI_TEMP_DIR}/${config.key}-raw.png`;
  mkdirSync(dirname(tempPath), { recursive: true });

  const promptId = await queuePrompt(buildWorkflow(config, genWidth, genHeight));
  console.log(`    queued prompt: ${promptId}`);

  const result = await waitForCompletion(promptId);
  const outputs = Object.values(result.outputs);
  if (outputs.length === 0 || outputs[0].images.length === 0) {
    throw new Error(`No output images for ${config.key}`);
  }

  const image = outputs[0].images[0];
  await downloadImage(image.filename, image.subfolder, tempPath);

  mkdirSync(dirname(config.outputPath), { recursive: true });

  if (isBackground) {
    // Background: use as-is (already 512x768)
    const { writeFileSync, readFileSync } = await import('fs');
    writeFileSync(config.outputPath, readFileSync(tempPath));
  } else {
    // Landmarks: resize from 512x512 to 96x96 with nearest-neighbor
    const src = await loadImage(tempPath);
    const { canvas, ctx } = makeCanvas(96, 96);
    ctx.drawImage(src, 0, 0, 96, 96);
    saveCanvas(canvas, config.outputPath);
  }

  return toManifestEntry(config);
}

function generatePlaceholders(): ManifestEntry[] {
  console.log('  ComfyUI unavailable — generating placeholders');
  mkdirSync(OUTPUT_DIR, { recursive: true });

  const entries: ManifestEntry[] = [];

  for (const config of WORLDMAP_PROMPTS) {
    const isBackground = config.key === 'ui-worldmap-bg';
    const w = isBackground ? 512 : 96;
    const h = isBackground ? 768 : 96;

    const { canvas, ctx } = makeCanvas(w, h);

    if (isBackground) {
      // Dark parchment background
      drawRect(ctx, 0, 0, w, h, '#2a2218');
      // Forest zone (bottom)
      drawRect(ctx, 0, Math.floor(h * 0.6), w, Math.floor(h * 0.4), '#1a3a10');
      // Lava zone (middle-left)
      drawRect(ctx, 0, Math.floor(h * 0.3), Math.floor(w * 0.5), Math.floor(h * 0.3), '#3a1808');
      // Storm zone (top-right)
      drawRect(ctx, Math.floor(w * 0.5), 0, Math.floor(w * 0.5), Math.floor(h * 0.3), '#1a2040');
    } else {
      // Landmark placeholder: colored square with border
      const colors: Record<string, string> = {
        'ui-landmark-forest_gate': '#4a8a2a',
        'ui-landmark-lava_fortress': '#c04020',
        'ui-landmark-storm_citadel': '#5a6aaa',
      };
      const color = colors[config.key] ?? PALETTE.gold;
      drawRect(ctx, 0, 0, w, h, '#2a1f14');
      drawRect(ctx, 4, 4, w - 8, h - 8, color);
      drawRect(ctx, 8, 8, w - 16, w - 16, '#2a1f14');
      // Center dot
      drawRect(ctx, Math.floor(w / 2) - 4, Math.floor(h / 2) - 4, 8, 8, color);
    }

    saveCanvas(canvas, config.outputPath);
    entries.push(toManifestEntry(config));
  }

  return entries;
}

export async function generate(): Promise<ManifestEntry[]> {
  console.log('Generating world map assets...');

  if (!(await checkAvailable())) {
    console.warn(
      `  WARNING: ComfyUI not available at ${COMFYUI_CONFIG.url}. Using placeholders.`,
    );
    return generatePlaceholders();
  }
  console.log('  ComfyUI connected');

  const results = await Promise.allSettled(
    WORLDMAP_PROMPTS.map((config) => generateAsset(config)),
  );

  const entries: ManifestEntry[] = [];
  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    if (result.status === 'fulfilled') {
      entries.push(result.value);
    } else {
      console.error(
        `  ERROR generating ${WORLDMAP_PROMPTS[i].key}:`,
        result.reason,
      );
    }
  }

  return entries;
}

if (import.meta.main) {
  generate()
    .then((entries) => console.log(`\nGenerated ${entries.length} world map assets`))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
