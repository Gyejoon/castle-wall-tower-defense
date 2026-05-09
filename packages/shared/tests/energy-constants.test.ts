import { describe, expect, it } from 'vitest';
import {
	ENERGY_INITIAL,
	ENERGY_MAX,
	ENERGY_PER_BOSS_FAST_CLEAR,
	ENERGY_PER_BOSS_KILL,
	ENERGY_PER_KILL,
	ENERGY_PER_SECOND,
	ENERGY_PER_WAVE_CLEAR,
	FAST_CLEAR_THRESHOLD_MS,
	INGAME_GACHA,
} from '../src/constants/energy';

describe('energy constants (정식 모드)', () => {
	it('baseline regen and caps match spec', () => {
		expect(ENERGY_PER_SECOND).toBe(1);
		expect(ENERGY_INITIAL).toBe(40);
		expect(ENERGY_MAX).toBe(200);
	});

	it('kill rewards match spec', () => {
		expect(ENERGY_PER_KILL).toBe(1);
		expect(ENERGY_PER_BOSS_KILL).toBe(20);
		expect(ENERGY_PER_BOSS_FAST_CLEAR).toBe(20);
		expect(ENERGY_PER_WAVE_CLEAR).toBe(0);
	});

	it('fast-clear threshold is 30s', () => {
		expect(FAST_CLEAR_THRESHOLD_MS).toBe(30_000);
	});

	it('ingame gacha cost/probability table', () => {
		expect(INGAME_GACHA.tier2).toEqual({ cost: 40, successRate: 0.6 });
		expect(INGAME_GACHA.tier3).toEqual({ cost: 80, successRate: 0.2 });
		expect(INGAME_GACHA.tier4).toEqual({ cost: 160, successRate: 0.05 });
	});
});
