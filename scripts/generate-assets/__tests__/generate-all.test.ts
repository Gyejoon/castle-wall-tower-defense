import { describe, expect, it } from 'vitest';
import { collectStaticFieldAssetEntries } from '../generate-all';
import { generate as generateUnits } from '../generate-units';

describe('generate-all field asset contract', () => {
  it('uses vendored Tiny Swords field assets instead of generated field tile keys', () => {
    const entries = collectStaticFieldAssetEntries();

    expect(entries.some((entry) => entry.key === 'grid-floor')).toBe(false);
    expect(entries.some((entry) => entry.key === 'path-tile')).toBe(false);
    expect(entries.some((entry) => entry.key === 'spawn-tile')).toBe(false);
    expect(entries.some((entry) => entry.key === 'exit-tile')).toBe(false);
    expect(entries.some((entry) => entry.key === 'tileset')).toBe(false);
    expect(entries.some((entry) => entry.key === 'tiny-swords-tileset-color-1')).toBe(true);
    expect(entries.some((entry) => entry.key === 'tiny-swords-tree-1')).toBe(true);
  });
});

describe('generate-units asset contract', () => {
  it('emits walk, idle, and death sheets for the four redesigned units and keeps titan boss sheets', async () => {
    const entries = await generateUnits();
    const byKey = new Map(entries.map((entry) => [entry.key, entry]));

    for (const unitId of [
      'scout_drone',
      'battle_robot',
      'heavy_walker',
      'stealth_drone',
    ] as const) {
      expect(byKey.get(`unit-${unitId}`)).toMatchObject({
        key: `unit-${unitId}`,
        type: 'spritesheet',
        path: `assets/units/${unitId}.png`,
        frameWidth: 40,
        frameHeight: 48,
        frameCount: 8,
      });
      expect(byKey.get(`unit-${unitId}-idle`)).toMatchObject({
        key: `unit-${unitId}-idle`,
        type: 'spritesheet',
        path: `assets/units/${unitId}_idle.png`,
        frameWidth: 40,
        frameHeight: 48,
        frameCount: 6,
      });
      expect(byKey.get(`unit-${unitId}-death`)).toMatchObject({
        key: `unit-${unitId}-death`,
        type: 'spritesheet',
        path: `assets/units/${unitId}_death.png`,
        frameWidth: 40,
        frameHeight: 48,
        frameCount: 6,
      });
    }

    expect(byKey.has('unit-death')).toBe(false);
    expect(byKey.get('unit-titan')).toMatchObject({
      key: 'unit-titan',
      type: 'spritesheet',
      path: 'assets/units/titan.png',
      frameWidth: 40,
      frameHeight: 48,
      frameCount: 8,
    });
    expect(byKey.get('unit-titan-boss')).toMatchObject({
      key: 'unit-titan-boss',
      type: 'spritesheet',
      path: 'assets/units/titan-boss.png',
      frameWidth: 96,
      frameHeight: 96,
      frameCount: 8,
      section: 'preload',
    });
    expect(byKey.get('unit-titan-boss-rage')).toMatchObject({
      key: 'unit-titan-boss-rage',
      type: 'spritesheet',
      path: 'assets/units/titan-boss-rage.png',
      frameWidth: 96,
      frameHeight: 96,
      frameCount: 8,
      section: 'preload',
    });
  });
});
