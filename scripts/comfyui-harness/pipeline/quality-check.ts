/**
 * Quality checker — automated validation of generated assets.
 *
 * Checks:
 * - Palette violation rate < 5%
 * - Frame structure consistency (SSIM-like) > threshold
 * - Transparency rate in normal range
 */

import { createCanvas, loadImage, type Canvas } from '@napi-rs/canvas';
import type { ResolvedAsset, QualityReport, PostProcessResult } from '../types';
import { computeFrameConsistency, collectPalette } from './post-process';

// ── Thresholds ─────────────────────────────────────────────────────

const PALETTE_VIOLATION_MAX = 0.05;     // 5%
const SSIM_MIN = 0.65;                   // frames should be at least 65% similar
const TRANSPARENCY_MIN = 0.05;           // at least 5% transparent (has background removed)
const TRANSPARENCY_MAX = 0.90;           // no more than 90% transparent (not empty)
const TRANSPARENCY_TILEABLE_MAX = 0.10;  // tileable should be mostly opaque

// ── Main Check ─────────────────────────────────────────────────────

export async function runQualityCheck(
  result: PostProcessResult,
  asset: ResolvedAsset,
): Promise<QualityReport> {
  const issues: string[] = [];
  const frames = await loadFrameCanvases(result.processedFrames);

  // 1. Palette violation
  const paletteHexes = collectPalette(asset);
  const paletteViolationRate = paletteHexes.length > 0
    ? checkPaletteViolation(frames, paletteHexes)
    : 0;

  if (paletteViolationRate > PALETTE_VIOLATION_MAX) {
    issues.push(`palette violation: ${(paletteViolationRate * 100).toFixed(1)}% > ${PALETTE_VIOLATION_MAX * 100}%`);
  }

  // 2. Frame consistency (skip for single-frame assets)
  const ssimScore = frames.length > 1
    ? computeFrameConsistency(frames)
    : 1.0;

  if (frames.length > 1 && ssimScore < SSIM_MIN) {
    issues.push(`frame consistency: ${ssimScore.toFixed(3)} < ${SSIM_MIN} (too much jitter)`);
  }

  // 3. Transparency
  const transparencyRate = computeTransparencyRate(frames);

  if (asset.tileable) {
    if (transparencyRate > TRANSPARENCY_TILEABLE_MAX) {
      issues.push(`tileable transparency: ${(transparencyRate * 100).toFixed(1)}% > ${TRANSPARENCY_TILEABLE_MAX * 100}% (tiles should be opaque)`);
    }
  } else {
    if (transparencyRate < TRANSPARENCY_MIN) {
      issues.push(`transparency too low: ${(transparencyRate * 100).toFixed(1)}% (background may not be removed)`);
    }
    if (transparencyRate > TRANSPARENCY_MAX) {
      issues.push(`transparency too high: ${(transparencyRate * 100).toFixed(1)}% (image may be empty)`);
    }
  }

  return {
    assetId: result.assetId,
    passed: issues.length === 0,
    paletteViolationRate,
    ssimScore,
    transparencyRate,
    issues,
  };
}

// ── Palette Violation ──────────────────────────────────────────────

function checkPaletteViolation(
  frames: Canvas[],
  paletteHexes: string[],
): number {
  const paletteSet = new Set(paletteHexes.map((h) => h.toLowerCase()));
  let totalPixels = 0;
  let violations = 0;

  for (const canvas of frames) {
    const ctx = canvas.getContext('2d');
    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] < 128) continue; // skip transparent
      totalPixels++;

      const hex = `#${data[i].toString(16).padStart(2, '0')}${data[i + 1].toString(16).padStart(2, '0')}${data[i + 2].toString(16).padStart(2, '0')}`;
      if (!paletteSet.has(hex)) {
        violations++;
      }
    }
  }

  return totalPixels > 0 ? violations / totalPixels : 0;
}

// ── Transparency ───────────────────────────────────────────────────

function computeTransparencyRate(frames: Canvas[]): number {
  let totalPixels = 0;
  let transparentPixels = 0;

  for (const canvas of frames) {
    const ctx = canvas.getContext('2d');
    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < data.length; i += 4) {
      totalPixels++;
      if (data[i + 3] < 128) transparentPixels++;
    }
  }

  return totalPixels > 0 ? transparentPixels / totalPixels : 0;
}

// ── Helpers ────────────────────────────────────────────────────────

async function loadFrameCanvases(buffers: Buffer[]): Promise<Canvas[]> {
  const canvases: Canvas[] = [];

  for (const buf of buffers) {
    const img = await loadImage(buf);
    const canvas = createCanvas(img.width, img.height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    canvases.push(canvas);
  }

  return canvases;
}

// ── Report Formatter ───────────────────────────────────────────────

export function formatQualityReport(report: QualityReport): string {
  const status = report.passed ? 'PASS' : 'FAIL';
  const lines = [
    `[${status}] ${report.assetId}`,
    `  palette violation: ${(report.paletteViolationRate * 100).toFixed(1)}%`,
    `  frame consistency: ${report.ssimScore.toFixed(3)}`,
    `  transparency:      ${(report.transparencyRate * 100).toFixed(1)}%`,
  ];

  if (report.issues.length > 0) {
    lines.push('  issues:');
    for (const issue of report.issues) {
      lines.push(`    - ${issue}`);
    }
  }

  return lines.join('\n');
}
