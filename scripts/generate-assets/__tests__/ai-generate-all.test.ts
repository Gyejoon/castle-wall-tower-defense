import { describe, test, expect } from 'bun:test';
import { mergeManifest, type AssetManifest } from '../ai-generate-all';
import type { ManifestEntry } from '../shared';

test('importing ai-generate-all does not run the pipeline', () => {
  const moduleUrl = new URL('../ai-generate-all.ts', import.meta.url).href;
  const result = Bun.spawnSync({
    cmd: ['bun', '--eval', `await import(${JSON.stringify(moduleUrl)});`],
    env: {
      ...process.env,
      COMFYUI_URL: 'http://127.0.0.1:65535',
      PIXELLAB_API_KEY: '',
    },
    stdout: 'pipe',
    stderr: 'pipe',
  });

  const stdout = new TextDecoder().decode(result.stdout);
  const stderr = new TextDecoder().decode(result.stderr);

  expect(result.exitCode).toBe(0);
  expect(stdout).toBe('');
  expect(stderr).toBe('');
});

describe('mergeManifest', () => {
  test('adds new entries to empty manifest', () => {
    const existing: AssetManifest = {
      generated: '2026-01-01T00:00:00.000Z',
      assets: [],
    };

    const newEntries: ManifestEntry[] = [
      { key: 'grid-floor', type: 'image', path: 'assets/tiles/grid-floor.png' },
    ];

    const result = mergeManifest(existing, newEntries);
    expect(result.assets).toHaveLength(1);
    expect(result.assets[0].key).toBe('grid-floor');
  });

  test('overrides existing entries with same key', () => {
    const existing: AssetManifest = {
      generated: '2026-01-01T00:00:00.000Z',
      assets: [
        { key: 'grid-floor', type: 'image', path: 'assets/tiles/old-grid-floor.png' },
      ],
    };

    const newEntries: ManifestEntry[] = [
      { key: 'grid-floor', type: 'image', path: 'assets/tiles/grid-floor.png' },
    ];

    const result = mergeManifest(existing, newEntries);
    expect(result.assets).toHaveLength(1);
    expect(result.assets[0].path).toBe('assets/tiles/grid-floor.png');
  });

  test('preserves existing entries not in new entries', () => {
    const existing: AssetManifest = {
      generated: '2026-01-01T00:00:00.000Z',
      assets: [
        { key: 'ui-hp-bar', type: 'image', path: 'assets/ui/hp-bar.png' },
        { key: 'grid-floor', type: 'image', path: 'assets/tiles/old.png' },
      ],
    };

    const newEntries: ManifestEntry[] = [
      { key: 'grid-floor', type: 'image', path: 'assets/tiles/new.png' },
    ];

    const result = mergeManifest(existing, newEntries);
    expect(result.assets).toHaveLength(2);
    expect(result.assets.find((a) => a.key === 'ui-hp-bar')?.path).toBe('assets/ui/hp-bar.png');
    expect(result.assets.find((a) => a.key === 'grid-floor')?.path).toBe('assets/tiles/new.png');
  });

  test('updates generated timestamp', () => {
    const existing: AssetManifest = {
      generated: '2020-01-01T00:00:00.000Z',
      assets: [],
    };

    const result = mergeManifest(existing, []);
    expect(result.generated).not.toBe('2020-01-01T00:00:00.000Z');
  });
});
