import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('phaser', () => ({
  default: {
    Scene: class {},
    Geom: { Point: class { constructor(public x: number, public y: number) {} } },
  },
}));

vi.mock('../src/EventBus', () => ({
  EventBus: {
    emit: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
  },
}));

import { AIOpponent } from '../src/systems/AIOpponent';
import { INITIAL_PLAYER_HP, INITIAL_GOLD, RANDOM_TOWER_COST } from '@gld/shared';

describe('AIOpponent', () => {
  let ai: AIOpponent;

  beforeEach(() => {
    ai = new AIOpponent();
  });

  it('initializes with correct defaults', () => {
    expect(ai.hp).toBe(INITIAL_PLAYER_HP);
    expect(ai.gold).toBe(INITIAL_GOLD);
    expect(ai.towerCount).toBe(0);
  });

  it('buildPhase spends gold on towers', () => {
    const startGold = ai.gold;
    ai.buildPhase();
    expect(ai.gold).toBeLessThan(startGold);
    expect(ai.towerCount).toBeGreaterThan(0);
  });

  it('queueUnits queues units for spawning', () => {
    ai.queueUnits('scout_drone', 3);
    expect(ai.hasActiveUnits()).toBe(true);
  });

  it('queueUnits ignores invalid unit IDs', () => {
    ai.queueUnits('invalid_unit', 3);
    expect(ai.hasActiveUnits()).toBe(false);
  });

  it('queueTransferUnits queues transfer units', () => {
    ai.queueTransferUnits('battle_robot', 2);
    expect(ai.hasActiveUnits()).toBe(true);
  });

  it('update spawns and moves units', () => {
    ai.queueUnits('scout_drone', 1);
    // First update: spawn
    const result1 = ai.update(0, 300);
    expect(result1.reachedExit).toBe(0);

    // Multiple updates to move unit along path
    let result: { reachedExit: number; killedUnits: string[] } = { reachedExit: 0, killedUnits: [] };
    for (let t = 300; t < 60000; t += 16) {
      result = ai.update(t, 16);
      if (result.reachedExit > 0) break;
    }
    // Unit should eventually reach exit (no towers to kill it)
    expect(result.reachedExit).toBeGreaterThan(0);
  });

  it('hasActiveUnits returns false with no units', () => {
    expect(ai.hasActiveUnits()).toBe(false);
  });

  it('destroy clears all state', () => {
    ai.queueUnits('scout_drone', 5);
    ai.buildPhase();
    ai.destroy();
    expect(ai.hasActiveUnits()).toBe(false);
  });
});
