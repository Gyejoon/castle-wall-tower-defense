import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'fs';
import { ALL_TOWERS } from '@gld/shared';

vi.mock('phaser', () => ({
  default: {
    Scene: class {
      constructor(_key?: string) {}
    },
  },
}));

import { Preloader } from '../src/scenes/Preloader';

describe('asset integration', () => {
  it('Preloader queues every tower sprite used by TowerSystem', async () => {
    const image = vi.fn();
    const tilemapTiledJSON = vi.fn();
    const spritesheet = vi.fn();

    const preloader = new Preloader() as Preloader & {
      load: {
        image: typeof image;
        tilemapTiledJSON: typeof tilemapTiledJSON;
        spritesheet: typeof spritesheet;
      };
    };

    preloader.load = {
      image,
      tilemapTiledJSON,
      spritesheet,
    };

    preloader.preload();

    const towerImageCalls = image.mock.calls.filter(([key]) => String(key).startsWith('tower-'));
    expect(towerImageCalls).toHaveLength(ALL_TOWERS.length);

    for (const tower of ALL_TOWERS) {
      expect(image).toHaveBeenCalledWith(`tower-${tower.id}`, `assets/towers/${tower.id}.png`);
    }
  });

  it('AI runtime tileset remains aligned with the generated Tiled map contract', async () => {
    const mapJson = JSON.parse(
      readFileSync(new URL('../../web-shell/public/assets/maps/forest-gate.json', import.meta.url), 'utf-8'),
    ) as {
      tilesets: Array<{
        image: string;
        imagewidth: number;
        imageheight: number;
        tilewidth: number;
        tileheight: number;
        tilecount: number;
        columns: number;
      }>;
    };

    expect(mapJson.tilesets).toHaveLength(1);
    expect(mapJson.tilesets[0]).toMatchObject({
      image: '../tiles/tileset.png',
      imagewidth: 320,
      imageheight: 128,
      tilewidth: 32,
      tileheight: 32,
      tilecount: 40,
      columns: 10,
    });
  });
});
