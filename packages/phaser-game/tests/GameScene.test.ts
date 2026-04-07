import { beforeEach, describe, expect, it, vi } from 'vitest';

const { EventBus } = vi.hoisted(() => ({
	EventBus: {
		emit: vi.fn(),
		on: vi.fn(),
		off: vi.fn(),
		removeAllListeners: vi.fn(),
	},
}));

const { unloadAssetSections } = vi.hoisted(() => ({
	unloadAssetSections: vi.fn(),
}));
const { registerOptionalCombatAnimations } = vi.hoisted(() => ({
	registerOptionalCombatAnimations: vi.fn(),
}));
const { getCachedAssetManifest, prefetchAssetSections, shouldUseWebPTextures } =
	vi.hoisted(() => ({
		getCachedAssetManifest: vi.fn(),
		prefetchAssetSections: vi.fn(),
		shouldUseWebPTextures: vi.fn(() => false),
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

vi.mock('../src/assets/assetManifest', () => ({
	unloadAssetSections,
	registerOptionalCombatAnimations,
	getCachedAssetManifest,
	prefetchAssetSections,
	shouldUseWebPTextures,
	OPTIONAL_ASSET_SECTIONS: ['ui', 'vfx', 'projectiles'],
}));

vi.mock('../src/audio/SoundGenerator', () => ({
	soundGenerator: {
		playUnitDeath: vi.fn(),
		playWaveStart: vi.fn(),
		reset: vi.fn(),
	},
}));

import { GameScene } from '../src/scenes/Game';

function createScene(): GameScene & Record<string, unknown> {
	return new GameScene() as GameScene & Record<string, unknown>;
}

describe('GameScene', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('energySystem spends energy and updates balance', () => {
		const scene = createScene();
		// INITIAL_ENERGY is 10, accumulate energy (delta clamped to 5s)
		scene.energySystem.update(5);
		scene.energySystem.update(5);
		scene.energySystem.update(5); // 10 + 15 = 25 energy total
		expect(scene.energySystem.canAfford(10)).toBe(true);
		expect(scene.energySystem.spend(10)).toBe(true);
		expect(scene.energySystem.getEnergy()).toBe(15); // 25 - 10
	});

	it('energySystem rejects spend when insufficient', () => {
		const scene = createScene();
		expect(scene.energySystem.spend(100)).toBe(false);
		expect(scene.energySystem.getEnergy()).toBe(10); // unchanged (INITIAL_ENERGY is 10)
	});

	it('cleanup unregisters EventBus listeners before destroying systems', () => {
		const scene = createScene();
		scene.onSelectTower = vi.fn();
		scene.onClearTowerSelection = vi.fn();
		scene.onWaveStartedLifecycle = vi.fn();
		scene.playerTowers = { destroy: vi.fn() };
		scene.playerUnits = { destroy: vi.fn() };
		scene.playerWaves = { destroy: vi.fn() };
		scene.playerDeck = { reset: vi.fn() };
		scene.selectionGraphics = { clear: vi.fn() };
		scene.optionalAssetManifest = {
			generated: '2026-04-02T00:00:00.000Z',
			assets: [],
		};

		scene.cleanup();

		expect(EventBus.off).toHaveBeenCalledWith(
			'request-select-tower',
			scene.onSelectTower,
		);
		expect(EventBus.off).toHaveBeenCalledWith(
			'request-clear-tower-selection',
			scene.onClearTowerSelection,
		);
		expect(EventBus.off).toHaveBeenCalledWith(
			'wave-started',
			scene.onWaveStartedLifecycle,
		);
		expect(EventBus.off).toHaveBeenCalledWith(
			'request-set-speed',
			scene.onSetSpeed,
		);

		const offCalls = EventBus.off.mock.invocationCallOrder;
		const destroyCalls = [
			scene.playerTowers.destroy.mock.invocationCallOrder[0],
			scene.playerUnits.destroy.mock.invocationCallOrder[0],
			scene.playerWaves.destroy.mock.invocationCallOrder[0],
		];
		expect(offCalls[offCalls.length - 1]).toBeLessThan(
			Math.min(...destroyCalls),
		);
		expect(unloadAssetSections).toHaveBeenCalledWith(
			scene,
			scene.optionalAssetManifest,
			['ui', 'vfx', 'projectiles'],
		);
	});

	it('emits a PVE victory payload when the final slot ends with no remaining player units', () => {
		const scene = createScene();
		scene.hudBuyBtn = { setAlpha: vi.fn() };
		scene.hudRolledInfo = { setText: vi.fn() };
		scene.currentSlotDef = { slotIndex: 20 };
		scene.playerWaves = {
			update: vi.fn(),
			getPhase: vi.fn(() => 'ended'),
			getElapsedMs: vi.fn(() => 0),
		};
		scene.playerTowers = {
			update: vi.fn(() => []),
			getTowers: vi.fn(() => []),
			destroy: vi.fn(),
		};
		scene.playerUnits = {
			getUnitPositions: vi.fn(() => []),
			getUnitElement: vi.fn(() => 'neutral'),
			applyDamage: vi.fn(),
			applySlow: vi.fn(),
			update: vi.fn(() => ({ reachedExit: [] })),
			hasActiveUnits: vi.fn(() => false),
			hasQueuedUnits: vi.fn(() => false),
			getActiveCount: vi.fn(() => 0),
		};

		scene.update(0, 16);

		expect(EventBus.emit).toHaveBeenCalledWith('game-over', {
			result: 'victory',
			reason: 'all_waves_cleared',
			finalSlot: 20,
			stats: {
				wavesCleared: 20,
				towersPlaced: 0,
				timeSurvivedSec: 0,
				goldEarned: 0,
				rewardMultiplier: 1,
			},
		});
	});

	it('emits defeat with wavesCleared=finalSlot-1 when base HP depletes', () => {
		const scene = createScene();
		scene.hudBuyBtn = { setAlpha: vi.fn() };
		scene.hudRolledInfo = { setText: vi.fn() };
		scene.currentSlotDef = { slotIndex: 5 };
		scene.playerHp = 1; // one more hit defeats
		scene.playerWaves = {
			update: vi.fn(),
			getPhase: vi.fn(() => 'running'),
			getElapsedMs: vi.fn(() => 0),
		};
		scene.playerTowers = {
			update: vi.fn(() => []),
			getTowers: vi.fn(() => []),
			destroy: vi.fn(),
		};
		scene.playerUnits = {
			getUnitPositions: vi.fn(() => []),
			getUnitElement: vi.fn(() => 'neutral'),
			applyDamage: vi.fn(),
			applySlow: vi.fn(),
			update: vi.fn(() => ({ reachedExit: ['unit-1'] })), // triggers damage
			hasActiveUnits: vi.fn(() => true),
			hasQueuedUnits: vi.fn(() => false),
			getActiveCount: vi.fn(() => 1),
		};

		scene.update(0, 16);

		expect(EventBus.emit).toHaveBeenCalledWith('game-over', {
			result: 'defeat',
			reason: 'base_hp_depleted',
			finalSlot: 5,
			stats: {
				wavesCleared: 4, // finalSlot-1
				towersPlaced: 0,
				timeSurvivedSec: 0,
				goldEarned: 0,
				rewardMultiplier: 1,
			},
		});
	});

	it('never emits opponent-state or kill-transfer during the PVE combat loop', () => {
		const scene = createScene();
		scene.hudBuyBtn = { setAlpha: vi.fn() };
		scene.hudRolledInfo = { setText: vi.fn() };
		scene.currentSlotDef = { slotIndex: 7 };
		scene.playerWaves = {
			update: vi.fn(),
			getPhase: vi.fn(() => 'running'),
			getElapsedMs: vi.fn(() => 0),
		};
		scene.playerTowers = {
			update: vi.fn(() => [
				{ unitId: 'unit-1', damage: 99, towerElement: 'neutral' },
			]),
		};
		scene.playerUnits = {
			getUnitPositions: vi.fn(() => []),
			getUnitElement: vi.fn(() => 'neutral'),
			applyDamage: vi.fn(() => ({
				killed: true,
				unitDefId: 'scout_drone',
				bounty: 3,
				countsTowardClear: true,
				source: 'base',
			})),
			applySlow: vi.fn(),
			update: vi.fn(() => ({ reachedExit: [] })),
			hasActiveUnits: vi.fn(() => true),
			hasQueuedUnits: vi.fn(() => false),
			getActiveCount: vi.fn(() => 1),
		};

		scene.update(0, 16);

		expect(EventBus.emit).not.toHaveBeenCalledWith(
			'opponent-state',
			expect.anything(),
		);
		expect(EventBus.emit).not.toHaveBeenCalledWith(
			'kill-transfer',
			expect.anything(),
		);
	});

	it('skips optional asset post-processing when shutdown wins the race', async () => {
		let resolvePrefetch: (() => void) | undefined;
		prefetchAssetSections.mockImplementationOnce(
			() =>
				new Promise<void>((resolve) => {
					resolvePrefetch = resolve;
				}),
		);

		const scene = createScene();
		scene.onSelectTower = vi.fn();
		scene.onClearTowerSelection = vi.fn();
		scene.onWaveStartedLifecycle = vi.fn();
		scene.playerTowers = { destroy: vi.fn() };
		scene.playerUnits = { destroy: vi.fn() };
		scene.playerWaves = { destroy: vi.fn() };
		scene.playerDeck = { reset: vi.fn() };
		scene.selectionGraphics = { clear: vi.fn() };
		scene.optionalAssetManifest = {
			generated: '2026-04-02T00:00:00.000Z',
			assets: [],
		};

		const pending = scene.prefetchOptionalAssets();
		scene.cleanup();
		resolvePrefetch?.();
		await pending;

		expect(registerOptionalCombatAnimations).not.toHaveBeenCalled();
		expect(unloadAssetSections).toHaveBeenCalledTimes(2);
		expect(unloadAssetSections).toHaveBeenLastCalledWith(
			scene,
			scene.optionalAssetManifest,
			['ui', 'vfx', 'projectiles'],
		);
	});
});
