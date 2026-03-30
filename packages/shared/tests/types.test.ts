import { describe, it, expect } from 'vitest';
import {
  BASE_TOWERS,
  FUSION_TOWERS,
  ALL_TOWERS,
  UNITS,
  GRID_WIDTH,
  GRID_HEIGHT,
  DEFAULT_GRID_CONFIG,
} from '../src/index';

describe('Grid constants', () => {
  it('has valid grid dimensions', () => {
    expect(GRID_WIDTH).toBe(12);
    expect(GRID_HEIGHT).toBe(8);
  });

  it('has spawn and exit within grid bounds', () => {
    const { spawnPoint, exitPoint } = DEFAULT_GRID_CONFIG;
    expect(spawnPoint.x).toBeGreaterThanOrEqual(0);
    expect(spawnPoint.x).toBeLessThan(GRID_WIDTH);
    expect(exitPoint.x).toBeGreaterThanOrEqual(0);
    expect(exitPoint.x).toBeLessThan(GRID_WIDTH);
  });
});

describe('Tower definitions', () => {
  it('has 4 base towers', () => {
    expect(BASE_TOWERS).toHaveLength(4);
  });

  it('base towers have unique ids', () => {
    const ids = BASE_TOWERS.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('base towers are tier 1, fusion towers are tier 2', () => {
    BASE_TOWERS.forEach((t) => expect(t.tier).toBe(1));
    FUSION_TOWERS.forEach((t) => expect(t.tier).toBe(2));
  });

  it('fusion towers have valid recipes referencing base tower types', () => {
    const baseTypes = new Set(BASE_TOWERS.map((t) => t.type));
    FUSION_TOWERS.forEach((t) => {
      expect(t.fusionRecipe).toBeDefined();
      t.fusionRecipe!.forEach((ingredient) => {
        expect(baseTypes.has(ingredient)).toBe(true);
      });
    });
  });

  it('ALL_TOWERS contains all base + fusion', () => {
    expect(ALL_TOWERS).toHaveLength(BASE_TOWERS.length + FUSION_TOWERS.length);
  });
});

describe('Unit definitions', () => {
  it('has 5 unit types', () => {
    expect(UNITS).toHaveLength(5);
  });

  it('units have unique ids', () => {
    const ids = UNITS.map((u) => u.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('titan is the most expensive to send', () => {
    const titan = UNITS.find((u) => u.type === 'titan')!;
    const otherMaxCost = Math.max(...UNITS.filter((u) => u.type !== 'titan').map((u) => u.sendCost));
    expect(titan.sendCost).toBeGreaterThan(otherMaxCost);
  });
});
