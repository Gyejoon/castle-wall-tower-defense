import { describe, it, expect } from 'vitest';
import { WAVE_DEFS, TOTAL_WAVES } from '../src/constants/waves';
import { UNITS } from '../src/constants/units';

const validUnitIds = new Set(UNITS.map((u) => u.id));

describe('WAVE_DEFS', () => {
  it('TOTAL_WAVES matches WAVE_DEFS length', () => {
    expect(TOTAL_WAVES).toBe(WAVE_DEFS.length);
  });

  it('wave numbers are ascending starting from 1', () => {
    for (let i = 0; i < WAVE_DEFS.length; i++) {
      expect(WAVE_DEFS[i].wave).toBe(i + 1);
    }
  });

  it('all unit references are valid', () => {
    for (const wave of WAVE_DEFS) {
      for (const group of wave.groups) {
        expect(validUnitIds.has(group.unitId)).toBe(true);
      }
    }
  });

  it('all waves have positive build time and unit counts', () => {
    for (const wave of WAVE_DEFS) {
      expect(wave.buildTime).toBeGreaterThan(0);
      for (const group of wave.groups) {
        expect(group.count).toBeGreaterThan(0);
      }
    }
  });
});
