/**
 * AI Unit Generation via PixelLab
 *
 * Generates 5 unit types with 4-direction walk animations.
 *
 * Usage: Called by ai-generate-all.ts or standalone:
 *   bun run scripts/generate-assets/ai-generate-units.ts
 */

import { mkdirSync, writeFileSync } from 'fs';
import { dirname } from 'path';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import {
  UNIT_PROMPTS,
  UNIT_DEATH_CONFIG,
  PIXELLAB_CONFIG,
  STYLE_PROMPT_PREFIX,
  AI_TEMP_DIR,
  WALK_FRAME_COUNT,
  toSpritesheetManifestEntry,
  type UnitPromptConfig,
} from './ai-config';
import { TILE_SIZE } from './shared';
import { postProcessImage, postProcessSpritesheet, assembleSpritesheetFromFrames, type PostProcessOptions } from './ai-post-process';
import type { ManifestEntry } from './shared';

// === PixelLab API Client ===

interface PixelLabGenerateResponse {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  images?: Array<{ url: string; width: number; height: number }>;
  error?: string;
}

async function pixelLabRequest<T>(endpoint: string, body: Record<string, unknown>): Promise<T> {
  const response = await fetch(`${PIXELLAB_CONFIG.baseUrl}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${PIXELLAB_CONFIG.apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`PixelLab API error (${response.status}): ${errorText}`);
  }

  return response.json() as Promise<T>;
}

async function pixelLabGet<T>(endpoint: string): Promise<T> {
  const response = await fetch(`${PIXELLAB_CONFIG.baseUrl}${endpoint}`, {
    headers: { Authorization: `Bearer ${PIXELLAB_CONFIG.apiKey}` },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`PixelLab API error (${response.status}): ${errorText}`);
  }

  return response.json() as Promise<T>;
}

async function pollPixelLabJob(jobId: string, label: string, timeoutMs: number = 120000): Promise<PixelLabGenerateResponse> {
  const startTime = Date.now();
  let status = await pixelLabGet<PixelLabGenerateResponse>(`/v1/generate/${jobId}`);

  while (status.status !== 'completed' && status.status !== 'failed') {
    if (Date.now() - startTime > timeoutMs) {
      throw new Error(`PixelLab generation timed out for ${label}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 3000));
    status = await pixelLabGet<PixelLabGenerateResponse>(`/v1/generate/${jobId}`);
  }

  if (status.status === 'failed') {
    throw new Error(`PixelLab generation failed for ${label}: ${status.error}`);
  }

  if (!status.images || status.images.length === 0) {
    throw new Error(`No images returned for ${label}`);
  }

  return status;
}

async function downloadToFile(url: string, outputPath: string): Promise<void> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download from ${url}: ${response.status}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, buffer);
}

// === Post-process options (shared across all unit assets) ===
const UNIT_PROCESS_OPTS: PostProcessOptions = {
  targetWidth: TILE_SIZE,
  targetHeight: TILE_SIZE,
  applyPaletteMapping: true,
  dithering: false,
};

// === Generation ===

async function generateUnit(config: UnitPromptConfig): Promise<ManifestEntry> {
  console.log(`  generating unit: ${config.key} (${config.name})`);

  const tempDir = `${AI_TEMP_DIR}/units`;
  mkdirSync(tempDir, { recursive: true });

  const result = await pixelLabRequest<PixelLabGenerateResponse>(
    '/v1/generate/character',
    {
      prompt: `${STYLE_PROMPT_PREFIX}, ${config.description}, walk cycle animation, ${WALK_FRAME_COUNT} frames`,
      size: PIXELLAB_CONFIG.defaultSize,
      directions: config.directions,
      animation: 'walk',
      frames: WALK_FRAME_COUNT,
      style: 'pixel_art',
    },
  );

  const completed = await pollPixelLabJob(result.id, config.key);
  console.log(`    received ${completed.images!.length} frame(s)`);

  const tempPaths: string[] = [];
  for (let i = 0; i < completed.images!.length; i++) {
    const tempPath = `${tempDir}/${config.key}-frame${i}.png`;
    await downloadToFile(completed.images![i].url, tempPath);
    tempPaths.push(tempPath);
  }

  if (tempPaths.length === 1) {
    await postProcessSpritesheet(tempPaths[0], config.outputPath, WALK_FRAME_COUNT, UNIT_PROCESS_OPTS);
  } else {
    const processedFrames = [];

    for (const tempPath of tempPaths) {
      const processedPath = tempPath + '-processed.png';
      await postProcessImage(tempPath, processedPath, UNIT_PROCESS_OPTS);

      const img = await loadImage(processedPath);
      const frameCanvas = createCanvas(TILE_SIZE, TILE_SIZE);
      const frameCtx = frameCanvas.getContext('2d');
      frameCtx.drawImage(img, 0, 0);
      processedFrames.push(frameCanvas);
    }

    while (processedFrames.length < WALK_FRAME_COUNT) {
      processedFrames.push(processedFrames[processedFrames.length - 1]);
    }

    const sheet = assembleSpritesheetFromFrames(processedFrames.slice(0, WALK_FRAME_COUNT), TILE_SIZE, TILE_SIZE);
    mkdirSync(dirname(config.outputPath), { recursive: true });
    writeFileSync(config.outputPath, sheet.toBuffer('image/png'));
    console.log(`    assembled spritesheet: ${config.outputPath}`);
  }

  return toSpritesheetManifestEntry(config.key, config.outputPath, WALK_FRAME_COUNT);
}

async function generateDeathAnimation(): Promise<ManifestEntry> {
  console.log('  generating unit death animation');

  const config = UNIT_DEATH_CONFIG;
  const tempPath = `${AI_TEMP_DIR}/units/unit-death-raw.png`;
  mkdirSync(dirname(tempPath), { recursive: true });

  const result = await pixelLabRequest<PixelLabGenerateResponse>(
    '/v1/generate/animation',
    {
      prompt: `${STYLE_PROMPT_PREFIX}, death poof animation, smoke dissipating, ${WALK_FRAME_COUNT} frames, small explosion then fade`,
      size: PIXELLAB_CONFIG.defaultSize,
      frames: WALK_FRAME_COUNT,
      style: 'pixel_art',
    },
  );

  const completed = await pollPixelLabJob(result.id, config.key);
  await downloadToFile(completed.images![0].url, tempPath);

  await postProcessSpritesheet(tempPath, config.outputPath, config.frameCount, UNIT_PROCESS_OPTS);

  return toSpritesheetManifestEntry(config.key, config.outputPath, config.frameCount);
}

// === Export ===

export async function generate(): Promise<ManifestEntry[]> {
  console.log('Generating AI units via PixelLab...');

  if (!PIXELLAB_CONFIG.apiKey) {
    console.warn('  WARNING: PIXELLAB_API_KEY not set. Skipping AI unit generation.');
    return [];
  }

  try {
    const response = await fetch(`${PIXELLAB_CONFIG.baseUrl}/v1/health`, {
      headers: { Authorization: `Bearer ${PIXELLAB_CONFIG.apiKey}` },
    });
    if (!response.ok) throw new Error('PixelLab API not responding');
    console.log('  PixelLab API connected');
  } catch {
    console.warn('  WARNING: PixelLab API not available. Skipping AI unit generation.');
    return [];
  }

  const unitResults = await Promise.allSettled(
    UNIT_PROMPTS.map((config) => generateUnit(config)),
  );

  const entries: ManifestEntry[] = [];
  for (let i = 0; i < unitResults.length; i++) {
    const result = unitResults[i];
    if (result.status === 'fulfilled') {
      entries.push(result.value);
    } else {
      console.error(`  ERROR generating unit ${UNIT_PROMPTS[i].key}:`, result.reason);
    }
  }

  try {
    const deathEntry = await generateDeathAnimation();
    entries.push(deathEntry);
  } catch (err) {
    console.error('  ERROR generating death animation:', err);
  }

  return entries;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  generate()
    .then((entries) => console.log(`\nGenerated ${entries.length} unit assets`))
    .catch((err) => { console.error(err); process.exit(1); });
}
