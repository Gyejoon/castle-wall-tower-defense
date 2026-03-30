import { describe, test, expect } from 'bun:test';
import {
  toManifestEntry,
  toSpritesheetManifestEntry,
  TILE_PROMPTS,
  TOWER_PROMPTS,
  UNIT_PROMPTS,
  FULL_PALETTE,
  WALK_FRAME_COUNT,
  ASSET_PATH_PREFIX,
} from '../ai-config';

describe('toManifestEntry', () => {
  test('creates image manifest entry with correct path stripping', () => {
    const entry = toManifestEntry({
      key: 'grid-floor',
      prompt: 'test',
      negativePrompt: 'test',
      outputPath: 'packages/web-shell/public/assets/tiles/grid-floor.png',
      frameCount: 1,
      frameWidth: 32,
      frameHeight: 32,
      type: 'image',
    });

    expect(entry.key).toBe('grid-floor');
    expect(entry.type).toBe('image');
    expect(entry.path).toBe('assets/tiles/grid-floor.png');
    expect(entry.frameWidth).toBeUndefined();
  });

  test('creates spritesheet manifest entry with frame dimensions', () => {
    const entry = toManifestEntry({
      key: 'tower-laser-fire',
      prompt: 'test',
      negativePrompt: 'test',
      outputPath: 'packages/web-shell/public/assets/towers/laser-fire.png',
      frameCount: 4,
      frameWidth: 32,
      frameHeight: 32,
      type: 'spritesheet',
    });

    expect(entry.type).toBe('spritesheet');
    expect(entry.frameWidth).toBe(32);
    expect(entry.frameHeight).toBe(32);
    expect(entry.frameCount).toBe(4);
  });
});

describe('toSpritesheetManifestEntry', () => {
  test('creates unit spritesheet entry', () => {
    const entry = toSpritesheetManifestEntry(
      'unit-scout_drone',
      'packages/web-shell/public/assets/units/scout_drone.png',
      4,
    );

    expect(entry.key).toBe('unit-scout_drone');
    expect(entry.type).toBe('spritesheet');
    expect(entry.path).toBe('assets/units/scout_drone.png');
    expect(entry.frameCount).toBe(4);
    expect(entry.frameWidth).toBe(32);
  });

  test('supports custom frame size', () => {
    const entry = toSpritesheetManifestEntry(
      'test',
      'packages/web-shell/public/assets/test.png',
      4,
      64,
    );

    expect(entry.frameWidth).toBe(64);
    expect(entry.frameHeight).toBe(64);
  });
});

describe('config integrity', () => {
  test('TILE_PROMPTS has 4 entries', () => {
    expect(TILE_PROMPTS).toHaveLength(4);
  });

  test('TOWER_PROMPTS has 18 entries (9 towers × 2)', () => {
    expect(TOWER_PROMPTS).toHaveLength(18);
  });

  test('UNIT_PROMPTS has 5 entries', () => {
    expect(UNIT_PROMPTS).toHaveLength(5);
  });

  test('all tile keys are unique', () => {
    const keys = TILE_PROMPTS.map((t) => t.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  test('all tower keys are unique', () => {
    const keys = TOWER_PROMPTS.map((t) => t.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  test('all unit keys are unique', () => {
    const keys = UNIT_PROMPTS.map((u) => u.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  test('FULL_PALETTE has entries from shared PALETTE', () => {
    expect(FULL_PALETTE.length).toBeGreaterThan(10);
    expect(FULL_PALETTE.every((c) => c.startsWith('#'))).toBe(true);
  });

  test('WALK_FRAME_COUNT is 4', () => {
    expect(WALK_FRAME_COUNT).toBe(4);
  });

  test('all output paths start with ASSET_PATH_PREFIX pattern', () => {
    for (const tile of TILE_PROMPTS) {
      expect(tile.outputPath.startsWith('packages/web-shell/public/assets/')).toBe(true);
    }
    for (const tower of TOWER_PROMPTS) {
      expect(tower.outputPath.startsWith('packages/web-shell/public/assets/')).toBe(true);
    }
  });
});
