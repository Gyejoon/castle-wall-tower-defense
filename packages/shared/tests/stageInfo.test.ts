import { describe, expect, it } from 'vitest';
import {
	getMaxGoldForMap,
	getMaxXpForMap,
	getTotalRewardMultiplier,
} from '../src/constants/stageInfo';

describe('stageInfo', () => {
	describe('getMaxXpForMap', () => {
		it('forest_gate returns 150 XP (10 waves × 10 + 50 victory bonus, ×1)', () => {
			expect(getMaxXpForMap('forest_gate')).toBe(150);
		});

		it('lava_fortress returns 300 XP (×2 multiplier)', () => {
			expect(getMaxXpForMap('lava_fortress')).toBe(300);
		});

		it('storm_citadel returns 450 XP (×3 multiplier)', () => {
			expect(getMaxXpForMap('storm_citadel')).toBe(450);
		});

		it('returns 0 for unknown map', () => {
			expect(getMaxXpForMap('nonexistent')).toBe(0);
		});

		it('forest_gate ★2 returns 300 XP (150 × 2 xp mult)', () => {
			expect(getMaxXpForMap('forest_gate', 2)).toBe(300);
		});

		it('forest_gate ★3 returns 450 XP (150 × 3 xp mult)', () => {
			expect(getMaxXpForMap('forest_gate', 3)).toBe(450);
		});
	});

	describe('getMaxGoldForMap', () => {
		it('forest_gate returns 848 gold (all bounties ×1)', () => {
			expect(getMaxGoldForMap('forest_gate')).toBe(848);
		});

		it('lava_fortress returns 2354 gold (×2 multiplier)', () => {
			expect(getMaxGoldForMap('lava_fortress')).toBe(2354);
		});

		it('storm_citadel returns 4254 gold (×3 multiplier)', () => {
			expect(getMaxGoldForMap('storm_citadel')).toBe(4254);
		});

		it('returns 0 for unknown map', () => {
			expect(getMaxGoldForMap('nonexistent')).toBe(0);
		});

		it('forest_gate ★2 returns 2120 gold (848 × 2.5 gold mult)', () => {
			expect(getMaxGoldForMap('forest_gate', 2)).toBe(2120);
		});

		it('forest_gate ★3 returns 4240 gold (848 × 5 gold mult)', () => {
			expect(getMaxGoldForMap('forest_gate', 3)).toBe(4240);
		});
	});

	describe('getTotalRewardMultiplier', () => {
		it('forest_gate ★1 = {gold:1, xp:1}', () => {
			expect(getTotalRewardMultiplier('forest_gate', 1)).toEqual({
				gold: 1,
				xp: 1,
			});
		});

		it('lava_fortress ★2 = {gold:5, xp:4}', () => {
			expect(getTotalRewardMultiplier('lava_fortress', 2)).toEqual({
				gold: 5,
				xp: 4,
			});
		});

		it('storm_citadel ★3 = {gold:15, xp:9}', () => {
			expect(getTotalRewardMultiplier('storm_citadel', 3)).toEqual({
				gold: 15,
				xp: 9,
			});
		});
	});
});
