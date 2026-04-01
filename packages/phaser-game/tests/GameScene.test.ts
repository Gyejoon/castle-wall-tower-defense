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

vi.mock('phaser3-rex-plugins/plugins/drag.js', () => ({
	default: class Drag {
		destroy() {}
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
		scene.onWaveStartedLifecycle = vi.fn();
		scene.playerTowers = { destroy: vi.fn() };
		scene.playerUnits = { destroy: vi.fn() };
		scene.playerWaves = { destroy: vi.fn() };
		scene.playerMerge = { destroy: vi.fn() };
		scene.playerRandomTower = { reset: vi.fn() };
		scene.aiTowers = { destroy: vi.fn() };
		scene.aiUnits = { destroy: vi.fn() };
		scene.aiRandomTower = { reset: vi.fn() };
		scene.aiMerge = { destroy: vi.fn() };
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

		const offCalls = EventBus.off.mock.invocationCallOrder;
		const destroyCalls = [
			scene.playerTowers.destroy.mock.invocationCallOrder[0],
			scene.playerUnits.destroy.mock.invocationCallOrder[0],
			scene.playerWaves.destroy.mock.invocationCallOrder[0],
			scene.aiTowers.destroy.mock.invocationCallOrder[0],
			scene.aiUnits.destroy.mock.invocationCallOrder[0],
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

	it('queues pressure units without bounty or clear credit', () => {
		const scene = createScene();
		scene.playerUnits = { queueUnits: vi.fn() };
		scene.aiUnits = { queueUnits: vi.fn() };
		scene.queuedPressureForPlayer = new Map([[10, 'mixed_pressure']]);
		scene.queuedPressureForOpponent = new Map([[10, 'breach_pressure']]);

		scene.applyQueuedPressureForSlot(10);

		expect(scene.playerUnits.queueUnits).toHaveBeenCalledWith(
			'scout_drone',
			4,
			expect.objectContaining({
				bountyOverride: 0,
				countsTowardClear: false,
				source: 'pressure',
			}),
		);
		expect(scene.aiUnits.queueUnits).toHaveBeenCalledWith(
			'battle_robot',
			2,
			expect.objectContaining({
				bountyOverride: 0,
				countsTowardClear: false,
				source: 'pressure',
			}),
		);
	});

	it('expires every unused pressure token on sudden death', () => {
		const scene = createScene();
		scene.currentSlotDef = { slotIndex: 19 };
		scene.localPressureInventory = ['mixed_pressure', 'breach_pressure'];
		scene.opponentPressureInventory = ['scout_pressure'];

		scene.expirePressureAtSuddenDeath();

		expect(scene.localPressureInventory).toEqual([]);
		expect(scene.opponentPressureInventory).toEqual([]);
		expect(EventBus.emit).toHaveBeenCalledWith('pressure-expired', {
			ownerId: 'local',
			slotIndex: 19,
			pressureTokens: 0,
			packetId: 'mixed_pressure',
		});
		expect(EventBus.emit).toHaveBeenCalledWith('pressure-expired', {
			ownerId: 'opponent',
			slotIndex: 19,
			pressureTokens: 0,
			packetId: 'scout_pressure',
		});
	});

	it('applies optional AI overlay art when the UI textures are available', () => {
		const scene = createScene();
		const addImage = vi.fn(() => ({
			setDisplaySize: vi.fn().mockReturnThis(),
			setDepth: vi.fn().mockReturnThis(),
			setAlpha: vi.fn().mockReturnThis(),
		}));
		const addSprite = vi.fn(() => ({
			setDisplaySize: vi.fn().mockReturnThis(),
			setDepth: vi.fn().mockReturnThis(),
			setAlpha: vi.fn().mockReturnThis(),
		}));

		scene.add = {
			image: addImage,
			sprite: addSprite,
		};
		scene.textures = {
			exists: vi.fn(
				(key: string) => key === 'ui-ghost-avatar' || key === 'ui-stat-icons',
			),
		};

		scene.applyOptionalUiAssets();

		expect(addImage).toHaveBeenCalledWith(12, 14, 'ui-ghost-avatar');
		expect(addSprite).toHaveBeenCalledWith(12, 32, 'ui-stat-icons', 1);
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
		scene.playerMerge = { destroy: vi.fn() };
		scene.playerRandomTower = { reset: vi.fn() };
		scene.aiTowers = { destroy: vi.fn() };
		scene.aiUnits = { destroy: vi.fn() };
		scene.aiRandomTower = { reset: vi.fn() };
		scene.aiMerge = { destroy: vi.fn() };
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
