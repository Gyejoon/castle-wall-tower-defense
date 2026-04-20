import { describe, expect, it } from 'vitest';
import {
	BASE_FAMILY_UPGRADE_COST,
	FAMILY_UPGRADE_DAMAGE_PER_LEVEL,
	familyDamageMultiplier,
	familyUpgradeCost,
	MAX_FAMILY_UPGRADE_LEVEL,
	UPGRADEABLE_FAMILIES,
} from '../src/constants/familyUpgrade';

describe('familyUpgradeCost', () => {
	it('level 0 → BASE_FAMILY_UPGRADE_COST (30)', () => {
		expect(familyUpgradeCost(0)).toBe(BASE_FAMILY_UPGRADE_COST);
	});

	it('grows geometrically ×1.25 and rounds to 5', () => {
		// Hardcoded snapshot values, NOT re-derived via the same formula.
		expect(familyUpgradeCost(1)).toBe(40); // 30 × 1.25 = 37.5 → 40
		expect(familyUpgradeCost(2)).toBe(45); // 30 × 1.25² = 46.875 → 45
		expect(familyUpgradeCost(5)).toBe(90);
		expect(familyUpgradeCost(9)).toBe(225);
		expect(familyUpgradeCost(19)).toBe(2080); // last affordable step
	});

	it('all in-range costs are multiples of 5 (HUD badge tidiness)', () => {
		for (let lv = 0; lv < MAX_FAMILY_UPGRADE_LEVEL; lv++) {
			expect(familyUpgradeCost(lv) % 5).toBe(0);
		}
	});

	it('returns Infinity at or above the cap', () => {
		expect(familyUpgradeCost(MAX_FAMILY_UPGRADE_LEVEL)).toBe(
			Number.POSITIVE_INFINITY,
		);
		expect(familyUpgradeCost(MAX_FAMILY_UPGRADE_LEVEL + 5)).toBe(
			Number.POSITIVE_INFINITY,
		);
	});
});

describe('familyDamageMultiplier', () => {
	it('level 0 → ×1.0 (no buff)', () => {
		expect(familyDamageMultiplier(0)).toBe(1);
	});

	it('per-level flat bonus matches FAMILY_UPGRADE_DAMAGE_PER_LEVEL', () => {
		// Use hardcoded expected to catch regressions in the multiplier rate.
		expect(FAMILY_UPGRADE_DAMAGE_PER_LEVEL).toBe(0.75);
		expect(familyDamageMultiplier(1)).toBeCloseTo(1.75, 5);
		expect(familyDamageMultiplier(5)).toBeCloseTo(4.75, 5);
		expect(familyDamageMultiplier(10)).toBeCloseTo(8.5, 5);
		expect(familyDamageMultiplier(20)).toBeCloseTo(16, 5);
	});

	it('treats negative levels as 0 so empty entries do not reduce damage', () => {
		expect(familyDamageMultiplier(-3)).toBe(1);
	});
});

describe('UPGRADEABLE_FAMILIES', () => {
	it('exposes exactly the four base families', () => {
		expect([...UPGRADEABLE_FAMILIES]).toEqual([
			'archer',
			'siege',
			'frost',
			'stun',
		]);
	});
});
