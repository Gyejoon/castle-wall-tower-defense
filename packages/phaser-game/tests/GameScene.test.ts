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

		// Player systems
		scene.playerTowers = { destroy: vi.fn() };
		scene.playerUnits = { destroy: vi.fn() };
		scene.playerWaves = { destroy: vi.fn() };
		scene.playerMerge = { destroy: vi.fn() };
		scene.playerRandomTower = { reset: vi.fn() };

		// AI systems
		scene.aiTowers = { destroy: vi.fn() };
		scene.aiUnits = { destroy: vi.fn() };
		scene.aiRandomTower = { reset: vi.fn() };
		scene.aiMerge = { destroy: vi.fn() };

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

		// Player systems destroyed
		expect(scene.playerTowers.destroy).toHaveBeenCalledOnce();
		expect(scene.playerUnits.destroy).toHaveBeenCalledOnce();
		expect(scene.playerWaves.destroy).toHaveBeenCalledOnce();

		// AI systems destroyed
		expect(scene.aiTowers.destroy).toHaveBeenCalledOnce();
		expect(scene.aiUnits.destroy).toHaveBeenCalledOnce();

		// EventBus.off called before system destroys
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
	});

	it('gstack PvP Pressure: queued pressure units always spawn with zero bounty and do not count toward clear checks', () => {
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

	it('gstack Boss / Sudden Death: sudden death expires every unused pressure token', () => {
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
});
