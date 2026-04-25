import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { mergeBuild } from './merge-build';

async function fileExists(p: string): Promise<boolean> {
  try {
    await readFile(p);
    return true;
  } catch {
    return false;
  }
}

describe('mergeBuild', () => {
  let root: string;
  let webShellDist: string;
  let unityBuild: string;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'gld-merge-'));
    webShellDist = join(root, 'dist');
    unityBuild = join(root, 'unity-build');
    await mkdir(webShellDist, { recursive: true });
    await writeFile(join(webShellDist, 'index.html'), '<html><body>phaser</body></html>');
    await writeFile(join(webShellDist, 'assets.js'), 'console.log("phaser");');
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it('emits placeholder /unity/index.html when unity build dir is absent', async () => {
    const result = await mergeBuild({ webShellDist, unityBuild });

    expect(result.unityMode).toBe('placeholder');
    const unityIndex = await readFile(join(webShellDist, 'unity', 'index.html'), 'utf8');
    expect(unityIndex).toContain('Unity Phase 0');
    expect(unityIndex).toContain('pending build');
    // web-shell files untouched.
    expect(await readFile(join(webShellDist, 'index.html'), 'utf8')).toContain('phaser');
  });

  it('copies unity build files under /unity/ when unity build dir exists', async () => {
    await mkdir(join(unityBuild, 'Build'), { recursive: true });
    await writeFile(join(unityBuild, 'index.html'), '<html><body>unity</body></html>');
    await writeFile(join(unityBuild, 'Build', 'game.wasm'), 'wasm-bytes');
    await writeFile(join(unityBuild, 'Build', 'game.data'), 'data-bytes');

    const result = await mergeBuild({ webShellDist, unityBuild });

    expect(result.unityMode).toBe('copied');
    expect(result.filesCopied).toBe(3);
    const unityIndex = await readFile(join(webShellDist, 'unity', 'index.html'), 'utf8');
    expect(unityIndex).toContain('<body>unity</body>');
    expect(await fileExists(join(webShellDist, 'unity', 'Build', 'game.wasm'))).toBe(true);
    expect(await fileExists(join(webShellDist, 'unity', 'Build', 'game.data'))).toBe(true);
    // web-shell files untouched.
    expect(await readFile(join(webShellDist, 'index.html'), 'utf8')).toContain('phaser');
  });

  it('is idempotent — running twice produces same output', async () => {
    await mergeBuild({ webShellDist, unityBuild });
    const first = await readFile(join(webShellDist, 'unity', 'index.html'), 'utf8');
    await mergeBuild({ webShellDist, unityBuild });
    const second = await readFile(join(webShellDist, 'unity', 'index.html'), 'utf8');
    expect(second).toBe(first);
  });

  it('falls back to placeholder when unity build dir exists but is empty', async () => {
    await mkdir(unityBuild, { recursive: true });
    // no files inside

    const result = await mergeBuild({ webShellDist, unityBuild });

    expect(result.unityMode).toBe('placeholder');
    const unityIndex = await readFile(join(webShellDist, 'unity', 'index.html'), 'utf8');
    expect(unityIndex).toContain('Unity Phase 0');
    expect(unityIndex).toContain('pending build');
  });

  it('throws if webShellDist does not exist', async () => {
    await rm(webShellDist, { recursive: true });
    await expect(
      mergeBuild({ webShellDist, unityBuild }),
    ).rejects.toThrow(/web-shell.*dist/i);
  });
});
