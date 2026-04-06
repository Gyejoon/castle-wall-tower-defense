/**
 * Master workflow — AnimateDiff-based animated sprite generation.
 * Used for towers, units, general structures, decorations.
 *
 * Flow: CheckpointLoader → CLIP(+/-) → AnimateDiff → KSampler → VAEDecode → output
 */

import type { ComfyUIWorkflow, ResolvedAsset } from '../types';
import { DEFAULTS } from '../types';

export function buildMasterWorkflow(asset: ResolvedAsset): ComfyUIWorkflow {
  const { generation, animation, style } = asset;
  const seed = style.seed ?? Math.floor(Math.random() * 2 ** 32);
  const motionModule = animation.motion_module ?? DEFAULTS.motionModule;

  return {
    // 1. Load checkpoint
    '1': {
      class_type: 'CheckpointLoaderSimple',
      inputs: {
        ckpt_name: generation.checkpoint,
      },
    },

    // 2. Positive prompt
    '2': {
      class_type: 'CLIPTextEncode',
      inputs: {
        text: asset.prompt,
        clip: ['1', 1],
      },
    },

    // 3. Negative prompt
    '3': {
      class_type: 'CLIPTextEncode',
      inputs: {
        text: asset.negativePrompt,
        clip: ['1', 1],
      },
    },

    // 4. Empty latent (sized for animation frames)
    '4': {
      class_type: 'EmptyLatentImage',
      inputs: {
        width: generation.width ?? DEFAULTS.width,
        height: generation.height ?? DEFAULTS.height,
        batch_size: asset.frames,
      },
    },

    // 5. AnimateDiff loader
    '5': {
      class_type: 'ADE_AnimateDiffLoaderWithContext',
      inputs: {
        model: ['1', 0],
        model_name: motionModule,
        beta_schedule: 'sqrt_linear (AnimateDiff)',
        context_options: ['6', 0],
      },
    },

    // 6. AnimateDiff context
    '6': {
      class_type: 'ADE_StandardStaticContextOptions',
      inputs: {
        context_length: 16,
        context_stride: 1,
        context_overlap: 4,
        context_schedule: 'uniform',
        closed_loop: false,
      },
    },

    // 7. KSampler
    '7': {
      class_type: 'KSampler',
      inputs: {
        model: ['5', 0],
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

    // 8. VAE Decode
    '8': {
      class_type: 'VAEDecode',
      inputs: {
        samples: ['7', 0],
        vae: ['1', 2],
      },
    },

    // 9. Save frames
    '9': {
      class_type: 'SaveImage',
      inputs: {
        images: ['8', 0],
        filename_prefix: `harness/${asset.id}`,
      },
    },
  };
}
