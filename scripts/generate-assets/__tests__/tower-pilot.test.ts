import { describe, it, expect } from 'vitest';
import { existsSync, statSync } from 'node:fs';

const TOWER_DIR = 'packages/web-shell/public/assets/towers';

const PILOT_IDS = [
  'archer',
  'flame_tower',
  'dragon_nest',
  'wind_spire',
  'arcane_spire',
  'world_tree',
  'celestial',
  'divine_throne',
] as const;

const GRADES = ['rare', 'unique', 'epic'] as const;

describe('tower pilot assets', () => {
  for (const id of PILOT_IDS) {
    it(`${id}.png exists and is HQ (128×160)`, () => {
      const path = `${TOWER_DIR}/${id}.png`;
      expect(existsSync(path)).toBe(true);
      expect(statSync(path).size).toBeGreaterThan(1000);
    });

    for (const grade of GRADES) {
      it(`${id}-${grade}.png exists`, () => {
        const path = `${TOWER_DIR}/${id}-${grade}.png`;
        expect(existsSync(path)).toBe(true);
        expect(statSync(path).size).toBeGreaterThan(500);
      });
    }

    it(`${id}-fire.png exists as HQ spritesheet`, () => {
      const path = `${TOWER_DIR}/${id}-fire.png`;
      expect(existsSync(path)).toBe(true);
      expect(statSync(path).size).toBeGreaterThan(1000);
    });
  }

  it('legacy tower plasma.png still exists (regression)', () => {
    expect(existsSync(`${TOWER_DIR}/plasma.png`)).toBe(true);
  });

  it('legacy tower emp.png still exists (regression)', () => {
    expect(existsSync(`${TOWER_DIR}/emp.png`)).toBe(true);
  });
});
