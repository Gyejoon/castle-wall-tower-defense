/**
 * ComfyUI API Client — shared by tile and tower generators.
 */

import { mkdirSync, writeFileSync } from 'fs';
import { dirname } from 'path';
import { COMFYUI_CONFIG } from './ai-config';

// === Types ===

interface ComfyUIPromptResponse {
  prompt_id: string;
}

interface ComfyUIHistoryEntry {
  outputs: Record<string, { images: Array<{ filename: string; subfolder: string; type: string }> }>;
}

export interface ComfyUIWorkflowNode {
  class_type: string;
  inputs: Record<string, string | number | boolean | [string, number]>;
}

export type ComfyUIWorkflow = Record<string, ComfyUIWorkflowNode>;

// === API Functions ===

export async function queuePrompt(workflow: ComfyUIWorkflow): Promise<string> {
  const response = await fetch(`${COMFYUI_CONFIG.url}/prompt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: workflow }),
  });

  if (!response.ok) {
    throw new Error(`ComfyUI prompt failed: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as ComfyUIPromptResponse;
  return data.prompt_id;
}

export async function waitForCompletion(promptId: string, timeoutMs: number = 120000): Promise<ComfyUIHistoryEntry> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    const response = await fetch(`${COMFYUI_CONFIG.url}/history/${promptId}`);
    if (response.ok) {
      const history = (await response.json()) as Record<string, ComfyUIHistoryEntry>;
      if (history[promptId]) {
        return history[promptId];
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  throw new Error(`ComfyUI generation timed out after ${timeoutMs}ms`);
}

export async function downloadImage(filename: string, subfolder: string, outputPath: string): Promise<void> {
  const url = `${COMFYUI_CONFIG.url}/view?filename=${encodeURIComponent(filename)}&subfolder=${encodeURIComponent(subfolder)}&type=output`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to download image: ${response.status}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, buffer);
}

export async function checkAvailable(): Promise<boolean> {
  try {
    const health = await fetch(`${COMFYUI_CONFIG.url}/system_stats`);
    return health.ok;
  } catch {
    return false;
  }
}
