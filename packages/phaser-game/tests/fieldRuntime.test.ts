import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FOREST_GATE_MAP } from '@gld/shared';

const eventBus = {
  on: vi.fn(),
  off: vi.fn(),
  emit: vi.fn(),
};

vi.mock('phaser', () => ({
  default: {
    Scene: class {
      add: unknown;
      make: unknown;
      input: unknown;
      events = { on: vi.fn() };
    },
  },
}));

vi.mock('../src/EventBus', () => ({
  EventBus: eventBus,
}));

vi.mock('../src/audio/SoundGenerator', () => ({
  soundGenerator: {
    playWaveStart: vi.fn(),
    playUnitDeath: vi.fn(),
    playTowerAttack: vi.fn(),
  },
}));

vi.mock('../src/placementRules', () => ({
  getPlacementGuardFailure: vi.fn(() => null),
}));

class MockGridManager {
  width = FOREST_GATE_MAP.width;
  height = FOREST_GATE_MAP.height;
  tileSize = FOREST_GATE_MAP.tileSize;
  spawnPoint = FOREST_GATE_MAP.spawnPoint;
  exitPoint = FOREST_GATE_MAP.exitPoint;

  worldToGrid() {
    return { x: 0, y: 0 };
  }

  isInBounds() {
    return true;
  }

  isWalkable() {
    return true;
  }

  gridToWorld(x: number, y: number) {
    return { x: x * 32 + 16, y: y * 32 + 16 };
  }

  getWalkabilityGrid() {
    return [];
  }
}

class MockPathfindingSystem {
  invalidateCache = vi.fn();
  findPath = vi.fn(() => FOREST_GATE_MAP.path);
}

class MockTowerSystem {
  destroy = vi.fn();
  hasTowerAt = vi.fn(() => false);
  placeTower = vi.fn(() => ({ success: true }));
  sellTower = vi.fn(() => ({ success: false, refund: 0 }));
  getTowers = vi.fn(() => []);
  update = vi.fn(() => []);
}

class MockUnitSystem {
  destroy = vi.fn();
  setPath = vi.fn();
  getUnitPositions = vi.fn(() => []);
  update = vi.fn(() => ({ reachedExit: [] }));
  hasActiveUnits = vi.fn(() => false);
  hasQueuedUnits = vi.fn(() => false);
  applyDamage = vi.fn(() => null);
  applySlow = vi.fn();
  getUnitDefId = vi.fn(() => null);
  queueTransferUnits = vi.fn();
}

class MockWaveSystem {
  destroy = vi.fn();
  start = vi.fn();
  update = vi.fn();
  getPhase = vi.fn(() => 'building');
  skipCountdown = vi.fn();
}

class MockRandomTowerSystem {
  rollRandomTower = vi.fn(() => ({ id: 'laser' }));
}

class MockMergeSystem {
  canMerge = vi.fn(() => false);
  merge = vi.fn(() => null);
}

class MockAIOpponent {
  hp = 20;
  gold = 0;
  destroy = vi.fn();
  queueUnits = vi.fn();
  buildPhase = vi.fn();
  queueTransferUnits = vi.fn();
  update = vi.fn(() => ({ killedUnits: [] }));
  hasActiveUnits = vi.fn(() => false);
}

vi.mock('../src/systems/GridManager', () => ({
  GridManager: MockGridManager,
}));

vi.mock('../src/systems/PathfindingSystem', () => ({
  PathfindingSystem: MockPathfindingSystem,
}));

vi.mock('../src/systems/TowerSystem', () => ({
  TowerSystem: MockTowerSystem,
}));

vi.mock('../src/systems/UnitSystem', () => ({
  UnitSystem: MockUnitSystem,
}));

vi.mock('../src/systems/WaveSystem', () => ({
  WaveSystem: MockWaveSystem,
}));

vi.mock('../src/systems/RandomTowerSystem', () => ({
  RandomTowerSystem: MockRandomTowerSystem,
}));

vi.mock('../src/systems/MergeSystem', () => ({
  MergeSystem: MockMergeSystem,
}));

vi.mock('../src/systems/AIOpponent', () => ({
  AIOpponent: MockAIOpponent,
}));

function createGraphics() {
  return {
    setDepth: vi.fn().mockReturnThis(),
    clear: vi.fn().mockReturnThis(),
    fillStyle: vi.fn().mockReturnThis(),
    fillRect: vi.fn().mockReturnThis(),
    lineStyle: vi.fn().mockReturnThis(),
    beginPath: vi.fn().mockReturnThis(),
    moveTo: vi.fn().mockReturnThis(),
    lineTo: vi.fn().mockReturnThis(),
    strokePath: vi.fn().mockReturnThis(),
    fillCircle: vi.fn().mockReturnThis(),
    destroy: vi.fn(),
  };
}

function createImage() {
  return {
    setDisplaySize: vi.fn().mockReturnThis(),
    setDepth: vi.fn().mockReturnThis(),
    setAlpha: vi.fn().mockReturnThis(),
    destroy: vi.fn(),
  };
}

describe('GameScene field runtime', () => {
  beforeEach(() => {
    eventBus.on.mockClear();
    eventBus.off.mockClear();
    eventBus.emit.mockClear();
  });

  it('renders the field from generated tile assets instead of the legacy tilemap bundle', async () => {
    const addImage = vi.fn(() => createImage());
    const addSprite = vi.fn(() => createImage());
    const addGraphics = vi.fn(() => createGraphics());
    const makeTilemap = vi.fn(() => ({
      addTilesetImage: vi.fn(() => ({})),
      createLayer: vi.fn(() => ({ setDepth: vi.fn().mockReturnThis() })),
    }));

    const { GameScene } = await import('../src/scenes/Game');
    const scene = new GameScene();

    Object.assign(scene, {
      add: {
        image: addImage,
        sprite: addSprite,
        graphics: addGraphics,
      },
      make: {
        tilemap: makeTilemap,
      },
      input: {
        on: vi.fn(),
      },
      events: {
        on: vi.fn(),
      },
    });

    scene.create();

    const imageKeys = addImage.mock.calls.map((call) => call[2]);
    const spriteKeys = addSprite.mock.calls.map((call) => call[2]);

    expect(makeTilemap).not.toHaveBeenCalled();
    expect(spriteKeys.filter((key) => key === 'grid-floor')).toHaveLength(
      FOREST_GATE_MAP.width * FOREST_GATE_MAP.height,
    );
    expect(imageKeys).toContain('path-tile');
    expect(imageKeys).toContain('spawn-tile');
    expect(imageKeys).toContain('exit-tile');
  });
});
