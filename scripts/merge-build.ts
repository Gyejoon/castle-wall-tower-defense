#!/usr/bin/env bun
/**
 * Merges the Phaser web-shell build with the Unity WebGL build.
 *
 * - Phaser output at packages/web-shell/dist/ is left in place (served at `/`).
 * - Unity output (if present) at packages/unity-game/Build/WebGL/ is copied under
 *   packages/web-shell/dist/unity/ (served at `/unity/`).
 * - If the Unity build is missing (Phase 0a expected state), writes a placeholder
 *   dist/unity/index.html so Vercel deploys still produce a valid `/unity/` path.
 *
 * Invoked via `bun run build:all` (see root package.json).
 */

import { cp, mkdir, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export type MergeBuildOptions = {
  webShellDist: string;
  unityBuild: string;
};

export type MergeBuildResult = {
  unityMode: 'copied' | 'placeholder';
  filesCopied: number;
};

const PLACEHOLDER_HTML = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Unity Phase 0 — pending build</title>
  <style>
    body { margin: 0; display: grid; place-items: center; min-height: 100vh;
           background: #1a140a; color: #c8a04a;
           font-family: 'Galmuri11', 'Press Start 2P', system-ui, sans-serif; }
    .box { max-width: 480px; padding: 32px; text-align: center; }
    h1 { margin: 0 0 12px; font-size: 28px; }
    p { margin: 6px 0; color: #b0a080; font-size: 14px; line-height: 1.5; }
    code { background: #2a2010; padding: 2px 6px; border-radius: 3px; color: #e0d0a0; }
  </style>
</head>
<body>
  <div class="box">
    <h1>Unity Phase 0 — pending build</h1>
    <p>The Unity runtime has not produced a build yet. This placeholder page is emitted by
       <code>scripts/merge-build.ts</code> so the <code>/unity/</code> route stays healthy on Vercel.</p>
    <p>See <code>docs/unity-migration/phase-0b-runbook.md</code> for the steps to install Unity locally,
       register <code>UNITY_LICENSE</code>, and produce the first build.</p>
    <p><a href="/" style="color:#c8a04a">← back to Phaser build</a></p>
  </div>
</body>
</html>
`;

async function exists(p: string): Promise<boolean> {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}

async function countFiles(dir: string): Promise<number> {
  let count = 0;
  async function walk(d: string): Promise<void> {
    const entries = await readdir(d, { withFileTypes: true });
    for (const entry of entries) {
      const p = join(d, entry.name);
      if (entry.isDirectory()) {
        await walk(p);
      } else if (entry.isFile()) {
        count++;
      }
    }
  }
  await walk(dir);
  return count;
}

export async function mergeBuild(options: MergeBuildOptions): Promise<MergeBuildResult> {
  const { webShellDist, unityBuild } = options;

  if (!(await exists(webShellDist))) {
    throw new Error(`web-shell dist does not exist at ${webShellDist} — run \`bun run build:web\` first`);
  }

  const unityOut = join(webShellDist, 'unity');
  // Always rewrite /unity/ so merges are idempotent.
  await rm(unityOut, { recursive: true, force: true });
  await mkdir(unityOut, { recursive: true });

  if (await exists(unityBuild)) {
    await cp(unityBuild, unityOut, { recursive: true });
    const filesCopied = await countFiles(unityOut);
    if (filesCopied > 0) {
      return { unityMode: 'copied', filesCopied };
    }
    // Unity dir exists but empty — clean and fall through to placeholder so /unity/ stays healthy.
    await rm(unityOut, { recursive: true, force: true });
    await mkdir(unityOut, { recursive: true });
  }

  await writeFile(join(unityOut, 'index.html'), PLACEHOLDER_HTML, 'utf8');
  return { unityMode: 'placeholder', filesCopied: 1 };
}

async function main(): Promise<void> {
  const thisFile = fileURLToPath(import.meta.url);
  const repoRoot = resolve(dirname(thisFile), '..');
  const webShellDist = resolve(repoRoot, 'packages/web-shell/dist');
  const unityBuild = resolve(repoRoot, 'packages/unity-game/Build/WebGL');

  const result = await mergeBuild({ webShellDist, unityBuild });
  console.log(`[merge-build] unityMode=${result.unityMode} filesCopied=${result.filesCopied}`);
}

if (import.meta.main) {
  await main();
}
