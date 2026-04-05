import { describe, expect, it } from 'vitest';
import { getLevelBand, scaleUnitStats } from '../src/constants/scaling';

describe('getLevelBand', () => {
  it('returns 1 for levels 1-10', () => {
    expect(getLevelBand(1)).toBe(1);
    expect(getLevelBand(10)).toBe(1);
  });
  it('returns 2 for levels 11-20', () => {
    expect(getLevelBand(11)).toBe(2);
    expect(getLevelBand(20)).toBe(2);
  });
  it('returns 3 for levels 21-30', () => {
    expect(getLevelBand(21)).toBe(3);
    expect(getLevelBand(30)).toBe(3);
  });
  it('clamps at 3 for levels above 30', () => {
    expect(getLevelBand(50)).toBe(3);
  });
});

describe('scaleUnitStats', () => {
  const base = { hp: 100, speed: 2.0, armor: 5 };

  it('returns unmodified stats for band 1 (LV.1-10)', () => {
    const result = scaleUnitStats(base, 1);
    expect(result).toEqual({ hp: 100, speed: 2.0, armor: 5, ccImmunityChance: 0 });
  });

  it('applies band 2 multipliers for LV.11-20', () => {
    const result = scaleUnitStats(base, 15);
    expect(result.hp).toBe(800);
    expect(result.armor).toBe(25);
    expect(result.speed).toBeCloseTo(2.4);
    expect(result.ccImmunityChance).toBe(0.1);
  });

  it('applies band 3 multipliers for LV.21-30', () => {
    const result = scaleUnitStats(base, 25);
    expect(result.hp).toBe(5000);
    expect(result.armor).toBe(100);
    expect(result.speed).toBeCloseTo(3.0);
    expect(result.ccImmunityChance).toBe(0.2);
  });
});
