/** Image I/O utilities using Sharp */

import sharp from 'sharp';
import { readdirSync, statSync } from 'fs';
import { join } from 'path';
import { rgbToHex, type RGB } from './color';

export interface ImageData {
  width: number;
  height: number;
  pixels: Uint8Array; // RGBA
  path: string;
}

export async function readImage(path: string): Promise<ImageData> {
  const img = sharp(path);
  const meta = await img.metadata();
  const { data, info } = await img.raw().ensureAlpha().toBuffer({ resolveWithObject: true });
  return {
    width: info.width,
    height: info.height,
    pixels: new Uint8Array(data.buffer, data.byteOffset, data.byteLength),
    path,
  };
}

/** Extract unique opaque colors from image (skips transparent pixels) */
export function extractColors(img: ImageData): Map<string, number> {
  const colors = new Map<string, number>();
  for (let i = 0; i < img.pixels.length; i += 4) {
    const a = img.pixels[i + 3];
    if (a < 128) continue; // skip transparent
    const hex = rgbToHex(img.pixels[i], img.pixels[i + 1], img.pixels[i + 2]);
    colors.set(hex, (colors.get(hex) ?? 0) + 1);
  }
  return colors;
}

/** Get pixel RGB at (x, y) */
export function getPixel(img: ImageData, x: number, y: number): RGB & { a: number } {
  const idx = (y * img.width + x) * 4;
  return {
    r: img.pixels[idx],
    g: img.pixels[idx + 1],
    b: img.pixels[idx + 2],
    a: img.pixels[idx + 3],
  };
}

/** Find all PNG files recursively */
export function findPngFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      files.push(...findPngFiles(full));
    } else if (entry.endsWith('.png')) {
      files.push(full);
    }
  }
  return files;
}

/** Count opaque pixels */
export function countOpaquePixels(img: ImageData): number {
  let count = 0;
  for (let i = 3; i < img.pixels.length; i += 4) {
    if (img.pixels[i] >= 128) count++;
  }
  return count;
}
