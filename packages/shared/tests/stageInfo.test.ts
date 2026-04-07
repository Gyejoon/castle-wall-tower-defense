import { describe, expect, it } from 'vitest';
import { getMaxGoldForMap, getMaxXpForMap } from '../src/constants/stageInfo';

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
	});

	describe('getMaxGoldForMap', () => {
		it('forest_gate returns 1225 gold (all bounties ×1)', () => {
			expect(getMaxGoldForMap('forest_gate')).toBe(1225);
		});

		it('lava_fortress returns 3230 gold (×2 multiplier)', () => {
			expect(getMaxGoldForMap('lava_fortress')).toBe(3230);
		});

		it('storm_citadel returns 6279 gold (×3 multiplier)', () => {
			expect(getMaxGoldForMap('storm_citadel')).toBe(6279);
		});

		it('returns 0 for unknown map', () => {
			expect(getMaxGoldForMap('nonexistent')).toBe(0);
		});
	});
});
