import { describe, expect, it } from 'vitest';
import {
	getMaxGoldForMap,
	getMaxXpForMap,
	getTotalRewardMultiplier,
} from '../src/constants/stageInfo';

describe('stageInfo', () => {
	describe('getMaxXpForMap', () => {
		// forest_gate → w1_s1 (5 waves): battleXp(5,true)=100, ×rewardMult(1)=100
		it('forest_gate returns 100 XP (5 waves × 10 + 50 victory bonus, ×1)', () => {
			expect(getMaxXpForMap('forest_gate')).toBe(100);
		});

		// lava_fortress → w2_s1 (7 waves): battleXp(7,true)=120, ×rewardMult(2)=240
		it('lava_fortress returns 240 XP (×2 multiplier)', () => {
			expect(getMaxXpForMap('lava_fortress')).toBe(240);
		});

		// storm_citadel → w3_s1 (9 waves): battleXp(9,true)=140, ×rewardMult(3)=420
		it('storm_citadel returns 420 XP (×3 multiplier)', () => {
			expect(getMaxXpForMap('storm_citadel')).toBe(420);
		});

		it('returns 0 for unknown map', () => {
			expect(getMaxXpForMap('nonexistent')).toBe(0);
		});

		// forest_gate ★2: 100 × xpMult(2)=200
		it('forest_gate ★2 returns 200 XP (100 × 2 xp mult)', () => {
			expect(getMaxXpForMap('forest_gate', 2)).toBe(200);
		});

		// forest_gate ★3: 100 × xpMult(3)=300
		it('forest_gate ★3 returns 300 XP (100 × 3 xp mult)', () => {
			expect(getMaxXpForMap('forest_gate', 3)).toBe(300);
		});
	});

	describe('getMaxGoldForMap', () => {
		// forest_gate → w1_s1: scout_drone(5)×(3+5+4+6)+battle_robot(12)×(2+4+3)=5×18+12×9=90+108=198
		it('forest_gate returns 198 gold (w1_s1 bounties ×1)', () => {
			expect(getMaxGoldForMap('forest_gate')).toBe(198);
		});

		// lava_fortress → w2_s1: flame_imp/lava_golem bounty=0 (no UnitDef yet)
		// battle_robot(12)×(6+8+6)+heavy_walker(25)×(3+3)=12×20+25×6=240+150=390, ×2=780
		it('lava_fortress returns 780 gold (×2 multiplier, new W2 unit bounties pending)', () => {
			expect(getMaxGoldForMap('lava_fortress')).toBe(780);
		});

		// storm_citadel → w3_s1: arcane_mage/mana_shield bounty=0 (no UnitDef yet)
		// battle_robot(12)×(10+6+8)+heavy_walker(25)×(4+5)+stealth_drone(18)×5+titan(60)×1
		// =12×24+25×9+18×5+60=288+225+90+60=663, ×3=1989
		it('storm_citadel returns 1989 gold (×3 multiplier, new W3 unit bounties pending)', () => {
			expect(getMaxGoldForMap('storm_citadel')).toBe(1989);
		});

		it('returns 0 for unknown map', () => {
			expect(getMaxGoldForMap('nonexistent')).toBe(0);
		});

		// forest_gate ★2: 198 × goldMult(2.5)=495
		it('forest_gate ★2 returns 495 gold (198 × 2.5 gold mult)', () => {
			expect(getMaxGoldForMap('forest_gate', 2)).toBe(495);
		});

		// forest_gate ★3: 198 × goldMult(5)=990
		it('forest_gate ★3 returns 990 gold (198 × 5 gold mult)', () => {
			expect(getMaxGoldForMap('forest_gate', 3)).toBe(990);
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
