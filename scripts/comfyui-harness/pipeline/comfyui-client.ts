/**
 * ComfyUI API client for the harness.
 * Based on scripts/generate-assets/comfyui-client.ts but self-contained.
 */

import { mkdirSync, writeFileSync } from 'fs';
import { dirname } from 'path';
import type { ComfyUIWorkflow } from '../types';

// ── Config ─────────────────────────────────────────────────────────

const COMFYUI_URL = process.env.COMFYUI_URL || 'http://localhost:8188';

// ── Types ──────────────────────────────────────────────────────────

interface PromptResponse {
  prompt_id: string;
}

interface HistoryImage {
  filename: string;
  subfolder: string;
  type: string;
}

interface HistoryEntry {
  outputs: Record<string, { images: HistoryImage[] }>;
}

// ── API ────────────────────────────────────────────────────────────

export async function checkAvailable(): Promise<boolean> {
  try {
    const res = await fetch(`${COMFYUI_URL}/system_stats`);
    return res.ok;
  } catch {
    return false;
  }
}

export async function queuePrompt(workflow: ComfyUIWorkflow): Promise<string> {
  const res = await fetch(`${COMFYUI_URL}/prompt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: workflow }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`ComfyUI prompt failed: ${res.status} ${res.statusText}\n${body}`);
  }

  const data = (await res.json()) as PromptResponse;
  return data.prompt_id;
}

export async function waitForCompletion(
  promptId: string,
  timeoutMs: number = 180_000,
): Promise<HistoryEntry> {
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    const res = await fetch(`${COMFYUI_URL}/history/${promptId}`);
    if (res.ok) {
      const history = (await res.json()) as Record<string, HistoryEntry>;
      if (history[promptId]) return history[promptId];
    }
    await new Promise((r) => setTimeout(r, 2000));
  }

  throw new Error(`ComfyUI timed out after ${timeoutMs}ms for prompt ${promptId}`);
}

export async function downloadImage(
  filename: string,
  subfolder: string,
  outputPath: string,
): Promise<void> {
  const url = `${COMFYUI_URL}/view?filename=${encodeURIComponent(filename)}&subfolder=${encodeURIComponent(subfolder)}&type=output`;
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`Failed to download image ${filename}: ${res.status}`);
  }

  const buffer = Buffer.from(await res.arrayBuffer());
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, buffer);
}

/**
 * Queue a workflow, wait for completion, download all output images.
 * Returns paths to downloaded files.
 */
export async function generateAndDownload(
  workflow: ComfyUIWorkflow,
  outputDir: string,
  prefix: string,
): Promise<string[]> {
  const promptId = await queuePrompt(workflow);
  console.log(`  queued prompt ${promptId}`);

  const result = await waitForCompletion(promptId);
  const paths: string[] = [];

  for (const [_nodeId, output] of Object.entries(result.outputs)) {
    if (!output.images) continue;
    for (const img of output.images) {
      const outPath = `${outputDir}/${prefix}_${img.filename}`;
      await downloadImage(img.filename, img.subfolder, outPath);
      paths.push(outPath);
    }
  }

  return paths;
}
