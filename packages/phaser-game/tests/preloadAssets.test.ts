import { existsSync, readFileSync } from 'fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ALL_TOWERS } from '@gld/shared';
import { PRELOAD_TOWER_IDS } from '../src/constants/preloadAssets';

vi.mock('phaser', () => ({
  default: {
    Scene: class {
      load: unknown;
      anims = {
        create: vi.fn(),
        generateFrameNumbers: vi.fn(() => []),
      };
      scene = {
        start: vi.fn(),
      };
    },
  },
}));

const manifestPath = new URL('../../web-shell/public/assets/asset-manifest.json', import.meta.url);
const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8')) as {
  assets: Array<{
    key: string;
    path: string;
    type: 'image' | 'spritesheet';
    frameWidth?: number;
    frameHeight?: number;
    frameCount?: number;
  }>;
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('PRELOAD_TOWER_IDS', () => {
  it('includes every tower asset id through god tier', () => {
    expect(PRELOAD_TOWER_IDS).toHaveLength(ALL_TOWERS.length);
    expect(PRELOAD_TOWER_IDS).toEqual(ALL_TOWERS.map((tower) => tower.id));
    expect(PRELOAD_TOWER_IDS).toContain('flame_tower');
    expect(PRELOAD_TOWER_IDS).toContain('dragon_nest');
    expect(PRELOAD_TOWER_IDS).toContain('divine_throne');
  });

  it('has either png manifest entries or generated webp files for every preloaded tower asset', () => {
    for (const towerId of PRELOAD_TOWER_IDS) {
      const hasPngManifestEntry = manifest.assets.some(
        (asset) => asset.key === `tower-${towerId}` && asset.path === `assets/towers/${towerId}.png`,
      );
      const hasWebpFile = existsSync(
        new URL(`../../web-shell/public/assets/towers/${towerId}.webp`, import.meta.url),
      );

      expect(hasPngManifestEntry || hasWebpFile).toBe(true);
    }
  });
});

describe('field asset preload alignment', () => {
  it('keeps manifest entries aligned with the isometric field runtime assets', () => {
    expect(manifest.assets).toContainEqual({
      key: 'grid-floor',
      type: 'image',
      path: 'assets/tiles/grid-floor.png',
    });
    expect(manifest.assets).toContainEqual({
      key: 'path-tile',
      type: 'image',
      path: 'assets/tiles/path-tile.png',
    });
    expect(manifest.assets).toContainEqual({
      key: 'spawn-tile',
      type: 'image',
      path: 'assets/tiles/spawn-tile.png',
    });
    expect(manifest.assets).toContainEqual({
      key: 'exit-tile',
      type: 'image',
      path: 'assets/tiles/exit-tile.png',
    });
    expect(manifest.assets).toContainEqual({
      key: 'tileset',
      type: 'image',
      path: 'assets/tiles/tileset.png',
    });
    expect(manifest.assets).toContainEqual({
      key: 'tilemap-forest-gate',
      type: 'tilemapTiledJSON',
      path: 'assets/maps/forest-gate.json',
    });
  });

  it('preloads the isometric field tiles including dark AI variants', async () => {
    vi.stubGlobal('document', {
      createElement: () => ({
        toDataURL: () => 'data:image/png',
      }),
    });

    const image = vi.fn();
    const spritesheet = vi.fn();
    const tilemapTiledJSON = vi.fn();
    const { Preloader } = await import('../src/scenes/Preloader');
    const scene = new Preloader();

    Object.assign(scene, {
      load: {
        image,
        spritesheet,
        tilemapTiledJSON,
      },
    });

    scene.preload();

    // Normal tiles
    expect(image).toHaveBeenCalledWith('grid-floor', 'assets/tiles/grid-floor.png');
    expect(image).toHaveBeenCalledWith('path-tile', 'assets/tiles/path-tile.png');
    expect(image).toHaveBeenCalledWith('spawn-tile', 'assets/tiles/spawn-tile.png');
    expect(image).toHaveBeenCalledWith('exit-tile', 'assets/tiles/exit-tile.png');

    // Dark AI variants
    expect(image).toHaveBeenCalledWith('grid-floor-dark', 'assets/tiles/grid-floor-dark.png');
    expect(image).toHaveBeenCalledWith('path-tile-dark', 'assets/tiles/path-tile-dark.png');
    expect(image).toHaveBeenCalledWith('spawn-tile-dark', 'assets/tiles/spawn-tile-dark.png');
    expect(image).toHaveBeenCalledWith('exit-tile-dark', 'assets/tiles/exit-tile-dark.png');

    // Tilemap for decoration layer
    expect(tilemapTiledJSON).toHaveBeenCalledWith('tilemap-forest-gate', 'assets/maps/forest-gate.json');
  });
});
