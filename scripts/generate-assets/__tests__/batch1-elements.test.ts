import { describe, it, expect } from 'vitest';
import { existsSync } from 'fs';

const ASSETS_DIR = 'packages/web-shell/public/assets';

describe('Batch 1: element/boss/result assets', () => {
  it('element badges exist (4 files)', () => {
    for (const element of ['fire', 'water', 'lightning', 'neutral']) {
      expect(existsSync(`${ASSETS_DIR}/vfx/element-badge-${element}.png`)).toBe(true);
    }
  });

  it('element projectile variants exist (3 files)', () => {
    for (const name of ['fire-bolt', 'ice-shard', 'spark-chain']) {
      expect(existsSync(`${ASSETS_DIR}/projectiles/${name}.png`)).toBe(true);
    }
  });

  it('element hit flashes exist (3 files)', () => {
    for (const element of ['fire', 'water', 'lightning']) {
      expect(existsSync(`${ASSETS_DIR}/projectiles/hit-flash-${element}.png`)).toBe(true);
    }
  });

  it('dragon boss sprites exist', () => {
    expect(existsSync(`${ASSETS_DIR}/units/dragon-boss.png`)).toBe(true);
    expect(existsSync(`${ASSETS_DIR}/units/dragon-boss-rage.png`)).toBe(true);
  });

  it('boss VFX exist', () => {
    expect(existsSync(`${ASSETS_DIR}/vfx/boss-warning.png`)).toBe(true);
    expect(existsSync(`${ASSETS_DIR}/vfx/boss-final.png`)).toBe(true);
    expect(existsSync(`${ASSETS_DIR}/vfx/boss-telegraph.png`)).toBe(true);
    expect(existsSync(`${ASSETS_DIR}/vfx/boss-death-fx.png`)).toBe(true);
  });

  it('PVE result screens exist', () => {
    expect(existsSync(`${ASSETS_DIR}/ui/defense-success.png`)).toBe(true);
    expect(existsSync(`${ASSETS_DIR}/ui/defense-fail.png`)).toBe(true);
  });

  it('boss HP bar and energy gauge exist', () => {
    expect(existsSync(`${ASSETS_DIR}/ui/boss-hp-bar.png`)).toBe(true);
    expect(existsSync(`${ASSETS_DIR}/ui/energy-gauge.png`)).toBe(true);
  });

  it('PVP assets are removed', () => {
    expect(existsSync(`${ASSETS_DIR}/ui/match-draw.png`)).toBe(false);
    expect(existsSync(`${ASSETS_DIR}/ui/ghost-avatar.png`)).toBe(false);
    expect(existsSync(`${ASSETS_DIR}/ui/pressure-attack-effect.png`)).toBe(false);
  });
});
