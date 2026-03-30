import { createCanvas, loadImage, type Canvas, type SKRSContext2D } from '@napi-rs/canvas';
import { writeFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import { FULL_PALETTE } from './ai-config';
import { TILE_SIZE } from './shared';

// === Types ===
interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface PostProcessOptions {
  targetWidth: number;
  targetHeight: number;
  applyPaletteMapping: boolean;
  dithering: boolean;
}

// === Color Utilities ===
function hexToRgb(hex: string): RGB {
  return {
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16),
  };
}

const PALETTE_RGB: RGB[] = FULL_PALETTE.map(hexToRgb);

function colorDistance(a: RGB, b: RGB): number {
  const dr = a.r - b.r;
  const dg = a.g - b.g;
  const db = a.b - b.b;
  return dr * dr + dg * dg + db * db;
}

// Cache to avoid recomputing nearest color for the same RGB triple
const nearestColorCache = new Map<number, RGB>();

function rgbCacheKey(r: number, g: number, b: number): number {
  return (r << 16) | (g << 8) | b;
}

function findNearestPaletteColor(color: RGB): RGB {
  const key = rgbCacheKey(color.r, color.g, color.b);
  const cached = nearestColorCache.get(key);
  if (cached) return cached;

  let minDist = Infinity;
  let nearest = PALETTE_RGB[0];
  for (const pc of PALETTE_RGB) {
    const dist = colorDistance(color, pc);
    if (dist < minDist) {
      minDist = dist;
      nearest = pc;
    }
  }
  nearestColorCache.set(key, nearest);
  return nearest;
}

// === Post-Processing Pipeline ===

export async function loadImageToCanvas(imagePath: string): Promise<{ canvas: Canvas; ctx: SKRSContext2D }> {
  const img = await loadImage(imagePath);
  const canvas = createCanvas(img.width, img.height);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);
  return { canvas, ctx };
}

/**
 * Nearest-neighbor downscale — preserves pixel art crispness.
 */
export function nearestNeighborResize(
  sourceCtx: SKRSContext2D,
  srcW: number,
  srcH: number,
  targetW: number,
  targetH: number,
): { canvas: Canvas; ctx: SKRSContext2D } {
  const srcData = sourceCtx.getImageData(0, 0, srcW, srcH);
  const canvas = createCanvas(targetW, targetH);
  const ctx = canvas.getContext('2d');
  const dstData = ctx.createImageData(targetW, targetH);

  const xRatio = srcW / targetW;
  const yRatio = srcH / targetH;

  for (let y = 0; y < targetH; y++) {
    for (let x = 0; x < targetW; x++) {
      const srcX = Math.floor(x * xRatio);
      const srcY = Math.floor(y * yRatio);
      const srcIdx = (srcY * srcW + srcX) * 4;
      const dstIdx = (y * targetW + x) * 4;

      dstData.data[dstIdx] = srcData.data[srcIdx];
      dstData.data[dstIdx + 1] = srcData.data[srcIdx + 1];
      dstData.data[dstIdx + 2] = srcData.data[srcIdx + 2];
      dstData.data[dstIdx + 3] = srcData.data[srcIdx + 3];
    }
  }

  ctx.putImageData(dstData, 0, 0);
  return { canvas, ctx };
}

/**
 * Map all pixels to the nearest color in the medieval fantasy palette.
 * Uses Floyd-Steinberg dithering when enabled — float buffer prevents
 * error accumulation rounding artifacts.
 */
export function applyPaletteMapping(
  ctx: SKRSContext2D,
  width: number,
  height: number,
  dithering: boolean = false,
): void {
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  const floatData = new Float32Array(data.length);
  for (let i = 0; i < data.length; i++) {
    floatData[i] = data[i];
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const alpha = floatData[idx + 3];

      if (alpha < 10) {
        data[idx] = 0;
        data[idx + 1] = 0;
        data[idx + 2] = 0;
        data[idx + 3] = 0;
        continue;
      }

      const oldColor: RGB = {
        r: Math.max(0, Math.min(255, Math.round(floatData[idx]))),
        g: Math.max(0, Math.min(255, Math.round(floatData[idx + 1]))),
        b: Math.max(0, Math.min(255, Math.round(floatData[idx + 2]))),
      };

      const newColor = findNearestPaletteColor(oldColor);

      data[idx] = newColor.r;
      data[idx + 1] = newColor.g;
      data[idx + 2] = newColor.b;
      // Preserve original alpha to avoid halo artifacts on semi-transparent edges
      data[idx + 3] = Math.round(Math.max(0, Math.min(255, floatData[idx + 3])));

      if (dithering) {
        const errR = oldColor.r - newColor.r;
        const errG = oldColor.g - newColor.g;
        const errB = oldColor.b - newColor.b;

        const distribute = (dx: number, dy: number, factor: number): void => {
          const nx = x + dx;
          const ny = y + dy;
          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            const nIdx = (ny * width + nx) * 4;
            floatData[nIdx] += errR * factor;
            floatData[nIdx + 1] += errG * factor;
            floatData[nIdx + 2] += errB * factor;
          }
        };

        distribute(1, 0, 7 / 16);
        distribute(-1, 1, 3 / 16);
        distribute(0, 1, 5 / 16);
        distribute(1, 1, 1 / 16);
      }
    }
  }

  ctx.putImageData(imageData, 0, 0);
}

export function assembleSpritesheetFromFrames(
  frames: Canvas[],
  frameWidth: number,
  frameHeight: number,
): Canvas {
  const canvas = createCanvas(frameWidth * frames.length, frameHeight);
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  for (let i = 0; i < frames.length; i++) {
    ctx.drawImage(frames[i], i * frameWidth, 0);
  }

  return canvas;
}

export async function splitSpritesheet(
  imagePath: string,
  frameCount: number,
): Promise<Canvas[]> {
  const { canvas, ctx } = await loadImageToCanvas(imagePath);
  const frameWidth = canvas.width / frameCount;
  const frameHeight = canvas.height;
  const frames: Canvas[] = [];

  for (let i = 0; i < frameCount; i++) {
    const frameCanvas = createCanvas(frameWidth, frameHeight);
    const frameCtx = frameCanvas.getContext('2d');
    frameCtx.drawImage(
      canvas,
      i * frameWidth, 0, frameWidth, frameHeight,
      0, 0, frameWidth, frameHeight,
    );
    frames.push(frameCanvas);
  }

  return frames;
}

function writeFileSafe(path: string, buffer: Buffer): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, buffer);
}

export interface RuntimeTilesetInputs {
  gridFloor: string;
  path: string;
  spawn: string;
  exit: string;
}

export async function composeRuntimeTileset(
  inputs: RuntimeTilesetInputs,
  outputPath: string,
): Promise<void> {
  const gridFloorImage = await loadImage(inputs.gridFloor);
  const pathImage = await loadImage(inputs.path);
  const spawnImage = await loadImage(inputs.spawn);
  const exitImage = await loadImage(inputs.exit);

  const canvas = createCanvas(256, 96);
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  ctx.drawImage(gridFloorImage, 0, 0, TILE_SIZE, TILE_SIZE);
  ctx.drawImage(gridFloorImage, TILE_SIZE, 0, TILE_SIZE, TILE_SIZE);
  ctx.drawImage(pathImage, TILE_SIZE * 2, 0, TILE_SIZE, TILE_SIZE);
  ctx.drawImage(pathImage, TILE_SIZE * 3, 0, TILE_SIZE, TILE_SIZE);
  ctx.drawImage(pathImage, TILE_SIZE * 4, 0, TILE_SIZE, TILE_SIZE);
  ctx.drawImage(pathImage, TILE_SIZE * 5, 0, TILE_SIZE, TILE_SIZE);
  ctx.drawImage(pathImage, TILE_SIZE * 6, 0, TILE_SIZE, TILE_SIZE);
  ctx.drawImage(pathImage, TILE_SIZE * 7, 0, TILE_SIZE, TILE_SIZE);
  ctx.drawImage(spawnImage, 0, TILE_SIZE, TILE_SIZE, TILE_SIZE);
  ctx.drawImage(exitImage, TILE_SIZE, TILE_SIZE, TILE_SIZE, TILE_SIZE);

  for (let x = 2; x < 8; x++) {
    ctx.drawImage(gridFloorImage, x * TILE_SIZE, TILE_SIZE, TILE_SIZE, TILE_SIZE);
  }

  for (let x = 0; x < 8; x++) {
    ctx.drawImage(gridFloorImage, x * TILE_SIZE, TILE_SIZE * 2, TILE_SIZE, TILE_SIZE);
  }

  writeFileSafe(outputPath, canvas.toBuffer('image/png'));
}

export async function postProcessImage(
  inputPath: string,
  outputPath: string,
  options: PostProcessOptions,
): Promise<void> {
  const { canvas: srcCanvas, ctx: srcCtx } = await loadImageToCanvas(inputPath);

  const { canvas: resizedCanvas, ctx: resizedCtx } = nearestNeighborResize(
    srcCtx,
    srcCanvas.width,
    srcCanvas.height,
    options.targetWidth,
    options.targetHeight,
  );

  if (options.applyPaletteMapping) {
    applyPaletteMapping(resizedCtx, options.targetWidth, options.targetHeight, options.dithering);
  }

  writeFileSafe(outputPath, resizedCanvas.toBuffer('image/png'));
  console.log(`  post-processed: ${outputPath} (${options.targetWidth}x${options.targetHeight})`);
}

export async function postProcessSpritesheet(
  inputPath: string,
  outputPath: string,
  frameCount: number,
  options: PostProcessOptions,
): Promise<void> {
  const frames = await splitSpritesheet(inputPath, frameCount);
  const processedFrames: Canvas[] = [];

  for (const frame of frames) {
    const frameCtx = frame.getContext('2d');
    const { canvas: resized, ctx: resizedCtx } = nearestNeighborResize(
      frameCtx,
      frame.width,
      frame.height,
      options.targetWidth,
      options.targetHeight,
    );

    if (options.applyPaletteMapping) {
      applyPaletteMapping(resizedCtx, options.targetWidth, options.targetHeight, options.dithering);
    }

    processedFrames.push(resized);
  }

  const sheet = assembleSpritesheetFromFrames(processedFrames, options.targetWidth, options.targetHeight);
  writeFileSafe(outputPath, sheet.toBuffer('image/png'));
  console.log(`  post-processed spritesheet: ${outputPath} (${frameCount} frames @ ${options.targetWidth}x${options.targetHeight})`);
}

export async function auditPalette(imagePath: string): Promise<{ total: number; offPalette: number; percentage: number }> {
  const { canvas, ctx } = await loadImageToCanvas(imagePath);
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;

  const paletteSet = new Set(FULL_PALETTE.map((h) => h.toLowerCase()));
  let total = 0;
  let offPalette = 0;

  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 10) continue;
    total++;
    const hex = `#${data[i].toString(16).padStart(2, '0')}${data[i + 1].toString(16).padStart(2, '0')}${data[i + 2].toString(16).padStart(2, '0')}`;
    if (!paletteSet.has(hex)) {
      offPalette++;
    }
  }

  return { total, offPalette, percentage: total > 0 ? (offPalette / total) * 100 : 0 };
}
