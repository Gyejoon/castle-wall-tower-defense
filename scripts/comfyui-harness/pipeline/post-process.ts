/**
 * Post-processing pipeline — 5-stage image processing.
 *
 * 1. Downscale (512→128/256, nearest-neighbor)
 * 2. Palette quantize (CIE LAB distance, map theme palette)
 * 3. Outline (1px black)
 * 4. Background transparency (corner sampling)
 * 5. ControlNet frame consistency check (flag only — actual re-gen in pipeline)
 */

import { createCanvas, loadImage, type Canvas } from '@napi-rs/canvas';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import type { ResolvedAsset, PostProcessResult } from '../types';

// ── Stage 1: Downscale ─────────────────────────────────────────────

function downscale(canvas: Canvas, targetSize: number): Canvas {
  const out = createCanvas(targetSize, targetSize);
  const ctx = out.getContext('2d');
  ctx.imageSmoothingEnabled = false; // nearest-neighbor
  ctx.drawImage(canvas, 0, 0, targetSize, targetSize);
  return out;
}

// ── Stage 2: Palette Quantize ──────────────────────────────────────

interface RGB { r: number; g: number; b: number }
interface LAB { l: number; a: number; b: number }

function hexToRgb(hex: string): RGB {
  return {
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16),
  };
}

function rgbToLab(rgb: RGB): LAB {
  // sRGB → linear → XYZ → CIELAB (D65)
  let r = rgb.r / 255, g = rgb.g / 255, b = rgb.b / 255;
  r = r > 0.04045 ? ((r + 0.055) / 1.055) ** 2.4 : r / 12.92;
  g = g > 0.04045 ? ((g + 0.055) / 1.055) ** 2.4 : g / 12.92;
  b = b > 0.04045 ? ((b + 0.055) / 1.055) ** 2.4 : b / 12.92;

  let x = (r * 0.4124564 + g * 0.3575761 + b * 0.1804375) / 0.95047;
  let y = r * 0.2126729 + g * 0.7151522 + b * 0.0721750;
  let z = (r * 0.0193339 + g * 0.1191920 + b * 0.9503041) / 1.08883;

  const f = (t: number) => t > 0.008856 ? t ** (1 / 3) : 7.787 * t + 16 / 116;
  x = f(x); y = f(y); z = f(z);

  return { l: 116 * y - 16, a: 500 * (x - y), b: 200 * (y - z) };
}

function labDistance(a: LAB, b: LAB): number {
  return Math.sqrt((a.l - b.l) ** 2 + (a.a - b.a) ** 2 + (a.b - b.b) ** 2);
}

function findClosestPaletteColor(pixel: RGB, paletteLab: { rgb: RGB; lab: LAB }[]): RGB {
  let minDist = Infinity;
  let closest = paletteLab[0].rgb;

  for (const entry of paletteLab) {
    const dist = labDistance(rgbToLab(pixel), entry.lab);
    if (dist < minDist) {
      minDist = dist;
      closest = entry.rgb;
    }
  }

  return closest;
}

function quantizePalette(canvas: Canvas, paletteHexes: string[]): Canvas {
  const ctx = canvas.getContext('2d');
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const { data } = imageData;

  const paletteLab = paletteHexes.map((hex) => {
    const rgb = hexToRgb(hex);
    return { rgb, lab: rgbToLab(rgb) };
  });

  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 128) continue; // skip transparent
    const pixel: RGB = { r: data[i], g: data[i + 1], b: data[i + 2] };
    const closest = findClosestPaletteColor(pixel, paletteLab);
    data[i] = closest.r;
    data[i + 1] = closest.g;
    data[i + 2] = closest.b;
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

// ── Stage 3: Outline ───────────────────────────────────────────────

function addOutline(canvas: Canvas, color: string = '#000000'): Canvas {
  const w = canvas.width;
  const h = canvas.height;
  const ctx = canvas.getContext('2d');
  const imageData = ctx.getImageData(0, 0, w, h);
  const { data } = imageData;

  const out = createCanvas(w, h);
  const outCtx = out.getContext('2d');
  outCtx.drawImage(canvas, 0, 0);
  const outData = outCtx.getImageData(0, 0, w, h);
  const od = outData.data;

  const rgb = hexToRgb(color);
  const offsets = [[-1, 0], [1, 0], [0, -1], [0, 1]];

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      if (data[idx + 3] >= 128) continue; // not transparent — skip

      // Check if any neighbor is opaque
      for (const [dx, dy] of offsets) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
        const nIdx = (ny * w + nx) * 4;
        if (data[nIdx + 3] >= 128) {
          od[idx] = rgb.r;
          od[idx + 1] = rgb.g;
          od[idx + 2] = rgb.b;
          od[idx + 3] = 255;
          break;
        }
      }
    }
  }

  outCtx.putImageData(outData, 0, 0);
  return out;
}

// ── Stage 4: Background Transparency ───────────────────────────────

function removeBackground(canvas: Canvas, tolerance: number = 30): Canvas {
  const w = canvas.width;
  const h = canvas.height;
  const ctx = canvas.getContext('2d');
  const imageData = ctx.getImageData(0, 0, w, h);
  const { data } = imageData;

  // Sample corners to detect background color
  const corners = [
    0,                          // top-left
    (w - 1) * 4,               // top-right
    ((h - 1) * w) * 4,         // bottom-left
    ((h - 1) * w + w - 1) * 4, // bottom-right
  ];

  let bgR = 0, bgG = 0, bgB = 0, count = 0;
  for (const idx of corners) {
    if (data[idx + 3] >= 128) {
      bgR += data[idx];
      bgG += data[idx + 1];
      bgB += data[idx + 2];
      count++;
    }
  }

  if (count === 0) return canvas; // already transparent

  bgR = Math.round(bgR / count);
  bgG = Math.round(bgG / count);
  bgB = Math.round(bgB / count);

  for (let i = 0; i < data.length; i += 4) {
    const dr = Math.abs(data[i] - bgR);
    const dg = Math.abs(data[i + 1] - bgG);
    const db = Math.abs(data[i + 2] - bgB);
    if (dr + dg + db < tolerance) {
      data[i + 3] = 0; // make transparent
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

// ── Stage 5: Frame Consistency Score (SSIM-like) ───────────────────

export function computeFrameConsistency(frames: Canvas[]): number {
  if (frames.length < 2) return 1.0;

  let totalSimilarity = 0;
  for (let i = 1; i < frames.length; i++) {
    totalSimilarity += computeSimpleSimilarity(frames[i - 1], frames[i]);
  }

  return totalSimilarity / (frames.length - 1);
}

function computeSimpleSimilarity(a: Canvas, b: Canvas): number {
  const ctxA = a.getContext('2d');
  const ctxB = b.getContext('2d');
  const dataA = ctxA.getImageData(0, 0, a.width, a.height).data;
  const dataB = ctxB.getImageData(0, 0, b.width, b.height).data;

  let diff = 0;
  const pixelCount = a.width * a.height;

  for (let i = 0; i < dataA.length; i += 4) {
    const dr = Math.abs(dataA[i] - dataB[i]);
    const dg = Math.abs(dataA[i + 1] - dataB[i + 1]);
    const db = Math.abs(dataA[i + 2] - dataB[i + 2]);
    diff += (dr + dg + db) / (3 * 255);
  }

  return 1 - diff / pixelCount;
}

// ── Full Pipeline ──────────────────────────────────────────────────

export async function postProcess(
  framePaths: string[],
  asset: ResolvedAsset,
): Promise<PostProcessResult> {
  const paletteHexes = collectPalette(asset);
  const processedFrames: Buffer[] = [];

  for (const framePath of framePaths) {
    const img = await loadImage(readFileSync(framePath));
    let canvas = createCanvas(img.width, img.height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);

    // Stage 1: Downscale
    canvas = downscale(canvas, asset.outputSize);

    // Stage 2: Palette quantize
    if (paletteHexes.length > 0) {
      canvas = quantizePalette(canvas, paletteHexes);
    }

    // Stage 3: Outline
    canvas = addOutline(canvas);

    // Stage 4: Background removal (skip for tileable — tiles need full coverage)
    if (!asset.tileable) {
      canvas = removeBackground(canvas);
    }

    processedFrames.push(canvas.toBuffer('image/png'));
  }

  return {
    assetId: asset.id,
    processedFrames,
    width: asset.outputSize,
    height: asset.outputSize,
  };
}

export function collectPalette(asset: ResolvedAsset): string[] {
  const palette = asset.style.palette;
  if (!palette) return [];

  return [
    ...palette.primary,
    ...palette.accent,
    ...(palette.highlight ?? []),
  ];
}

// ── Save Helper ────────────────────────────────────────────────────

export function saveProcessedFrame(buffer: Buffer, path: string): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, buffer);
}
