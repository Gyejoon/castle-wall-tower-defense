/**
 * AI Tower Generation via ComfyUI
 *
 * Generates 9 tower types (static + fire animation) using Stable Diffusion.
 *
 * Usage: Called by ai-generate-all.ts or standalone:
 *   bun run scripts/generate-assets/ai-generate-towers.ts
 */

import { mkdirSync } from 'fs';
import { dirname } from 'path';
import {
  TOWER_PROMPTS,
  COMFYUI_CONFIG,
  AI_TEMP_DIR,
  toManifestEntry,
  type AssetPromptConfig,
} from './ai-config';
import { queuePrompt, waitForCompletion, downloadImage, checkAvailable, type ComfyUIWorkflow } from './comfyui-client';
import { postProcessImage, postProcessSpritesheet } from './ai-post-process';
import type { ManifestEntry } from './shared';

function buildTowerWorkflow(config: AssetPromptConfig): ComfyUIWorkflow {
  const isSpritesheet = config.type === 'spritesheet';
  const outputWidth = isSpritesheet ? COMFYUI_CONFIG.width * config.frameCount : COMFYUI_CONFIG.width;

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
      inputs: { width: outputWidth, height: COMFYUI_CONFIG.height, batch_size: 1 },
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
      inputs: { filename_prefix: `ai-tower-${config.key}`, images: ['8', 0] },
    },
  };
}

async function generateTower(config: AssetPromptConfig): Promise<ManifestEntry> {
  console.log(`  generating tower: ${config.key}`);

  const tempPath = `${AI_TEMP_DIR}/${config.key}-raw.png`;
  mkdirSync(dirname(tempPath), { recursive: true });

  const promptId = await queuePrompt(buildTowerWorkflow(config));
  console.log(`    queued prompt: ${promptId}`);

  const result = await waitForCompletion(promptId);
  const outputs = Object.values(result.outputs);
  if (outputs.length === 0 || outputs[0].images.length === 0) {
    throw new Error(`No output images for tower ${config.key}`);
  }

  const image = outputs[0].images[0];
  await downloadImage(image.filename, image.subfolder, tempPath);

  const processOpts = {
    targetWidth: config.frameWidth,
    targetHeight: config.frameHeight,
    applyPaletteMapping: true,
    dithering: false,
  };

  if (config.type === 'spritesheet') {
    await postProcessSpritesheet(tempPath, config.outputPath, config.frameCount, processOpts);
  } else {
    await postProcessImage(tempPath, config.outputPath, processOpts);
  }

  return toManifestEntry(config);
}

export async function generate(): Promise<ManifestEntry[]> {
  console.log('Generating AI towers via ComfyUI...');

  if (!(await checkAvailable())) {
    console.warn('  WARNING: ComfyUI not available. Skipping AI tower generation.');
    console.warn(`  Start ComfyUI at ${COMFYUI_CONFIG.url} to enable AI generation.`);
    return [];
  }
  console.log('  ComfyUI connected');

  const results = await Promise.allSettled(
    TOWER_PROMPTS.map((config) => generateTower(config)),
  );

  const entries: ManifestEntry[] = [];
  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    if (result.status === 'fulfilled') {
      entries.push(result.value);
    } else {
      console.error(`  ERROR generating tower ${TOWER_PROMPTS[i].key}:`, result.reason);
    }
  }

  return entries;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  generate()
    .then((entries) => console.log(`\nGenerated ${entries.length} tower assets`))
    .catch((err) => { console.error(err); process.exit(1); });
}
