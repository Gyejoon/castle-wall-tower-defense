import { describe, expect, it } from 'vitest';
import { getMaxGoldForMap, getMaxXpForMap } from '../src/constants/stageInfo';
import { getTotalWavesForMap } from '../src/constants/waves';
import { battleXp } from '../src/constants/meta';

describe('stageInfo', () => {
	describe('getMaxXpForMap', () => {
		it('returns correct XP for forest_gate (multiplier 1x)', () => {
			const totalWaves = getTotalWavesForMap('forest_gate');
			const expected = Math.round(battleXp(totalWaves, true) * 1);
			expect(getMaxXpForMap('forest_gate')).toBe(expected);
		});

		it('returns correct XP for lava_fortress (multiplier 2x)', () => {
			const totalWaves = getTotalWavesForMap('lava_fortress');
			const expected = Math.round(battleXp(totalWaves, true) * 2);
			expect(getMaxXpForMap('lava_fortress')).toBe(expected);
		});

		it('returns correct XP for storm_citadel (multiplier 3x)', () => {
			const totalWaves = getTotalWavesForMap('storm_citadel');
			const expected = Math.round(battleXp(totalWaves, true) * 3);
			expect(getMaxXpForMap('storm_citadel')).toBe(expected);
		});

		it('returns 0 for unknown map', () => {
			expect(getMaxXpForMap('nonexistent')).toBe(0);
		});
	});

	describe('getMaxGoldForMap', () => {
		it('returns positive gold for forest_gate', () => {
			const gold = getMaxGoldForMap('forest_gate');
			expect(gold).toBeGreaterThan(0);
		});

		it('lava_fortress gold > forest_gate gold (higher multiplier)', () => {
			expect(getMaxGoldForMap('lava_fortress')).toBeGreaterThan(
				getMaxGoldForMap('forest_gate'),
			);
		});

		it('storm_citadel gold > lava_fortress gold', () => {
			expect(getMaxGoldForMap('storm_citadel')).toBeGreaterThan(
				getMaxGoldForMap('lava_fortress'),
			);
		});

		it('returns 0 for unknown map', () => {
			expect(getMaxGoldForMap('nonexistent')).toBe(0);
		});
	});
});
