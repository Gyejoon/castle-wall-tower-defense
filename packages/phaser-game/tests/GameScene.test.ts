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
import { BossContextBuilder } from '../src/scenes/runtime/BossContextBuilder';
import { CombatMediator } from '../src/scenes/runtime/CombatMediator';
import { GameStateManager } from '../src/scenes/runtime/GameStateManager';

function createScene(): GameScene & Record<string, unknown> {
	return new GameScene() as GameScene & Record<string, unknown>;
}

// Game.ts와 동일한 onEndGame/onExitSideEffect 계약으로 GameStateManager를 세팅한다.
function installRuntimeControllers(
	scene: GameScene & Record<string, unknown>,
	opts: {
		initialHp?: number;
		slotIndex: number;
		bossBehaviors?: Map<string, unknown>;
	} = { slotIndex: 0 },
): GameStateManager {
	const state = new GameStateManager({
		initialHp: opts.initialHp,
		emit: EventBus.emit as never,
		onEndGame: (reason) => {
			const rangeOverlay = scene.rangeOverlay as {
				getRangeOverlayGraphics: () => { clear: () => void };
			};
			rangeOverlay?.getRangeOverlayGraphics().clear();
			const towers = scene.playerTowers as {
				getTowers: () => unknown[];
				destroy: () => void;
			};
			const towersPlaced = towers.getTowers().length;
			towers.destroy();
			const waves = scene.playerWaves as {
				getMaxWaves: () => number;
				getElapsedMs: () => number;
			};
			const finalSlot =
				(state.getCurrentSlotDef()?.slotIndex as number | undefined) ?? 0;
			EventBus.emit('game-over', {
				result: reason.result,
				stats: {
					wavesCleared:
						reason.result === 'victory'
							? finalSlot
							: Math.max(0, finalSlot - 1),
					totalWaves: waves.getMaxWaves(),
					towersPlaced,
					timeSurvivedSec: Math.round(waves.getElapsedMs() / 1000),
					goldEarned: state.getGoldEarned(),
					remainingHp: Math.max(0, state.getHp()),
					initialHp: state.getInitialHp(),
				},
			});
		},
		onExitSideEffect: (remainingHp) => {
			const castleWall = scene.castleWall as
				| { update: (n: number) => void; onHit: () => void }
				| undefined;
			EventBus.emit('base-hp-changed', {
				hp: remainingHp,
				maxHp: state.getInitialHp(),
				laneIndex: 0,
			});
			castleWall?.update(remainingHp);
			castleWall?.onHit();
		},
	});
	state.setCurrentSlotDef({
		slotIndex: opts.slotIndex,
	} as never);
	scene.state = state;
	scene.combat = new CombatMediator({
		towers: scene.playerTowers as never,
		units: scene.playerUnits as never,
		damageNumbers: scene.damageNumbers as never,
		bossBehaviors: (opts.bossBehaviors ?? new Map()) as never,
		orchestrator: undefined,
		isGameMap: false,
	});
	scene.bossCtx = new BossContextBuilder({
		units: scene.playerUnits as never,
		towers: scene.playerTowers as never,
		getSceneTime: () => state.getScaledTime(),
	});
	scene.bossBehaviors = opts.bossBehaviors ?? new Map();
	return state;
}

describe('GameScene', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('energySystem spends energy and updates balance', () => {
		const scene = createScene();
		// INITIAL_ENERGY is 40, accumulate energy (delta clamped to 5s)
		scene.energySystem.update(5);
		scene.energySystem.update(5);
		scene.energySystem.update(5); // 40 + 15 = 55 energy total
		expect(scene.energySystem.canAfford(10)).toBe(true);
		expect(scene.energySystem.spend(10)).toBe(true);
		expect(scene.energySystem.getEnergy()).toBe(45); // 55 - 10
	});

	it('energySystem rejects spend when insufficient', () => {
		const scene = createScene();
		expect(scene.energySystem.spend(100)).toBe(false);
		expect(scene.energySystem.getEnergy()).toBe(40); // unchanged (INITIAL_ENERGY is 40)
	});

	it('cleanup unregisters EventBus listeners before destroying systems', () => {
		const scene = createScene();
		scene.onSelectTower = vi.fn();
		scene.onClearTowerSelection = vi.fn();
		scene.onWaveStartedLifecycle = vi.fn();
		scene.game = { registry: { events: { off: vi.fn() } } };
		scene.damageNumbers = { destroy: vi.fn(), setEnabled: vi.fn() };
		scene.playerTowers = { destroy: vi.fn() };
		scene.playerUnits = { destroy: vi.fn() };
		scene.playerWaves = { destroy: vi.fn() };
		scene.playerDeck = { reset: vi.fn() };
		scene.fieldRenderer = { destroy: vi.fn() };
		scene.rangeOverlay = { destroy: vi.fn() };
		scene.optionalAssetManifest = {
			generated: '2026-04-02T00:00:00.000Z',
			assets: [],
		};
		scene.castleWall = { destroy: vi.fn() };
		scene.spawnHut = { destroy: vi.fn() };
		scene.energySystem = { reset: vi.fn() };

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

	it('clears selected tower state after a successful placement', async () => {
		const { PlacementCoordinator } = await import(
			'../src/scenes/input/PlacementCoordinator'
		);
		const energy = { canAfford: vi.fn(() => true), spend: vi.fn() };
		const deck = { getCardByTowerId: vi.fn(() => ({ energyCost: 3 })) };
		const waves = { getPhase: vi.fn(() => 'combat') };
		const towers = {
			placeTower: vi.fn(() => ({ success: true })),
			getTowers: vi.fn(() => [{}, {}]),
		};
		const rangeOverlay = {
			clearSelection: vi.fn(),
			clearRangeOverlay: vi.fn(),
		};
		const selected = { id: 'archer' as string | null };
		const coord = new PlacementCoordinator({
			towers: towers as never,
			energy: energy as never,
			deck: deck as never,
			orchestrator: undefined,
			waves: waves as never,
			emit: EventBus.emit as never,
			onBeforeSuccessEmit: () => {
				selected.id = null;
				rangeOverlay.clearSelection();
				rangeOverlay.clearRangeOverlay();
			},
			onSuccess: vi.fn(),
		});

		coord.place(1, 2, 'archer');

		expect(selected.id).toBeNull();
		expect(rangeOverlay.clearSelection).toHaveBeenCalledOnce();
		expect(rangeOverlay.clearRangeOverlay).toHaveBeenCalledOnce();
		expect(EventBus.emit).toHaveBeenCalledWith('tower-deselected');
	});

	it('emits a PVE victory payload when the final slot ends with no remaining player units', () => {
		const scene = createScene();
		scene.hudBuyBtn = { setAlpha: vi.fn() };
		scene.hudRolledInfo = { setText: vi.fn() };
		scene.rangeOverlay = {
			getRangeOverlayGraphics: vi.fn(() => ({ clear: vi.fn() })),
		};
		scene.currentMap = { id: 'forest_gate' };
		scene.damageNumbers = {
			update: vi.fn(),
			show: vi.fn(),
			destroy: vi.fn(),
			setEnabled: vi.fn(),
		};
		scene.playerWaves = {
			update: vi.fn(),
			getPhase: vi.fn(() => 'ended'),
			getElapsedMs: vi.fn(() => 0),
			getWaveRemainingSec: vi.fn(() => -1),
			getMaxWaves: vi.fn(() => 10),
		};
		scene.playerTowers = {
			update: vi.fn(() => []),
			getTowers: vi.fn(() => []),
			destroy: vi.fn(),
		};
		scene.playerUnits = {
			getUnitPositions: vi.fn(() => []),
			getUnitElement: vi.fn(() => 'neutral'),
			getUnitWorldPos: vi.fn(() => null),
			applyDamage: vi.fn(),
			applySlow: vi.fn(),
			update: vi.fn(() => ({ reachedExit: [] })),
			hasActiveUnits: vi.fn(() => false),
			hasQueuedUnits: vi.fn(() => false),
			getActiveCount: vi.fn(() => 0),
		};
		installRuntimeControllers(scene, { initialHp: 20, slotIndex: 20 });

		scene.update(0, 16);

		expect(EventBus.emit).toHaveBeenCalledWith('game-over', {
			result: 'victory',
			stats: {
				wavesCleared: 20,
				totalWaves: 10,
				towersPlaced: 0,
				timeSurvivedSec: 0,
				goldEarned: 0,
				remainingHp: 20,
				initialHp: 20,
			},
		});
	});

	it('emits defeat with wavesCleared=finalSlot-1 when base HP depletes', () => {
		const scene = createScene();
		scene.hudBuyBtn = { setAlpha: vi.fn() };
		scene.hudRolledInfo = { setText: vi.fn() };
		scene.rangeOverlay = {
			getRangeOverlayGraphics: vi.fn(() => ({ clear: vi.fn() })),
		};
		scene.currentMap = { id: 'forest_gate' };
		scene.castleWall = { update: vi.fn(), onHit: vi.fn(), destroy: vi.fn() };
		scene.spawnHut = { setActive: vi.fn(), destroy: vi.fn() };
		scene.damageNumbers = {
			update: vi.fn(),
			show: vi.fn(),
			destroy: vi.fn(),
			setEnabled: vi.fn(),
		};
		scene.playerWaves = {
			update: vi.fn(),
			getPhase: vi.fn(() => 'running'),
			getElapsedMs: vi.fn(() => 0),
			getWaveRemainingSec: vi.fn(() => -1),
			getMaxWaves: vi.fn(() => 10),
		};
		scene.playerTowers = {
			update: vi.fn(() => []),
			getTowers: vi.fn(() => []),
			destroy: vi.fn(),
		};
		scene.playerUnits = {
			getUnitPositions: vi.fn(() => []),
			getUnitElement: vi.fn(() => 'neutral'),
			getUnitWorldPos: vi.fn(() => null),
			applyDamage: vi.fn(),
			applySlow: vi.fn(),
			update: vi.fn(() => ({ reachedExit: [{ id: 'unit-1', isBoss: false }] })), // triggers damage
			hasActiveUnits: vi.fn(() => true),
			hasQueuedUnits: vi.fn(() => false),
			getActiveCount: vi.fn(() => 1),
		};
		const state = installRuntimeControllers(scene, {
			initialHp: 20,
			slotIndex: 5,
		});
		state.setHp(1); // one more hit defeats

		scene.update(0, 16);

		expect(EventBus.emit).toHaveBeenCalledWith('game-over', {
			result: 'defeat',
			stats: {
				wavesCleared: 4, // finalSlot-1
				totalWaves: 10,
				towersPlaced: 0,
				timeSurvivedSec: 0,
				goldEarned: 0,
				remainingHp: 0,
				initialHp: 20,
			},
		});
	});

	it('accumulates bounty into goldEarned when a tower kills a unit', () => {
		const scene = createScene();
		scene.hudBuyBtn = { setAlpha: vi.fn() };
		scene.hudRolledInfo = { setText: vi.fn() };
		scene.rangeOverlay = {
			getRangeOverlayGraphics: vi.fn(() => ({ clear: vi.fn() })),
		};
		scene.currentMap = { id: 'forest_gate' };
		scene.damageNumbers = {
			update: vi.fn(),
			show: vi.fn(),
			showMiss: vi.fn(),
			destroy: vi.fn(),
			setEnabled: vi.fn(),
		};
		scene.playerWaves = {
			update: vi.fn(),
			getPhase: vi.fn(() => 'running'),
			getElapsedMs: vi.fn(() => 0),
			getWaveRemainingSec: vi.fn(() => -1),
			getMaxWaves: vi.fn(() => 10),
		};
		// Tower emits one damage event against unit u1 that kills it with bounty=42.
		scene.playerTowers = {
			update: vi.fn(() => [{ unitId: 'u1', damage: 99 }]),
			getTowers: vi.fn(() => []),
			destroy: vi.fn(),
		};
		scene.playerUnits = {
			getUnitPositions: vi.fn(() => [
				{
					instanceId: 'u1',
					x: 0,
					y: 0,
					hp: 1,
					element: 'neutral' as const,
				},
			]),
			getUnitElement: vi.fn(() => 'neutral'),
			getUnitWorldPos: vi.fn(() => ({ x: 0, y: 0 })),
			applyDamage: vi.fn(() => ({
				outcome: 'hit',
				killed: true,
				bounty: 42,
				unitDefId: 'grunt',
				countsTowardClear: true,
				source: 'base',
				isBoss: false,
				actualDamage: 99,
			})),
			applySlow: vi.fn(),
			applyStun: vi.fn(),
			update: vi.fn(() => ({ reachedExit: [] })),
			hasActiveUnits: vi.fn(() => false),
			hasQueuedUnits: vi.fn(() => false),
			getActiveCount: vi.fn(() => 0),
		};
		const state = installRuntimeControllers(scene, {
			initialHp: 20,
			slotIndex: 3,
		});

		scene.update(0, 16);

		expect(state.getGoldEarned()).toBe(42);
	});

	it('never emits opponent-state or kill-transfer during the PVE combat loop', () => {
		const scene = createScene();
		scene.hudBuyBtn = { setAlpha: vi.fn() };
		scene.hudRolledInfo = { setText: vi.fn() };
		scene.damageNumbers = {
			update: vi.fn(),
			show: vi.fn(),
			destroy: vi.fn(),
			setEnabled: vi.fn(),
		};
		scene.playerWaves = {
			update: vi.fn(),
			getPhase: vi.fn(() => 'running'),
			getElapsedMs: vi.fn(() => 0),
			getWaveRemainingSec: vi.fn(() => -1),
			getMaxWaves: vi.fn(() => 10),
		};
		scene.playerTowers = {
			update: vi.fn(() => [
				{ unitId: 'unit-1', damage: 99, towerElement: 'neutral' },
			]),
		};
		scene.playerUnits = {
			getUnitPositions: vi.fn(() => []),
			getUnitElement: vi.fn(() => 'neutral'),
			getUnitWorldPos: vi.fn(() => ({ x: 100, y: 200 })),
			applyDamage: vi.fn(() => ({
				outcome: 'hit',
				killed: true,
				unitDefId: 'scout_drone',
				bounty: 3,
				countsTowardClear: true,
				source: 'base',
				actualDamage: 99,
			})),
			applySlow: vi.fn(),
			update: vi.fn(() => ({ reachedExit: [] })),
			hasActiveUnits: vi.fn(() => true),
			hasQueuedUnits: vi.fn(() => false),
			getActiveCount: vi.fn(() => 1),
		};
		installRuntimeControllers(scene, { slotIndex: 7 });

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
		scene.game = { registry: { events: { off: vi.fn() } } };
		scene.damageNumbers = { destroy: vi.fn(), setEnabled: vi.fn() };
		scene.playerTowers = { destroy: vi.fn() };
		scene.playerUnits = { destroy: vi.fn() };
		scene.playerWaves = { destroy: vi.fn() };
		scene.playerDeck = { reset: vi.fn() };
		scene.fieldRenderer = { destroy: vi.fn() };
		scene.rangeOverlay = { destroy: vi.fn() };
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
