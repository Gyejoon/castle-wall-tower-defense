import { beforeEach, describe, expect, it, vi } from 'vitest';

const { EventBus } = vi.hoisted(() => ({
  EventBus: {
    emit: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
  },
}));

vi.mock('phaser', () => ({
  default: {
    Scene: class {
      constructor(_key?: string) {}
    },
  },
}));

vi.mock('../src/EventBus', () => ({
  EventBus,
}));

import { GameScene } from '../src/scenes/Game';

function createScene(): GameScene & Record<string, any> {
  return new GameScene() as GameScene & Record<string, any>;
}

describe('GameScene', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('spendGold deducts gold and emits the updated total when affordable', () => {
    const scene = createScene();
    scene.gold = 100;

    expect(scene.spendGold(50)).toBe(true);
    expect(scene.gold).toBe(50);
    expect(EventBus.emit).toHaveBeenCalledWith('gold-changed', { gold: 50 });
  });

  it('spendGold leaves gold unchanged when funds are insufficient', () => {
    const scene = createScene();
    scene.gold = 40;

    expect(scene.spendGold(50)).toBe(false);
    expect(scene.gold).toBe(40);
    expect(EventBus.emit).not.toHaveBeenCalled();
  });

  it('earnGold adds gold and emits the updated total', () => {
    const scene = createScene();
    scene.gold = 10;

    scene.earnGold(25);

    expect(scene.gold).toBe(35);
    expect(EventBus.emit).toHaveBeenCalledWith('gold-changed', { gold: 35 });
  });

  it('cleanup unregisters EventBus listeners before destroying systems', () => {
    const scene = createScene();
    scene.onSelectTower = vi.fn();
    scene.onClearTowerSelection = vi.fn();
    scene.onPlaceTower = vi.fn();
    scene.onSellTower = vi.fn();
    scene.onBuyRandomTower = vi.fn();
    scene.onStartWave = vi.fn();
    scene.onGameWon = vi.fn();
    scene.onWaveStartedLifecycle = vi.fn();
    scene.towerSystem = { destroy: vi.fn() };
    scene.unitSystem = { destroy: vi.fn() };
    scene.waveSystem = { destroy: vi.fn() };
    scene.aiOpponent = { destroy: vi.fn() };
    scene.mergeSystem = { destroy: vi.fn() };
    scene.randomTowerSystem = { reset: vi.fn() };

    scene.cleanup();

    expect(EventBus.off).toHaveBeenCalledWith('request-select-tower', scene.onSelectTower);
    expect(EventBus.off).toHaveBeenCalledWith('request-clear-tower-selection', scene.onClearTowerSelection);
    expect(EventBus.off).toHaveBeenCalledWith('request-place-tower', scene.onPlaceTower);
    expect(EventBus.off).toHaveBeenCalledWith('request-sell-tower', scene.onSellTower);
    expect(EventBus.off).toHaveBeenCalledWith('request-buy-random-tower', scene.onBuyRandomTower);
    expect(EventBus.off).toHaveBeenCalledWith('request-start-wave', scene.onStartWave);
    expect(EventBus.off).toHaveBeenCalledWith('game-won', scene.onGameWon);
    expect(EventBus.off).toHaveBeenCalledWith('wave-started', scene.onWaveStartedLifecycle);

    expect(scene.towerSystem.destroy).toHaveBeenCalledOnce();
    expect(scene.unitSystem.destroy).toHaveBeenCalledOnce();
    expect(scene.waveSystem.destroy).toHaveBeenCalledOnce();
    expect(scene.aiOpponent.destroy).toHaveBeenCalledOnce();

    const offCalls = EventBus.off.mock.invocationCallOrder;
    const destroyCalls = [
      scene.towerSystem.destroy.mock.invocationCallOrder[0],
      scene.unitSystem.destroy.mock.invocationCallOrder[0],
      scene.waveSystem.destroy.mock.invocationCallOrder[0],
      scene.aiOpponent.destroy.mock.invocationCallOrder[0],
    ];
    expect(offCalls[offCalls.length - 1]).toBeLessThan(Math.min(...destroyCalls));
  });
});
