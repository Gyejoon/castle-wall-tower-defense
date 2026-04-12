import { describe, expect, it } from 'vitest';
import { FINAL_BOSS_HP_MULTIPLIER } from '../src/constants/boss';
import { getLevelBand, scaleUnitStats } from '../src/constants/scaling';
import { UNITS } from '../src/constants/units';

describe('getLevelBand', () => {
	it('returns 1 for levels 1-10', () => {
		expect(getLevelBand(1)).toBe(1);
		expect(getLevelBand(10)).toBe(1);
	});
	it('returns 2 for levels 11-20', () => {
		expect(getLevelBand(11)).toBe(2);
		expect(getLevelBand(20)).toBe(2);
	});
	it('returns 3 for levels 21-30', () => {
		expect(getLevelBand(21)).toBe(3);
		expect(getLevelBand(30)).toBe(3);
	});
	it('clamps at 3 for levels above 30', () => {
		expect(getLevelBand(50)).toBe(3);
	});
});

describe('scaleUnitStats — softened band multipliers', () => {
	const base = { hp: 100, speed: 2.0, armor: 5 };

	it('returns unmodified stats for band 1 (LV.1-10)', () => {
		const result = scaleUnitStats(base, 1);
		expect(result).toEqual({
			hp: 100,
			speed: 2.0,
			armor: 5,
			bountyMultiplier: 1,
			ccImmunityChance: 0,
		});
	});

	it('applies band 2 multipliers for LV.11-20 (hp×6, armor×4, speed×1.15)', () => {
		const result = scaleUnitStats(base, 15);
		expect(result.hp).toBe(600);
		expect(result.armor).toBe(20);
		expect(result.speed).toBeCloseTo(2.3);
		expect(result.bountyMultiplier).toBe(3);
		expect(result.ccImmunityChance).toBe(0.1);
	});

	it('applies band 3 multipliers for LV.21-30 (hp×30, armor×12, speed×1.35)', () => {
		const result = scaleUnitStats(base, 25);
		expect(result.hp).toBe(3000);
		expect(result.armor).toBe(60);
		expect(result.speed).toBeCloseTo(2.7);
		expect(result.bountyMultiplier).toBe(8);
		expect(result.ccImmunityChance).toBe(0.2);
	});
});

describe('FINAL_BOSS_HP_MULTIPLIER', () => {
	it('nerfed from 2 to 1.5', () => {
		expect(FINAL_BOSS_HP_MULTIPLIER).toBe(1.5);
	});
});

describe('corrupted_archmage CC resist', () => {
	it('nerfed from 1.0 (full immune) to 0.7', () => {
		const archmage = UNITS.find((u) => u.id === 'corrupted_archmage');
		expect(archmage?.bossCcResist).toBe(0.7);
	});
});
