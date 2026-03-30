import { describe, it, expect } from 'vitest';
import {
  BASE_TOWERS,
  RARE_TOWERS,
  HEROIC_TOWERS,
  LEGENDARY_TOWERS,
  GOD_TOWERS,
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
  it('has 4 base towers (T1)', () => {
    expect(BASE_TOWERS).toHaveLength(4);
  });

  it('has 5 rare towers (T2)', () => {
    expect(RARE_TOWERS).toHaveLength(5);
  });

  it('has 4 heroic towers (T3)', () => {
    expect(HEROIC_TOWERS).toHaveLength(4);
  });

  it('has 3 legendary towers (T4)', () => {
    expect(LEGENDARY_TOWERS).toHaveLength(3);
  });

  it('has 2 god towers (T5)', () => {
    expect(GOD_TOWERS).toHaveLength(2);
  });

  it('all towers have unique ids', () => {
    const ids = ALL_TOWERS.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('towers have correct tier assignments', () => {
    BASE_TOWERS.forEach((t) => expect(t.tier).toBe(1));
    RARE_TOWERS.forEach((t) => expect(t.tier).toBe(2));
    HEROIC_TOWERS.forEach((t) => expect(t.tier).toBe(3));
    LEGENDARY_TOWERS.forEach((t) => expect(t.tier).toBe(4));
    GOD_TOWERS.forEach((t) => expect(t.tier).toBe(5));
  });

  it('ALL_TOWERS contains all 18 towers', () => {
    expect(ALL_TOWERS).toHaveLength(18);
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
