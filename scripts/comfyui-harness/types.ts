/**
 * ComfyUI Asset Harness — shared type definitions.
 */

// ── YAML Config Types ──────────────────────────────────────────────

export type WorkflowOverride = 'boss' | 'tileable';

export interface ConfigMeta {
  id: string;
  name: string;
  theme?: string;
}

export interface ConfigStyle {
  prompt_prefix: string;
  negative: string;
  palette?: {
    primary: string[];
    accent: string[];
    highlight?: string[];
  };
  seed?: number;
}

export interface ConfigGeneration {
  checkpoint: string;
  steps: number;
  cfg_scale: number;
  width?: number;  // default 512
  height?: number; // default 512
  sampler?: string; // default 'euler_ancestral'
}

export interface ConfigAnimation {
  motion_module?: string;
  frames: number;
  fps?: number; // default 14
}

export interface ConfigOutput {
  base_size: number; // 128 or 256
  format?: string;   // default 'png'
  spritesheet?: boolean; // default true
}

export interface BossAnimationState {
  state: string;
  prompt_suffix: string;
}

export interface AssetDefinition {
  id: string;
  prompt: string;
  frames?: number;       // override animation.frames
  size?: number;          // override output.base_size
  tileable?: boolean;
  workflow_override?: WorkflowOverride;
  animations?: BossAnimationState[];
}

export interface AssetCategory {
  [category: string]: AssetDefinition[];
}

export interface HarnessConfig {
  meta: ConfigMeta;
  style: ConfigStyle;
  generation: ConfigGeneration;
  animation: ConfigAnimation;
  output: ConfigOutput;
  assets: AssetCategory;
}

// ── Workflow Types ──────────────────────────────────────────────────

export interface ComfyUIWorkflowNode {
  class_type: string;
  inputs: Record<string, string | number | boolean | [string, number]>;
}

export type ComfyUIWorkflow = Record<string, ComfyUIWorkflowNode>;

// ── Pipeline Types ─────────────────────────────────────────────────

export interface ResolvedAsset {
  id: string;
  category: string;
  prompt: string;
  negativePrompt: string;
  frames: number;
  outputSize: number;
  tileable: boolean;
  workflowOverride: WorkflowOverride | null;
  animations: BossAnimationState[];
  /** Full generation config merged from config + asset overrides */
  generation: ConfigGeneration;
  /** Style config from parent config */
  style: ConfigStyle;
  /** Animation config from parent config */
  animation: ConfigAnimation;
}

export interface GenerationResult {
  assetId: string;
  state?: string; // boss animation state
  frames: Buffer[];
  width: number;
  height: number;
}

export interface PostProcessResult {
  assetId: string;
  state?: string;
  processedFrames: Buffer[];
  width: number;
  height: number;
}

export interface QualityReport {
  assetId: string;
  passed: boolean;
  paletteViolationRate: number;
  ssimScore: number;     // avg inter-frame SSIM (1.0 = identical)
  transparencyRate: number;
  issues: string[];
}

export interface SpritesheetResult {
  assetId: string;
  state?: string;
  path: string;
  frameWidth: number;
  frameHeight: number;
  frameCount: number;
}

// ── CLI Options ────────────────────────────────────────────────────

export interface HarnessOptions {
  config: string;
  only?: string;
  dryRun: boolean;
  maxRetries: number;
  verbose: boolean;
}

// ── Constants ──────────────────────────────────────────────────────

export const DEFAULTS = {
  width: 512,
  height: 512,
  sampler: 'euler_ancestral',
  fps: 14,
  format: 'png',
  maxRetries: 3,
  motionModule: 'mm_sd_v15_v2.ckpt',
  controlnetModel: 'control_v11p_sd15_lineart.pth',
} as const;

export const OUTPUT_BASE = 'packages/web-shell/public/assets';
export const ASSET_PATH_PREFIX = 'packages/web-shell/public/';
export const TEMP_DIR = 'scripts/comfyui-harness/.temp';
