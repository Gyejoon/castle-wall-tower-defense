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
  queueUnits = vi.fn();
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
  rollRandomTower = vi.fn(() => ({ id: 'laser', name: 'Laser' }));
  reset = vi.fn();
}

class MockMergeSystem {
  canMerge = vi.fn(() => false);
  merge = vi.fn(() => null);
  destroy = vi.fn();
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
    setOrigin: vi.fn().mockReturnThis(),
    setTint: vi.fn().mockReturnThis(),
    setCrop: vi.fn().mockReturnThis(),
    destroy: vi.fn(),
  };
}

function createText() {
  return {
    setOrigin: vi.fn().mockReturnThis(),
    setDepth: vi.fn().mockReturnThis(),
    setInteractive: vi.fn().mockReturnThis(),
    setAlpha: vi.fn().mockReturnThis(),
    setText: vi.fn().mockReturnThis(),
    on: vi.fn().mockReturnThis(),
    destroy: vi.fn(),
  };
}

describe('GameScene field runtime', () => {
  beforeEach(() => {
    eventBus.on.mockClear();
    eventBus.off.mockClear();
    eventBus.emit.mockClear();
  });

  it('renders dual fields (AI dark + player normal) from generated tile assets', async () => {
    const addImage = vi.fn(() => createImage());
    const addSprite = vi.fn(() => createImage());
    const addGraphics = vi.fn(() => createGraphics());
    const addText = vi.fn(() => createText());
    const tilemapData = {
      getLayer: vi.fn(() => ({
        height: FOREST_GATE_MAP.height,
        width: FOREST_GATE_MAP.width,
        data: Array.from({ length: FOREST_GATE_MAP.height }, () =>
          Array.from({ length: FOREST_GATE_MAP.width }, () => ({ index: 0 })),
        ),
      })),
    };
    const makeTilemap = vi.fn(() => tilemapData);

    const { GameScene } = await import('../src/scenes/Game');
    const scene = new GameScene();

    Object.assign(scene, {
      add: {
        image: addImage,
        sprite: addSprite,
        graphics: addGraphics,
        text: addText,
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

    const spriteKeys = addSprite.mock.calls.map((call) => call[2]);
    const imageKeys = addImage.mock.calls.map((call) => call[2]);

    // Both fields rendered: 2x grid floor sprites
    const gridFloorCount = spriteKeys.filter((k) => k === 'grid-floor').length;
    const gridFloorDarkCount = spriteKeys.filter((k) => k === 'grid-floor-dark').length;
    expect(gridFloorCount).toBe(FOREST_GATE_MAP.width * FOREST_GATE_MAP.height);
    expect(gridFloorDarkCount).toBe(FOREST_GATE_MAP.width * FOREST_GATE_MAP.height);

    // Path tiles for both fields
    expect(imageKeys).toContain('path-tile');
    expect(imageKeys).toContain('path-tile-dark');
    expect(imageKeys).toContain('spawn-tile');
    expect(imageKeys).toContain('spawn-tile-dark');
    expect(imageKeys).toContain('exit-tile');
    expect(imageKeys).toContain('exit-tile-dark');

    // HUD text buttons created
    expect(addText.mock.calls.length).toBeGreaterThanOrEqual(3);
  });
});
