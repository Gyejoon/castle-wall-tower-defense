/**
 * Tileable workflow — static image generation (no AnimateDiff).
 * For terrain tiles (grass, dirt, stone) that need seamless tiling.
 */

import type { ComfyUIWorkflow, ResolvedAsset } from '../types';
import { DEFAULTS } from '../types';

export function buildTileableWorkflow(asset: ResolvedAsset): ComfyUIWorkflow {
  const { generation, style } = asset;
  const seed = style.seed ?? Math.floor(Math.random() * 2 ** 32);

  // Tileable: add seamless hint to prompt
  const tilePrompt = `${asset.prompt}, seamless tileable texture, repeating pattern`;

  return {
    // 1. Checkpoint
    '1': {
      class_type: 'CheckpointLoaderSimple',
      inputs: { ckpt_name: generation.checkpoint },
    },

    // 2. Positive
    '2': {
      class_type: 'CLIPTextEncode',
      inputs: {
        text: tilePrompt,
        clip: ['1', 1],
      },
    },

    // 3. Negative
    '3': {
      class_type: 'CLIPTextEncode',
      inputs: {
        text: `${asset.negativePrompt}, asymmetric, uneven edges, seam visible`,
        clip: ['1', 1],
      },
    },

    // 4. Empty latent (single frame, no batch)
    '4': {
      class_type: 'EmptyLatentImage',
      inputs: {
        width: generation.width ?? DEFAULTS.width,
        height: generation.height ?? DEFAULTS.height,
        batch_size: 1,
      },
    },

    // 5. KSampler (no AnimateDiff — static)
    '5': {
      class_type: 'KSampler',
      inputs: {
        model: ['1', 0],
        positive: ['2', 0],
        negative: ['3', 0],
        latent_image: ['4', 0],
        seed,
        steps: generation.steps,
        cfg: generation.cfg_scale,
        sampler_name: generation.sampler ?? DEFAULTS.sampler,
        scheduler: 'normal',
        denoise: 1.0,
      },
    },

    // 6. VAE Decode
    '6': {
      class_type: 'VAEDecode',
      inputs: {
        samples: ['5', 0],
        vae: ['1', 2],
      },
    },

    // 7. Save
    '7': {
      class_type: 'SaveImage',
      inputs: {
        images: ['6', 0],
        filename_prefix: `harness/${asset.id}`,
      },
    },
  };
}
