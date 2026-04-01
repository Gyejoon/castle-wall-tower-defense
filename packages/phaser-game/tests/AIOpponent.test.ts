import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('phaser', () => ({
	default: {
		Scene: class {},
		Geom: {
			Point: class {
				constructor(
					public x: number,
					public y: number,
				) {}
			},
		},
	},
}));

vi.mock('../src/EventBus', () => ({
	EventBus: {
		emit: vi.fn(),
		on: vi.fn(),
		off: vi.fn(),
	},
}));

import {
	INITIAL_GOLD,
	INITIAL_PLAYER_HP,
	RANDOM_TOWER_COST,
} from '@gld/shared';
import { AIOpponent } from '../src/systems/AIOpponent';

describe('AIOpponent', () => {
	let ai: AIOpponent;

	beforeEach(() => {
		ai = new AIOpponent();
		vi.restoreAllMocks();
	});

	it('initializes with correct defaults', () => {
		expect(ai.hp).toBe(INITIAL_PLAYER_HP);
		expect(ai.gold).toBe(INITIAL_GOLD);
		expect(ai.towerCount).toBe(0);
		expect(ai.pressureTokens).toBe(0);
	});

	it('gstack PvP Pressure: caps stored pressure tokens at two', () => {
		expect(ai.earnPressure('scout_pressure')).toBe(true);
		expect(ai.earnPressure('mixed_pressure')).toBe(true);
		expect(ai.earnPressure('breach_pressure')).toBe(false);
		expect(ai.pressureTokens).toBe(2);
	});

	it('gstack PvP Pressure: reserves the next eligible slot immediately under the same rules as the player', () => {
		ai.earnPressure('mixed_pressure');
		const reservedSlot = ai.reserveNextPressure(8);

		expect(reservedSlot).toBe(10);
		expect(ai.pressureTokens).toBe(0);
		expect(ai.queuedPressureSlots).toEqual([10]);
	});

	it('gstack Core Loop: spends gold in the real-time purchase loop instead of build-phase-only flow', () => {
		vi.spyOn(Math, 'random').mockReturnValue(0.99);

		const startGold = ai.gold;
		ai.updateRealtime(2000, { slotIndex: 3, pressureTier: null });

		expect(ai.gold).toBeLessThan(startGold);
		expect(ai.towerCount).toBeGreaterThan(0);
		expect(startGold - ai.gold).toBe(RANDOM_TOWER_COST);
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
		const result1 = ai.update(0, 300);
		expect(result1.reachedExit).toBe(0);

		let result: { reachedExit: number; killedUnits: string[] } = {
			reachedExit: 0,
			killedUnits: [],
		};
		for (let t = 300; t < 60000; t += 16) {
			result = ai.update(t, 16);
			if (result.reachedExit > 0) break;
		}

		expect(result.reachedExit).toBeGreaterThan(0);
	});

	it('destroy clears all state', () => {
		ai.queueUnits('scout_drone', 5);
		ai.updateRealtime(2000, { slotIndex: 3, pressureTier: 1 });
		ai.destroy();
		expect(ai.hasActiveUnits()).toBe(false);
	});
});
