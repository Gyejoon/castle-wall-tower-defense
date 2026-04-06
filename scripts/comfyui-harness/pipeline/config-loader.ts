/**
 * YAML config loader + validation for ComfyUI harness.
 */

import { readFileSync } from 'fs';
import { parse as parseYaml } from 'yaml';
import type {
  HarnessConfig,
  AssetDefinition,
  AssetCategory,
  ResolvedAsset,
  ConfigStyle,
  ConfigGeneration,
  ConfigAnimation,
  ConfigOutput,
  ConfigMeta,
} from '../types';
import { DEFAULTS } from '../types';

// ── Loader ─────────────────────────────────────────────────────────

export function loadConfig(configPath: string): HarnessConfig {
  const raw = readFileSync(configPath, 'utf-8');
  const parsed = parseYaml(raw);
  if (parsed == null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(`Config must be a YAML object, got ${typeof parsed} in ${configPath}`);
  }
  return validateConfig(parsed as Record<string, unknown>, configPath);
}

// ── Validation ─────────────────────────────────────────────────────

function validateConfig(raw: Record<string, unknown>, path: string): HarnessConfig {
  const errors: string[] = [];

  const meta = validateMeta(raw.meta, errors);
  const style = validateStyle(raw.style, errors);
  const generation = validateGeneration(raw.generation, errors);
  const animation = validateAnimation(raw.animation, errors);
  const output = validateOutput(raw.output, errors);
  const assets = validateAssets(raw.assets, errors);

  if (errors.length > 0) {
    throw new Error(`Config validation failed for ${path}:\n  - ${errors.join('\n  - ')}`);
  }

  return { meta, style, generation, animation, output, assets };
}

function validateMeta(raw: unknown, errors: string[]): ConfigMeta {
  const obj = expectObject(raw, 'meta', errors);
  if (!obj) return { id: '', name: '' };

  requireString(obj, 'id', 'meta.id', errors);
  requireString(obj, 'name', 'meta.name', errors);

  return {
    id: String(obj.id ?? ''),
    name: String(obj.name ?? ''),
    theme: obj.theme != null ? String(obj.theme) : undefined,
  };
}

function validateStyle(raw: unknown, errors: string[]): ConfigStyle {
  const obj = expectObject(raw, 'style', errors);
  if (!obj) return { prompt_prefix: '', negative: '' };

  requireString(obj, 'prompt_prefix', 'style.prompt_prefix', errors);
  requireString(obj, 'negative', 'style.negative', errors);

  return {
    prompt_prefix: String(obj.prompt_prefix ?? ''),
    negative: String(obj.negative ?? ''),
    palette: validatePalette(obj.palette, errors),
    seed: typeof obj.seed === 'number' ? obj.seed : undefined,
  };
}

function validateGeneration(raw: unknown, errors: string[]): ConfigGeneration {
  const obj = expectObject(raw, 'generation', errors);
  if (!obj) return { checkpoint: '', steps: 20, cfg_scale: 7 };

  requireString(obj, 'checkpoint', 'generation.checkpoint', errors);
  requireNumber(obj, 'steps', 'generation.steps', errors);
  requireNumber(obj, 'cfg_scale', 'generation.cfg_scale', errors);

  return {
    checkpoint: String(obj.checkpoint ?? ''),
    steps: Number(obj.steps ?? 20),
    cfg_scale: Number(obj.cfg_scale ?? 7),
    width: typeof obj.width === 'number' ? obj.width : DEFAULTS.width,
    height: typeof obj.height === 'number' ? obj.height : DEFAULTS.height,
    sampler: typeof obj.sampler === 'string' ? obj.sampler : DEFAULTS.sampler,
  };
}

function validateAnimation(raw: unknown, errors: string[]): ConfigAnimation {
  const obj = expectObject(raw, 'animation', errors);
  if (!obj) return { frames: 8 };

  requireNumber(obj, 'frames', 'animation.frames', errors);

  return {
    motion_module: typeof obj.motion_module === 'string' ? obj.motion_module : undefined,
    frames: Number(obj.frames ?? 8),
    fps: typeof obj.fps === 'number' ? obj.fps : DEFAULTS.fps,
  };
}

function validateOutput(raw: unknown, errors: string[]): ConfigOutput {
  const obj = expectObject(raw, 'output', errors);
  if (!obj) return { base_size: 128 };

  requireNumber(obj, 'base_size', 'output.base_size', errors);

  return {
    base_size: Number(obj.base_size ?? 128),
    format: typeof obj.format === 'string' ? obj.format : DEFAULTS.format,
    spritesheet: typeof obj.spritesheet === 'boolean' ? obj.spritesheet : true,
  };
}

function validateAssets(raw: unknown, errors: string[]): AssetCategory {
  const obj = expectObject(raw, 'assets', errors);
  if (!obj) return {};

  const result: AssetCategory = {};

  for (const [category, items] of Object.entries(obj)) {
    if (!Array.isArray(items)) {
      errors.push(`assets.${category} must be an array`);
      continue;
    }
    result[category] = items.map((item, i) => {
      const assetObj = item as Record<string, unknown>;
      if (!assetObj.id) errors.push(`assets.${category}[${i}].id is required`);
      if (!assetObj.prompt && !assetObj.animations) {
        errors.push(`assets.${category}[${i}] requires prompt or animations`);
      }
      return {
        id: String(assetObj.id ?? ''),
        prompt: String(assetObj.prompt ?? ''),
        frames: typeof assetObj.frames === 'number' ? assetObj.frames : undefined,
        size: typeof assetObj.size === 'number' ? assetObj.size : undefined,
        tileable: assetObj.tileable === true,
        workflow_override: validateWorkflowOverride(assetObj.workflow_override, `assets.${category}[${i}]`, errors),
        animations: Array.isArray(assetObj.animations) ? assetObj.animations : undefined,
      } satisfies AssetDefinition;
    });
  }

  return result;
}

// ── Resolution ─────────────────────────────────────────────────────

export function resolveAssets(config: HarnessConfig, only?: string): ResolvedAsset[] {
  const resolved: ResolvedAsset[] = [];

  for (const [category, assets] of Object.entries(config.assets)) {
    for (const asset of assets) {
      if (only && asset.id !== only) continue;

      resolved.push({
        id: asset.id,
        category,
        prompt: buildPrompt(config.style, asset),
        negativePrompt: config.style.negative,
        frames: asset.frames ?? config.animation.frames,
        outputSize: asset.size ?? config.output.base_size,
        tileable: asset.tileable ?? false,
        workflowOverride: asset.workflow_override ?? null,
        animations: asset.animations ?? [],
        generation: config.generation,
        style: config.style,
        animation: config.animation,
      });
    }
  }

  if (only && resolved.length === 0) {
    throw new Error(`Asset "${only}" not found in config`);
  }

  return resolved;
}

function buildPrompt(style: ConfigStyle, asset: AssetDefinition): string {
  return `${style.prompt_prefix}, ${asset.prompt}`;
}

// ── Helpers ────────────────────────────────────────────────────────

function expectObject(
  raw: unknown,
  field: string,
  errors: string[],
): Record<string, unknown> | null {
  if (raw == null || typeof raw !== 'object' || Array.isArray(raw)) {
    errors.push(`${field} is required and must be an object`);
    return null;
  }
  return raw as Record<string, unknown>;
}

function requireString(obj: Record<string, unknown>, key: string, path: string, errors: string[]): void {
  if (typeof obj[key] !== 'string' || (obj[key] as string).length === 0) {
    errors.push(`${path} is required (string)`);
  }
}

function requireNumber(obj: Record<string, unknown>, key: string, path: string, errors: string[]): void {
  if (typeof obj[key] !== 'number') {
    errors.push(`${path} is required (number)`);
  }
}

const VALID_WORKFLOW_OVERRIDES = new Set(['boss', 'tileable']);

function validateWorkflowOverride(
  value: unknown,
  path: string,
  errors: string[],
): AssetDefinition['workflow_override'] {
  if (value == null) return undefined;
  if (typeof value === 'string' && VALID_WORKFLOW_OVERRIDES.has(value)) {
    return value as AssetDefinition['workflow_override'];
  }
  errors.push(`${path}.workflow_override must be 'boss' or 'tileable', got '${value}'`);
  return undefined;
}

const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;

function validatePalette(raw: unknown, errors: string[]): ConfigStyle['palette'] {
  if (raw == null) return undefined;
  if (typeof raw !== 'object' || Array.isArray(raw)) {
    errors.push('style.palette must be an object');
    return undefined;
  }

  const obj = raw as Record<string, unknown>;

  function validateHexArray(arr: unknown, field: string): string[] {
    if (!Array.isArray(arr)) {
      errors.push(`style.palette.${field} must be an array`);
      return [];
    }
    return arr.filter((v, i) => {
      if (typeof v !== 'string' || !HEX_COLOR_RE.test(v)) {
        errors.push(`style.palette.${field}[${i}] must be #RRGGBB hex, got '${v}'`);
        return false;
      }
      return true;
    }) as string[];
  }

  return {
    primary: validateHexArray(obj.primary, 'primary'),
    accent: validateHexArray(obj.accent, 'accent'),
    highlight: obj.highlight != null ? validateHexArray(obj.highlight, 'highlight') : undefined,
  };
}
