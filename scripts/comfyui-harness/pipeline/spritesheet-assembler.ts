/**
 * Spritesheet assembler — combines individual frames into a horizontal spritesheet.
 */

import { createCanvas, loadImage } from '@napi-rs/canvas';
import { writeFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import type { PostProcessResult, SpritesheetResult, ResolvedAsset } from '../types';
import { OUTPUT_BASE } from '../types';

/**
 * Assemble processed frames into a horizontal spritesheet.
 */
export async function assembleSpritesheet(
  result: PostProcessResult,
  asset: ResolvedAsset,
  mapId?: string,
  state?: string,
): Promise<SpritesheetResult> {
  const { processedFrames, width, height } = result;
  const frameCount = processedFrames.length;

  const sheetWidth = width * frameCount;
  const sheetHeight = height;
  const canvas = createCanvas(sheetWidth, sheetHeight);
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  for (let i = 0; i < frameCount; i++) {
    const img = await loadImage(processedFrames[i]);
    ctx.drawImage(img, i * width, 0, width, height);
  }

  const outputPath = resolveOutputPath(asset, mapId, state);
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, canvas.toBuffer('image/png'));

  console.log(`  spritesheet: ${outputPath} (${sheetWidth}x${sheetHeight}, ${frameCount} frames)`);

  return {
    assetId: asset.id,
    state,
    path: outputPath,
    frameWidth: width,
    frameHeight: height,
    frameCount,
  };
}

/**
 * For single-frame assets (tileable tiles), save directly without spritesheet assembly.
 */
export async function saveSingleFrame(
  result: PostProcessResult,
  asset: ResolvedAsset,
  mapId?: string,
): Promise<SpritesheetResult> {
  const frame = result.processedFrames[0];
  if (!frame) throw new Error(`No frames to save for asset ${asset.id}`);

  const outputPath = resolveOutputPath(asset, mapId);
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, frame);

  console.log(`  single: ${outputPath} (${result.width}x${result.height})`);

  return {
    assetId: asset.id,
    path: outputPath,
    frameWidth: result.width,
    frameHeight: result.height,
    frameCount: 1,
  };
}

// ── Path Resolution ────────────────────────────────────────────────

function resolveOutputPath(
  asset: ResolvedAsset,
  mapId?: string,
  state?: string,
): string {
  const ext = 'png';

  // Boss assets: bosses/{id}/{state}.png
  if (asset.workflowOverride === 'boss') {
    const stateName = state ?? 'idle';
    return `${OUTPUT_BASE}/bosses/${asset.id}/${stateName}.${ext}`;
  }

  // Map-specific assets: maps/{mapId}/{category}/{id}.png
  if (mapId) {
    return `${OUTPUT_BASE}/maps/${mapId}/${asset.category}/${asset.id}.${ext}`;
  }

  // Generic: {category}/{id}.png (towers, units)
  return `${OUTPUT_BASE}/${asset.category}/${asset.id}.${ext}`;
}
