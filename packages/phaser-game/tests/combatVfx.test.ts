import { readFileSync } from 'fs';
import { describe, expect, it, vi } from 'vitest';

vi.mock('phaser', () => ({
  default: {
    Animations: {
      Events: {
        ANIMATION_COMPLETE: 'animationcomplete',
      },
    },
  },
}));

vi.mock('../src/audio/SoundGenerator', () => ({
  soundGenerator: {
    playTowerAttack: vi.fn(),
  },
}));

vi.mock('../src/EventBus', () => ({
  EventBus: {
    emit: vi.fn(),
  },
}));

import {
  getOptionalAnimationKey,
  registerOptionalCombatAnimations,
} from '../src/assets/assetManifest';
import { TowerSystem } from '../src/systems/TowerSystem';
import { UnitSystem } from '../src/systems/UnitSystem';

const manifest = JSON.parse(
  readFileSync(new URL('../../web-shell/public/assets/asset-manifest.json', import.meta.url), 'utf-8'),
) as {
  generated: string;
  assets: Array<{
    key: string;
    path: string;
    type: 'image' | 'spritesheet' | 'tilemapTiledJSON';
    section?: string;
    frameWidth?: number;
    frameHeight?: number;
    frameCount?: number;
  }>;
};

function createGraphics() {
  return {
    setDepth: vi.fn().mockReturnThis(),
    clear: vi.fn().mockReturnThis(),
    fillStyle: vi.fn().mockReturnThis(),
    fillEllipse: vi.fn().mockReturnThis(),
    strokeEllipse: vi.fn().mockReturnThis(),
    lineStyle: vi.fn().mockReturnThis(),
    fillCircle: vi.fn().mockReturnThis(),
    beginPath: vi.fn().mockReturnThis(),
    moveTo: vi.fn().mockReturnThis(),
    lineTo: vi.fn().mockReturnThis(),
    strokePath: vi.fn().mockReturnThis(),
    destroy: vi.fn(),
  };
}

function createImage() {
  return {
    setY: vi.fn().mockReturnThis(),
    setDepth: vi.fn().mockReturnThis(),
    destroy: vi.fn(),
  };
}

function createSprite() {
  return {
    setDisplaySize: vi.fn().mockReturnThis(),
    setDepth: vi.fn().mockReturnThis(),
    setY: vi.fn().mockReturnThis(),
    setPosition: vi.fn().mockReturnThis(),
    setTint: vi.fn().mockReturnThis(),
    clearTint: vi.fn().mockReturnThis(),
    play: vi.fn().mockReturnThis(),
    once: vi.fn((_event: string, callback: () => void) => {
      callback();
      return undefined;
    }),
    destroy: vi.fn(),
  };
}

describe('optional combat vfx', () => {
  it('registers one-shot animations for optional combat spritesheets', () => {
    const create = vi.fn();
    const scene = {
      textures: {
        exists: vi.fn((key: string) => ['tower-laser-fire', 'projectile-hit-flash', 'vfx-explosion-sm'].includes(key)),
      },
      anims: {
        exists: vi.fn(() => false),
        create,
        generateFrameNumbers: vi.fn((key: string, range: { start: number; end: number }) =>
          Array.from({ length: range.end - range.start + 1 }, (_, index) => ({ key, frame: index })),
        ),
      },
    };

    registerOptionalCombatAnimations(scene as never, manifest as never);

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ key: getOptionalAnimationKey('tower-laser-fire'), frameRate: 14, repeat: 0 }),
    );
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ key: getOptionalAnimationKey('projectile-hit-flash'), frameRate: 18, repeat: 0 }),
    );
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ key: getOptionalAnimationKey('vfx-explosion-sm'), frameRate: 14, repeat: 0 }),
    );
  });

  it('spawns optional muzzle and impact vfx when matching animations are available', () => {
    const addGraphics = vi.fn(() => createGraphics());
    const addImage = vi.fn(() => createImage());
    const addSprite = vi.fn(() => createSprite());

    const scene = {
      add: {
        graphics: addGraphics,
        image: addImage,
        sprite: addSprite,
      },
      textures: {
        exists: vi.fn((key: string) => ['tower-laser-fire', 'projectile-hit-flash'].includes(key)),
      },
      anims: {
        exists: vi.fn((key: string) =>
          [getOptionalAnimationKey('tower-laser-fire'), getOptionalAnimationKey('projectile-hit-flash')].includes(key),
        ),
      },
    };

    const gridManager = {
      isInBounds: vi.fn(() => true),
      isWalkable: vi.fn(() => true),
      placeTower: vi.fn(() => true),
      removeTower: vi.fn(),
      getWalkabilityGrid: vi.fn(() => []),
      spawnPoint: { x: 0, y: 0 },
      exitPoint: { x: 11, y: 4 },
      gridToWorld: vi.fn(() => ({ x: 100, y: 120 })),
      getIsoDepth: vi.fn(() => 10),
      worldToGridFloat: vi.fn(() => ({ x: 1, y: 0 })),
    };

    const pathfinding = {
      invalidateCache: vi.fn(),
      findPath: vi.fn(() => [{ x: 0, y: 0 }, { x: 1, y: 0 }]),
    };

    const towerSystem = new TowerSystem(scene as never, gridManager as never, pathfinding as never);
    const result = towerSystem.placeTower(0, 0, 'laser');
    expect(result.success).toBe(true);

    towerSystem.update(1000, 16, [{ instanceId: 'unit_1', x: 132, y: 120, hp: 10 }]);

    expect(addSprite).toHaveBeenCalledWith(100, 100, 'tower-laser-fire');
    expect(addSprite).toHaveBeenCalledWith(132, 120, 'projectile-hit-flash');
  });

  it('spawns optional portal and explosion vfx for units when available', () => {
    const addSprite = vi.fn(() => createSprite());
    const addGraphics = vi.fn(() => ({
      clear: vi.fn(),
      fillStyle: vi.fn().mockReturnThis(),
      fillRect: vi.fn().mockReturnThis(),
      destroy: vi.fn(),
    }));

    const scene = {
      add: {
        sprite: addSprite,
        graphics: addGraphics,
      },
      textures: {
        exists: vi.fn((key: string) => ['vfx-spawn-portal', 'vfx-explosion-sm'].includes(key)),
      },
      anims: {
        exists: vi.fn((key: string) =>
          [getOptionalAnimationKey('vfx-spawn-portal'), getOptionalAnimationKey('vfx-explosion-sm')].includes(key),
        ),
      },
    };

    const gridManager = {
      gridToWorld: vi.fn(() => ({ x: 40, y: 60 })),
      worldToGrid: vi.fn(() => ({ x: 0, y: 0 })),
      worldToGridFloat: vi.fn(() => ({ x: 0, y: 0 })),
      getIsoDepth: vi.fn(() => 10),
    };

    const unitSystem = new UnitSystem(scene as never, gridManager as never);
    unitSystem.setPath([
      { x: 0, y: 0 },
      { x: 1, y: 0 },
    ]);
    unitSystem.queueUnits('scout_drone', 1);
    unitSystem.update(0, 300);
    unitSystem.applyDamage('unit_0', 999);

    expect(addSprite).toHaveBeenCalledWith(40, 60, 'vfx-spawn-portal');
    expect(addSprite).toHaveBeenCalledWith(40, 60, 'vfx-explosion-sm');
  });
});
